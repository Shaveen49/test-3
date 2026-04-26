// src/screens/DiagnosticScreen.js
// Auto-tests multiple IPs and shows which one works.

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Platform,
} from 'react-native';
import axios from 'axios';
import { C, SP, FS, R, SH } from '../utils/theme';
import { API_BASE } from '../utils/config';

// IPs to auto-test — your real IP is first
const CANDIDATES = [
  { label: 'Your Windows IP (172.20.10.2)',  url: 'http://172.20.10.2:8080' },
  { label: 'Android Emulator (10.0.2.2)',    url: 'http://10.0.2.2:8080' },
  { label: 'Genymotion (10.0.3.2)',          url: 'http://10.0.3.2:8080' },
  { label: 'localhost',                      url: 'http://localhost:8080' },
  { label: '127.0.0.1',                      url: 'http://127.0.0.1:8080' },
];

export default function DiagnosticScreen({ onDismiss }) {
  const [results,  setResults]  = useState([]);
  const [testing,  setTesting]  = useState(false);
  const [customIp, setCustomIp] = useState('');

  useEffect(() => { runTests([]); }, []);

  const testUrl = async (baseUrl) => {
    const start = Date.now();
    try {
      await axios.post(`${baseUrl}/api/auth/login`, {}, { timeout: 4000 });
      return { ok: true, ms: Date.now() - start };
    } catch (e) {
      if (e.response) {
        // Got HTTP response (400/401) = server IS reachable ✅
        return { ok: true, ms: Date.now() - start };
      }
      return { ok: false, err: e.code ?? e.message };
    }
  };

  const runTests = async (extra = []) => {
    setTesting(true);
    const all = [...CANDIDATES, ...extra];
    const out = [];
    for (const c of all) {
      const r = await testUrl(c.url);
      out.push({ ...c, ...r });
      setResults([...out]);
    }
    setTesting(false);
  };

  const testCustom = () => {
    if (!customIp.trim()) return;
    let url = customIp.trim();
    if (!url.startsWith('http')) url = `http://${url}`;
    if (!url.match(/:\d+$/)) url = `${url}:8080`;
    runTests([{ label: 'Custom', url }]);
  };

  const working = results.filter(r => r.ok);

  return (
    <View style={s.overlay}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.title}>🔌  Cannot Connect to Backend</Text>

          <View style={s.currentBox}>
            <Text style={s.currentLabel}>Current config URL:</Text>
            <Text style={s.currentUrl}>{API_BASE}</Text>
            <Text style={s.currentLabel}>Platform: {Platform.OS}</Text>
          </View>

          {/* Working IPs */}
          {working.length > 0 && (
            <View style={s.successBox}>
              <Text style={s.successTitle}>✅  Working IP Found!</Text>
              {working.map(r => (
                <View key={r.url}>
                  <Text style={s.successUrl}>{r.url}</Text>
                  <Text style={s.successHint}>
                    Open  src/utils/config.js  and set:{'\n'}
                    {'  '}const WINDOWS_IP = '{r.url.replace('http://', '').replace(':8080', '')}';
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Test results */}
          <Text style={s.secLabel}>TESTING ALL KNOWN IPs…</Text>
          {results.map(r => (
            <View key={r.url} style={[s.row, r.ok ? s.rowOk : s.rowFail]}>
              <Text style={{ fontSize: 18, width: 28 }}>{r.ok ? '✅' : '❌'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{r.label}</Text>
                <Text style={s.rowUrl}>{r.url}</Text>
                {!r.ok && r.err && <Text style={s.rowErr}>{r.err}</Text>}
              </View>
              {r.ok && r.ms && (
                <Text style={s.rowMs}>{r.ms}ms</Text>
              )}
            </View>
          ))}
          {testing && (
            <View style={s.loadRow}>
              <ActivityIndicator color={C.primary} size="small" />
              <Text style={s.loadTxt}>  Testing…</Text>
            </View>
          )}

          {/* Custom IP */}
          <Text style={[s.secLabel, { marginTop: SP.lg }]}>TEST A DIFFERENT IP</Text>
          <Text style={s.hint}>
            On Windows: open CMD → type <Text style={s.mono}>ipconfig</Text>{'\n'}
            Look for "IPv4 Address" under your WiFi adapter
          </Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={customIp}
              onChangeText={setCustomIp}
              placeholder="192.168.1.x"
              placeholderTextColor={C.textMuted}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={s.testBtn} onPress={testCustom} disabled={testing}>
              <Text style={s.testBtnTxt}>Test</Text>
            </TouchableOpacity>
          </View>

          {/* Fix instructions */}
          <View style={s.instructBox}>
            <Text style={s.instructTitle}>📋  How to fix:</Text>
            <Text style={s.instruct}>
              1. Find a ✅ working IP above{'\n'}
              2. Open  src/utils/config.js{'\n'}
              3. Change:  const WINDOWS_IP = '172.20.10.2';{'\n'}
                 to your working IP{'\n'}
              4. Run:  npx expo start --clear{'\n\n'}
              Also make sure:{'\n'}
              • Spring Boot backend is running{'\n'}
              • Windows Firewall allows port 8080{'\n'}
              • Phone and PC are on same WiFi
            </Text>
          </View>

          <TouchableOpacity style={s.dismissBtn}
            onPress={() => { runTests([]); onDismiss?.(); }}>
            <Text style={s.dismissTxt}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  overlay:      { position:'absolute', top:0, left:0, right:0, bottom:0,
    backgroundColor:C.overlay, zIndex:999 },
  scroll:       { flexGrow:1, justifyContent:'center', padding:SP.md },
  card:         { backgroundColor:C.white, borderRadius:R.lg, padding:SP.lg },
  title:        { fontSize:FS.xl, fontWeight:'900', color:C.error, marginBottom:SP.md },
  currentBox:   { backgroundColor:C.bg, borderRadius:R.sm, padding:SP.sm,
    marginBottom:SP.md },
  currentLabel: { fontSize:FS.xs, color:C.textSub, fontWeight:'700' },
  currentUrl:   { fontFamily:'monospace', fontSize:FS.sm, color:C.primary,
    fontWeight:'700', marginBottom:4 },
  successBox:   { backgroundColor:C.successBg, borderRadius:R.md, padding:SP.md,
    marginBottom:SP.md, borderWidth:2, borderColor:C.success },
  successTitle: { fontSize:FS.lg, fontWeight:'900', color:C.success, marginBottom:SP.sm },
  successUrl:   { fontFamily:'monospace', fontSize:FS.md, color:C.success,
    fontWeight:'800' },
  successHint:  { fontFamily:'monospace', fontSize:FS.xs, color:C.success,
    marginTop:SP.xs, lineHeight:18 },
  secLabel:     { fontSize:FS.xs, fontWeight:'800', color:C.textSub,
    textTransform:'uppercase', letterSpacing:0.6, marginBottom:SP.sm },
  row:          { flexDirection:'row', alignItems:'center', padding:SP.sm,
    borderRadius:R.sm, marginBottom:SP.xs },
  rowOk:        { backgroundColor:C.successBg, borderWidth:1, borderColor:C.success },
  rowFail:      { backgroundColor:C.errorBg },
  rowLabel:     { fontSize:FS.sm, fontWeight:'700', color:C.text },
  rowUrl:       { fontFamily:'monospace', fontSize:FS.xs, color:C.textSub },
  rowErr:       { fontSize:FS.xs, color:C.error, fontStyle:'italic' },
  rowMs:        { fontSize:FS.xs, color:C.success, fontWeight:'700' },
  loadRow:      { flexDirection:'row', alignItems:'center', padding:SP.sm },
  loadTxt:      { fontSize:FS.sm, color:C.textSub },
  hint:         { fontSize:FS.xs, color:C.textSub, marginBottom:SP.sm, lineHeight:18 },
  mono:         { fontFamily:'monospace', color:C.primary },
  inputRow:     { flexDirection:'row', gap:SP.sm, marginBottom:SP.md },
  input:        { flex:1, borderWidth:1.5, borderColor:C.border, borderRadius:R.sm,
    paddingHorizontal:SP.md, paddingVertical:10, fontSize:FS.md,
    color:C.text, fontFamily:'monospace' },
  testBtn:      { backgroundColor:C.primary, borderRadius:R.sm,
    paddingHorizontal:SP.md, alignItems:'center', justifyContent:'center' },
  testBtnTxt:   { color:C.white, fontWeight:'800' },
  instructBox:  { backgroundColor:C.infoBg, borderRadius:R.md,
    padding:SP.md, marginBottom:SP.lg },
  instructTitle:{ fontSize:FS.sm, fontWeight:'800', color:C.info, marginBottom:SP.sm },
  instruct:     { fontSize:FS.sm, color:C.info, lineHeight:22 },
  dismissBtn:   { backgroundColor:C.primary, borderRadius:R.sm,
    padding:SP.md, alignItems:'center' },
  dismissTxt:   { color:C.white, fontWeight:'800', fontSize:FS.md },
});
