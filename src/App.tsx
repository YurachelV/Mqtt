/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';
import { 
  Cpu, 
  Wifi, 
  WifiOff, 
  Mic, 
  Sliders, 
  Activity, 
  Database, 
  RotateCw, 
  CheckCircle,
  HelpCircle,
  Info,
  Server
} from 'lucide-react';

import { BrokerConfig, RelayState, SensorData, LogEntry } from './types';
import MetricCard from './components/MetricCard';
import RelayControl from './components/RelayControl';
import VariasiControl from './components/VariasiControl';
import VoicePanel from './components/VoicePanel';
import BrokerPanel from './components/BrokerPanel';
import TerminalLogs from './components/TerminalLogs';

// Default preconfigured brokers matching the ESP32 specifications
const INITIAL_BROKERS: BrokerConfig[] = [
  {
    id: 1,
    name: 'Broker 1 — CloudAMQP',
    server: 'kingfisher.lmq.cloudamqp.com',
    port: 8883,
    wsUrl: 'wss://kingfisher.lmq.cloudamqp.com:443/ws', // Secure Websocket mapping
    user: 'wxoeelnh:wxoeelnh', // Format vhost:user
    pass: 'BQAdo1W8qPeDlnF1O2WZ_AdUTd_uVG0x',
    clientId: 'WebClientAMQP_' + Math.random().toString(16).substring(2, 6),
    vhost: 'wxoeelnh',
    useProxy: false
  },
  {
    id: 2,
    name: 'Broker 2 — MyQTTHub',
    server: 'node02.myqtthub.com',
    port: 8883,
    wsUrl: 'tcps://node02.myqtthub.com:8883', // TLS raw secure port mapped dynamically via Proxy
    user: 'ESP@domain_anda',
    pass: 'password_anda',
    clientId: 'WebClientHub_' + Math.random().toString(16).substring(2, 6),
    vhost: null,
    useProxy: true
  },
  {
    id: 3,
    name: 'Broker 3 — Cedalo Mosquitto',
    server: 'pf-l6rvh5uuefqnek6dwyef.cedalo.cloud',
    port: 8883,
    wsUrl: 'wss://pf-l6rvh5uuefqnek6dwyef.cedalo.cloud:443/mqtt', // WS path usually /mqtt
    user: 'Web',
    pass: 'a',
    clientId: 'WebClientCedalo_' + Math.random().toString(16).substring(2, 6),
    vhost: null,
    useProxy: false
  }
];

const INITIAL_RELAYS: RelayState[] = [
  { id: 1, topic: 'kontrol/relay1', state: false },
  { id: 2, topic: 'kontrol/relay2', state: false },
  { id: 3, topic: 'kontrol/relay3', state: false },
  { id: 4, topic: 'kontrol/relay4', state: false }
];

export default function App() {
  const [brokers, setBrokers] = useState<BrokerConfig[]>(INITIAL_BROKERS);
  const [activeBrokerId, setActiveBrokerId] = useState<number>(1);
  const [activeHardwareBrokerId, setActiveHardwareBrokerId] = useState<number>(1);
  
  const [relays, setRelays] = useState<RelayState[]>(INITIAL_RELAYS);
  const [variasiMode, setVariasiMode] = useState<number>(0); // 0=STOP, 1=maju, 2=mundur
  const [variasiJeda, setVariasiJeda] = useState<number>(150); // initial default delay

  const [sensorData, setSensorData] = useState<SensorData>({
    suhu: null,
    kelembaban: null,
    lastUpdated: null,
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [simulationActive, setSimulationActive] = useState<boolean>(true); // Enable simulation by default for trial ease

  const mqttClientRef = useRef<mqtt.MqttClient | null>(null);

  // Helper to append a console log string
  const addLog = (message: string, type: 'info' | 'rx' | 'tx' | 'error' | 'success', topic?: string) => {
    const newEntry: LogEntry = {
      id: Math.random().toString(),
      timestamp: new Date(),
      type,
      topic,
      message
    };
    setLogs((prev) => [...prev.slice(-199), newEntry]); // maintain last 200 logs
  };

  const handleClearLogs = () => {
    setLogs([]);
    addLog('Konsol dibersihkan.', 'info');
  };

  // Switch Web-side Active MQTT Client Broker Connection
  const handleSwitchWebBroker = (id: number) => {
    setActiveBrokerId(id);
    addLog(`Pindah web broker koneksi ke Broker ${id}...`, 'info');
  };

  // Publish Change Broker Request code (1, 2, or 3) to the ESP32 hardware via MQTT
  const handleSwitchHardwareBroker = (id: number) => {
    const commandTopic = 'kontrol/broker';
    const payload = String(id);
    
    addLog(`Mengirim sinyal ganti broker aktif ke ESP32...`, 'info');
    publishMessage(commandTopic, payload);

    if (simulationActive) {
      setTimeout(() => {
        setActiveHardwareBrokerId(id);
        addLog(`[MOCK GAMEPAD] ESP32 berhasil berpindah ke Broker ${id}!`, 'success');
        // Publish mock status update
        const host = brokers.find((b) => b.id === id)?.server || 'unknown';
        addLog(`[MOCK RX] status/broker => BROKER:${id}|${host}`, 'rx', 'status/broker');
      }, 1000);
    }
  };

  const handleUpdateBrokerWSSSettings = (id: number, wsUrl: string, user: string, pass: string, clientId: string, useProxy: boolean) => {
    setBrokers((prev) =>
      prev.map((b) => (b.id === id ? { ...b, wsUrl, user, pass, clientId, useProxy } : b))
    );
    addLog(`Parameter WebSocket Broker ${id} berhasil diperbarui!`, 'success');
  };

  // Publish a topic & payload to MQTT Broker
  const publishMessage = (topic: string, payload: string) => {
    addLog(`Publish: '${payload}'`, 'tx', topic);
    
    if (mqttClientRef.current && connectionState === 'connected') {
      try {
        mqttClientRef.current.publish(topic, payload, { qos: 0, retain: false });
      } catch (err: any) {
        addLog(`Gagal publish ke MQTT: ${err.message}`, 'error', topic);
      }
    }
  };

  // Toggle Single Relay
  const handleToggleRelay = (id: number, state: boolean) => {
    if (variasiMode !== 0) {
      addLog('Instruksi dibatalkan. Matikan mode VARIATION terlebih dahulu!', 'error');
      return;
    }

    const payload = state ? 'ON' : 'OFF';
    const targetRelay = relays.find((r) => r.id === id);
    if (targetRelay) {
      publishMessage(targetRelay.topic, payload);
      
      // Eagerly update local state for click fluidity
      setRelays((prev) =>
        prev.map((r) => (r.id === id ? { ...r, state } : r))
      );
    }
  };

  // Select Variation Mode
  const handleSelectVariasiMode = (mode: '1' | '2' | 'STOP') => {
    publishMessage('kontrol/variasi', mode);
    
    const numMode = mode === '1' ? 1 : mode === '2' ? 2 : 0;
    setVariasiMode(numMode);

    if (numMode === 0) {
      // Turn off all relays locally too on stop
      setRelays((prev) => prev.map((r) => ({ ...r, state: false })));
    }
  };

  // Change Jeda Interval
  const handleSelectVariasiJeda = (jeda: number) => {
    setVariasiJeda(jeda);
    publishMessage('kontrol/variasi/jeda', String(jeda));
  };

  // Handle voice actions coming back from VoicePanel component
  const handleVoiceCommand = (commandType: string, payload?: any) => {
    if (commandType === 'RELAY_SINGLE') {
      const { relayId, action } = payload;
      handleToggleRelay(relayId, action === 'ON');
    } else if (commandType === 'RELAY_ALL') {
      const { action } = payload;
      const state = action === 'ON';
      
      // Loop over relays in 50ms intervals for neat animation sequencing
      relays.forEach((r, idx) => {
        setTimeout(() => {
          const payloadStr = state ? 'ON' : 'OFF';
          publishMessage(r.topic, payloadStr);
          setRelays((prev) => prev.map((item) => item.id === r.id ? { ...item, state } : item));
        }, idx * 120);
      });
    } else if (commandType === 'VARIASI_MODE') {
      const { mode } = payload;
      handleSelectVariasiMode(mode);
    } else if (commandType === 'GET_TEMPERATURE' || commandType === 'GET_HUMIDITY' || commandType === 'GET_ALL_STATUS') {
      // Handled directly inside voice synthesis! Just logging the status
      addLog(`Membacakan status sensor via audio TTS.`, 'info');
    }
  };

  // --- MQTT CONNECTIVITY ENGINE ---
  useEffect(() => {
    const b = brokers.find((item) => item.id === activeBrokerId);
    if (!b) return;

    // Disconnect existing client
    if (mqttClientRef.current) {
      addLog('Memutuskan koneksi broker sebelumnya...', 'info');
      try {
        mqttClientRef.current.end();
      } catch (err) {
        // Safe catch
      }
    }

    setConnectionState('connecting');
    addLog(`[WebClientHub] Menghubungkan ke ${b.name}...`, 'info');
    addLog(`Target WSS: ${b.wsUrl}${b.useProxy ? ' (via Proxy AI Studio)' : ''}`, 'info');

    try {
      const options: mqtt.IClientOptions = {
        clientId: b.clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 5000,
      };

      if (b.user && b.user.length > 0) {
        options.username = b.user;
        options.password = b.pass;
      }

      // Determine the final connection URL (direct vs proxied)
      let finalWsUrl = b.wsUrl;
      if (b.useProxy) {
        const customProxyUrl = (import.meta as any).env.VITE_EXTERNAL_PROXY_URL;
        if (customProxyUrl) {
          const baseProxy = customProxyUrl.replace(/^http/, 'ws');
          const formattedProxy = baseProxy.startsWith('ws') ? baseProxy : `wss://${baseProxy}`;
          const suffix = formattedProxy.endsWith('/api/proxy') ? '' : '/api/proxy';
          finalWsUrl = `${formattedProxy}${suffix}?target=${encodeURIComponent(b.wsUrl)}`;
        } else {
          const localProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          finalWsUrl = `${localProtocol}//${window.location.host}/api/proxy?target=${encodeURIComponent(b.wsUrl)}`;
        }
        addLog(`Proxy Routing: ${finalWsUrl}`, 'info');
      }

      // Instantiate MQTT instance with robust fallback checks for different export structures at runtime
      let client: mqtt.MqttClient;
      if (mqtt && typeof (mqtt as any).connect === 'function') {
        client = (mqtt as any).connect(finalWsUrl, options);
      } else if (mqtt && (mqtt as any).default && typeof (mqtt as any).default.connect === 'function') {
        client = (mqtt as any).default.connect(finalWsUrl, options);
      } else if (typeof mqtt === 'function') {
        client = (mqtt as any)(finalWsUrl, options);
      } else {
        const exportedKeys = mqtt ? Object.keys(mqtt).join(', ') : 'null';
        throw new Error(`MQTT module resolved to ${typeof mqtt} (keys: [${exportedKeys}]), but no connect function was found.`);
      }
      mqttClientRef.current = client;

      client.on('connect', () => {
        setConnectionState('connected');
        addLog(`Koneksi MQTT BERHASIL Terhubung ke ${b.server}!`, 'success');
        
        // Subscription block
        const subscribeTopics = [
          'kontrol/relay1',
          'kontrol/relay2',
          'kontrol/relay3',
          'kontrol/relay4',
          'kontrol/variasi',
          'kontrol/variasi/jeda',
          'status/broker',
          'sensor/suhu',
          'sensor/kelembaban'
        ];

        subscribeTopics.forEach((t) => {
          client.subscribe(t, (err) => {
            if (!err) {
              addLog(`Disubscribe: '${t}'`, 'info');
            } else {
              addLog(`Gagal subscribe ke topik '${t}': ${err.message}`, 'error');
            }
          });
        });
      });

      client.on('message', (topic, message) => {
        const payloadStr = message.toString().trim();
        addLog(`RX: '${payloadStr}'`, 'rx', topic);

        // Process message types
        if (topic.startsWith('kontrol/relay')) {
          const id = parseInt(topic.replace('kontrol/relay', ''));
          const state = payloadStr === 'ON';
          setRelays((prev) =>
            prev.map((r) => (r.id === id ? { ...r, state } : r))
          );
        } else if (topic === 'kontrol/variasi') {
          const modeMap: Record<string, number> = { '1': 1, '2': 2, 'STOP': 0 };
          setVariasiMode(modeMap[payloadStr] ?? 0);
        } else if (topic === 'kontrol/variasi/jeda') {
          setVariasiJeda(parseInt(payloadStr) || 100);
        } else if (topic === 'sensor/suhu') {
          setSensorData((prev) => ({
            ...prev,
            suhu: parseFloat(payloadStr),
            lastUpdated: new Date()
          }));
        } else if (topic === 'sensor/kelembaban') {
          setSensorData((prev) => ({
            ...prev,
            kelembaban: parseFloat(payloadStr),
            lastUpdated: new Date()
          }));
        } else if (topic === 'status/broker') {
          // format "BROKER:1|server.com"
          if (payloadStr.startsWith('BROKER:')) {
            const parts = payloadStr.replace('BROKER:', '').split('|');
            const brokerIdx = parseInt(parts[0]);
            if (brokerIdx >= 1 && brokerIdx <= 3) {
              setActiveHardwareBrokerId(brokerIdx);
            }
          }
        }
      });

      client.on('error', (err) => {
        addLog(`Kesalahan MQTT: ${err.message}`, 'error');
        setConnectionState('disconnected');
      });

      client.on('close', () => {
        addLog('Sambungan ke broker terputus.', 'info');
        setConnectionState('disconnected');
      });

      client.on('offline', () => {
        addLog('Web Client dalam keadaan offline...', 'info');
        setConnectionState('disconnected');
      });

    } catch (err: any) {
      addLog(`Koneksi Gagal Diinisiasi: ${err.message}`, 'error');
      setConnectionState('disconnected');
    }

    return () => {
      if (mqttClientRef.current) {
        mqttClientRef.current.end();
      }
    };
  }, [activeBrokerId, brokers]);

  // --- MOCK SIMULATOR FEED ---
  // In addition to real MQTT, if simulation is enabled, generate periodic feeds or responses.
  // This allows full UI testing without physically setting up the Arduino device.
  useEffect(() => {
    if (!simulationActive) return;

    addLog('[SIMULATOR] Mode simulasi diaktifkan. Mengirimkan data sensor bayangan...', 'success');

    // Create periodic sensor loop
    const sensorInterval = setInterval(() => {
      const mockSuhu = 26.5 + Math.sin(Date.now() / 30000) * 4.5 + (Math.random() - 0.5) * 0.4;
      const mockKelembaban = 60.0 + Math.cos(Date.now() / 45000) * 15.0 + (Math.random() - 0.5) * 1.0;

      setSensorData({
        suhu: mockSuhu,
        kelembaban: mockKelembaban,
        lastUpdated: new Date()
      });

      addLog(`[MOCK RX] sensor/suhu => ${mockSuhu.toFixed(1)}`, 'rx', 'sensor/suhu');
      addLog(`[MOCK RX] sensor/kelembaban => ${mockKelembaban.toFixed(1)}`, 'rx', 'sensor/kelembaban');
    }, 6000);

    return () => clearInterval(sensorInterval);
  }, [simulationActive]);

  // Handle active variation sequencers locally on simulation mode when variasiMode is active
  useEffect(() => {
    if (!simulationActive || variasiMode === 0) return;

    let step = 0;
    const variasiInterval = setInterval(() => {
      // Simulate physical ESP turnoffs and single active light transitions
      const simulatedActiveIndex = variasiMode === 1 ? (step % 4) : (3 - (step % 4));
      
      setRelays((prev) =>
        prev.map((r, idx) => ({
          ...r,
          state: idx === simulatedActiveIndex
        }))
      );

      addLog(`[MOCK TX/RX] Variasi ${variasiMode} | Jeda ${variasiJeda}ms | Relay ${simulatedActiveIndex + 1} ON`, 'rx', 'kontrol/variasi-siklus');
      step++;
    }, variasiJeda);

    return () => {
      clearInterval(variasiInterval);
      if (variasiMode === 0) {
        setRelays((prev) => prev.map((r) => ({ ...r, state: false })));
      }
    };
  }, [simulationActive, variasiMode, variasiJeda]);

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Professional Dashboard Header */}
      <header className="shrink-0 bg-[#090b11] border-b border-slate-800/80 sticky top-0 z-30 shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Cpu size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-200 tracking-wider uppercase font-mono flex items-center gap-1.5 leading-none">
                <span>ESP32 Control Hub</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1 font-mono">
                REDUNANCY MQTT WORKSPACE • v1.4
              </p>
            </div>
          </div>

          {/* Quick status counters */}
          <div className="flex items-center gap-3 flex-wrap font-mono text-[10px]">
            {/* Simulation Feed option checkbox button */}
            <button
              id="simulation-mode-toggle"
              onClick={() => setSimulationActive(!simulationActive)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold border cursor-pointer transition-all ${
                simulationActive
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title="Jika aktif, mensimulasikan data sensor fiktif jika modul ESP32 Anda luring"
            >
              <Activity size={12} className={simulationActive ? 'animate-pulse' : ''} />
              <span>SIMULATION: {simulationActive ? 'ON' : 'OFF'}</span>
            </button>

            {/* Hardware Active Broker indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-md border border-slate-800 text-slate-300">
              <Server size={11} className="text-cyan-400" />
              <span className="font-bold text-slate-500">BROKER:</span>
              <span className="text-cyan-400 font-bold">#{activeHardwareBrokerId}</span>
            </div>

            {/* Connection Status Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 rounded-md border border-slate-800">
              <Wifi size={11} className={connectionState === 'connected' ? 'text-emerald-400 animate-pulse' : 'text-slate-500'} />
              <span className="font-bold text-slate-500">WIFI:</span>
              <span className={connectionState === 'connected' ? 'text-emerald-400 font-extrabold' : 'text-rose-455 font-extrabold'}>
                {connectionState === 'connected' ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner Intro */}
      <div className="bg-gradient-to-r from-[#0a0c14] to-transparent border-b border-slate-800/60 p-6 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded font-mono font-bold uppercase tracking-widest">
              Smart IoT Core Dashboard
            </span>
            <h2 className="text-lg font-bold text-white tracking-widest uppercase font-mono mt-1.5">
              Sistem Otomasi Node ESP32
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Hubungkan panel web ini dengan broker MQTT Anda. Kelola relay listrik secara paralel, pantau suhu sensor langsung, dan manfaatkan asisten perintah suara internal.
            </p>
          </div>

          {/* Quick Stats Panel */}
          <div className="flex gap-4 p-3 bg-black/40 border border-slate-800/85 rounded-xl shrink-0 font-mono">
            <div className="text-center px-4 border-r border-slate-850">
              <span className="text-[9px] text-slate-550 uppercase tracking-widest font-bold">SUHU</span>
              <p className="text-base font-bold text-emerald-450 mt-0.5">
                {sensorData.suhu !== null ? `${sensorData.suhu.toFixed(1)}°C` : '—'}
              </p>
            </div>
            <div className="text-center px-4">
              <span className="text-[9px] text-slate-550 uppercase tracking-widest font-bold">KELEMBABAN</span>
              <p className="text-base font-bold text-cyan-400 mt-0.5">
                {sensorData.kelembaban !== null ? `${sensorData.kelembaban.toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Single-Page Bento Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMN 1: SENSOR & VOICE ASSISTANT COMPANION (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-6 w-full">
            {/* Live Sensor Metrics Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <MetricCard type="suhu" value={sensorData.suhu} />
              <MetricCard type="kelembaban" value={sensorData.kelembaban} />
            </div>

            {/* Voice Assistant Panel Component */}
            <VoicePanel
              lastSuhu={sensorData.suhu}
              lastKelembaban={sensorData.kelembaban}
              onVoiceCommand={handleVoiceCommand}
            />
          </div>

          {/* COLUMN 2: CONTROLS, SEQUENCE & GATEWAYS (lg:col-span-8) */}
          <div className="lg:col-span-8 flex flex-col gap-6 w-full">
            {/* 4 Relay Grid switches */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between mb-5 border-b border-cyan-900/10 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Cpu size={16} className="text-cyan-400" />
                    <span>Kontrol Sirkuler Relay Fisik</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Aktifkan atau matikan sirkuit relai daya ESP32 secara manual
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relays.map((r) => (
                  <RelayControl
                    key={r.id}
                    relay={r}
                    onToggle={handleToggleRelay}
                    variasiActive={variasiMode !== 0}
                  />
                ))}
              </div>
            </div>

            {/* Variasi Relay Component */}
            <VariasiControl
              activeMode={variasiMode}
              jedaMs={variasiJeda}
              onSelectMode={handleSelectVariasiMode}
              onSelectJeda={handleSelectVariasiJeda}
            />

            {/* Broker Redundancy Switcher & Connection Gateway Panel */}
            <BrokerPanel
              brokers={brokers}
              activeBrokerId={activeBrokerId}
              activeHardwareBrokerId={activeHardwareBrokerId}
              connectionState={connectionState}
              onSwitchHardwareBroker={handleSwitchHardwareBroker}
              onSwitchWebBroker={handleSwitchWebBroker}
              onUpdateBrokerWSS={handleUpdateBrokerWSSSettings}
            />
          </div>
        </div>

        {/* Live debug serial logs always visible at bottom to feel extremely engaging */}
        <TerminalLogs logs={logs} onClearLogs={handleClearLogs} />
      </main>

      {/* Footer Branding */}
      <footer className="shrink-0 bg-[#090b11] border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 font-mono uppercase tracking-wider text-[10px]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 ESP32 Control Hub. Redundancy Broker Environment.</p>
          <div className="flex gap-4">
            <span className="text-slate-600">ALL SERVICES STATUS: ACTIVE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
