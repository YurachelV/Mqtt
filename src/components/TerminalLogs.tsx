/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, ArrowDownLeft, ArrowUpRight, Cpu } from 'lucide-react';
import { LogEntry } from '../types';

interface TerminalLogsProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  className?: string;
}

export default function TerminalLogs({ logs, onClearLogs, className }: TerminalLogsProps) {
  const [filter, setFilter] = useState<'all' | 'rx' | 'tx' | 'sys_err'>('all');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, filter]);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'rx') return log.type === 'rx';
    if (filter === 'tx') return log.type === 'tx';
    if (filter === 'sys_err') return log.type === 'error' || log.type === 'info' || log.type === 'success';
    return true;
  });

  return (
    <div id="terminal-logs-panel" className={`bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm flex flex-col h-[260px] md:h-[280px] transition-all duration-300 ${className || ''}`}>
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5 pb-1.5 border-b border-cyan-900/10 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-cyan-400" />
          <div>
            <h2 className="text-xs font-bold text-slate-300 tracking-wider uppercase font-mono">Live Serial MQTT Monitor</h2>
            <p className="text-[8px] text-slate-500 font-mono">DEBUG CONSOLE RX / TX SYSTEM PACKETS</p>
          </div>
        </div>

        {/* Console control filters */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            id="filter-log-all"
            onClick={() => setFilter('all')}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold border cursor-pointer select-none transition-all ${
              filter === 'all'
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-slate-900 text-slate-500 border-slate-800/40 hover:border-slate-700'
            }`}
          >
            ALL
          </button>
          
          <button
            id="filter-log-rx"
            onClick={() => setFilter('rx')}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold border cursor-pointer select-none transition-all flex items-center gap-0.5 ${
              filter === 'rx'
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-slate-900 text-slate-500 border-slate-800/40 hover:border-slate-700'
            }`}
          >
            <ArrowDownLeft size={8} />
            <span>RX</span>
          </button>

          <button
            id="filter-log-tx"
            onClick={() => setFilter('tx')}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold border cursor-pointer select-none transition-all flex items-center gap-0.5 ${
              filter === 'tx'
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-slate-900 text-slate-500 border-slate-800/40 hover:border-slate-700'
            }`}
          >
            <ArrowUpRight size={8} />
            <span>TX</span>
          </button>

          <button
            id="filter-log-sys"
            onClick={() => setFilter('sys_err')}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold border cursor-pointer select-none transition-all flex items-center gap-0.5 ${
              filter === 'sys_err'
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-slate-900 text-slate-500 border-slate-800/40 hover:border-slate-700'
            }`}
          >
            <Cpu size={8} />
            <span>Sys</span>
          </button>

          <div className="w-[1px] h-3 bg-slate-850 mx-0.5" />

          {/* Dump recycle trash */}
          <button
            id="btn-clear-logs"
            onClick={onClearLogs}
            className="p-0.5 px-1.5 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-450 transition-all cursor-pointer border border-transparent hover:border-rose-500/20"
            title="Clean terminal buffer"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Console log list window */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-black/40 border border-slate-800/80 rounded-xl p-2.5 font-mono text-[10px] space-y-1 scrollbar-thin overflow-x-hidden min-h-[100px]"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-700 italic flex items-center justify-center h-full">
            Terminal kosong. Menunggu data paket MQTT...
          </div>
        ) : (
          filteredLogs.map((log) => {
            const timeStr = log.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            let colorClass = 'text-slate-400';
            let iconText = '⚙️ [SYS]';
            
            if (log.type === 'rx') {
              colorClass = 'text-emerald-400';
              iconText = '📥 [RX]';
            } else if (log.type === 'tx') {
              colorClass = 'text-cyan-400';
              iconText = '📤 [TX]';
            } else if (log.type === 'error') {
              colorClass = 'text-rose-450 font-semibold';
              iconText = '🚨 [ERR]';
            } else if (log.type === 'success') {
              colorClass = 'text-cyan-400 font-bold';
              iconText = '✅ [OK]';
            }

            return (
              <div key={log.id} className="flex gap-1.5 leading-normal hover:bg-slate-900/30 p-0.5 rounded transition-all">
                <span className="text-slate-600 select-none shrink-0">[{timeStr}]</span>
                <span className={`${colorClass} shrink-0 select-none`}>{iconText}</span>
                {log.topic && (
                  <span className="text-cyan-400 font-semibold shrink-0">
                    [{log.topic}] ➜
                  </span>
                )}
                <span className={`${colorClass} whitespace-pre-wrap break-all flex-1`}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Terminal footer note */}
      <div className="flex items-center justify-between text-[8px] text-slate-600 font-mono mt-1.5 shrink-0 uppercase tracking-wider">
        <span>MQTT WebSockets 115200</span>
        <span>Payload: Plain-text string</span>
      </div>
    </div>
  );
}
