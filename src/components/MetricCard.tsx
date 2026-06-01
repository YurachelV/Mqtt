/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Thermometer, Droplets, AlertTriangle } from 'lucide-react';

interface MetricProps {
  type: 'suhu' | 'kelembaban';
  value: number | null;
}

export default function MetricCard({ type, value }: MetricProps) {
  const isSuhu = type === 'suhu';
  const label = isSuhu ? 'Ambient Temperature' : 'Relative Humidity';
  const unit = isSuhu ? '°C' : '%';
  const Icon = isSuhu ? Thermometer : Droplets;
  
  // Safe default values
  const displayValue = value !== null ? Number(value.toFixed(1)) : null;
  
  // Custom styling colors based on values
  let barGradient = 'from-cyan-600 to-cyan-400';
  let textColor = 'text-cyan-400';
  let progressPercentage = 0;

  if (isSuhu) {
    if (value !== null) {
      progressPercentage = Math.min(Math.max((value / 50) * 100, 0), 100); // 0-50 deg scale
      if (value < 20) {
        barGradient = 'from-sky-600 to-sky-400';
        textColor = 'text-sky-400';
      } else if (value < 28) {
        barGradient = 'from-emerald-600 to-emerald-400';
        textColor = 'text-emerald-400';
      } else if (value < 35) {
        barGradient = 'from-amber-600 to-amber-400';
        textColor = 'text-amber-400';
      } else {
        barGradient = 'from-rose-600 to-rose-400';
        textColor = 'text-rose-400';
      }
    }
  } else {
    // Kelembaban
    if (value !== null) {
      progressPercentage = Math.min(Math.max(value, 0), 100); // 0-100% scale
      if (value < 40) {
        barGradient = 'from-orange-600 to-orange-400';
        textColor = 'text-orange-450';
      } else if (value < 70) {
        barGradient = 'from-cyan-600 to-cyan-400';
        textColor = 'text-cyan-400';
      } else {
        barGradient = 'from-blue-600 to-blue-400';
        textColor = 'text-blue-400';
      }
    }
  }

  return (
    <div 
      id={`metric-card-${type}`} 
      className="relative bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center space-y-1 overflow-hidden transition-all duration-300"
    >
      {/* Background icon decoration with lower opacity */}
      <div className="absolute top-0 right-0 p-3 opacity-5 text-slate-400">
        <Icon size={36} />
      </div>

      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{label}</p>
      
      <div className="flex items-baseline justify-center">
        {value !== null ? (
          <div className="text-3xl sm:text-4xl font-light text-white tracking-tight tabular-nums flex items-baseline">
            <span>{displayValue}</span>
            <span className="text-cyan-500 text-lg ml-0.5">{unit}</span>
          </div>
        ) : (
          <div className="text-xl font-light text-slate-600 tracking-wider animate-pulse flex items-center justify-center py-2">
            <AlertTriangle size={16} className="text-amber-500 mr-1.5" />
            <span className="text-[10px] uppercase tracking-widest font-mono font-bold">LURING</span>
          </div>
        )}
      </div>

      {/* Progress Bar Indicator from Immersive UI theme */}
      <div className="w-full h-1 bg-slate-800/80 rounded-full mt-2 overflow-hidden">
        {value !== null ? (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r ${barGradient} rounded-full`}
          />
        ) : (
          <div className="h-full bg-slate-800/20 rounded-full w-0" />
        )}
      </div>

      {/* Footer descriptor text */}
      <div className="w-full text-center pt-1 text-[9px] font-mono text-slate-500">
        {value !== null ? (
          <span>
            {isSuhu 
              ? value < 28 ? 'SUHU NORMAL' : 'TERLALU DEKAT AMBANG BATAS!'
              : value >= 40 && value <= 70 ? 'HUMIDITY OPTIMAL' : 'KELEMBABAN EKSTRIM'
            }
          </span>
        ) : (
          <span>MENETAPKAN KONEKSI MQTT...</span>
        )}
      </div>
    </div>
  );
}
