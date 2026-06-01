/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Safe client-side type-casting for SpeechRecognition APIs
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export interface SpeechRecognitionHelperConfig {
  onResult: (text: string, isFinal: boolean) => void;
  onCommandMatched: (commandName: string, payload?: any) => void;
  onEnd: () => void;
  onError: (errorEvent: any) => void;
  onStart: () => void;
}

export class SpeechRecognitionHelper {
  private recognition: any = null;
  private config: SpeechRecognitionHelperConfig;
  private isListening: boolean = false;

  constructor(config: SpeechRecognitionHelperConfig) {
    this.config = config;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'id-ID'; // Set language to Indonesian

      this.recognition.onstart = () => {
        this.isListening = true;
        this.config.onStart();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const combined = finalTranscript || interimTranscript;
        this.config.onResult(combined, !!finalTranscript);

        if (finalTranscript) {
          this.matchCommand(finalTranscript.toLowerCase().trim());
        }
      };

      this.recognition.onerror = (event: any) => {
        this.config.onError(event);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.config.onEnd();
      };
    }
  }

  public start() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
      }
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Failed to stop speech recognition:', e);
      }
    }
  }

  public getIsListening() {
    return this.isListening;
  }

  public isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  private matchCommand(rawText: string) {
    console.log('[VoiceMatch] Raw command text:', rawText);
    const text = rawText.replace(/[.,?/#!$%^&*;:{}=\-_`~()]/g, "").trim();

    // 1. Check relay specific ON/OFF commands
    // Match "relay 1 nyala", "hidupkan relay 1", "turn on relay 1", "nyalakan relay 1", "aktifkan relay 1", "relay 1 hidup"
    const relayMatch = text.match(/(hidupkan|matikan|nyalakan|aktifkan|matikan|matikanlah|nyalakanlah|hidupkanlah|nonaktifkan|non-aktifkan|buka|tutup)\s+(?:relay|lampu|r)\s*([1-4])/i) ||
                       text.match(/(?:relay|lampu|r)\s*([1-4])\s*(hidup|nyala|mati)/i);
    
    if (relayMatch) {
      let action: 'ON' | 'OFF' = 'ON';
      let relayId = 0;

      if (relayMatch[1] && relayMatch[2]) {
        // e.g. "hidupkan relay 1"
        const cmdWord = relayMatch[1].toLowerCase();
        relayId = parseInt(relayMatch[2]);
        if (cmdWord.startsWith('mati') || cmdWord.startsWith('non') || cmdWord === 'tutup') {
          action = 'OFF';
        }
      } else if (relayMatch[1] && relayMatch[2] === undefined) {
        // Fallback or inverse matching where index positions might differ
      } else {
        // e.g. "relay 1 nyala"
        relayId = parseInt(relayMatch[1]);
        const stateWord = relayMatch[2].toLowerCase();
        if (stateWord === 'mati') {
          action = 'OFF';
        }
      }

      if (relayId >= 1 && relayId <= 4) {
        this.config.onCommandMatched('RELAY_SINGLE', { relayId, action });
        return;
      }
    }

    // 2. Control all relays
    if (text.includes('hidupkan semua relay') || text.includes('nyalakan semua relay') || text.includes('aktifkan semua relay') || text.includes('semua relay hidup') || text.includes('semua relay nyala')) {
      this.config.onCommandMatched('RELAY_ALL', { action: 'ON' });
      return;
    }
    if (text.includes('matikan semua relay') || text.includes('nonaktifkan semua relay') || text.includes('semua relay mati') || text.includes('semua relay nonaktif')) {
      this.config.onCommandMatched('RELAY_ALL', { action: 'OFF' });
      return;
    }

    // 3. Variation Commands
    // "stop variasi" or "hentikan variasi" or "matikan variasi 1/2"
    if (
      text.includes('stop variasi') || 
      text.includes('hentikan variasi') || 
      text.includes('matikan variasi') || 
      text.includes('semua variasi stop') || 
      text.includes('variasi stop') || 
      text.includes('matikan variasi 1') || 
      text.includes('matikan variasi 2') || 
      text.includes('matikan variasi satu') || 
      text.includes('matikan variasi dua')
    ) {
      this.config.onCommandMatched('VARIASI_MODE', { mode: 'STOP' });
      return;
    }
    // "mulai variasi satu" or "mulai variasi maju" or "variasi satu"
    if (text.includes('variasi satu') || text.includes('variasi 1') || text.includes('variasi maju') || text.includes('mulai variasi satu') || text.includes('mulai variasi 1')) {
      this.config.onCommandMatched('VARIASI_MODE', { mode: '1' });
      return;
    }
    // "mulai variasi dua" or "mulai variasi mundur" or "variasi dua"
    if (text.includes('variasi dua') || text.includes('variasi 2') || text.includes('variasi mundur') || text.includes('mulai variasi dua') || text.includes('mulai variasi 2')) {
      this.config.onCommandMatched('VARIASI_MODE', { mode: '2' });
      return;
    }

    // 4. Query commands
    if (text.includes('suhu') && (text.includes('berapa') || text.includes('tunjukkan') || text.includes('cek') || text.includes('informasi') || text.includes('status'))) {
      this.config.onCommandMatched('GET_TEMPERATURE');
      return;
    }
    if (text.includes('kelembaban') && (text.includes('berapa') || text.includes('tunjukkan') || text.includes('cek') || text.includes('informasi') || text.includes('status') || text.includes('kelembapan'))) {
      this.config.onCommandMatched('GET_HUMIDITY');
      return;
    }
    if (text.includes('status') || text.includes('cek semua') || text.includes('bagaimana kabar') || text.includes('semua status')) {
      this.config.onCommandMatched('GET_ALL_STATUS');
      return;
    }

    // Direct relay command mapping fallback
    if (text.match(/relay\s*1\s*on/i) || text.includes('nyalakan satu') || text.includes('hidupkan satu')) {
      this.config.onCommandMatched('RELAY_SINGLE', { relayId: 1, action: 'ON' });
      return;
    }
    if (text.match(/relay\s*1\s*off/i) || text.includes('matikan satu')) {
      this.config.onCommandMatched('RELAY_SINGLE', { relayId: 1, action: 'OFF' });
      return;
    }
    if (text.match(/relay\s*2\s*on/i) || text.includes('nyalakan dua') || text.includes('hidupkan dua')) {
      this.config.onCommandMatched('RELAY_SINGLE', { relayId: 2, action: 'ON' });
      return;
    }
    if (text.match(/relay\s*2\s*off/i) || text.includes('matikan dua')) {
      this.config.onCommandMatched('RELAY_SINGLE', { relayId: 2, action: 'OFF' });
      return;
    }
    if (text.match(/relay\s*3\s*on/i) || text.includes('nyalakan tiga') || text.includes('hidupkan tiga')) {
      this.config.onCommandMatched('RELAY_SINGLE', { relayId: 3, action: 'ON' });
      return;
    }
    if (text.match(/relay\s*3\s*off/i) || text.includes('matikan tiga')) {
      this.config.onCommandMatched('RELAY_SINGLE', { relayId: 3, action: 'OFF' });
      return;
    }
    if (text.match(/relay\s*4\s*on/i) || text.includes('nyalakan empat') || text.includes('hidupkan empat')) {
      this.config.onCommandMatched('RELAY_SINGLE', { relayId: 4, action: 'ON' });
      return;
    }
    if (text.match(/relay\s*4\s*off/i) || text.includes('matikan empat')) {
      this.config.onCommandMatched('RELAY_SINGLE', { relayId: 4, action: 'OFF' });
      return;
    }

    // No matching command
    this.config.onCommandMatched('UNKNOWN', { text: rawText });
  }
}

// Speaks out loud using the web browser speechSynthesis api
export function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported in this browser.');
      resolve();
      return;
    }

    // Stop existing spoken content
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID'; // Indonesian
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to find an Indonesian voice
    const voices = window.speechSynthesis.getVoices();
    const indonesianVoice = voices.find(voice => voice.lang.startsWith('id'));
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}
