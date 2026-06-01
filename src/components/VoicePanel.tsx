/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
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
  const [hintIndex, setHintIndex] = useState(0);
  const [errorText, setErrorText] = useState('');
  
  const speechHelperRef = useRef<SpeechRecognitionHelper | null>(null);

  const hints = [
    'berapa suhu',
    'nyalakan kipas exhaust',
    'hidupkan semua relay',
    'buka kunci pengaman',
    'jalankan variasi satu'
  ];

  // Rotate hint phrases
  useEffect(() => {
    const hintTimer = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % hints.length);
    }, 4500);
    return () => clearInterval(hintTimer);
  }, []);

  // Initialize helper on client mount
  useEffect(() => {
    speechHelperRef.current = new SpeechRecognitionHelper({
      onStart: () => {
        setIsListening(true);
        setErrorText('');
      },
      onEnd: () => {
        setIsListening(false);
      },
      onResult: (text, isFinal) => {
        setTranscript(text);
        setIsFinalTranscript(isFinal);
      },
      onError: (event) => {
        console.error('Speech recognition error:', event);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorText('Izin mikrofon ditolak!');
        } else if (event.error !== 'no-speech') {
          setErrorText(`Error: ${event.error}`);
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

  const handleToggleListening = () => {
    if (!speechHelperRef.current) return;

    if (!speechHelperRef.current.isSupported()) {
      setErrorText('Browser tidak didukung.');
      return;
    }

    if (isListening) {
      speechHelperRef.current.stop();
    } else {
      speechHelperRef.current.start();
    }
  };

  const handleMatchedCommandAction = async (commandName: string, payload?: any) => {
    let speakMessage = '';

    switch (commandName) {
      case 'RELAY_SINGLE': {
        const { relayId, action } = payload;
        // Map relay ID to matches in Indonesian
        const relayNames: Record<number, string> = {
          1: 'Lampu Utama',
          2: 'Exhaust Fan',
          3: 'Irrigation Valve',
          4: 'Kunci Pengaman'
        };
        const rName = relayNames[relayId] || `relay ${relayId}`;
        speakMessage = `Baik, ${rName} telah ${action === 'ON' ? 'diaktifkan' : 'dinonaktifkan'}.`;
        onVoiceCommand('RELAY_SINGLE', { relayId, action });
        break;
      }
      
      case 'RELAY_ALL': {
        const { action } = payload;
        speakMessage = action === 'ON' 
          ? 'Siap, seluruh saklar sirkuit dinyalakan.'
          : 'Baik, seluruh saklar sirkuit dimatikan.';
        onVoiceCommand('RELAY_ALL', { action });
        break;
      }

      case 'VARIASI_MODE': {
        const { mode } = payload;
        if (mode === 'STOP') {
          speakMessage = 'Variasi otomatis dihentikan.';
        } else if (mode === '1') {
          speakMessage = 'Variasi satu dijalankan, arah maju.';
        } else {
          speakMessage = 'Variasi dua dijalankan, arah mundur.';
        }
        onVoiceCommand('VARIASI_MODE', { mode });
        break;
      }

      case 'GET_TEMPERATURE': {
        if (lastSuhu !== null) {
          speakMessage = `Suhu ruangan saat ini adalah ${lastSuhu.toFixed(1)} derajat Celcius.`;
        } else {
          speakMessage = 'Maaf, data suhu tidak terhubung.';
        }
        break;
      }

      case 'GET_HUMIDITY': {
        if (lastKelembaban !== null) {
          speakMessage = `Kelembaban udara bernilai ${lastKelembaban.toFixed(1)} persen.`;
        } else {
          speakMessage = 'Maaf, kelembaban tidak terhubung.';
        }
        break;
      }

      case 'GET_ALL_STATUS': {
        const statusStr = `Suhu ${lastSuhu !== null ? lastSuhu.toFixed(1) + ' derajat' : 'luring'} dan Kelembaban ${lastKelembaban !== null ? lastKelembaban.toFixed(1) + ' persen' : 'luring'}.`;
        speakMessage = `Laporan parameter lingkungan: ${statusStr}`;
        break;
      }

      case 'UNKNOWN': {
        const raw = payload?.text || '';
        speakMessage = `Maaf, saya tidak memahami perintah: "${raw}".`;
        break;
      }
      
      default:
        break;
    }

    if (speechEnabled && speakMessage) {
      await speakText(speakMessage);
    }
  };

  return (
    <div 
      id="voice-command-panel" 
      className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 w-full min-h-[290px]"
    >
      {/* Microphone glowing circle button */}
      <div className="relative w-24 h-24 flex items-center justify-center mb-4">
        {isListening && (
          <motion.div 
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
            className="absolute inset-0 bg-cyan-500/10 rounded-full"
          />
        )}
        {isListening && (
          <motion.div 
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            className="absolute inset-2 bg-cyan-500/15 rounded-full border border-cyan-500/20"
          />
        )}
        
        <button
          id="voice-mic-trigger"
          onClick={handleToggleListening}
          className={`relative z-10 w-16 h-16 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-300 ${
            isListening
              ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
              : 'bg-slate-800/80 hover:bg-slate-800 text-cyan-400 border-slate-700 hover:border-cyan-500/40'
          }`}
        >
          {isListening ? (
            <Mic size={24} className="animate-pulse" />
          ) : (
            <MicOff size={24} className="text-slate-400" />
          )}
        </button>
      </div>

      {/* Voice Assistant Identifier */}
      <h3 className="text-sm font-extrabold text-white tracking-widest uppercase">
        Voice Assistant
      </h3>

      {/* Spoken transcript or active hints */}
      <div className="mt-3.5 min-h-[36px] flex items-center justify-center max-w-xs font-mono text-xs text-slate-500">
        {isListening ? (
          transcript ? (
            <p className="text-cyan-400 italic">
              "{transcript}"{!isFinalTranscript && <span className="animate-pulse">...</span>}
            </p>
          ) : (
            <p className="text-emerald-400 animate-pulse font-sans">
              Mendengarkan... Katakan sesuatu
            </p>
          )
        ) : errorText ? (
          <p className="text-rose-450 text-[10px] font-sans font-bold uppercase">{errorText}</p>
        ) : (
          <p className="italic text-slate-400 opacity-90 transition-all">
            "{hints[hintIndex]}"
          </p>
        )}
      </div>

      {/* Bottom pagination/indicator dots matching the screen */}
      <div className="flex gap-1.5 justify-center items-center mt-6 shrink-0 shrink-0">
        {[0, 1, 2, 3].map((dot) => (
          <div 
            key={dot} 
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              isListening 
                ? 'bg-cyan-500 animate-pulse' 
                : dot === 0 
                  ? 'bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.5)]' 
                  : 'bg-slate-800'
            }`} 
          />
        ))}
      </div>
    </div>
  );
}
