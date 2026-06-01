/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Square, FastForward, ArrowRight, ArrowLeft } from 'lucide-react';
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
  const [simulatedStep, setSimulatedStep] = useState(0);

  // Client-side visual sequencer loop to mock the ESP32 relay switching rhythm
  useEffect(() => {
    if (activeMode === 0) {
      setSimulatedStep(0);
      return;
    }

    const interval = setInterval(() => {
      setSimulatedStep((prev) => (prev + 1) % 4);
    }, jedaMs);

    return () => clearInterval(interval);
  }, [activeMode, jedaMs]);

  // Which relay is ON based on mode and step
  const getActiveRelayIndex = () => {
    if (activeMode === 0) return -1;
    return activeMode === 1 ? simulatedStep : 3 - simulatedStep;
  };

  const activeRelayIdx = getActiveRelayIndex();

  return (
    <div id="variasi-panel" className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-sm transition-all duration-300 flex flex-col justify-between h-full min-h-[220px]">
      <div className="flex items-center justify-between mb-4 border-b border-cyan-900/10 pb-2 shrink-0">
        <div>
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 animate-pulse-slow">
            <FastForward size={14} className="text-cyan-400" />
            <span>Sequence Control (Variasi)</span>
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Siklus otomatis relay terprogram berkecepatan tinggi</p>
        </div>
        <div className="flex items-center gap-1 text-[9px] uppercase font-bold px-2 py-0.5 rounded border bg-black/40 text-slate-400 border-cyan-900/30">
          STATUS: <span className={activeMode !== 0 ? "text-cyan-400 animate-pulse font-mono" : "text-slate-500 font-mono"}>
            {activeMode === 1 ? 'MODE 1' : activeMode === 2 ? 'MODE 2' : 'STOP'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 items-stretch">
        {/* Left Side: Mode Selection Buttons & Interval Slider */}
        <div className="flex flex-col justify-center gap-6 py-2">
          <div>
            <span className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase mb-2.5 block">Pola Sequence</span>
            <div className="grid grid-cols-3 gap-2">
              {/* Mode 1: Maju */}
              <button
                id="cmd-variasi-1"
                onClick={() => onSelectMode('1')}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer transition-all text-center whitespace-nowrap border ${
                  activeMode === 1
                    ? 'bg-cyan-600 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700/50 hover:border-slate-600'
                }`}
              >
                Maju (M1)
              </button>

              {/* Mode 2: Mundur */}
              <button
                id="cmd-variasi-2"
                onClick={() => onSelectMode('2')}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer transition-all text-center whitespace-nowrap border ${
                  activeMode === 2
                    ? 'bg-cyan-600 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700/50 hover:border-slate-600'
                }`}
              >
                Mundur (M2)
              </button>

              {/* Mode STOP */}
              <button
                id="cmd-variasi-stop"
                onClick={() => onSelectMode('STOP')}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold uppercase cursor-pointer transition-all text-center whitespace-nowrap border ${
                  activeMode === 0
                    ? 'bg-rose-950/40 text-rose-400 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
                    : 'bg-red-950/15 text-red-400 border-red-900/30 hover:bg-red-950/30 hover:border-red-800/40'
                }`}
              >
                Stop
              </button>
            </div>
          </div>

          {/* Jeda Slider */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Interval Jeda</span>
              <span className="text-cyan-400 font-bold font-mono px-2 py-0.5 rounded bg-black/40 border border-slate-800">
                {jedaMs} ms
              </span>
            </div>
            
            <div className="px-0.5">
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
            </div>
            <div className="flex justify-between text-[8px] text-slate-500 font-mono">
              <span>Cepat (50ms)</span>
              <span>Lambat (500ms)</span>
            </div>
          </div>
        </div>

        {/* Right Side: Virtual Board Glow Sequencer */}
        <div className="bg-black/30 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-center gap-4">
          <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left">
            <span className="text-[9px] font-extrabold text-slate-500 tracking-wider uppercase">Visual Monitor Sequencer</span>
            <div className="text-[9px] font-mono text-cyan-500/85">
              {activeMode === 1 ? (
                <span className="flex items-center gap-1">Arah Arus: 1 <ArrowRight size={10} className="inline animate-pulse" /> 2 <ArrowRight size={10} className="inline animate-pulse" /> 3 <ArrowRight size={10} className="inline animate-pulse" /> 4</span>
              ) : activeMode === 2 ? (
                <span className="flex items-center gap-1">Arah Arus: 1 <ArrowLeft size={10} className="inline animate-pulse" /> 2 <ArrowLeft size={10} className="inline animate-pulse" /> 3 <ArrowLeft size={10} className="inline animate-pulse" /> 4</span>
              ) : (
                <span className="text-slate-600">Semua channel siaga (Standby)</span>
              )}
            </div>
          </div>

          {/* Visual lights matrix */}
          <div className="grid grid-cols-4 gap-2.5 py-1">
            {[1, 2, 3, 4].map((num, i) => {
              const active = activeMode !== 0 && activeRelayIdx === i;
              return (
                <div key={num} className="flex flex-col items-center gap-2">
                  <div className="text-[8px] font-semibold text-slate-500 font-mono">CH-0{num}</div>
                  <div className={`relative w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center border transition-all duration-150 ${
                    active
                      ? 'bg-cyan-950/20 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6),inset_0_0_8px_rgba(6,182,212,0.2)] text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-650'
                  }`}>
                    {active && (
                      <motion.div
                        layoutId="activeGlow"
                        className="absolute inset-0 rounded-full border border-cyan-400/30 filter opacity-55 pointer-events-none"
                      />
                    )}
                    <span className="font-mono text-[11px] md:text-[12px] font-extrabold">0{num}</span>
                  </div>
                  <span className={`text-[7px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    active 
                      ? 'text-cyan-400 font-extrabold bg-cyan-950/30 border border-cyan-500/20' 
                      : 'text-slate-600 bg-slate-950/20 border border-transparent'
                  }`}>
                    {active ? 'ON' : 'OFF'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-[8px] font-mono text-slate-600 text-center uppercase tracking-widest pt-1 border-t border-slate-800/30">
            {activeMode !== 0 
              ? '● TRANSMITTING MATRIX PACKET' 
              : 'IDLE BUFFER READY'
            }
          </div>
        </div>
      </div>
    </div>
  );
}
