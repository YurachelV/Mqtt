/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Terminal, HelpCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { SpeechRecognitionHelper, speakText } from '../utils/speech';

interface VoicePanelProps {
  lastSuhu: number | null;
  lastKelembaban: number | null;
  onVoiceCommand: (type: string, payload?: any) => void;
}

export default function VoicePanel({ lastSuhu, lastKelembaban, onVoiceCommand }: VoicePanelProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isFinalTranscript, setIsFinalTranscript] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [voiceLogs, setVoiceLogs] = useState<{ id: string; msg: string; actor: 'user' | 'system' | 'err'; time: string }[]>([]);
  const [errorText, setErrorText] = useState('');
  
  const speechHelperRef = useRef<SpeechRecognitionHelper | null>(null);

  // Initialize helper on client mount
  useEffect(() => {
    speechHelperRef.current = new SpeechRecognitionHelper({
      onStart: () => {
        setIsListening(true);
        setErrorText('');
        addVoiceLog('Sistem mendengarkan...', 'system');
      },
      onEnd: () => {
        setIsListening(false);
      },
      onResult: (text, isFinal) => {
        setTranscript(text);
        setIsFinalTranscript(isFinal);
        if (isFinal) {
          addVoiceLog(text, 'user');
        }
      },
      onError: (event) => {
        console.error('Speech recognition error:', event);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorText('Izin mikrofon ditolak! Izinkan di browser Anda.');
          addVoiceLog('Gagal mengakses mikrofon (Izin ditolak)', 'err');
        } else if (event.error === 'no-speech') {
          // Silent error handling
        } else {
          setErrorText(`Error: ${event.error}`);
          addVoiceLog(`Error mikrofon: ${event.error}`, 'err');
        }
      },
      onCommandMatched: (commandName, payload) => {
        handleMatchedCommandAction(commandName, payload);
      }
    });

    return () => {
      if (speechHelperRef.current) {
        speechHelperRef.current.stop();
      }
    };
  }, [lastSuhu, lastKelembaban]);

  const addVoiceLog = (msg: string, actor: 'user' | 'system' | 'err') => {
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setVoiceLogs((prev) => [
      { id: Math.random().toString(), msg, actor, time },
      ...prev.slice(0, 19), // Keep last 20 lines
    ]);
  };

  const handleToggleListening = () => {
    if (!speechHelperRef.current) return;

    if (!speechHelperRef.current.isSupported()) {
      setErrorText('Browser Anda tidak mendukung Web Speech API (Gunakan Chrome / Edge).');
      return;
    }

    if (isListening) {
      speechHelperRef.current.stop();
      addVoiceLog('Sistem dihentikan.', 'system');
    } else {
      speechHelperRef.current.start();
    }
  };

  const handleMatchedCommandAction = async (commandName: string, payload?: any) => {
    let speakMessage = '';

    switch (commandName) {
      case 'RELAY_SINGLE': {
        const { relayId, action } = payload;
        speakMessage = `Baik, relay ${relayId} telah ${action === 'ON' ? 'saya aktifkan' : 'saya nonaktifkan'}.`;
        onVoiceCommand('RELAY_SINGLE', { relayId, action });
        addVoiceLog(`EXECUTING: RELAY_${relayId}:${action}`, 'system');
        break;
      }
      
      case 'RELAY_ALL': {
        const { action } = payload;
        speakMessage = action === 'ON' 
          ? 'Siap, seluruh relay telah dinyalakan secara bersamaan.'
          : 'Baik, seluruh relay kini telah kumatikan.';
        onVoiceCommand('RELAY_ALL', { action });
        addVoiceLog(`EXECUTING: ALL_RELAYS:${action}`, 'system');
        break;
      }

      case 'VARIASI_MODE': {
        const { mode } = payload;
        if (mode === 'STOP') {
          speakMessage = 'Baik, variasi otomatis kumatikan. Kontrol manual kembali dibuka.';
        } else if (mode === '1') {
          speakMessage = 'Mulai memutarkan variasi relay satu, berjalan maju berurutan.';
        } else {
          speakMessage = 'Mulai memutarkan variasi relay dua, berjalan mundur terbalik.';
        }
        onVoiceCommand('VARIASI_MODE', { mode });
        addVoiceLog(`EXECUTING: VARIATION_MODE:${mode}`, 'system');
        break;
      }

      case 'GET_TEMPERATURE': {
        if (lastSuhu !== null) {
          speakMessage = `Suhu lingkungan saat ini tercatat ${Number(lastSuhu.toFixed(1))} derajat Celcius.`;
        } else {
          speakMessage = 'Maaf, data pembacaan sensor suhu belum diterima dari unit ESP Tiga Dua.';
        }
        addVoiceLog(`STATUS: Temp is ${lastSuhu !== null ? lastSuhu.toFixed(1) + '°C' : 'ERR'}`, 'system');
        break;
      }

      case 'GET_HUMIDITY': {
        if (lastKelembaban !== null) {
          speakMessage = `Kelembaban udara sekitar saat ini bernilai ${Number(lastKelembaban.toFixed(1))} persen.`;
        } else {
          speakMessage = 'Maaf, data kelembaban dari DHT sebelas belum diperbarui.';
        }
        addVoiceLog(`STATUS: Humid is ${lastKelembaban !== null ? lastKelembaban.toFixed(1) + '%' : 'ERR'}`, 'system');
        break;
      }

      case 'GET_ALL_STATUS': {
        const statusStr = `Suhu ${lastSuhu !== null ? lastSuhu.toFixed(1) : 'Offline'} dan Kelembaban ${lastKelembaban !== null ? lastKelembaban.toFixed(1) : 'Offline'}.`;
        speakMessage = `Laporan status IoT: ${statusStr}.`;
        addVoiceLog(`STATUS: Comprehensive status dispatched`, 'system');
        break;
      }

      case 'UNKNOWN': {
        const raw = payload?.text || '';
        speakMessage = `Maaf, saya mendengar: "${raw}", namun instruksi tersebut tidak dipahami.`;
        addVoiceLog(`UNKNOWN: "${raw}"`, 'system');
        break;
      }
      
      default:
        break;
    }

    if (speechEnabled && speakMessage) {
      await speakText(speakMessage);
    }
  };

  const supportedCommands = [
    { cmd: 'Hidupkan Relay 1', desc: 'R1 ON' },
    { cmd: 'Matikan Relay 3', desc: 'R3 OFF' },
    { cmd: 'Hidupkan semua relay', desc: 'R1-R4 ON' },
    { cmd: 'Mulai variasi satu', desc: 'Maju' },
    { cmd: 'Mulai variasi dua', desc: 'Mundur' },
    { cmd: 'Hentikan variasi', desc: 'Stop' },
    { cmd: 'Berapa suhunya?', desc: 'Suhu DHT' },
  ];

  return (
    <div id="voice-command-panel" className="bg-cyan-950/10 border border-cyan-900/25 rounded-xl p-4 flex flex-col transition-all duration-300">
      {/* Header section with pulsating cyber dot */}
      <div className="flex items-center justify-between mb-3 border-b border-cyan-900/15 pb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <div className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
          </div>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Voice Command Engine</h3>
            <p className="text-[8px] text-slate-550 font-mono tracking-wider">ESP32_SPEECH_01X</p>
          </div>
        </div>

        <button
          id="voice-sound-toggle"
          onClick={() => setSpeechEnabled(!speechEnabled)}
          className={`h-6 px-2 rounded text-[8px] uppercase font-mono font-bold tracking-wider border cursor-pointer select-none transition-all ${
            speechEnabled
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              : 'bg-slate-900 text-slate-600 border-slate-800'
          }`}
          title={speechEnabled ? "Audible feedback is on" : "Muted"}
        >
          TTS: {speechEnabled ? 'ACTIVE' : 'MUTED'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Core trigger block */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center bg-black/40 border border-slate-800/80 rounded-xl p-3 text-center relative overflow-hidden">
          <div className="relative w-16 h-16 flex items-center justify-center my-1">
            {isListening && (
              <>
                <div className="absolute inset-x-0 bg-cyan-500/10 rounded-full animate-ping" />
                <div className="absolute inset-y-0 bg-cyan-500/15 rounded-full animate-pulse" />
              </>
            )}
            
            <button
              id="voice-mic-trigger"
              onClick={handleToggleListening}
              className={`relative z-10 w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-300 ${
                isListening
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              {isListening ? <Mic size={16} className="animate-pulse" /> : <MicOff size={16} />}
            </button>
          </div>

          <span className={`text-[8px] uppercase font-mono font-bold tracking-widest ${isListening ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`}>
            {isListening ? 'REC STREAM' : 'TRIGGER MIC'}
          </span>

          {errorText && (
            <div className="mt-1.5 p-1.5 bg-rose-500/10 border border-rose-500/20 rounded text-[8px] text-rose-400 flex gap-1 items-start text-left font-mono">
              <Info size={10} className="shrink-0 mt-0.5" />
              <span>{errorText}</span>
            </div>
          )}
        </div>

        {/* Black interactive logs terminal matches "listening..." in design HTML */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="flex-1 bg-black/40 rounded-xl p-3 font-mono text-[10px] text-slate-400 min-h-[90px] flex flex-col justify-between border border-slate-800/80">
            <div className="space-y-1 overflow-hidden flex-1 scrollbar-thin">
              {isListening ? (
                <p className="text-emerald-400 italic font-sans mb-1 animate-pulse flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                  Mendengarkan...
                </p>
              ) : (
                <p className="text-slate-650 italic font-sans mb-1 text-[9px]">Klik mikrofon di samping lalu bicaralah</p>
              )}

              {transcript && (
                <p className="text-white opacity-90 font-medium">
                  &gt; "{transcript}" {!isFinalTranscript && <span className="text-cyan-500 animate-pulse">...</span>}
                </p>
              )}

              {/* Reverse order of logs for modern downward-flowing log feel */}
              {voiceLogs.filter(log => log.msg !== transcript).slice(0, 2).reverse().map((log) => (
                <p key={log.id} className={
                  log.actor === 'err' 
                    ? 'text-rose-400' 
                    : log.actor === 'system' 
                      ? 'text-cyan-400 font-semibold text-[9px]' 
                      : 'opacity-50 text-[9px]'
                }>
                  &gt; {log.msg}
                </p>
              ))}
            </div>

            <div className="border-t border-slate-900 mt-1.5 pt-1.5 flex items-center justify-between text-[8px] text-slate-600 uppercase tracking-widest">
              <span>VOICE STREAM STATUS: OK</span>
              <span>AUDIO BUFFER</span>
            </div>
          </div>

          {/* Quick reference guide of command structures */}
          <div className="bg-black/20 border border-slate-850/50 rounded-xl p-2.5">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-1.5">
              <HelpCircle size={10} className="text-cyan-500" />
              <span>Contoh Perintah Suara</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[8.5px]">
              {supportedCommands.slice(0, 4).map((item, i) => (
                <div key={i} className="px-1.5 py-0.5 border border-slate-800 bg-black/20 rounded font-mono text-slate-450 text-center hover:border-cyan-850 transition-colors truncate" title={item.cmd}>
                  "{item.cmd}"
                </div>
              ))}
              {/* Fallback to fill layout */}
              <div className="px-1.5 py-0.5 border border-slate-800 bg-black/20 rounded font-mono text-slate-450 text-center truncate">
                "Suhu dht"
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
