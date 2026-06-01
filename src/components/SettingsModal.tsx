/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings, Database, ShieldAlert, RotateCcw, Save } from 'lucide-react';
import { BrokerConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  brokers: BrokerConfig[];
  onSaveAllBrokers: (newBrokers: BrokerConfig[]) => void;
}

export default function SettingsModal({ isOpen, onClose, brokers, onSaveAllBrokers }: SettingsModalProps) {
  const [localBrokers, setLocalBrokers] = useState<BrokerConfig[]>(() => JSON.parse(JSON.stringify(brokers)));
  const [activeTabId, setActiveTabId] = useState<number>(1);

  // Sync state if brokers list changes from outside
  React.useEffect(() => {
    setLocalBrokers(JSON.parse(JSON.stringify(brokers)));
  }, [brokers]);

  if (!isOpen) return null;

  const currentBroker = localBrokers.find((b) => b.id === activeTabId) || localBrokers[0];

  const handleFieldChange = (field: keyof BrokerConfig, value: any) => {
    setLocalBrokers((prev) =>
      prev.map((b) => (b.id === activeTabId ? { ...b, [field]: value } : b))
    );
  };

  const handleSave = () => {
    onSaveAllBrokers(localBrokers);
    onClose();
  };

  const handleResetToDefault = () => {
    if (window.confirm('Apakah Anda yakin ingin mengembalikan pengaturan broker ke nilai bawaan pabrik?')) {
      const INITIAL_RECOMMENDED_BROKERS: BrokerConfig[] = [
        {
          id: 1,
          name: 'Broker 1 — CloudAMQP',
          server: 'kingfisher.lmq.cloudamqp.com',
          port: 8883,
          wsUrl: 'wss://kingfisher.lmq.cloudamqp.com:443/ws',
          user: 'wxoeelnh:wxoeelnh',
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
          wsUrl: 'tcps://node02.myqtthub.com:8883',
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
          wsUrl: 'wss://pf-l6rvh5uuefqnek6dwyef.cedalo.cloud:443/mqtt',
          user: 'Web',
          pass: 'a',
          clientId: 'WebClientCedalo_' + Math.random().toString(16).substring(2, 6),
          vhost: null,
          useProxy: false
        }
      ];
      setLocalBrokers(INITIAL_RECOMMENDED_BROKERS);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop glass blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal body container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-[#090b13] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl z-10"
        >
          {/* Header Panel */}
          <div className="px-6 py-4.5 border-b border-slate-850 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Settings size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-widest uppercase font-mono">
                  BROKER CONFIGURATION
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  Konfigurasikan detail MQTT Broker redundansi secara mandiri
                </p>
              </div>
            </div>
            <button
              id="close-settings-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Broker Tab bar Selector */}
          <div className="px-6 pt-3.5 pb-0.5 border-b border-slate-850 bg-black/20 flex gap-2 shrink-0">
            {localBrokers.map((b) => (
              <button
                key={b.id}
                id={`tab-select-broker-${b.id}`}
                onClick={() => setActiveTabId(b.id)}
                className={`px-4 py-2 text-xs font-mono font-bold tracking-wider rounded-t-lg border-t border-l border-r transition-all cursor-pointer ${
                  activeTabId === b.id
                    ? 'bg-[#090b13] border-slate-800 text-cyan-400 font-extrabold pb-2.5 -mb-1 relative z-10'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-350 hover:bg-slate-900/40'
                }`}
              >
                BROKER {b.id}
              </button>
            ))}
          </div>

          {/* Form Content (scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="p-3.5 bg-cyan-950/10 border border-cyan-500/15 rounded-xl flex gap-3">
              <Database size={18} className="text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed text-slate-400">
                <span className="font-extrabold text-cyan-400 block mb-0.5 uppercase tracking-wide">
                  Broker #{activeTabId} Profile Settings
                </span>
                Ubah parameter server ini agar sesuai dengan konfigurasi ESP32 Anda. Server ini akan dihubungi oleh web client.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                  Alias Name
                </label>
                <input
                  id={`field-broker-name-${activeTabId}`}
                  type="text"
                  value={currentBroker.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="bg-black/35 border border-slate-800 focus:border-cyan-500/80 focus:outline-none p-2.5 rounded-lg text-xs font-sans text-white placeholder-slate-650 transition-colors"
                  placeholder="Misal: Broker Utama CloudAMQP"
                />
              </div>

              {/* Host/Server */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                  Server / Host Address
                </label>
                <input
                  id={`field-broker-server-${activeTabId}`}
                  type="text"
                  value={currentBroker.server}
                  onChange={(e) => handleFieldChange('server', e.target.value)}
                  className="bg-black/35 border border-slate-800 focus:border-cyan-500/80 focus:outline-none p-2.5 rounded-lg text-xs font-mono text-white placeholder-slate-650 transition-colors"
                  placeholder="broker.hivemq.com atau kingfisher.lmq.cloudamqp.com"
                />
              </div>

              {/* Port */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                  Port Number (TLS / Secure)
                </label>
                <input
                  id={`field-broker-port-${activeTabId}`}
                  type="number"
                  value={currentBroker.port}
                  onChange={(e) => handleFieldChange('port', parseInt(e.target.value) || 8883)}
                  className="bg-black/35 border border-slate-800 focus:border-cyan-500/80 focus:outline-none p-2.5 rounded-lg text-xs font-mono text-white placeholder-slate-650 transition-colors"
                  placeholder="8883"
                />
              </div>

              {/* WS URL Secure */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                  Secure WebSocket (WSS) URL
                </label>
                <input
                  id={`field-broker-wsurl-${activeTabId}`}
                  type="text"
                  value={currentBroker.wsUrl}
                  onChange={(e) => handleFieldChange('wsUrl', e.target.value)}
                  className="bg-black/35 border border-slate-800 focus:border-cyan-500/80 focus:outline-none p-2.5 rounded-lg text-xs font-mono text-white placeholder-slate-650 transition-colors"
                  placeholder="wss://kingfisher.lmq.cloudamqp.com:443/ws"
                />
              </div>

              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                  MQTT Username (opsional)
                </label>
                <input
                  id={`field-broker-user-${activeTabId}`}
                  type="text"
                  value={currentBroker.user || ''}
                  onChange={(e) => handleFieldChange('user', e.target.value)}
                  className="bg-black/35 border border-slate-800 focus:border-cyan-500/80 focus:outline-none p-2.5 rounded-lg text-xs font-mono text-white placeholder-slate-650 transition-colors"
                  placeholder="Username"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                  MQTT Password (opsional)
                </label>
                <input
                  id={`field-broker-pass-${activeTabId}`}
                  type="password"
                  value={currentBroker.pass || ''}
                  onChange={(e) => handleFieldChange('pass', e.target.value)}
                  className="bg-black/35 border border-slate-800 focus:border-cyan-500/80 focus:outline-none p-2.5 rounded-lg text-xs font-mono text-white placeholder-slate-650 transition-colors"
                  placeholder="Password"
                />
              </div>

              {/* ClientID */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                  Client ID
                </label>
                <input
                  id={`field-broker-clientid-${activeTabId}`}
                  type="text"
                  value={currentBroker.clientId}
                  onChange={(e) => handleFieldChange('clientId', e.target.value)}
                  className="bg-black/35 border border-slate-800 focus:border-cyan-500/80 focus:outline-none p-2.5 rounded-lg text-xs font-mono text-white placeholder-slate-650 transition-colors"
                />
              </div>
            </div>

            {/* AI Studio proxy selection */}
            <div className="p-4 bg-slate-950/70 border border-slate-850 rounded-xl flex items-start gap-3">
              <input
                id={`field-broker-proxy-${activeTabId}`}
                type="checkbox"
                checked={!!currentBroker.useProxy}
                onChange={(e) => handleFieldChange('useProxy', e.target.checked)}
                className="w-4 h-4 mt-0.5 text-cyan-600 bg-slate-950 border-slate-800 rounded accent-cyan-500 cursor-pointer shrink-0"
              />
              <div className="flex flex-col">
                <label
                  htmlFor={`field-broker-proxy-${activeTabId}`}
                  className="text-xs font-extrabold text-white tracking-wide uppercase cursor-pointer select-none"
                >
                  Gunakan Proxy Server AI Studio (Disarankan)
                </label>
                <span className="text-[10px] text-slate-500 mt-1 leading-normal">
                  Rekomendasi aktif untuk menghindari pembatasan pertukaran sertifikat Mixed Content pada Web Browser saat berkomunikasi secara amankan dengan broker MQTT di luar sandbox.
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="px-6 py-4.5 border-t border-slate-850 bg-black/10 flex items-center justify-between gap-3 shrink-0">
            <button
              id="reset-brokers-defaults"
              onClick={handleResetToDefault}
              className="px-3.5 py-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-rose-500/10 shrink-0"
            >
              <RotateCcw size={13} />
              <span>DEFAULT</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                id="cancel-broker-settings"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-450 hover:bg-slate-850 hover:text-white transition-colors text-xs font-extrabold tracking-wide cursor-pointer"
              >
                Batal
              </button>
              <button
                id="save-broker-settings"
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 text-black font-extrabold text-xs tracking-wide shadow-lg shadow-cyan-500/10 hover:bg-cyan-400 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={14} />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
