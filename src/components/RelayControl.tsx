/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { RelayState } from '../types';

interface RelayControlProps {
  relay: RelayState;
  onToggle: (id: number, newState: boolean) => void;
  variasiActive: boolean;
  className?: string;
}

const RELAY_DETAILS: Record<number, { title: string; badge: string }> = {
  1: { title: 'Lampu 1', badge: 'R1' },
  2: { title: 'Lampu 2', badge: 'R2' },
  3: { title: 'Lampu 3', badge: 'R3' },
  4: { title: 'Lampu 4', badge: 'R4' },
};

export default function RelayControl({ relay, onToggle, variasiActive, className }: RelayControlProps) {
  const { id, state } = relay;
  const info = RELAY_DETAILS[id] || { title: `Relay ${id}`, badge: `R${id}` };

  const handleCardClick = () => {
    if (!variasiActive) {
      onToggle(id, !state);
    }
  };

  return (
    <motion.button
      id={`relay-card-${id}`}
      whileHover={variasiActive ? {} : { scale: 1.01 }}
      whileTap={variasiActive ? {} : { scale: 0.98 }}
      onClick={handleCardClick}
      className={`w-full text-left rounded-2xl p-4 flex flex-col justify-between h-[120px] lg:h-[120px] min-h-[120px] transition-all duration-300 relative overflow-hidden border ${
        state
          ? 'bg-[#090e1b]/70 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
          : 'bg-[#080a13]/80 border-slate-800 hover:border-slate-700'
      } ${variasiActive ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${className || ''}`}
    >
      {/* Top Row: R-Badge and Pill Switch */}
      <div className="flex justify-between items-center w-full shrink-0">
        <div className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-mono text-xs font-bold shrink-0">
          {info.badge}
        </div>
        
        {/* Custom modern toggle switch */}
        <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
          state ? 'bg-cyan-500/80' : 'bg-slate-800'
        }`}>
          <div className={`w-3.5 h-3.5 rounded-full bg-white transition-all transform duration-200 ${
            state ? 'translate-x-3.5' : 'translate-x-0'
          }`} />
        </div>
      </div>

      {/* Title & Status Indicator Container */}
      <div className="mt-auto w-full">
        <h2 className="text-[15px] font-extrabold tracking-tight text-white leading-snug">
          {info.title}
        </h2>
        <span className={`text-[9px] font-extrabold uppercase tracking-wider block mt-1.5 ${
          state ? 'text-cyan-400' : 'text-slate-500'
        }`}>
          STATUS: {state ? 'on' : 'off'}
        </span>
      </div>

      {/* Security lockout overlay (when variation mode is running on sequence) */}
      {variasiActive && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 p-2 backdrop-blur-[1px]">
          <Lock size={14} className="text-amber-500 animate-pulse" />
          <span className="text-[9px] text-amber-500 font-extrabold tracking-widest uppercase">TERKUNCI</span>
        </div>
      )}
    </motion.button>
  );
}
