// src/screens/DriverDashboard.js
// Driver role screen.
// - Toggle availability  →  PATCH /api/rides/driver/availability
// - Accept ride          →  PATCH /api/rides/{id}/accept
// - Start ride           →  PATCH /api/rides/{id}/start  (begins GPS broadcast)
// - Complete ride        →  PATCH /api/rides/{id}/complete
// - Real GPS via expo-location watchPositionAsync
// - Broadcasts to /app/location.update over WebSocket

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { rideAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  wsConnect, wsDisconnect, wsSendLocation, wsIsConnected,
} from '../services/websocket';
import { StatusBadge, Spinner, Empty, Btn } from '../components';
import { C, SP, FS, R, SH } from '../utils/theme';

export default function DriverDashboard() {
  const { user, token, logout } = useAuth();

  const [available,  setAvailable]  = useState(false);
  const [rides,      setRides]      = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling,   setToggling]   = useState(false);
  const [wsLive,     setWsLive]     = useState(false);

  const locSubscription = useRef(null);  // expo-location subscription

  // Connect WebSocket once on mount
  useEffect(() => {
    wsConnect(token, () => setWsLive(true));
    return () => {
      wsDisconnect();
      stopGps();
    };
  }, []);

  useFocusEffect(useCallback(() => { fetchRides(); }, []));

  const fetchRides = async () => {
    try {
      const { data } = await rideAPI.getDriverRides();
      const list = data ?? [];
      setRides(list);
      const active = list.find(r => r.status === 'ACCEPTED' || r.status === 'STARTED');
      setActiveRide(active ?? null);
      // If we're mid-ride and GPS not running, restart
      if (active?.status === 'STARTED' && !locSubscription.current) {
        startGps(active.id);
      }
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  // ── Availability toggle ────────────────────────────────
  const toggleAvail = async (val) => {
    setToggling(true);
    try {
      await rideAPI.setAvailability(val);   // PATCH /rides/driver/availability { available }
      setAvailable(val);
    } catch (_) {
      Alert.alert('Error', 'Could not update availability. Please try again.');
    } finally { setToggling(false); }
  };

  // ── Accept ─────────────────────────────────────────────
  const acceptRide = async (id) => {
    try {
      const { data } = await rideAPI.accept(id);
      setActiveRide(data);
      fetchRides();
      Alert.alert('Accepted! 🚗', 'Head to the pickup location now.');
    } catch (ex) {
      Alert.alert('Error', ex.response?.data?.message ?? 'Failed to accept ride.');
    }
  };

  // ── Start ──────────────────────────────────────────────
  const startRide = async (id) => {
    try {
      const { data } = await rideAPI.start(id);
      setActiveRide(data);
      fetchRides();
      await startGps(id);        // begin real GPS broadcasting
      Alert.alert('Ride Started! 🛣️',
        'Drive safely. Your live location is now shared with the pet owner.');
    } catch (ex) {
      Alert.alert('Error', ex.response?.data?.message ?? 'Failed to start ride.');
    }
  };

  // ── Complete ───────────────────────────────────────────
  const completeRide = (id) =>
    Alert.alert('Complete Ride?', 'Confirm you have dropped off the pet safely.', [
      { text: 'Not Yet', style: 'cancel' },
      { text: 'Complete', onPress: async () => {
          try {
            await rideAPI.complete(id);
            setActiveRide(null);
            stopGps();
            fetchRides();
            Alert.alert('Completed ✅', 'Great work! You are now available for new rides.');
          } catch (_) { Alert.alert('Error', 'Failed to complete ride.'); }
      }},
    ]);

  // ── expo-location GPS broadcast ────────────────────────
  const startGps = async (rideId) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Permission',
        'Location access is required to share your live position with the pet owner.');
      return;
    }
    locSubscription.current = await Location.watchPositionAsync(
      {
        accuracy:         Location.Accuracy.High,
        timeInterval:     4000,    // every 4 seconds
        distanceInterval: 5,       // or every 5 metres
      },
      (loc) => {
        if (wsIsConnected()) {
          wsSendLocation(
            rideId,
            user?.driverId,              // driverId from auth context
            loc.coords.latitude,
            loc.coords.longitude
          );
        }
      }
    );
    console.log('[GPS] Started broadcasting for ride', rideId);
  };

  const stopGps = () => {
    locSubscription.current?.remove();
    locSubscription.current = null;
    console.log('[GPS] Stopped');
  };

  // ── Per-ride action button ─────────────────────────────
  const rideAction = (ride) => {
    if (ride.status === 'REQUESTED')
      return { lbl: '✓  Accept Ride', fn: () => acceptRide(ride.id),  col: C.primary };
    if (ride.status === 'ACCEPTED')
      return { lbl: '▶  Start Ride',  fn: () => startRide(ride.id),   col: C.info };
    if (ride.status === 'STARTED')
      return { lbl: '⬛  Complete',    fn: () => completeRide(ride.id), col: C.success };
    return null;
  };

  if (loading) return <Spinner msg="Loading dashboard…" />;

  const pending   = rides.filter(r => r.status === 'REQUESTED');
  const completed = rides.filter(r => r.status === 'COMPLETED' || r.status === 'CANCELLED');

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={C.primary}
          onRefresh={() => { setRefreshing(true); fetchRides(); }} />
      }>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerLabel}>Driver Dashboard</Text>
          <Text style={s.driverName}>{user?.name}</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* ── Status chips ── */}
      <View style={s.statsRow}>
        {[
          { ico: wsLive ? '🟢' : '🔴', lbl: 'WebSocket', val: wsLive ? 'Live' : 'Offline' },
          { ico: '🚗',                  lbl: 'Status',    val: available ? 'Online' : 'Offline',
            valColor: available ? C.success : C.textSub },
          { ico: '📦',                  lbl: 'Active',    val: activeRide ? '1 Ride' : 'None' },
        ].map(st => (
          <View key={st.lbl} style={s.stat}>
            <Text style={{ fontSize: 20, marginBottom: 4 }}>{st.ico}</Text>
            <Text style={s.statLbl}>{st.lbl}</Text>
            <Text style={[s.statVal, st.valColor ? { color: st.valColor } : {}]}>{st.val}</Text>
          </View>
        ))}
      </View>

      {/* ── Availability toggle ── */}
      <View style={s.availCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.availTitle}>
            {available ? '🟢  You are Online' : '⚫  You are Offline'}
          </Text>
          <Text style={s.availSub}>
            {available
              ? 'You are visible to riders and will receive requests'
              : 'Toggle on to start receiving ride requests'}
          </Text>
        </View>
        <Switch
          value={available}
          onValueChange={toggleAvail}
          disabled={toggling}
          trackColor={{ false: C.border, true: C.primaryLight }}
          thumbColor={available ? C.primary : C.white}
          ios_backgroundColor={C.border}
        />
      </View>

      {/* ── Active ride ── */}
      {activeRide && (
        <View style={s.activeCard}>
          <Text style={s.sectionTitle}>🔥  Active Ride</Text>
          <StatusBadge status={activeRide.status} />

          <View style={s.metaRow}>
            <Text style={s.metaLbl}>Pet</Text>
            <Text style={s.metaVal}>🐾  {activeRide.petName}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLbl}>Owner</Text>
            <Text style={s.metaVal}>{activeRide.userName}</Text>
          </View>

          <View style={s.divider} />

          <Text style={s.addrLbl}>PICKUP</Text>
          <Text style={s.addrTxt}>{activeRide.pickupAddress}</Text>
          <Text style={s.addrLbl}>DROP-OFF</Text>
          <Text style={s.addrTxt}>{activeRide.dropAddress}</Text>
          {activeRide.notes
            ? <Text style={s.notesTxt}>📝  {activeRide.notes}</Text>
            : null}

          {/* Action button */}
          {(() => {
            const a = rideAction(activeRide);
            return a ? (
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: a.col }]}
                onPress={a.fn}>
                <Text style={s.actionBtnTxt}>{a.lbl}</Text>
              </TouchableOpacity>
            ) : null;
          })()}

          {/* GPS broadcasting indicator */}
          {activeRide.status === 'STARTED' && (
            <View style={s.gpsBanner}>
              <Text style={s.gpsTxt}>📡  Broadcasting live GPS to pet owner…</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Pending requests (when online & no active ride) ── */}
      {available && !activeRide && pending.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>📬  New Requests</Text>
          {pending.map(r => {
            const a = rideAction(r);
            return (
              <View key={r.id} style={s.pendingCard}>
                <Text style={s.pendingPet}>🐾  {r.petName}  ·  {r.userName}</Text>
                <Text style={s.pendingAddr} numberOfLines={1}>📍  {r.pickupAddress}</Text>
                <Text style={s.pendingAddr} numberOfLines={1}>🏁  {r.dropAddress}</Text>
                {r.notes ? <Text style={s.notesTxt}>📝  {r.notes}</Text> : null}
                {a && (
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: a.col, marginTop: SP.sm }]}
                    onPress={a.fn}>
                    <Text style={s.actionBtnTxt}>{a.lbl}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ── Completed ride history ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Ride History</Text>
        {completed.length === 0
          ? <Empty icon="🛣️" title="No completed rides yet"
              sub="Accept rides to build your history" />
          : completed.map(r => (
              <View key={r.id} style={s.histCard}>
                <View style={s.histTop}>
                  <StatusBadge status={r.status} />
                  <Text style={s.histDate}>
                    {new Date(r.requestedAt).toLocaleDateString('en-LK',
                      { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <Text style={s.histPet}>🐾  {r.petName}</Text>
                <Text style={s.histAddr} numberOfLines={1}>
                  {r.pickupAddress}  →  {r.dropAddress}
                </Text>
              </View>
            ))
        }
      </View>

      <View style={{ height: SP.xxl }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:       { flex:1, backgroundColor:C.bg },
  content:      { padding:SP.md },
  header:       { flexDirection:'row', justifyContent:'space-between',
    alignItems:'flex-start', marginBottom:SP.xl, marginTop:SP.sm },
  headerLabel:  { fontSize:FS.sm, color:C.textSub, fontWeight:'700' },
  driverName:   { fontSize:FS.xxl, fontWeight:'900', color:C.text },
  logoutBtn:    { paddingHorizontal:SP.md, paddingVertical:SP.sm,
    borderRadius:R.full, borderWidth:1, borderColor:C.border },
  logoutTxt:    { fontSize:FS.sm, color:C.textSub, fontWeight:'700' },
  statsRow:     { flexDirection:'row', gap:SP.sm, marginBottom:SP.md },
  stat:         { flex:1, backgroundColor:C.white, borderRadius:R.md,
    padding:SP.md, alignItems:'center', ...SH.sm },
  statLbl:      { fontSize:FS.xs, color:C.textSub, fontWeight:'700' },
  statVal:      { fontSize:FS.md, fontWeight:'900', color:C.text, marginTop:2 },
  availCard:    { flexDirection:'row', alignItems:'center', backgroundColor:C.white,
    borderRadius:R.md, padding:SP.lg, marginBottom:SP.md, ...SH.sm },
  availTitle:   { fontSize:FS.lg, fontWeight:'800', color:C.text },
  availSub:     { fontSize:FS.sm, color:C.textSub, marginTop:4, lineHeight:20 },
  activeCard:   { backgroundColor:C.white, borderRadius:R.md, padding:SP.lg,
    marginBottom:SP.md, borderLeftWidth:4, borderLeftColor:C.primary, ...SH.md },
  sectionTitle: { fontSize:FS.lg, fontWeight:'900', color:C.text, marginBottom:SP.md },
  metaRow:      { flexDirection:'row', justifyContent:'space-between',
    marginTop:SP.sm },
  metaLbl:      { fontSize:FS.sm, color:C.textSub, fontWeight:'700' },
  metaVal:      { fontSize:FS.sm, fontWeight:'800', color:C.text },
  divider:      { height:1, backgroundColor:C.border, marginVertical:SP.md },
  addrLbl:      { fontSize:FS.xs, fontWeight:'800', color:C.textSub,
    textTransform:'uppercase', letterSpacing:0.5, marginTop:SP.xs },
  addrTxt:      { fontSize:FS.md, color:C.text, marginBottom:SP.xs },
  notesTxt:     { fontSize:FS.sm, color:C.textSub, fontStyle:'italic', marginTop:SP.xs },
  actionBtn:    { borderRadius:R.sm, padding:SP.md, alignItems:'center',
    marginTop:SP.md },
  actionBtnTxt: { color:C.white, fontWeight:'900', fontSize:FS.md, letterSpacing:0.4 },
  gpsBanner:    { backgroundColor:C.primaryLight+'22', borderRadius:R.sm,
    padding:SP.sm, marginTop:SP.sm, alignItems:'center' },
  gpsTxt:       { fontSize:FS.sm, color:C.primary, fontWeight:'700' },
  section:      { marginBottom:SP.lg },
  pendingCard:  { backgroundColor:C.warningBg, borderRadius:R.md, padding:SP.md,
    marginBottom:SP.sm, borderLeftWidth:4, borderLeftColor:C.warning },
  pendingPet:   { fontSize:FS.md, fontWeight:'800', color:C.text },
  pendingAddr:  { fontSize:FS.sm, color:C.textSub, marginTop:4 },
  histCard:     { backgroundColor:C.white, borderRadius:R.md, padding:SP.md,
    marginBottom:SP.sm, ...SH.sm },
  histTop:      { flexDirection:'row', justifyContent:'space-between',
    alignItems:'center', marginBottom:SP.sm },
  histDate:     { fontSize:FS.sm, color:C.textSub },
  histPet:      { fontSize:FS.md, fontWeight:'800', color:C.text },
  histAddr:     { fontSize:FS.sm, color:C.textSub, marginTop:4 },
});
