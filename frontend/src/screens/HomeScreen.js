// src/screens/HomeScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { petAPI, rideAPI, reminderAPI } from '../services/api';
import { PetCard, SecHead, Empty, StatusBadge, Spinner } from '../components';
import { C, SP, FS, R, SH } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [pets,       setPets]       = useState([]);
  const [recentRide, setRecentRide] = useState(null);
  const [reminders,  setReminders]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    try {
      const [pRes, rRes] = await Promise.all([petAPI.getAll(), rideAPI.getMyRides()]);
      const petList = pRes.data ?? [];
      setPets(petList.slice(0, 3));
      const rides = rRes.data ?? [];
      setRecentRide(rides[0] ?? null);

      // Fetch pending reminders for up to 3 pets
      const rems = [];
      for (const p of petList.slice(0, 3)) {
        try {
          const r = await reminderAPI.getPending(p.id);
          rems.push(...(r.data ?? []).map(x => ({ ...x, _petName: p.name })));
        } catch (_) {}
      }
      setReminders(rems.slice(0, 4));
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const greet = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const doLogout = () =>
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);

  if (loading) return <Spinner msg="Loading your dashboard…" />;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={C.primary}
          onRefresh={() => { setRefreshing(true); load(); }} />
      }>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.greet}>{greet()},</Text>
          <Text style={s.name}>{user?.name?.split(' ')[0]} 👋</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={doLogout}>
          <Text style={s.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* ── Quick actions ── */}
      <View style={s.qaWrap}>
        {[
          { ico:'🐾', lbl:'My Pets',   onPress:() => navigation.navigate('PetList') },
          { ico:'🏥', lbl:'Medical',   onPress:() => navigation.navigate('PetList') },
          { ico:'🚗', lbl:'Book Ride', onPress:() => navigation.navigate('BookRide') },
          { ico:'📅', lbl:'Reminders', onPress:() => navigation.navigate('PetList') },
        ].map(a => (
          <TouchableOpacity key={a.lbl} style={s.qa} onPress={a.onPress} activeOpacity={0.8}>
            <View style={s.qaIco}><Text style={{ fontSize: 24 }}>{a.ico}</Text></View>
            <Text style={s.qaLbl}>{a.lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── My Pets ── */}
      <View style={s.section}>
        <SecHead title="My Pets" onMore={() => navigation.navigate('PetList')} />
        {pets.length === 0
          ? <Empty icon="🐶" title="No pets yet"
              sub="Add your first pet to get started"
              onAction={() => navigation.navigate('AddPet')} actionLbl="Add Pet" />
          : pets.map(p => (
              <PetCard key={p.id} pet={p}
                onPress={() => navigation.navigate('Medical', { petId: p.id, petName: p.name })} />
            ))
        }
      </View>

      {/* ── Recent ride ── */}
      {recentRide && (
        <View style={s.section}>
          <SecHead title="Recent Ride"
            onMore={() => navigation.navigate('RideHistory')} moreLabel="All Rides" />
          <TouchableOpacity style={s.rideCard} activeOpacity={0.85}
            onPress={() => navigation.navigate('TrackRide', { rideId: recentRide.id })}>
            <View style={s.rideTop}>
              <StatusBadge status={recentRide.status} />
              <Text style={s.rideDate}>
                {new Date(recentRide.requestedAt).toLocaleDateString('en-LK',
                  { day: 'numeric', month: 'short' })}
              </Text>
            </View>
            <Text style={s.ridePet}>🐾  {recentRide.petName}</Text>
            <Text style={s.rideAddr} numberOfLines={1}>📍  {recentRide.pickupAddress}</Text>
            <Text style={s.rideAddr} numberOfLines={1}>🏁  {recentRide.dropAddress}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Reminders ── */}
      {reminders.length > 0 && (
        <View style={s.section}>
          <SecHead title="Upcoming Reminders" />
          {reminders.map(r => (
            <View key={r.id} style={s.remCard}>
              <Text style={{ fontSize: 28, marginRight: SP.md }}>
                {r.type === 'VET_VISIT' ? '🏥' : r.type === 'MEDICATION' ? '💊'
                  : r.type === 'VACCINATION' ? '💉' : r.type === 'GROOMING' ? '✂️' : '🔔'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={s.remTitle}>{r.title}</Text>
                <Text style={s.remPet}>{r._petName}</Text>
                <Text style={s.remDate}>
                  {new Date(r.reminderDateTime).toLocaleString('en-LK',
                    { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: SP.xxl }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: C.bg },
  content:   { padding: SP.md },
  header:    { flexDirection:'row', justifyContent:'space-between',
    alignItems:'flex-start', marginBottom:SP.xl, marginTop:SP.sm },
  greet:     { fontSize: FS.md, color: C.textSub },
  name:      { fontSize: FS.xxl, fontWeight: '900', color: C.text },
  logoutBtn: { paddingHorizontal: SP.md, paddingVertical: SP.sm,
    borderRadius: R.full, borderWidth: 1, borderColor: C.border },
  logoutTxt: { fontSize: FS.sm, color: C.textSub, fontWeight: '600' },
  qaWrap:    { flexDirection:'row', justifyContent:'space-between', marginBottom:SP.xl },
  qa:        { alignItems:'center', flex:1 },
  qaIco:     { width:58, height:58, borderRadius:16, backgroundColor:C.white,
    alignItems:'center', justifyContent:'center', marginBottom:6, ...SH.sm },
  qaLbl:     { fontSize:FS.xs, fontWeight:'700', color:C.textSub, textAlign:'center' },
  section:   { marginBottom: SP.lg },
  rideCard:  { backgroundColor:C.white, borderRadius:R.md, padding:SP.md, ...SH.sm },
  rideTop:   { flexDirection:'row', justifyContent:'space-between',
    alignItems:'center', marginBottom:SP.sm },
  rideDate:  { fontSize:FS.sm, color:C.textSub },
  ridePet:   { fontSize:FS.md, fontWeight:'700', color:C.text, marginBottom:4 },
  rideAddr:  { fontSize:FS.sm, color:C.textSub, marginTop:2 },
  remCard:   { flexDirection:'row', alignItems:'center', backgroundColor:C.white,
    borderRadius:R.md, padding:SP.md, marginBottom:SP.sm, ...SH.sm },
  remTitle:  { fontSize:FS.md, fontWeight:'700', color:C.text },
  remPet:    { fontSize:FS.sm, color:C.primary, marginTop:2, fontWeight:'600' },
  remDate:   { fontSize:FS.xs, color:C.textSub, marginTop:2 },
});
