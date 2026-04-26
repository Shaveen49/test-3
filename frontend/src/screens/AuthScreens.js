// src/screens/AuthScreens.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Field, Btn } from '../components';
import { C, SP, FS, R } from '../utils/theme';
import { API_BASE } from '../utils/config';
import DiagnosticScreen from './DiagnosticScreen';

// ─────────────────────────────────────────────────────────
// LoginScreen
// ─────────────────────────────────────────────────────────
export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState({});
  const [noServer, setNoServer] = useState(false);

  // Ping backend on mount
  useEffect(() => { pingServer(); }, []);

  const pingServer = async () => {
    try {
      await axios.post(`${API_BASE}/auth/login`, {}, { timeout: 5000 });
    } catch (e) {
      // e.response means server replied (400/401) = reachable ✅
      // no e.response means network error = unreachable ❌
      setNoServer(!e.response);
    }
  };

  const validate = () => {
    const e = {};
    if (!email.trim())                       e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email))    e.email    = 'Invalid email address';
    if (!password)                           e.password = 'Password is required';
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (ex) {
      if (!ex.response) {
        setNoServer(true);
      } else {
        Alert.alert('Login Failed',
          ex.response?.data?.message ?? 'Invalid email or password.');
      }
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView
      style={s.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <View style={s.hero}>
          <Text style={s.heroIcon}>🐾</Text>
          <Text style={s.heroName}>PetBuddy</Text>
          <Text style={s.heroSub}>Sri Lanka's Pet Care & Transport App</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Welcome Back</Text>
          <Text style={s.cardSub}>Sign in to continue</Text>

          <Field label="Email Address" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            placeholder="you@example.com" error={err.email} />

          <Field label="Password" value={password} onChangeText={setPassword}
            secureTextEntry placeholder="Enter your password" error={err.password} />

          <Btn title="Sign In" onPress={submit} loading={busy}
            style={{ marginTop: SP.xs }} />

          <TouchableOpacity style={s.diagBtn} onPress={() => setNoServer(true)}>
            <Text style={s.diagBtnTxt}>🔌  Test Backend Connection</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.switchRow}
            onPress={() => navigation.navigate('Register')}>
            <Text style={s.switchTxt}>Don't have an account?  </Text>
            <Text style={s.switchLink}>Register here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Diagnostic overlay — shown when server unreachable */}
      {noServer && (
        <DiagnosticScreen onDismiss={() => { setNoServer(false); pingServer(); }} />
      )}
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────
// RegisterScreen
// ─────────────────────────────────────────────────────────
export function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [f, setF] = useState({
    name: '', email: '', password: '', confirm: '',
    role: 'USER',
    vehicleType: '', vehicleNumber: '', licenseNumber: '',
  });
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState({});
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!f.name.trim())   e.name     = 'Full name is required';
    if (!f.email.trim())  e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(f.email)) e.email = 'Invalid email';
    if (!f.password)      e.password = 'Password is required';
    else if (f.password.length < 6)  e.password = 'Minimum 6 characters';
    if (f.password !== f.confirm)    e.confirm  = 'Passwords do not match';
    if (f.role === 'DRIVER') {
      if (!f.vehicleNumber.trim()) e.vehicleNumber = 'Vehicle number required';
      if (!f.licenseNumber.trim()) e.licenseNumber = 'License number required';
    }
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = {
        name:     f.name.trim(),
        email:    f.email.trim(),
        password: f.password,
        role:     f.role,
        ...(f.role === 'DRIVER' && {
          vehicleType:   f.vehicleType.trim() || null,
          vehicleNumber: f.vehicleNumber.trim(),
          licenseNumber: f.licenseNumber.trim(),
        }),
      };
      await register(payload);
    } catch (ex) {
      const msg = ex.response?.data?.message
        ?? 'Registration failed. Check your connection and try again.';
      Alert.alert('Registration Failed', msg);
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView
      style={s.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <View style={s.hero}>
          <Text style={s.heroIcon}>🐾</Text>
          <Text style={s.heroName}>PetBuddy</Text>
          <Text style={s.heroSub}>Create your account</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Create Account</Text>
          <Text style={s.cardSub}>Fill in your details to get started</Text>

          <Field label="Full Name" value={f.name} onChangeText={v => up('name', v)}
            placeholder="Kasun Perera" error={err.name} />
          <Field label="Email Address" value={f.email} onChangeText={v => up('email', v)}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            placeholder="you@example.com" error={err.email} />
          <Field label="Password" value={f.password} onChangeText={v => up('password', v)}
            secureTextEntry placeholder="Minimum 6 characters" error={err.password} />
          <Field label="Confirm Password" value={f.confirm}
            onChangeText={v => up('confirm', v)}
            secureTextEntry placeholder="Re-enter password" error={err.confirm} />

          <Text style={s.roleLabel}>I AM A:</Text>
          <View style={s.roleRow}>
            {[{k:'USER',ico:'👤',lbl:'Pet Owner'},{k:'DRIVER',ico:'🚗',lbl:'Driver'}]
              .map(r => (
                <TouchableOpacity key={r.k}
                  style={[s.roleBtn, f.role === r.k && s.roleBtnOn]}
                  onPress={() => up('role', r.k)}>
                  <Text style={{ fontSize: 28, marginBottom: 4 }}>{r.ico}</Text>
                  <Text style={[s.roleTxt, f.role === r.k && { color: C.primary }]}>
                    {r.lbl}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>

          {f.role === 'DRIVER' && (
            <View style={s.driverBox}>
              <Text style={s.driverBoxTitle}>🚗 Vehicle Details</Text>
              <Field label="Vehicle Type (optional)" value={f.vehicleType}
                onChangeText={v => up('vehicleType', v)} placeholder="Car / Van / Bike" />
              <Field label="Vehicle Number *" value={f.vehicleNumber}
                onChangeText={v => up('vehicleNumber', v)}
                placeholder="WP CAB-1234" autoCapitalize="characters"
                error={err.vehicleNumber} />
              <Field label="License Number *" value={f.licenseNumber}
                onChangeText={v => up('licenseNumber', v)}
                placeholder="B1234567" autoCapitalize="characters"
                error={err.licenseNumber} />
            </View>
          )}

          <Btn title="Create Account" onPress={submit} loading={busy}
            style={{ marginTop: SP.sm }} />

          <TouchableOpacity style={s.switchRow}
            onPress={() => navigation.navigate('Login')}>
            <Text style={s.switchTxt}>Already have an account?  </Text>
            <Text style={s.switchLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  kav:           { flex:1, backgroundColor:C.primary },
  scroll:        { flexGrow:1, paddingBottom:SP.xxl },
  hero:          { alignItems:'center', paddingTop:70, paddingBottom:SP.xl,
    paddingHorizontal:SP.lg },
  heroIcon:      { fontSize:68 },
  heroName:      { fontSize:FS.h1, fontWeight:'900', color:C.white,
    marginTop:SP.sm, letterSpacing:0.5 },
  heroSub:       { fontSize:FS.md, color:C.primaryLight, marginTop:4,
    opacity:0.9, textAlign:'center' },
  card:          { backgroundColor:C.white, borderTopLeftRadius:32,
    borderTopRightRadius:32, padding:SP.xl, flexGrow:1 },
  cardTitle:     { fontSize:FS.xxl, fontWeight:'900', color:C.text, marginBottom:4 },
  cardSub:       { fontSize:FS.md, color:C.textSub, marginBottom:SP.xl },
  diagBtn:       { marginTop:SP.lg, alignItems:'center', padding:SP.sm,
    borderRadius:R.sm, borderWidth:1, borderColor:C.border, borderStyle:'dashed' },
  diagBtnTxt:    { fontSize:FS.sm, color:C.textSub },
  switchRow:     { flexDirection:'row', justifyContent:'center',
    marginTop:SP.lg, flexWrap:'wrap' },
  switchTxt:     { fontSize:FS.sm, color:C.textSub },
  switchLink:    { fontSize:FS.sm, color:C.primary, fontWeight:'700' },
  roleLabel:     { fontSize:FS.xs, fontWeight:'700', color:C.textSub,
    letterSpacing:0.6, marginBottom:SP.sm },
  roleRow:       { flexDirection:'row', gap:SP.md, marginBottom:SP.lg },
  roleBtn:       { flex:1, alignItems:'center', padding:SP.md, borderRadius:R.md,
    borderWidth:2, borderColor:C.border, backgroundColor:C.bg },
  roleBtnOn:     { borderColor:C.primary, backgroundColor:C.primary+'12' },
  roleTxt:       { fontSize:FS.sm, fontWeight:'700', color:C.textSub },
  driverBox:     { backgroundColor:C.bg, borderRadius:R.md,
    padding:SP.md, marginBottom:SP.md },
  driverBoxTitle:{ fontSize:FS.md, fontWeight:'800', color:C.text, marginBottom:SP.md },
});
