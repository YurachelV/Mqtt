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
  Server,
  Settings
} from 'lucide-react';

import { BrokerConfig, RelayState, SensorData, LogEntry } from './types';
import MetricCard from './components/MetricCard';
import RelayControl from './components/RelayControl';
import VariasiControl from './components/VariasiControl';
import VoicePanel from './components/VoicePanel';
import BrokerPanel from './components/BrokerPanel';
import TerminalLogs from './components/TerminalLogs';
import SettingsModal from './components/SettingsModal';

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
  const [brokers, setBrokers] = useState<BrokerConfig[]>(() => {
    const saved = localStorage.getItem('esp32_iot_brokers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_BROKERS;
      }
    }
    return INITIAL_BROKERS;
  });
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
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const mqttClientRef = useRef<mqtt.MqttClient | null>(null);

  const activeBroker = brokers.find((b) => b.id === activeBrokerId);

  // Sync brokers to localStorage when they change
  useEffect(() => {
    localStorage.setItem('esp32_iot_brokers', JSON.stringify(brokers));
  }, [brokers]);

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
    addLog(`Switching connection to BROKER${id}...`, 'info');
  };

  // Publish Change Broker Request code (1, 2, or 3) to the ESP32 hardware via MQTT
  const handleSwitchHardwareBroker = (id: number) => {
    const commandTopic = 'kontrol/broker';
    const payload = String(id);
    
    publishMessage(commandTopic, payload);

    if (simulationActive) {
      setTimeout(() => {
        setActiveHardwareBrokerId(id);
        addLog(`Successfully connected to BROKER${id}`, 'success');
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
    addLog(`Command sent: [${topic}] ${payload}`, 'tx');
    
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
    if (mode === 'STOP') {
      const activeName = variasiMode === 1 ? 'Variasi 1' : variasiMode === 2 ? 'Variasi 2' : 'Variasi';
      publishMessage('kontrol/variasi', 'STOP');
      addLog(`${activeName} Dihentikan`, 'info');
      setVariasiMode(0);
      setRelays((prev) => prev.map((r) => ({ ...r, state: false })));
    } else {
      publishMessage('kontrol/variasi', mode);
      setVariasiMode(mode === '1' ? 1 : 2);
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
        addLog(`Successfully connected to BROKER${b.id}`, 'success');
        
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
            if (err) {
              addLog(`Failed to subscribe: [${t}] - ${err.message}`, 'error');
            }
          });
        });
      });

      client.on('message', (topic, message) => {
        const payloadStr = message.toString().trim();
        addLog(`RX: [${topic}] ${payloadStr}`, 'rx');

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

      addLog(`RX: '${mockSuhu.toFixed(1)}'`, 'rx', 'sensor/suhu');
      addLog(`RX: '${mockKelembaban.toFixed(1)}'`, 'rx', 'sensor/kelembaban');
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

      addLog(`RX: 'Variasi ${variasiMode} | Jeda ${variasiJeda}ms | Relay ${simulatedActiveIndex + 1} ON'`, 'rx', 'kontrol/variasi-siklus');
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
      {/* Top Professional Dashboard Header matching mockup */}
      <header className="shrink-0 bg-[#090b11] border-b border-slate-850 sticky top-0 z-30 shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 py-4.5 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <Cpu size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-wider uppercase font-mono leading-none">
                IOT COMMAND CENTER
              </h1>
              <p className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase mt-1.5 font-mono">
                ESP32 GATEWAY • CONSOLE
              </p>
            </div>
          </div>

          {/* Connected state and broker switching dropdown */}
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {/* Simulation toggle indicator button */}
            <button
              id="simulation-mode-toggle"
              onClick={() => setSimulationActive(!simulationActive)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                simulationActive
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
                  : 'bg-slate-900 border-slate-800 text-slate-600'
              }`}
              title="Toggle simulated sensor feed"
            >
              SIM: {simulationActive ? 'ON' : 'OFF'}
            </button>

            {/* Connection badge capsule */}
            <div className={`px-2.5 py-1.5 rounded-full text-[9px] font-sans font-extrabold uppercase tracking-widest border flex items-center gap-1.5 select-none ${
              connectionState === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-450'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${connectionState === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span>{connectionState === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}</span>
            </div>

            {/* Active Broker Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-500 font-extrabold tracking-wider uppercase font-mono hidden sm:inline">
                ACTIVE BROKER
              </span>
              <div 
                id="header-active-broker-badge"
                className="bg-black/40 border border-cyan-500/15 text-cyan-400 font-mono text-[10px] font-bold py-1.5 px-3 rounded-lg flex items-center gap-2 select-none"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>{activeBroker ? activeBroker.name.toUpperCase() : 'UNKNOWN'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Single-Page Bento Dashboard (No hero section for ultimate layout density) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 flex flex-col gap-6">
        {/* Three Columns Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* COLUMN 1 (Left): ENVIRONMENT METRICS & VOICE ASSISTANT */}
          <div className="lg:col-span-3 flex flex-col gap-5 justify-between">
            <MetricCard 
              suhu={sensorData.suhu} 
              kelembaban={sensorData.kelembaban} 
              className="lg:h-[220px]"
            />
            <VoicePanel
              lastSuhu={sensorData.suhu}
              lastKelembaban={sensorData.kelembaban}
              onVoiceCommand={handleVoiceCommand}
              className="lg:h-[340px]"
            />
          </div>

          {/* COLUMN 2 (Middle): RELAY GRID & SEQUENCE CONTROL */}
          <div className="lg:col-span-5 flex flex-col gap-5 justify-between">
            {/* Relays 2x2 grid directly sitting item-stretch */}
            <div className="grid grid-cols-2 gap-4">
              {relays.map((r) => (
                <RelayControl
                  key={r.id}
                  relay={r}
                  onToggle={handleToggleRelay}
                  variasiActive={variasiMode !== 0}
                />
              ))}
            </div>

            {/* Sequence control stack */}
            <VariasiControl
              activeMode={variasiMode}
              jedaMs={variasiJeda}
              onSelectMode={handleSelectVariasiMode}
              onSelectJeda={handleSelectVariasiJeda}
              className="lg:h-[304px]"
            />
          </div>

          {/* COLUMN 3 (Right): ACTIVITY LOG (full vertical matching stretch) */}
          <div className="lg:col-span-4 flex flex-col">
            <TerminalLogs className="flex-1" logs={logs} onClearLogs={handleClearLogs} />
          </div>

        </div>

        {/* Collapsible Advanced Credentials Redundancy Hub */}
        <div className="border border-slate-800/60 rounded-xl bg-slate-900/10 overflow-hidden mt-2">
          <button
            id="expand-advanced-settings-trigger"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="w-full px-5 py-3.5 flex justify-between items-center text-xs font-bold text-slate-400 select-none cursor-pointer bg-slate-900/20 hover:bg-slate-900/40 transition-colors"
          >
            <span className="tracking-widest uppercase text-[10px]">
              {showAdvancedSettings ? 'Hide Broker Server Credentials' : 'Configure Redundant Servers & WebSocket WSS Channels'}
            </span>
            <span className="text-cyan-400 font-mono text-[11px] uppercase">
              {showAdvancedSettings ? '[-] CLOSE' : '[+] ADJUST CREDENTIALS'}
            </span>
          </button>

          {showAdvancedSettings && (
            <div className="border-t border-slate-850 p-4 transition-all duration-300">
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
          )}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="shrink-0 bg-[#090b11] border-t border-slate-800/80 py-5 text-center text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 IOT COMMAND CENTER. ESP32 REDUNDANCY CONTROLLER.</p>
          <div className="flex gap-4">
            <span className="text-slate-600">ALL SYSTEMS ONLINE • FEED DECODER OK</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal Component for configuring brokers */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        brokers={brokers}
        onSaveAllBrokers={(newBrokers) => {
          setBrokers(newBrokers);
          addLog('Semua parameter broker berhasil diperbarui dan disimpan!', 'success');
        }}
      />
    </div>
  );
}
