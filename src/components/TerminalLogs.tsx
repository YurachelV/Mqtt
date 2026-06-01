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
    <div id="terminal-logs-panel" className={`bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm flex flex-col h-[340px] max-h-[340px] min-h-[340px] overflow-hidden transition-all duration-300 ${className || ''}`}>
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
            className="p-0.5 px-1.5 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all cursor-pointer border border-transparent hover:border-rose-500/20"
            title="Clean terminal buffer"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Console log list window */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-black/40 border border-slate-800/80 rounded-xl p-2.5 font-mono text-[10px] space-y-1.5 scrollbar-thin overflow-x-hidden min-h-[100px]"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-700 italic flex items-center justify-center h-full">
            Terminal kosong. Menunggu data paket MQTT...
          </div>
        ) : (
          filteredLogs.map((log) => {
            const timeStr = log.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            let colorClass = 'text-slate-300';
            let iconText = 'SYS';
            
            if (log.type === 'rx') {
              colorClass = 'text-emerald-300';
              iconText = 'RX';
            } else if (log.type === 'tx') {
              colorClass = 'text-cyan-300';
              iconText = 'TX';
            } else if (log.type === 'error') {
              colorClass = 'text-rose-400 font-semibold';
              iconText = 'ERR';
            } else if (log.type === 'success') {
              colorClass = 'text-teal-300 font-bold';
              iconText = 'OK';
            }

            return (
              <div 
                key={log.id} 
                className="flex items-start md:items-center justify-between gap-2.5 leading-relaxed hover:bg-slate-900/30 p-1 md:p-0.5 rounded transition-all border-b border-slate-800/10 last:border-0"
              >
                {/* Meta details with static spacing for gorgeous alignment */}
                <div className="flex items-center gap-2 shrink-0 select-none">
                  <span className="text-slate-600 font-mono text-[9px] min-w-[50px]">
                    {timeStr}
                  </span>
                  
                  {/* Mode badge */}
                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold font-mono tracking-wider shrink-0 uppercase border transition-all ${
                    log.type === 'rx' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    log.type === 'tx' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                    log.type === 'error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    log.type === 'success' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                    'bg-slate-800/40 text-slate-500 border-slate-700/25'
                  }`}>
                    {iconText}
                  </span>
                </div>

                {/* Topic if exists */}
                {log.topic ? (
                  <span className="text-[9px] font-mono font-bold text-cyan-400/90 bg-cyan-950/20 border border-cyan-800/15 px-1.5 py-0.2 rounded truncate max-w-[140px] shrink-0">
                    {log.topic}
                  </span>
                ) : (
                  <div className="w-[4px] h-[1px] bg-slate-800 shrink-0 select-none" />
                )}

                {/* Message payload content with smart word-level formatting */}
                <span className={`font-mono text-[10.5px] break-words flex-1 min-w-0 pr-1 select-text ${colorClass}`}>
                  {log.message}
                </span>
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
