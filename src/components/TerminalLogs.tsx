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
    <div id="terminal-logs-panel" className={`bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm flex flex-col h-[480px] lg:h-[580px] max-h-[580px] overflow-hidden transition-all duration-300 ${className || ''}`}>
      {/* Header Panel */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-cyan-900/10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-mono font-bold">&gt;_</span>
          <h2 className="text-[11px] font-extrabold text-slate-300 tracking-wider uppercase font-sans">Activity Log</h2>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1 bg-black/30 p-0.5 rounded-md border border-slate-800/40 shrink-0">
            <button
              id="filter-log-all"
              onClick={() => setFilter('all')}
              className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold cursor-pointer transition-all ${
                filter === 'all'
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'text-slate-650 hover:text-slate-400'
              }`}
            >
              ALL
            </button>
            <button
              id="filter-log-rx"
              onClick={() => setFilter('rx')}
              className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold cursor-pointer transition-all ${
                filter === 'rx'
                  ? 'bg-cyan-500/10 text-emerald-400'
                  : 'text-slate-650 hover:text-slate-400'
              }`}
            >
              RX
            </button>
            <button
              id="filter-log-tx"
              onClick={() => setFilter('tx')}
              className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold cursor-pointer transition-all ${
                filter === 'tx'
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'text-slate-650 hover:text-slate-400'
              }`}
            >
              TX
            </button>
          </div>

          <button
            id="btn-clear-logs"
            onClick={onClearLogs}
            className="p-1 rounded hover:bg-rose-500/15 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
            title="Clean terminal buffer"
          >
            <Trash2 size={11} />
          </button>

          {/* Green active dot from the screenshot */}
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
        </div>
      </div>

      {/* Console log list window */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-black/25 rounded-lg p-3 font-mono text-[10px] leading-relaxed space-y-2 scrollbar-thin overflow-x-hidden min-h-[150px]"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-700 italic flex items-center justify-center h-full">
            Terminal kosong. Menunggu data paket MQTT...
          </div>
        ) : (
          filteredLogs.map((log) => {
            const timeStr = log.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            let badgeColor = 'text-cyan-400';
            let badgeText = 'INFO';
            
            if (log.type === 'rx') {
              badgeColor = 'text-cyan-400';
              badgeText = 'INFO';
            } else if (log.type === 'tx') {
              badgeColor = 'text-purple-400';
              badgeText = 'COMMAND';
            } else if (log.type === 'error') {
              badgeColor = 'text-rose-400 font-extrabold';
              badgeText = 'ERROR';
            } else if (log.type === 'success') {
              badgeColor = 'text-emerald-400 font-extrabold';
              badgeText = 'SUCCESS';
            }

            return (
              <div 
                key={log.id} 
                className="flex items-start gap-1 font-mono hover:bg-slate-900/10 py-0.5 rounded transition-all"
              >
                {/* Time string like [15:20:58] in slate-500 */}
                <span className="text-slate-500 select-none shrink-0 font-mono">
                  [{timeStr}]
                </span>

                {/* Badge text like [INFO] / [COMMAND] */}
                <span className={`${badgeColor} shrink-0 select-none font-mono font-bold`}>
                  [{badgeText}]
                </span>

                {/* Message text rendering */}
                <span className="text-slate-300 break-words flex-1 min-w-0 pl-1 font-mono leading-snug">
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Terminal footer note */}
      <div className="flex items-center justify-center text-[8px] font-mono text-slate-650/90 mt-3 shrink-0 uppercase tracking-widest border-t border-slate-800/40 pt-2">
        <span>REAL-TIME STREAM ACTIVE</span>
      </div>
    </div>
  );
}
