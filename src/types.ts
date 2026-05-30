/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BrokerConfig {
  id: number; // 1, 2, 3
  name: string;
  server: string;
  port: number; // TLS port in ESP32 (e.g. 8883)
  wsUrl: string; // Secure WebSocket link (wss://)
  user: string;
  pass: string;
  clientId: string;
  vhost: string | null;
}

export interface RelayState {
  id: number; // 1, 2, 3, 4
  topic: string;
  state: boolean; // true = ON (LOW in ESP32), false = OFF (HIGH in ESP32)
}

export interface SensorData {
  suhu: number | null; // Temperature in °C
  kelembaban: number | null; // Humidity in %
  lastUpdated: Date | null;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'rx' | 'tx' | 'error' | 'success';
  topic?: string;
  message: string;
}

export interface VoiceCommandHelp {
  command: string;
  description: string;
  example: string;
}
