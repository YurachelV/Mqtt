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
  onUpdateBrokerWSS: (id: number, wsUrl: string, user: string, pass: string, clientId: string) => void;
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

  const handleEditClick = (b: BrokerConfig) => {
    if (editingBrokerId === b.id) {
      setEditingBrokerId(null);
    } else {
      setEditingBrokerId(b.id);
      setCustomWsUrl(b.wsUrl);
      setCustomUser(b.user);
      setCustomPass(b.pass);
      setCustomClientId(b.clientId);
    }
  };

  const handleSaveConfig = (id: number) => {
    onUpdateBrokerWSS(id, customWsUrl, customUser, customPass, customClientId);
    setEditingBrokerId(null);
  };

  const statusColors = {
    connected: 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]',
    disconnected: 'bg-rose-500 text-white shadow-md shadow-rose-500/10',
    connecting: 'bg-amber-500 text-black shadow-md shadow-amber-500/20 animate-pulse',
  };

  return (
    <div id="broker-panel" className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-lg backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-cyan-900/10">
        <div>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <Network size={16} className="text-cyan-400" />
            <span>Broker Switching (Redundancy Hub)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi koneksi ganda. ESP32 otomatis berpindah ke broker berikutnya jika koneksi gagal!
          </p>
        </div>

        {/* Global Connection status inside the web client */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end text-right">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Web Client Status</span>
            <span className="text-xs font-bold text-slate-400">
              {connectionState === 'connected' ? 'CONNECTED_BROKER' : connectionState === 'connecting' ? 'CONNECTING...' : 'DISCONNECTED'}
            </span>
          </div>
          <div className={`px-4 py-1.5 rounded text-[10px] font-mono font-bold tracking-wide transition-all uppercase select-none ${statusColors[connectionState]}`}>
            {connectionState}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {brokers.map((broker) => {
          const isWebConnectedBroker = activeBrokerId === broker.id && connectionState === 'connected';
          const isHardwareActive = activeHardwareBrokerId === broker.id;
          const isEditing = editingBrokerId === broker.id;

          return (
            <div
              key={broker.id}
              id={`broker-card-${broker.id}`}
              className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                isWebConnectedBroker
                  ? 'bg-[#050508]/60 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                  : 'bg-black/40 border-slate-800/80'
              }`}
            >
              <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Broker Identifier */}
                <div className="flex items-start md:items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 border transition-all duration-300 ${
                    isWebConnectedBroker 
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/50' 
                      : 'bg-slate-900 border-slate-800 text-slate-550'
                  }`}>
                    B-0{broker.id}
                  </div>
                  
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white text-sm">{broker.name}</span>
                      
                      {/* Active labels */}
                      {isHardwareActive && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 animate-pulse">
                          <ShieldCheck size={10} />
                          ESP32 Aktif
                        </span>
                      )}

                      {isWebConnectedBroker && (
                        <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                          Web Terhubung
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <code className="text-xs text-slate-400 font-mono block break-all">
                        URI: {broker.wsUrl}
                      </code>
                      <code className="text-[11px] text-cyan-400/95 font-mono block">
                        Client ID: <span className="font-bold">{broker.clientId}</span>
                      </code>
                    </div>
                  </div>
                </div>

                {/* Status elements and action Buttons */}
                <div className="flex items-center flex-wrap gap-2 md:justify-end shrink-0">
                  {/* Edit configuration button */}
                  <button
                    id={`btn-edit-broker-${broker.id}`}
                    onClick={() => handleEditClick(broker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 cursor-pointer"
                  >
                    <Settings size={13} />
                    <span>Konfigurasi WSS</span>
                    {isEditing ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {/* Connect Web Client to this Broker */}
                  <button
                    id={`btn-connect-web-broker-${broker.id}`}
                    onClick={() => onSwitchWebBroker(broker.id)}
                    disabled={activeBrokerId === broker.id && connectionState === 'connected'}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      activeBrokerId === broker.id
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 cursor-default shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-750'
                    }`}
                  >
                    {activeBrokerId === broker.id ? 'Web Terpilih' : 'Hubungkan Web'}
                  </button>

                  {/* Push switch command to ESP32 */}
                  <button
                    id={`btn-control-esp-broker-${broker.id}`}
                    onClick={() => onSwitchHardwareBroker(broker.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                    title="Kirim instruksi ganti broker ke ESP32 via MQTT"
                  >
                    <RefreshCw size={13} className="animate-spin-slow text-cyan-400" />
                    <span>Pindahkan ESP32</span>
                  </button>
                </div>
              </div>

              {/* Editing slider panel */}
              {isEditing && (
                <div className="p-4 bg-slate-950/90 border-t border-slate-900 flex flex-col gap-3">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
                    Ubah Jalur WebSocket Secure (WSS) & Kredensial
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-medium">WS URL Endpoint</label>
                      <input
                        id={`input-wsurl-broker-${broker.id}`}
                        type="text"
                        value={customWsUrl}
                        onChange={(e) => setCustomWsUrl(e.target.value)}
                        className="bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:outline-none p-2 rounded-lg font-mono text-slate-200"
                        placeholder="wss://host:port/path"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-medium font-semibold">Username (Format vhost:user)</label>
                      <input
                        id={`input-user-broker-${broker.id}`}
                        type="text"
                        value={customUser}
                        onChange={(e) => setCustomUser(e.target.value)}
                        className="bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:outline-none p-2 rounded-lg font-mono text-slate-200"
                        placeholder="Username"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-medium font-semibold">Password</label>
                      <input
                        id={`input-pass-broker-${broker.id}`}
                        type="password"
                        value={customPass}
                        onChange={(e) => setCustomPass(e.target.value)}
                        className="bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:outline-none p-2 rounded-lg font-mono text-slate-200"
                        placeholder="Password"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-500 font-medium font-semibold">Client ID</label>
                      <input
                        id={`input-clientid-broker-${broker.id}`}
                        type="text"
                        value={customClientId}
                        onChange={(e) => setCustomClientId(e.target.value)}
                        className="bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:outline-none p-2 rounded-lg font-mono text-slate-200"
                        placeholder="Client ID"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      id={`btn-cancel-edit-${broker.id}`}
                      onClick={() => setEditingBrokerId(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-850 text-slate-500 hover:bg-slate-800 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      id={`btn-save-edit-${broker.id}`}
                      onClick={() => handleSaveConfig(broker.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-500 cursor-pointer"
                    >
                      Simpan Parameter
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
