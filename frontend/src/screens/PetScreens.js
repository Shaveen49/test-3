// src/screens/PetScreens.js
// Matches backend PetDto.PetRequest: { name, breed, birthday (YYYY-MM-DD), species?, photoUrl? }

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, RefreshControl, Alert,Platform,Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { petAPI } from '../services/api';
import { PetCard, Empty, Spinner, ErrBox, Field, Btn } from '../components';
import { C, SP, FS, R, SH } from '../utils/theme';

import DateTimePicker from '@react-native-community/datetimepicker';
// import {  } from 'react-native';
ds
function DateField({ label, value, onChange, mode = 'date', required = false }) {
  const [show, setShow] = useState(false);

  // Parse stored string back to a Date object for the picker
  const parseValue = () => {
    if (!value) return new Date();
    try { return new Date(value); } catch (_) { return new Date(); }
  };

  const formatDisplay = () => {
    if (!value) return mode === 'datetime' ? 'Tap to select date & time' : 'Tap to select date';
    if (mode === 'datetime') {
      const d = parseValue();
      return d.toLocaleDateString('en-LK', {
        day: '2-digit', month: 'short', year: 'numeric',
      }) + '  ' + d.toLocaleTimeString('en-LK', {
        hour: '2-digit', minute: '2-digit',
      });
    }
    const d = parseValue();
    return d.toLocaleDateString('en-LK', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const onPick = (event, selected) => {
    // On Android the picker closes itself; on iOS keep it open
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed') { setShow(false); return; }
    if (selected) {
      if (mode === 'date') {
        // Format as YYYY-MM-DD
        const y = selected.getFullYear();
        const m = String(selected.getMonth() + 1).padStart(2, '0');
        const d = String(selected.getDate()).padStart(2, '0');
        onChange(`${y}-${m}-${d}`);
      } else {
        // Format as ISO datetime YYYY-MM-DDTHH:MM:00
        const y  = selected.getFullYear();
        const mo = String(selected.getMonth() + 1).padStart(2, '0');
        const d  = String(selected.getDate()).padStart(2, '0');
        const h  = String(selected.getHours()).padStart(2, '0');
        const mi = String(selected.getMinutes()).padStart(2, '0');
        onChange(`${y}-${mo}-${d}T${h}:${mi}:00`);
      }
    }
  };

  return (
    <View style={ds.wrap}>
      {label ? <Text style={ds.label}>{label}</Text> : null}

      <TouchableOpacity style={ds.btn} onPress={() => setShow(true)} activeOpacity={0.75}>
        <Text style={ds.calIcon}>📅</Text>
        <Text style={[ds.valueText, !value && ds.placeholder]}>
          {formatDisplay()}
        </Text>
        <Text style={ds.chevron}>›</Text>
      </TouchableOpacity>

      {/* Android: show inline picker when tapped */}
      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={parseValue()}
          mode={mode === 'datetime' ? 'datetime' : 'date'}
          display="default"
          onChange={onPick}
          maximumDate={mode === 'date' ? new Date() : undefined}
        />
      )}

      {/* iOS: show inside a modal sheet so it doesn't cover fields */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={ds.iosOverlay}>
            <View style={ds.iosSheet}>
              <View style={ds.iosHeader}>
                <Text style={ds.iosTitle}>{label ?? 'Select Date'}</Text>
                <TouchableOpacity onPress={() => setShow(false)} style={ds.iosDone}>
                  <Text style={ds.iosDoneTxt}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={parseValue()}
                mode={mode === 'datetime' ? 'datetime' : 'date'}
                display="spinner"
                onChange={onPick}
                style={{ height: 200 }}
                maximumDate={mode === 'date' ? new Date() : undefined}
                themeVariant="light"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const ds = StyleSheet.create({
  wrap:        { marginBottom: SP.md },
  label:       { fontSize: FS.xs, fontWeight: '700', color: C.textSub,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  btn:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderColor: C.border, borderRadius: R.sm, paddingHorizontal: SP.md,
    paddingVertical: 12, backgroundColor: C.white },
  calIcon:     { fontSize: 18, marginRight: SP.sm },
  valueText:   { flex: 1, fontSize: FS.md, color: C.text, fontWeight: '600' },
  placeholder: { color: C.textMuted, fontWeight: '400' },
  chevron:     { fontSize: 20, color: C.textMuted },
  iosOverlay:  { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  iosSheet:    { backgroundColor: C.white, borderTopLeftRadius: 20,
    borderTopRightRadius: 20, paddingBottom: SP.xl },
  iosHeader:   { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: SP.lg, borderBottomWidth: 1,
    borderBottomColor: C.border },
  iosTitle:    { fontSize: FS.lg, fontWeight: '800', color: C.text },
  iosDone:     { paddingHorizontal: SP.md, paddingVertical: SP.sm,
    backgroundColor: C.primary, borderRadius: R.full },
  iosDoneTxt:  { color: C.white, fontWeight: '800', fontSize: FS.sm },
});

// ── PetListScreen ─────────────────────────────────────────
export function PetListScreen({ navigation }) {
  const [pets,       setPets]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  useFocusEffect(useCallback(() => { fetchPets(); }, []));

  const fetchPets = async () => {
    try {
      setError(null);
      const { data } = await petAPI.getAll();
      setPets(data ?? []);
    } catch (_) {
      setError('Could not load pets. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const confirmDelete = (pet) =>
    Alert.alert(
      `Delete ${pet.name}?`,
      'This will permanently remove the pet and all its records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await petAPI.remove(pet.id);
              fetchPets();
            } catch (_) {
              Alert.alert('Error', 'Could not delete pet. Please try again.');
            }
          },
        },
      ]
    );

  if (loading) return <Spinner msg="Loading your pets…" />;
  if (error)   return <ErrBox msg={error} onRetry={fetchPets} />;

  return (
    <View style={s.screen}>
      <FlatList
        data={pets}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor={C.primary}
            onRefresh={() => { setRefreshing(true); fetchPets(); }} />
        }
        renderItem={({ item }) => (
          <View>
            <PetCard
              pet={item}
              onPress={() => navigation.navigate('Medical', {
                petId: item.id, petName: item.name,
              })}
            />
            <TouchableOpacity style={s.delBtn} onPress={() => confirmDelete(item)}>
              <Text style={s.delTxt}>🗑  Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Empty
            icon="🐾" title="No pets added yet"
            sub="Tap the + button to add your first furry friend!"
            onAction={() => navigation.navigate('AddPet')} actionLbl="Add My First Pet"
          />
        }
      />

      {/* Floating action button */}
      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('AddPet')} activeOpacity={0.88}>
        <Text style={s.fabTxt}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── AddPetScreen ──────────────────────────────────────────
// birthday must be sent as "YYYY-MM-DD" (LocalDate on backend)
export function AddPetScreen({ navigation }) {
  const SPECIES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Fish', 'Other'];
  const EMOJI   = { Dog:'🐶', Cat:'🐱', Bird:'🐦', Rabbit:'🐰', Fish:'🐟', Other:'🐾' };

  const [f, setF] = useState({
    name: '', breed: '', birthday: '', species: 'Dog', photoUrl: '',
  });
  const [err,  setErr]  = useState({});
  const [busy, setBusy] = useState(false);
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));
  const [showDate, setShowDate] = useState(false);

  const validate = () => {
    const e = {};
    if (!f.name.trim())  e.name    = 'Pet name is required';
    if (!f.breed.trim()) e.breed   = 'Breed is required';
    if (!f.birthday)     e.birthday = 'Birthday is required';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(f.birthday))
                         e.birthday = 'Use format YYYY-MM-DD (e.g. 2020-03-15)';
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      // Backend PetRequest fields exactly
      await petAPI.create({
        name:     f.name.trim(),
        breed:    f.breed.trim(),
        birthday: f.birthday,           // YYYY-MM-DD  ← LocalDate
        species:  f.species || null,
        photoUrl: f.photoUrl.trim() || null,
      });
      Alert.alert('Added! 🎉', `${f.name} has been added to your pets.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (ex) {
      const msg = ex.response?.data?.message ?? 'Failed to add pet. Please try again.';
      Alert.alert('Error', msg);
    } finally { setBusy(false); }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.form}
      showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* Species picker */}
      <Text style={s.secLbl}>PET TYPE</Text>
      <View style={s.speciesGrid}>
        {SPECIES.map(sp => (
          <TouchableOpacity key={sp}
            style={[s.spBtn, f.species === sp && s.spBtnOn]}
            onPress={() => up('species', sp)}>
            <Text style={{ fontSize: 24, marginBottom: 4 }}>{EMOJI[sp]}</Text>
            <Text style={[s.spTxt, f.species === sp && { color: C.primary }]}>{sp}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="Pet Name *" value={f.name} onChangeText={v => up('name', v)}
        placeholder="e.g. Buddy" error={err.name} />

      <Field label="Breed *" value={f.breed} onChangeText={v => up('breed', v)}
        placeholder="e.g. Golden Retriever" error={err.breed} />

      <DateField
          label="Birthday *"
          value={f.birthday}
          onChange={v => up('birthday', v)}
          mode="date"
        />

      <Field label="Photo URL (optional)" value={f.photoUrl}
        onChangeText={v => up('photoUrl', v)}
        placeholder="https://…" autoCapitalize="none" autoCorrect={false} />

      <Btn title="Add Pet  🐾" onPress={submit} loading={busy} style={{ marginTop: SP.sm }} />
      <View style={{ height: SP.xxl }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: C.bg },
  list:        { padding: SP.md, paddingBottom: 110 },
  delBtn:      { alignSelf: 'flex-end', marginTop: -SP.sm,
    marginRight: SP.sm, marginBottom: SP.xs, paddingHorizontal: SP.sm },
  delTxt:      { fontSize: FS.xs, color: C.error, fontWeight: '600' },
  fab:         { position:'absolute', bottom:SP.xl, right:SP.lg, width:60, height:60,
    borderRadius:30, backgroundColor:C.primary, alignItems:'center',
    justifyContent:'center', ...SH.lg },
  fabTxt:      { fontSize: 34, color: C.white, lineHeight: 38 },
  form:        { padding: SP.md, paddingBottom: 60 },
  secLbl:      { fontSize: FS.xs, fontWeight: '700', color: C.textSub,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: SP.sm },
  speciesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.lg },
  spBtn:       { alignItems: 'center', padding: SP.sm, borderRadius: R.md,
    borderWidth: 2, borderColor: C.border, backgroundColor: C.white, minWidth: 76 },
  spBtnOn:     { borderColor: C.primary, backgroundColor: C.primary + '14' },
  spTxt:       { fontSize: FS.xs, fontWeight: '700', color: C.textSub },
});
