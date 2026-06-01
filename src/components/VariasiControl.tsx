/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, ArrowLeftRight, Ban } from 'lucide-react';
import { motion } from 'motion/react';

interface VariasiControlProps {
  activeMode: number; // 0=off, 1=maju, 2=mundur
  jedaMs: number; // 50 - 500 ms
  onSelectMode: (mode: '1' | '2' | 'STOP') => void;
  onSelectJeda: (jeda: number) => void;
}

export default function VariasiControl({
  activeMode,
  jedaMs,
  onSelectMode,
  onSelectJeda,
}: VariasiControlProps) {
  return (
    <div 
      id="variasi-panel" 
      className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-sm transition-all duration-300 flex flex-col gap-4 w-full"
    >
      {/* Header Label */}
      <span className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase block shrink-0">
        SEQUENCE CONTROL
      </span>

      {/* Emergency Stop Button (top of sequence panel) */}
      <motion.button
        id="cmd-variasi-stop"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onSelectMode('STOP')}
        className={`w-full py-3 px-4 rounded-xl font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer border transition-all duration-300 ${
          activeMode === 0
            ? 'bg-rose-950/15 text-rose-500 border-rose-900/40 opacity-50'
            : 'bg-rose-600 border-rose-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.25)]'
        }`}
      >
        <Ban size={14} className={activeMode !== 0 ? 'animate-pulse' : ''} />
        <span>EMERGENCY STOP</span>
      </motion.button>

      {/* Vertical Stack of Variasi 1 and 2 Actions */}
      <div className="flex flex-col gap-3">
        {/* VARIASI 1 Card Button */}
        <motion.button
          id="cmd-variasi-1"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onSelectMode('1')}
          className={`w-full text-left rounded-xl p-3.5 flex items-center gap-4 transition-all duration-300 border cursor-pointer ${
            activeMode === 1
              ? 'bg-[#0b1424]/80 border-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-white'
              : 'bg-[#080911]/90 border-slate-800 text-slate-450 hover:border-slate-700'
          }`}
        >
          {/* Circular Play Icon Badge Left */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
            activeMode === 1
              ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]'
              : 'bg-slate-800 text-slate-400'
          }`}>
            <Play size={14} fill={activeMode === 1 ? 'currentColor' : 'none'} className={activeMode === 1 ? 'animate-pulse' : ''} />
          </div>

          <div className="flex flex-col min-w-0">
            <span className={`text-[13px] font-extrabold tracking-wide ${activeMode === 1 ? 'text-cyan-400' : 'text-slate-200'}`}>
              VARIASI 1
            </span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
              LOOP 1 → 2 → 3 → 4
            </span>
          </div>
        </motion.button>

        {/* VARIASI 2 Card Button */}
        <motion.button
          id="cmd-variasi-2"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onSelectMode('2')}
          className={`w-full text-left rounded-xl p-3.5 flex items-center gap-4 transition-all duration-300 border cursor-pointer ${
            activeMode === 2
              ? 'bg-[#150e26]/80 border-purple-500/80 shadow-[0_0_12px_rgba(168,85,247,0.15)] text-white'
              : 'bg-[#080911]/90 border-slate-800 text-slate-450 hover:border-slate-700'
          }`}
        >
          {/* Circular Icon Badge Left */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
            activeMode === 2
              ? 'bg-purple-500 text-white shadow-[0_0_8px_rgba(168,85,247,0.4)]'
              : 'bg-slate-800 text-slate-400'
          }`}>
            <ArrowLeftRight size={14} className={activeMode === 2 ? 'animate-pulse' : ''} />
          </div>

          <div className="flex flex-col min-w-0">
            <span className={`text-[13px] font-extrabold tracking-wide ${activeMode === 2 ? 'text-purple-400' : 'text-slate-200'}`}>
              VARIASI 2
            </span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
              LOOP 4 → 3 → 2 → 1
            </span>
          </div>
        </motion.button>
      </div>

      {/* Delay Interval Block */}
      <div className="bg-[#080911]/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-slate-500 font-extrabold tracking-wider uppercase">
            DELAY INTERVAL
          </span>
          <span className="text-cyan-400 font-extrabold font-mono text-[11px] px-2.5 py-1 rounded bg-slate-900 border border-slate-800 shrink-0">
            {jedaMs}ms
          </span>
        </div>
        
        <input
          id="variasi-jeda-slider"
          type="range"
          min="50"
          max="500"
          step="10"
          value={jedaMs}
          onChange={(e) => onSelectJeda(Number(e.target.value))}
          className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
        />

        <div className="flex justify-between text-[8px] text-slate-600 font-mono">
          <span>FAST (50ms)</span>
          <span>SLOW (500ms)</span>
        </div>
      </div>
    </div>
  );
}
