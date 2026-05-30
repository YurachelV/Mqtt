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
    <div id="variasi-panel" className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-lg backdrop-blur-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <FastForward size={16} className="text-cyan-400" />
            <span>Sequence Control (Variasi)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Siklus otomatis relay terprogram berkecepatan tinggi</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold px-2.5 py-1 rounded-md border bg-black/40 text-slate-400 border-cyan-900/30">
          STATUS: <span className={activeMode !== 0 ? "text-cyan-400 animate-pulse font-mono" : "text-slate-500 font-mono"}>
            {activeMode === 1 ? 'MODE 1 (MAJU)' : activeMode === 2 ? 'MODE 2 (MUNDUR)' : 'STOP'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Mode Selection Buttons */}
        <div className="flex flex-col justify-between gap-4">
          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Pola Sequence</span>
          
          <div className="grid grid-cols-3 gap-2">
            {/* Mode 1: Maju */}
            <button
              id="cmd-variasi-1"
              onClick={() => onSelectMode('1')}
              className={`py-3.5 px-3 rounded-lg text-xs font-bold uppercase cursor-pointer transition-all ${
                activeMode === 1
                  ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-450'
              }`}
            >
              Mode 1
            </button>

            {/* Mode 2: Mundur */}
            <button
              id="cmd-variasi-2"
              onClick={() => onSelectMode('2')}
              className={`py-3.5 px-3 rounded-lg text-xs font-bold uppercase cursor-pointer transition-all ${
                activeMode === 2
                  ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-450'
              }`}
            >
              Mode 2
            </button>

            {/* Mode STOP */}
            <button
              id="cmd-variasi-stop"
              onClick={() => onSelectMode('STOP')}
              className={`py-3.5 px-3 rounded-lg text-xs font-bold uppercase cursor-pointer transition-all ${
                activeMode === 0
                  ? 'bg-red-950/60 text-red-400 border border-red-500/30'
                  : 'bg-red-900/40 text-red-400 border border-red-500/50 hover:bg-red-900/50'
              }`}
            >
              Stop
            </button>
          </div>

          {/* Jeda Slider */}
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Variation Speed</span>
              <span className="text-cyan-400 font-bold font-mono px-2 py-0.5 rounded bg-black/40 border border-slate-800">
                {jedaMs} ms
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
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>Fast (50 ms)</span>
              <span>Slow (500 ms)</span>
            </div>
          </div>
        </div>

        {/* Right Side: Virtual Board Glow Sequencer */}
        <div className="flex flex-col bg-black/40 border border-slate-800 rounded-xl p-4 justify-between min-h-[160px]">
          <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-2">Virtual Light Sequencer Monitor</span>

          {/* Visual lights matrix */}
          <div className="grid grid-cols-4 gap-3 my-auto py-2">
            {[1, 2, 3, 4].map((num, i) => {
              const active = activeMode !== 0 && activeRelayIdx === i;
              return (
                <div key={num} className="flex flex-col items-center gap-2">
                  <div className="text-[9px] font-semibold text-slate-500 font-mono">CH{num}</div>
                  <div className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-150 ${
                    active
                      ? 'bg-[#050508] border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)] text-cyan-400'
                      : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}>
                    {active && (
                      <motion.div
                        layoutId="activeGlow"
                        className="absolute inset-0 rounded-full border border-cyan-400/30 filter opacity-40 pointer-events-none"
                      />
                    )}
                    <span className="font-mono text-xs font-bold">0{num}</span>
                  </div>
                  <span className={`text-[8px] font-mono uppercase tracking-widest ${active ? 'text-cyan-400 animate-pulse' : 'text-slate-600'}`}>
                    {active ? 'ON' : 'OFF'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-[9px] font-mono text-slate-600 text-center uppercase tracking-widest mt-2">
            {activeMode !== 0 
              ? 'Sequence Cycle Transmitting' 
              : 'IDLE STATUS BUFFER READY'
            }
          </div>
        </div>
      </div>
    </div>
  );
}
