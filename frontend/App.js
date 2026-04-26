// App.js  –  Root entry point for PetBuddy Expo app
//
// IMPORT ORDER MATTERS:
//   1. react-native-gesture-handler  (must be first)
//   2. react-native-url-polyfill     (URL polyfill for SockJS/WebSocket)
//   3. Everything else

import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider }  from './src/context/AuthContext';
import AppNavigator      from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
