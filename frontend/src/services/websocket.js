// src/services/websocket.js
// STOMP over SockJS — real-time ride tracking.
// This file was previously fully commented out — now fully restored.

import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { WS_BASE } from '../utils/config';

// ── Polyfill TextEncoder/TextDecoder for React Native / Hermes ──
if (typeof global.TextEncoder === 'undefined') {
  try {
    const te = require('text-encoding');
    global.TextEncoder = te.TextEncoder;
    global.TextDecoder = te.TextDecoder;
  } catch (_) {}
}

let stompClient = null;
const activeSubs = {};   // topic → STOMP subscription object

/**
 * Connect to the Spring Boot STOMP endpoint.
 * Spring backend WebSocket path: /ws  (SockJS)
 * @param {string} jwtToken  – Bearer token from auth
 * @param {()=>void} onConnected – fired once the STOMP session is open
 */
export function wsConnect(jwtToken, onConnected) {
  if (stompClient?.active) return;   // already connected, don't double-connect

  stompClient = new Client({
    // SockJS factory — Spring expects the SockJS handshake at /ws
    webSocketFactory: () => new SockJS(WS_BASE),

    // Spring Security validates this header during STOMP CONNECT
    connectHeaders: {
      Authorization: `Bearer ${jwtToken}`,
    },

    reconnectDelay: 5000,   // retry every 5 s if disconnected

    debug: (msg) => {
      if (__DEV__) console.log('[WS]', msg);
    },

    onConnect: () => {
      console.log('[WS] ✅ Connected to', WS_BASE);
      onConnected?.();
    },

    onStompError: (frame) => {
      console.error('[WS] STOMP error:', frame.headers?.message ?? frame);
    },

    onDisconnect: () => console.log('[WS] Disconnected'),

    onWebSocketError: (e) => console.error('[WS] WebSocket error:', e),
  });

  stompClient.activate();
}

/** Gracefully disconnect and clean up every subscription */
export function wsDisconnect() {
  Object.keys(activeSubs).forEach(k => {
    try { activeSubs[k]?.unsubscribe(); } catch (_) {}
    delete activeSubs[k];
  });
  stompClient?.deactivate();
  stompClient = null;
}

/**
 * Subscribe to live updates for one ride.
 * The backend broadcasts to /topic/ride/{rideId} for:
 *   - LocationUpdate  { rideId, driverId, latitude, longitude, timestamp }
 *   - RideResponse    { id, status, driverName, … }
 * @param {number|string} rideId
 * @param {(data: object) => void} onMessage
 */
export function wsSubscribeRide(rideId, onMessage) {
  if (!stompClient?.connected) {
    console.warn('[WS] Cannot subscribe — not connected yet');
    return;
  }
  const topic = `/topic/ride/${rideId}`;
  if (activeSubs[topic]) return;  // already subscribed for this ride

  activeSubs[topic] = stompClient.subscribe(topic, (frame) => {
    try {
      onMessage(JSON.parse(frame.body));
    } catch (e) {
      console.error('[WS] JSON parse error:', e);
    }
  });
  console.log('[WS] Subscribed →', topic);
}

/** Stop listening to a ride's topic */
export function wsUnsubscribeRide(rideId) {
  const topic = `/topic/ride/${rideId}`;
  try { activeSubs[topic]?.unsubscribe(); } catch (_) {}
  delete activeSubs[topic];
  console.log('[WS] Unsubscribed from', topic);
}

/**
 * Driver sends their live GPS coordinates.
 * Destination:  /app/location.update
 * Backend LocationWebSocketController reads this and
 * re-broadcasts to /topic/ride/{rideId}.
 */
export function wsSendLocation(rideId, driverId, latitude, longitude) {
  if (!stompClient?.connected) {
    console.warn('[WS] Cannot send location — not connected');
    return;
  }
  stompClient.publish({
    destination: '/app/location.update',
    body: JSON.stringify({
      rideId,
      driverId,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    }),
  });
}
console.log('[WS] Connecting to:', WS_BASE);
/** Returns true if the STOMP session is currently open */
export const wsIsConnected = () => stompClient?.connected === true;
