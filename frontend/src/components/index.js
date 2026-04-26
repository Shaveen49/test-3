// src/components/index.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, TextInput,
} from 'react-native';
import { C, SP, FS, R, SH, statusColor } from '../utils/theme';

// ── Loading spinner ───────────────────────────────────────
export function Spinner({ msg = 'Loading…' }) {
  return (
    <View style={s.fill}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={s.spinMsg}>{msg}</Text>
    </View>
  );
}

// ── Error box with optional retry ────────────────────────
export function ErrBox({ msg, onRetry }) {
  return (
    <View style={s.errBox}>
      <Text style={{ fontSize: 32 }}>⚠️</Text>
      <Text style={s.errMsg}>{msg}</Text>
      {onRetry && (
        <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
          <Text style={s.retryTxt}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Primary / danger / outline button ────────────────────
export function Btn({ title, onPress, loading, disabled, danger, outline, style }) {
  return (
    <TouchableOpacity
      style={[s.btn,
        danger   && s.btnDanger,
        outline  && s.btnOutline,
        (loading || disabled) && s.btnOff,
        style,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.78}
    >
      {loading
        ? <ActivityIndicator color={outline ? C.primary : C.white} size="small" />
        : <Text style={[s.btnTxt, outline && { color: C.primary }, danger && { color: C.white }]}>
            {title}
          </Text>
      }
    </TouchableOpacity>
  );
}

// ── Labelled text input ───────────────────────────────────
export function Field({ label, error, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.fieldWrap, style]}>
      {label ? <Text style={s.fieldLbl}>{label}</Text> : null}
      <TextInput
        style={[s.input, focused && s.inputFocus, error && s.inputErr]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={C.textMuted}
        {...props}
      />
      {error ? <Text style={s.fieldErr}>{error}</Text> : null}
    </View>
  );
}

// ── Ride status badge ─────────────────────────────────────
export function StatusBadge({ status }) {
  const col = statusColor(status);
  return (
    <View style={[s.badge, { backgroundColor: col + '20' }]}>
      <View style={[s.badgeDot, { backgroundColor: col }]} />
      <Text style={[s.badgeTxt, { color: col }]}>{status}</Text>
    </View>
  );
}

// ── Section header with optional "See All" ───────────────
export function SecHead({ title, onMore, moreLabel = 'See All' }) {
  return (
    <View style={s.secHead}>
      <Text style={s.secTitle}>{title}</Text>
      {onMore && (
        <TouchableOpacity onPress={onMore}>
          <Text style={s.secMore}>{moreLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────
export function Empty({ icon = '🐾', title, sub, onAction, actionLbl = 'Get Started' }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyIco}>{icon}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {sub && <Text style={s.emptySub}>{sub}</Text>}
      {onAction && (
        <TouchableOpacity style={s.emptyBtn} onPress={onAction}>
          <Text style={s.emptyBtnTxt}>{actionLbl}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Pet card ──────────────────────────────────────────────
export function PetCard({ pet, onPress }) {
  const ico = { Cat:'🐱', Bird:'🐦', Rabbit:'🐰', Fish:'🐟' }[pet.species] ?? '🐶';
  return (
    <TouchableOpacity style={s.petCard} onPress={onPress} activeOpacity={0.82}>
      <View style={s.petAva}><Text style={{ fontSize: 26 }}>{ico}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.petName}>{pet.name}</Text>
        <Text style={s.petBreed}>{pet.breed}</Text>
        <Text style={s.petAge}>{pet.age} yr{pet.age !== 1 ? 's' : ''} old</Text>
      </View>
      <Text style={{ fontSize: 22, color: C.textMuted }}>›</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  fill:       { flex:1, alignItems:'center', justifyContent:'center', padding:SP.xl },
  spinMsg:    { marginTop:SP.sm, color:C.textSub, fontSize:FS.md },
  errBox:     { margin:SP.md, padding:SP.lg, backgroundColor:C.errorBg,
    borderRadius:R.md, alignItems:'center', gap:SP.sm },
  errMsg:     { color:C.error, fontSize:FS.md, textAlign:'center' },
  retryBtn:   { paddingHorizontal:SP.lg, paddingVertical:SP.sm,
    backgroundColor:C.error, borderRadius:R.full },
  retryTxt:   { color:C.white, fontWeight:'700' },
  btn:        { backgroundColor:C.primary, borderRadius:R.sm, paddingVertical:14,
    alignItems:'center', justifyContent:'center', ...SH.sm },
  btnDanger:  { backgroundColor:C.error },
  btnOutline: { backgroundColor:'transparent', borderWidth:1.5, borderColor:C.primary },
  btnOff:     { opacity:0.48 },
  btnTxt:     { color:C.white, fontSize:FS.md, fontWeight:'700', letterSpacing:0.3 },
  fieldWrap:  { marginBottom:SP.md },
  fieldLbl:   { fontSize:FS.xs, fontWeight:'700', color:C.textSub,
    textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 },
  input:      { borderWidth:1.5, borderColor:C.border, borderRadius:R.sm,
    paddingHorizontal:SP.md, paddingVertical:12, fontSize:FS.md,
    color:C.text, backgroundColor:C.white },
  inputFocus: { borderColor:C.primary, borderWidth:2 },
  inputErr:   { borderColor:C.error },
  fieldErr:   { color:C.error, fontSize:FS.xs, marginTop:4 },
  badge:      { flexDirection:'row', alignItems:'center', paddingHorizontal:10,
    paddingVertical:4, borderRadius:R.full, alignSelf:'flex-start' },
  badgeDot:   { width:6, height:6, borderRadius:3, marginRight:5 },
  badgeTxt:   { fontSize:FS.xs, fontWeight:'800', letterSpacing:0.5 },
  secHead:    { flexDirection:'row', justifyContent:'space-between',
    alignItems:'center', marginBottom:SP.sm },
  secTitle:   { fontSize:FS.lg, fontWeight:'800', color:C.text },
  secMore:    { fontSize:FS.sm, color:C.primary, fontWeight:'600' },
  empty:      { alignItems:'center', paddingVertical:SP.xxl, paddingHorizontal:SP.xl },
  emptyIco:   { fontSize:56, marginBottom:SP.md },
  emptyTitle: { fontSize:FS.xl, fontWeight:'800', color:C.text, marginBottom:SP.xs },
  emptySub:   { fontSize:FS.md, color:C.textSub, textAlign:'center', lineHeight:22 },
  emptyBtn:   { marginTop:SP.lg, backgroundColor:C.primary,
    paddingHorizontal:SP.xl, paddingVertical:SP.sm, borderRadius:R.full },
  emptyBtnTxt:{ color:C.white, fontWeight:'700', fontSize:FS.md },
  petCard:    { flexDirection:'row', alignItems:'center', backgroundColor:C.surface,
    borderRadius:R.md, padding:SP.md, marginBottom:SP.sm, ...SH.sm },
  petAva:     { width:52, height:52, borderRadius:26, backgroundColor:C.primaryLight+'25',
    alignItems:'center', justifyContent:'center', marginRight:SP.md },
  petName:    { fontSize:FS.lg, fontWeight:'700', color:C.text },
  petBreed:   { fontSize:FS.sm, color:C.textSub, marginTop:2 },
  petAge:     { fontSize:FS.xs, color:C.textMuted, marginTop:2 },
});
