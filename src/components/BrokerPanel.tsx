/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RefreshCw, Network, Settings, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { BrokerConfig } from '../types';

interface BrokerPanelProps {
  brokers: BrokerConfig[];
  activeBrokerId: number; // 1, 2, 3
  activeHardwareBrokerId: number; // Read from TOPIC_STATUS_BROKER
  connectionState: 'connected' | 'disconnected' | 'connecting';
  onSwitchHardwareBroker: (id: number) => void;
  onSwitchWebBroker: (id: number) => void;
  onUpdateBrokerWSS: (id: number, wsUrl: string, user: string, pass: string, clientId: string, useProxy: boolean) => void;
}

export default function BrokerPanel({
  brokers,
  activeBrokerId,
  activeHardwareBrokerId,
  connectionState,
  onSwitchHardwareBroker,
  onSwitchWebBroker,
  onUpdateBrokerWSS,
}: BrokerPanelProps) {
  const [editingBrokerId, setEditingBrokerId] = useState<number | null>(null);
  const [customWsUrl, setCustomWsUrl] = useState('');
  const [customUser, setCustomUser] = useState('');
  const [customPass, setCustomPass] = useState('');
  const [customClientId, setCustomClientId] = useState('');
  const [customUseProxy, setCustomUseProxy] = useState(false);

  const handleEditClick = (b: BrokerConfig) => {
    if (editingBrokerId === b.id) {
       setEditingBrokerId(null);
    } else {
      setEditingBrokerId(b.id);
      setCustomWsUrl(b.wsUrl);
      setCustomUser(b.user);
      setCustomPass(b.pass);
      setCustomClientId(b.clientId);
      setCustomUseProxy(!!b.useProxy);
    }
  };

  const handleSaveConfig = (id: number) => {
    onUpdateBrokerWSS(id, customWsUrl, customUser, customPass, customClientId, customUseProxy);
    setEditingBrokerId(null);
  };

  const statusColors = {
    connected: 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.25)]',
    disconnected: 'bg-rose-500 text-white shadow-sm shadow-rose-500/10',
    connecting: 'bg-amber-500 text-black shadow-md shadow-amber-500/10 animate-pulse',
  };

  return (
    <div id="broker-panel" className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2.5 border-b border-cyan-900/10">
        <div>
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
            <Network size={14} className="text-cyan-400" />
            <span>Broker Switching (Redundancy Hub)</span>
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Mendukung koneksi ganda. ESP32 otomatis berpindah ke broker berikutnya secara sekuensial jika gagal!
          </p>
        </div>

        {/* Global Connection status inside the web client */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end text-right">
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Web Status</span>
          </div>
          <div className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wide transition-all uppercase select-none ${statusColors[connectionState]}`}>
            {connectionState}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {brokers.map((broker) => {
          const isWebConnectedBroker = activeBrokerId === broker.id && connectionState === 'connected';
          const isHardwareActive = activeHardwareBrokerId === broker.id;
          const isEditing = editingBrokerId === broker.id;

          return (
            <div
              key={broker.id}
              id={`broker-card-${broker.id}`}
              className={`rounded-lg border transition-all duration-300 overflow-hidden ${
                isWebConnectedBroker
                  ? 'bg-[#050508]/60 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.05)]'
                  : 'bg-black/40 border-slate-800'
              }`}
            >
              <div className="p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                {/* Broker Identifier */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-md font-mono font-bold text-[10px] flex items-center justify-center shrink-0 border transition-all duration-300 ${
                    isWebConnectedBroker 
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40' 
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    B-0{broker.id}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-white text-xs">{broker.name}</span>
                      
                      {/* Active labels */}
                      {isHardwareActive && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.1 rounded text-[8px] font-extrabold uppercase tracking-wide flex items-center gap-0.5 animate-pulse">
                          <ShieldCheck size={8} />
                          ESP32 Aktif
                        </span>
                      )}

                      {isWebConnectedBroker && (
                        <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.1 rounded text-[8px] font-bold uppercase tracking-wide">
                          Web OK
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.2 mt-0.5">
                      <code className="text-[10px] text-slate-400 font-mono block truncate">
                        {broker.wsUrl}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Status elements and action Buttons */}
                <div className="flex items-center flex-wrap gap-1.5 md:justify-end shrink-0 text-[10px]">
                  {/* Edit configuration button */}
                  <button
                    id={`btn-edit-broker-${broker.id}`}
                    onClick={() => handleEditClick(broker)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 cursor-pointer text-[10px]"
                  >
                    <Settings size={11} />
                    <span>Config</span>
                    {isEditing ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>

                  {/* Connect Web Client to this Broker */}
                  <button
                    id={`btn-connect-web-broker-${broker.id}`}
                    onClick={() => onSwitchWebBroker(broker.id)}
                    disabled={activeBrokerId === broker.id && connectionState === 'connected'}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                      activeBrokerId === broker.id
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25 cursor-default'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {activeBrokerId === broker.id ? 'Web Terpilih' : 'Hubungkan Web'}
                  </button>

                  {/* Push switch command to ESP32 */}
                  <button
                    id={`btn-control-esp-broker-${broker.id}`}
                    onClick={() => onSwitchHardwareBroker(broker.id)}
                    className="px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-0.5 bg-cyan-500/10 text-cyan-400 border-cyan-500/25 hover:bg-cyan-500/20"
                    title="Kirim instruksi ganti broker ke ESP32 via MQTT"
                  >
                    <RefreshCw size={11} className="animate-spin-slow text-cyan-400" />
                    <span>Pindahkan ESP32</span>
                  </button>
                </div>
              </div>

              {/* Editing slider panel */}
              {isEditing && (
                <div className="p-3 bg-slate-950/90 border-t border-slate-900 flex flex-col gap-2.5">
                  <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
                    Ubah Jalur WebSocket Secure (WSS) & Kredensial
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-semibold">WS URL Endpoint</label>
                      <input
                        id={`input-wsurl-broker-${broker.id}`}
                        type="text"
                        value={customWsUrl}
                        onChange={(e) => setCustomWsUrl(e.target.value)}
                        className="bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:outline-none p-1.5 rounded font-mono text-slate-200"
                        placeholder="wss://host:port/path"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-semibold">Username</label>
                      <input
                        id={`input-user-broker-${broker.id}`}
                        type="text"
                        value={customUser}
                        onChange={(e) => setCustomUser(e.target.value)}
                        className="bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:outline-none p-1.5 rounded font-mono text-slate-200"
                        placeholder="Username"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-semibold">Password</label>
                      <input
                        id={`input-pass-broker-${broker.id}`}
                        type="password"
                        value={customPass}
                        onChange={(e) => setCustomPass(e.target.value)}
                        className="bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:outline-none p-1.5 rounded font-mono text-slate-200"
                        placeholder="Password"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-semibold">Client ID</label>
                      <input
                        id={`input-clientid-broker-${broker.id}`}
                        type="text"
                        value={customClientId}
                        onChange={(e) => setCustomClientId(e.target.value)}
                        className="bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:outline-none p-1.5 rounded font-mono text-slate-200"
                        placeholder="Client ID"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-cyan-950/20 border border-cyan-500/10 rounded-lg max-w-2xl">
                    <input
                      id={`checkbox-proxy-broker-${broker.id}`}
                      type="checkbox"
                      checked={customUseProxy}
                      onChange={(e) => setCustomUseProxy(e.target.checked)}
                      className="w-3.5 h-3.5 text-cyan-600 bg-slate-950 border-slate-800 rounded accent-cyan-500 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <label 
                        htmlFor={`checkbox-proxy-broker-${broker.id}`}
                        className="text-[10px] text-slate-255 font-bold cursor-pointer select-none"
                      >
                        Gunakan Proxy Server AI Studio (Disarankan)
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-1.5 mt-1">
                    <button
                      id={`btn-cancel-edit-${broker.id}`}
                      onClick={() => setEditingBrokerId(null)}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-900 border border-slate-850 text-slate-500 hover:bg-slate-800 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      id={`btn-save-edit-${broker.id}`}
                      onClick={() => handleSaveConfig(broker.id)}
                      className="px-2 py-1 rounded text-[10px] font-bold bg-cyan-600 text-white hover:bg-cyan-500 cursor-pointer"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
