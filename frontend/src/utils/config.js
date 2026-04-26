// src/utils/config.js
// ═══════════════════════════════════════════════════════════════════════
//  YOUR SETUP (detected from your uploaded project):
//    Windows machine IP  : 172.20.10.2
//    Backend port        : 8080
//    DB password         : Pass1234
//
//  HOW IT WORKS:
//    - iOS Simulator talks to YOUR MACHINE via 172.20.10.2
//    - Android Emulator uses the special alias 10.0.2.2
//    - Physical devices (Expo Go) use the machine's LAN IP
//
//  If you change WiFi networks your IP will change — re-run ipconfig
// ═══════════════════════════════════════════════════════════════════════

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ── Your Windows machine's IP address ───────────────────
const WINDOWS_IP = '172.20.10.7';          // ← UPDATE if your IP changes

// ── Auto-select the right host based on platform ────────
function getHost() {
  // Expo Go on a physical device — use the machine's LAN IP directly
  if (Constants.executionEnvironment === 'storeClient') {
    return `http://${WINDOWS_IP}:8080`;
  }

  if (Platform.OS === 'android') {
    // Android Emulator (AVD) special loopback alias
    return 'http://10.0.2.2:8080';
  }

  if (Platform.OS === 'ios') {
    // iOS Simulator — it shares the Mac's network stack,
    // but since you're on Windows with Expo Go on iPhone,
    // use the LAN IP of your Windows machine.
    return `http://${WINDOWS_IP}:8080`;
  }

  // Web / fallback
  return `http://${WINDOWS_IP}:8080`;
}

const BACKEND_HOST = getHost();

export const API_BASE = `${BACKEND_HOST}/api`;
export const WS_BASE  = `${BACKEND_HOST}/ws`;

// Log on startup so you can see what URL is being used
if (__DEV__) {
  console.log(`[Config] Platform: ${Platform.OS}`);
  console.log(`[Config] API_BASE: ${API_BASE}`);
  console.log(`[Config] WS_BASE:  ${WS_BASE}`);
}
