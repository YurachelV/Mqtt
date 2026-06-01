/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Lock } from 'lucide-react';
import { RelayState } from '../types';

interface RelayControlProps {
  relay: RelayState;
  onToggle: (id: number, newState: boolean) => void;
  variasiActive: boolean;
}

const RELAY_DETAILS: Record<number, { title: string; pin: string; idxString: string }> = {
  1: { title: 'Pompa Sirkulasi', pin: 'RELAY1_PIN_05', idxString: '01' },
  2: { title: 'Kipas Exhaust', pin: 'RELAY2_PIN_19', idxString: '02' },
  3: { title: 'Lampu Grow Light', pin: 'RELAY3_PIN_18', idxString: '03' },
  4: { title: 'Selenoide Mist', pin: 'RELAY4_PIN_23', idxString: '04' },
};

export default function RelayControl({ relay, onToggle, variasiActive }: RelayControlProps) {
  const { id, state } = relay;
  const info = RELAY_DETAILS[id] || { title: `Relay ${id}`, pin: `RELAY${id}_PIN`, idxString: `0${id}` };

  const handleCardClick = () => {
    if (!variasiActive) {
      onToggle(id, !state);
    }
  };

  return (
    <motion.button
      id={`relay-card-${id}`}
      whileHover={variasiActive ? {} : { scale: 1.01 }}
      whileTap={variasiActive ? {} : { scale: 0.99 }}
      onClick={handleCardClick}
      className={`w-full text-left rounded-xl p-4 flex flex-col justify-between min-h-[125px] transition-all duration-300 relative overflow-hidden border ${
        state
          ? 'bg-slate-900/60 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
          : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-750'
      } ${variasiActive ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {/* Upper row: Indicator circle & badge */}
      <div className="flex justify-between items-center w-full mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs transition-colors duration-300 ${
          state 
            ? 'bg-cyan-500 text-black' 
            : 'bg-slate-800 text-slate-400'
        }`}>
          {info.idxString}
        </div>
        
        <div className={`text-[9px] px-2 py-0.5 font-bold rounded uppercase tracking-wider transition-colors duration-300 ${
          state 
            ? 'bg-cyan-500 text-black' 
            : 'bg-slate-800 text-slate-550'
        }`}>
          {state ? 'ON' : 'OFF'}
        </div>
      </div>

      {/* Lower row: pin name and descriptive title */}
      <div className="mt-auto w-full">
        <p className={`text-[10px] font-mono tracking-wide transition-colors duration-300 ${
          state ? 'text-cyan-400' : 'text-slate-500'
        }`}>
          {info.pin}
        </p>
        <h2 className={`text-base font-bold tracking-tight mt-0.5 transition-colors duration-300 ${
          state ? 'text-white' : 'text-slate-400'
        }`}>
          {info.title}
        </h2>
      </div>

      {/* Security lockout overlay (variasi Active) */}
      {variasiActive && (
        <div className="absolute inset-0 bg-[#050508]/60 flex flex-col items-center justify-center gap-1 p-2 backdrop-blur-[1px]">
          <Lock size={14} className="text-amber-500 animate-pulse" />
          <span className="text-[9px] text-amber-500 font-extrabold tracking-widest uppercase">TERKUNCI</span>
        </div>
      )}
    </motion.button>
  );
}
