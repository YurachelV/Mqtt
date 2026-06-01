/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Thermometer, Droplets, AlertTriangle } from 'lucide-react';

interface MetricProps {
  suhu: number | null;
  kelembaban: number | null;
  className?: string;
}

export default function MetricCard({ suhu, kelembaban, className }: MetricProps) {
  const isSuhuOffline = suhu === null;
  const isKelembabanOffline = kelembaban === null;

  return (
    <div 
      id="environment-metrics-card" 
      className={`bg-slate-900/40 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-sm transition-all duration-300 flex flex-col justify-between w-full ${className || ''}`}
    >
      {/* Card Header Label */}
      <span className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase block shrink-0">
        ENVIRONMENT METRICS
      </span>

      {/* Temperature Segment */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/60">
        <div className="flex flex-col">
          <div className="flex items-baseline">
            {!isSuhuOffline ? (
              <>
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight tabular-nums">
                  {suhu.toFixed(1)}
                </span>
                <span className="text-orange-400 text-lg sm:text-xl font-bold ml-1">°C</span>
              </>
            ) : (
              <div className="flex items-center gap-1.5 py-1 text-slate-600">
                <AlertTriangle size={14} className="text-amber-500/80" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">LURING</span>
              </div>
            )}
          </div>
          <span className="text-[9px] text-slate-500 font-extrabold tracking-wider uppercase mt-1">
            TEMPERATURE
          </span>
        </div>

        {/* Circular thermo display and light glow ring */}
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
          !isSuhuOffline 
            ? 'bg-orange-950/20 border border-orange-500/35 shadow-[0_0_12px_rgba(249,115,22,0.15)] text-orange-400' 
            : 'bg-slate-950/40 border border-slate-800/60 text-slate-600'
        }`}>
          <Thermometer size={18} className={!isSuhuOffline ? 'animate-pulse' : ''} />
        </div>
      </div>

      {/* Humidity Segment */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex flex-col">
          <div className="flex items-baseline">
            {!isKelembabanOffline ? (
              <>
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight tabular-nums">
                  {kelembaban.toFixed(1)}
                </span>
                <span className="text-cyan-400 text-lg sm:text-xl font-bold ml-1">%</span>
              </>
            ) : (
              <div className="flex items-center gap-1.5 py-1 text-slate-600">
                <AlertTriangle size={14} className="text-amber-500/80" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">LURING</span>
              </div>
            )}
          </div>
          <span className="text-[9px] text-slate-550 font-extrabold tracking-wider uppercase mt-1">
            HUMIDITY
          </span>
        </div>

        {/* Circular droplet display and light glow ring */}
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
          !isKelembabanOffline 
            ? 'bg-cyan-950/20 border border-cyan-500/35 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-cyan-400' 
            : 'bg-slate-950/40 border border-slate-800/60 text-slate-600'
        }`}>
          <Droplets size={18} className={!isKelembabanOffline ? 'animate-pulse' : ''} />
        </div>
      </div>
    </div>
  );
}
