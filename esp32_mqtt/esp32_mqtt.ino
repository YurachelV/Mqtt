// Perbesar buffer paket MQTT agar payload besar tidak terpotong
#define MQTT_MAX_PACKET_SIZE 512

// Library WiFi biasa dan versi TLS (untuk koneksi port 8883)
#include <WiFi.h>
#include <WiFiClientSecure.h>
// Library MQTT client untuk ESP32
#include <PubSubClient.h>
// Library sensor suhu & kelembaban DHT
#include "DHT.h"

// =============================================================
//  KONFIGURASI WIFI
//  Ganti sesuai nama dan password jaringan lokal
// =============================================================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// =============================================================
//  KONFIGURASI PIN
//  Relay aktif LOW → HIGH = mati, LOW = nyala
// =============================================================
#define RELAY1_PIN 5
#define RELAY2_PIN 19
#define RELAY3_PIN 18
#define RELAY4_PIN 23
#define DHT_PIN    4      // Pin data DHT11
#define DHT_TYPE   DHT11  // Tipe sensor DHT yang digunakan

// Array pin relay agar mudah diakses via indeks
const int RELAY_PINS[4] = { RELAY1_PIN, RELAY2_PIN, RELAY3_PIN, RELAY4_PIN };

// =============================================================
//  KONFIGURASI MQTT BROKER
//  vhost != NULL  → CloudAMQP (login format "vhost:user")
//  vhost == NULL  → broker biasa (user:pass langsung)
// =============================================================
struct BrokerConfig {
  const char* server;    // Alamat server broker
  int         port;      // Port TLS (biasanya 8883)
  const char* user;      // Username
  const char* pass;      // Password
  const char* clientId;  // ID unik client MQTT
  const char* vhost;     // Virtual host (CloudAMQP), NULL jika tidak dipakai
};

// Daftar 3 broker cadangan — sistem akan otomatis berpindah jika gagal
const BrokerConfig BROKERS[3] = {
  { "kingfisher.lmq.cloudamqp.com",         8883, "YOUR_CLOUDAMQP_USER",  "YOUR_CLOUDAMQP_PASSWORD",  "ESP32AMQP", "YOUR_CLOUDAMQP_VHOST" },
  { "node02.myqtthub.com",                  8883, "YOUR_MYQTTHUB_USER",   "YOUR_MYQTTHUB_PASSWORD",   "EspClient", NULL                 },
  { "pf-l6rvh5uuefqnek6dwyef.cedalo.cloud", 8883, "YOUR_CEDALO_USER",     "YOUR_CEDALO_PASSWORD",     "EspClient", NULL                 }
};

// Jumlah percobaan gagal sebelum beralih ke broker berikutnya
const int MAX_CONNECT_ATTEMPTS = 3;

// =============================================================
//  TOPIK MQTT
//  Semua topik publish/subscribe terpusat di sini
// =============================================================
#define TOPIC_RELAY1        "kontrol/relay1"         // Payload: ON / OFF
#define TOPIC_RELAY2        "kontrol/relay2"         // Payload: ON / OFF
#define TOPIC_RELAY3        "kontrol/relay3"         // Payload: ON / OFF
#define TOPIC_RELAY4        "kontrol/relay4"         // Payload: ON / OFF
#define TOPIC_VARIASI       "kontrol/variasi"        // Payload: 1 / 2 / STOP
#define TOPIC_VARIASI_JEDA  "kontrol/variasi/jeda"   // Payload: 50–500 (ms)
#define TOPIC_BROKER        "kontrol/broker"         // Payload: 1 / 2 / 3
#define TOPIC_STATUS_BROKER "status/broker"          // Publish info broker aktif
#define TOPIC_SUHU          "sensor/suhu"            // Publish suhu (°C)
#define TOPIC_KELEMBABAN    "sensor/kelembaban"      // Publish kelembaban (%)

// =============================================================
//  STATE GLOBAL
// =============================================================

// -- Broker: menyimpan broker aktif dan status perpindahan --
int  activeBrokerIdx      = 0;      // Indeks broker yang sedang dipakai (0–2)
int  connectAttempts      = 0;      // Hitung percobaan gagal ke broker saat ini
bool brokerSwitchPending  = false;  // Flag: ada permintaan ganti broker dari callback
int  pendingBrokerIdx     = 0;      // Indeks broker tujuan saat switch diminta

// -- Variasi relay: animasi relay berurutan --
int           variasiMode     = 0;   // 0=off, 1=maju (1→4), 2=mundur (4→1)
int           variasiStep     = 0;   // Langkah saat ini dalam siklus variasi
unsigned long variasiLastTime = 0;   // Waktu terakhir variasi dieksekusi (ms)
unsigned long variasiJeda     = 50;  // Jeda antar langkah variasi (ms), bisa diubah via MQTT

// -- Sensor: timer publish berkala --
unsigned long lastSensorTime        = 0;     // Waktu terakhir sensor dipublish
const unsigned long SENSOR_INTERVAL = 5000;  // Interval publish sensor (ms)

// =============================================================
//  OBJEK UTAMA
// =============================================================
WiFiClientSecure wifiClient;           // Koneksi WiFi dengan dukungan TLS/SSL
PubSubClient     mqttClient(wifiClient); // Client MQTT menggunakan koneksi TLS
DHT              dht(DHT_PIN, DHT_TYPE); // Sensor DHT11

// =============================================================
//  FUNGSI UTILITAS
// =============================================================

// Hapus spasi/tab/newline di awal & akhir string
// Diperlukan karena beberapa broker mengirim payload dengan spasi ekstra
String trimStr(String s) {
  int a = 0, b = s.length() - 1;
  // Geser indeks awal hingga bukan whitespace
  while (a <= b && (s[a] == ' ' || s[a] == '\t' || s[a] == '\r' || s[a] == '\n')) a++;
  // Geser indeks akhir hingga bukan whitespace
  while (b >= a && (s[b] == ' ' || s[b] == '\t' || s[b] == '\r' || s[b] == '\n')) b--;
  return s.substring(a, b + 1);
}

// Ubah kode error PubSubClient menjadi teks yang mudah dibaca
String stateDesc(int state) {
  switch (state) {
    case -4: return "TIMEOUT";
    case -3: return "CONNECTION_LOST";
    case -2: return "CONNECT_FAILED (SSL/Network)";
    case -1: return "DISCONNECTED";
    case  1: return "BAD_PROTOCOL";
    case  2: return "BAD_CLIENT_ID";
    case  3: return "UNAVAILABLE";
    case  4: return "BAD_CREDENTIALS";
    case  5: return "UNAUTHORIZED";
    default: return "UNKNOWN (" + String(state) + ")";
  }
}

// =============================================================
//  WIFI
// =============================================================

// Hubungkan ke WiFi dan nonaktifkan verifikasi sertifikat SSL (setInsecure)
void setupWifi() {
  Serial.print("\n[WiFi] Menghubungkan ke ");
  Serial.print(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  // Tunggu sampai terhubung, cetak titik setiap 500ms
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n[WiFi] Terhubung | IP: " + WiFi.localIP().toString());
  // Lewati validasi sertifikat TLS — cukup untuk komunikasi MQTT terenkripsi
  wifiClient.setInsecure();
}

// =============================================================
//  RELAY
// =============================================================

// Matikan semua relay sekaligus (HIGH = mati pada relay aktif LOW)
void allRelayOff() {
  for (int i = 0; i < 4; i++) digitalWrite(RELAY_PINS[i], HIGH);
}

// Nyalakan atau matikan satu relay berdasarkan indeks (0–3)
void setRelay(int idx, bool on) {
  digitalWrite(RELAY_PINS[idx], on ? LOW : HIGH); // LOW = ON, HIGH = OFF
  Serial.printf("[Relay] %d => %s\n", idx + 1, on ? "ON" : "OFF");
}

// =============================================================
//  VARIASI RELAY
//  Animasi relay bergiliran sesuai mode dan jeda yang dipilih
//  Mode 1 : maju    → relay 1 → 2 → 3 → 4 → 1 → ...
//  Mode 2 : mundur  → relay 4 → 3 → 2 → 1 → 4 → ...
//  Jeda   : variasiJeda ms (50–500), diatur via MQTT
// =============================================================
void handleVariasi() {
  // Tidak ada yang dilakukan jika variasi tidak aktif
  if (variasiMode == 0) return;

  unsigned long now = millis();
  // Belum waktunya langkah berikutnya — tunggu dulu
  if (now - variasiLastTime < variasiJeda) return;
  variasiLastTime = now;

  // Matikan semua relay sebelum menyalakan yang berikutnya
  allRelayOff();

  // Hitung indeks relay yang akan dinyalakan sesuai mode
  int relayIdx = (variasiMode == 1)
    ? (variasiStep % 4)          // Mode 1: 0,1,2,3,0,1,...
    : (3 - (variasiStep % 4));   // Mode 2: 3,2,1,0,3,2,...

  digitalWrite(RELAY_PINS[relayIdx], LOW);  // Nyalakan relay terpilih
  Serial.printf("[Variasi %d | jeda %lums] Relay %d ON\n",
                variasiMode, variasiJeda, relayIdx + 1);

  variasiStep++;  // Maju ke langkah berikutnya
}

// =============================================================
//  MQTT – CONNECT & SUBSCRIBE
// =============================================================

// Hubungkan ke broker sesuai tipe autentikasi (vhost / user-pass / tanpa auth)
bool connectToBroker(const BrokerConfig& b) {
  // CloudAMQP: username harus digabung "vhost:user"
  if (b.vhost != NULL) {
    String user = String(b.vhost) + ":" + String(b.user);
    Serial.println("[MQTT] Login vhost: " + user);
    return mqttClient.connect(b.clientId, user.c_str(), b.pass);
  }
  // Broker biasa dengan username & password
  if (b.user != NULL && strlen(b.user) > 0) {
    return mqttClient.connect(b.clientId, b.user, b.pass);
  }
  // Broker tanpa autentikasi
  return mqttClient.connect(b.clientId);
}

// Subscribe ke semua topik yang diperlukan setelah berhasil connect
void subscribeAll() {
  mqttClient.subscribe(TOPIC_RELAY1);
  mqttClient.subscribe(TOPIC_RELAY2);
  mqttClient.subscribe(TOPIC_RELAY3);
  mqttClient.subscribe(TOPIC_RELAY4);
  mqttClient.subscribe(TOPIC_VARIASI);
  mqttClient.subscribe(TOPIC_VARIASI_JEDA);  // Topik untuk mengatur jeda variasi
  mqttClient.subscribe(TOPIC_BROKER);
  Serial.println("[MQTT] Subscribe semua topik berhasil.");
}

// Coba hubungkan ke broker aktif; jika gagal N kali, otomatis pindah ke broker berikutnya
void reconnect() {
  while (!mqttClient.connected()) {
    const BrokerConfig& b = BROKERS[activeBrokerIdx];
    Serial.printf("\n[MQTT] Broker %d (%s:%d)%s... ",
                  activeBrokerIdx + 1, b.server, b.port,
                  b.vhost ? " [vhost]" : "");

    mqttClient.setServer(b.server, b.port);

    if (connectToBroker(b)) {
      // Berhasil: subscribe topik dan publish info broker aktif
      Serial.println("BERHASIL!");
      subscribeAll();
      connectAttempts = 0;

      String info = "BROKER:" + String(activeBrokerIdx + 1) + "|" + String(b.server);
      mqttClient.publish(TOPIC_STATUS_BROKER, info.c_str());
      Serial.println("[Status] " + info);

    } else {
      // Gagal: catat percobaan dan pindah broker jika sudah mencapai batas
      Serial.printf("Gagal! state=%d | %s\n",
                    mqttClient.state(), stateDesc(mqttClient.state()).c_str());

      if (++connectAttempts >= MAX_CONNECT_ATTEMPTS) {
        connectAttempts = 0;
        // Geser ke broker berikutnya secara melingkar (0→1→2→0)
        activeBrokerIdx = (activeBrokerIdx + 1) % 3;
        Serial.printf(">>> [AUTO FALLBACK] Broker %d (%s) <<<\n",
                      activeBrokerIdx + 1, BROKERS[activeBrokerIdx].server);
      }
      delay(4000);  // Tunggu 4 detik sebelum coba lagi
    }
  }
}

// =============================================================
//  MQTT – GANTI BROKER MANUAL
//  Dipanggil dari loop() setelah mqttClient.loop() selesai
//  JANGAN dipanggil langsung dari callback() → dapat menyebabkan crash
// =============================================================
void switchBroker(int newIdx) {
  Serial.printf("\n>>> [SWITCH] Broker %d (%s) <<<\n",
                newIdx + 1, BROKERS[newIdx].server);
  mqttClient.disconnect();  // Putus koneksi broker lama
  delay(500);
  activeBrokerIdx  = newIdx;  // Set broker tujuan
  connectAttempts  = 0;       // Reset counter percobaan
  // reconnect() akan dipanggil otomatis di loop() pada iterasi berikutnya
}

// =============================================================
//  MQTT – CALLBACK
//  Dipanggil otomatis oleh library saat pesan masuk di topik yang disubscribe
// =============================================================
void callback(char* topic, byte* payload, unsigned int length) {
  // Konversi byte payload menjadi String
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  Serial.println("[RX RAW] " + String(topic) + " => '" + msg + "'");
  // Bersihkan whitespace ekstra dari payload sebelum diproses
  msg = trimStr(msg);
  Serial.println("[RX]     " + String(topic) + " => '" + msg + "'");

  // ---- GANTI BROKER (1/2/3) ----
  if (String(topic) == TOPIC_BROKER) {
    int idx = msg.toInt() - 1;  // Konversi ke indeks 0-based
    if (idx >= 0 && idx <= 2) {
      if (idx == activeBrokerIdx) {
        Serial.println("[Broker] Sudah di broker " + String(idx + 1));
      } else {
        // Set flag agar switch dilakukan di loop(), bukan di sini
        pendingBrokerIdx    = idx;
        brokerSwitchPending = true;
      }
    } else {
      Serial.println("[Broker] Payload tidak valid (kirim 1/2/3): " + msg);
    }
    return;
  }

  // ---- ATUR JEDA VARIASI (50–500 ms) ----
  if (String(topic) == TOPIC_VARIASI_JEDA) {
    unsigned long jeda = (unsigned long)msg.toInt();
    if (jeda >= 50 && jeda <= 500) {
      variasiJeda = jeda;  // Terapkan jeda baru langsung
      Serial.printf("[Variasi] Jeda diubah → %lu ms\n", variasiJeda);
    } else {
      Serial.println("[Variasi] Jeda tidak valid (50–500): " + msg);
    }
    return;
  }

  // ---- PILIH MODE VARIASI (1/2/STOP) ----
  if (String(topic) == TOPIC_VARIASI) {
    if (msg == "1" || msg == "2") {
      variasiMode     = msg.toInt();  // Aktifkan mode maju atau mundur
      variasiStep     = 0;            // Mulai dari relay pertama
      variasiLastTime = 0;            // Paksa langkah pertama langsung dijalankan
      Serial.printf("[Variasi] Mode %d aktif | jeda %lu ms\n", variasiMode, variasiJeda);
    } else if (msg == "STOP") {
      // Hentikan variasi dan matikan semua relay
      variasiMode = 0;
      variasiStep = 0;
      allRelayOff();
      Serial.println("[Variasi] Dihentikan. Kembali ke kontrol manual.");
    }
    return;
  }

  // ---- KONTROL RELAY MANUAL (hanya aktif saat variasi OFF) ----
  if (variasiMode != 0) {
    // Abaikan perintah manual selama variasi berjalan
    Serial.println("[Info] Variasi aktif – kirim STOP ke kontrol/variasi dulu.");
    return;
  }

  // Terapkan perintah ON/OFF ke relay yang sesuai dengan topik
  bool on = (msg == "ON");
  if      (String(topic) == TOPIC_RELAY1) setRelay(0, on);
  else if (String(topic) == TOPIC_RELAY2) setRelay(1, on);
  else if (String(topic) == TOPIC_RELAY3) setRelay(2, on);
  else if (String(topic) == TOPIC_RELAY4) setRelay(3, on);
}

// =============================================================
//  SETUP
//  Dijalankan sekali saat ESP32 pertama kali dinyalakan
// =============================================================
void setup() {
  Serial.begin(115200);

  // Inisialisasi semua pin relay sebagai output dan set kondisi awal mati
  for (int i = 0; i < 4; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], HIGH);  // HIGH = relay mati (aktif LOW)
  }

  dht.begin();    // Inisialisasi sensor DHT11
  setupWifi();    // Hubungkan ke jaringan WiFi

  // Set broker awal dan daftarkan fungsi callback
  mqttClient.setServer(BROKERS[activeBrokerIdx].server, BROKERS[activeBrokerIdx].port);
  mqttClient.setCallback(callback);
}

// =============================================================
//  LOOP
//  Dijalankan terus-menerus; tangani koneksi, pesan, dan sensor
// =============================================================
void loop() {
  // Periksa koneksi WiFi; reconnect jika terputus
  if (WiFi.status() != WL_CONNECTED) setupWifi();

  // Periksa koneksi MQTT; reconnect (dengan auto fallback) jika terputus
  if (!mqttClient.connected()) reconnect();

  // Proses semua pesan MQTT yang masuk dan jaga koneksi tetap hidup
  mqttClient.loop();

  // Eksekusi ganti broker SETELAH mqttClient.loop() selesai
  // Melakukan disconnect di dalam callback dapat menyebabkan crash
  if (brokerSwitchPending) {
    brokerSwitchPending = false;
    switchBroker(pendingBrokerIdx);
  }

  // Jalankan animasi variasi relay (tidak melakukan apa-apa jika mode == 0)
  handleVariasi();

  // Baca dan publish data sensor setiap SENSOR_INTERVAL ms
  unsigned long now = millis();
  if (now - lastSensorTime >= SENSOR_INTERVAL) {
    lastSensorTime = now;

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    // Lewati publish jika pembacaan sensor gagal (nilai NaN)
    if (isnan(h) || isnan(t)) {
      Serial.println("[Sensor] Gagal membaca DHT11!");
      return;
    }

    mqttClient.publish(TOPIC_SUHU,       String(t).c_str());
    mqttClient.publish(TOPIC_KELEMBABAN, String(h).c_str());

    Serial.printf("[Sensor] (%s) Suhu: %.1f°C | Kelembaban: %.1f%%\n",
                  BROKERS[activeBrokerIdx].server, t, h);
  }
}
