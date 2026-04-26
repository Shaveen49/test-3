// src/screens/MedicalScreen.js
// Fixes applied:
//  1. Date fields → native calendar/date-wheel picker (no manual typing)
//  2. SheetModal wrapped in KeyboardAvoidingView so fields stay
//     visible above the keyboard
//  3. DateTimePicker works cross-platform:
//     - Android → inline calendar dialog
//     - iOS     → bottom sheet spinner wheel

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { recordAPI, medAPI, reminderAPI } from '../services/api';
import { Field, Btn, Empty, Spinner } from '../components';
import { C, SP, FS, R, SH } from '../utils/theme';

// ─────────────────────────────────────────────────────────
// Shared DateField component
// Shows a tappable button → opens native date picker
// Returns value as "YYYY-MM-DD" string (for date) or
// "YYYY-MM-DDTHH:MM:00" string (for datetime)
// ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────
// Root tab container
// ─────────────────────────────────────────────────────────
export default function MedicalScreen({ route, navigation }) {
  const { petId, petName } = route.params;
  const [tab, setTab] = useState('records');

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: `${petName}'s Health` });
  }, [petName]);

  const TABS = [
    { k: 'records',     lbl: '🏥 Records' },
    { k: 'medications', lbl: '💊 Meds' },
    { k: 'reminders',   lbl: '🔔 Reminders' },
  ];

  return (
    <View style={s.root}>
      <View style={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.k}
            style={[s.tab, tab === t.k && s.tabOn]}
            onPress={() => setTab(t.k)}>
            <Text style={[s.tabTxt, tab === t.k && s.tabTxtOn]}>{t.lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'records'     && <RecordsTab     petId={petId} />}
      {tab === 'medications' && <MedicationsTab petId={petId} />}
      {tab === 'reminders'   && <RemindersTab   petId={petId} />}
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// Records Tab
// ─────────────────────────────────────────────────────────
function RecordsTab({ petId }) {
  const BLANK = { visitDate: '', description: '', vetName: '',
                  clinicName: '', diagnosis: '', cost: '' };
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [f,       setF]       = useState(BLANK);
  const [saving,  setSaving]  = useState(false);
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    try { const { data } = await recordAPI.getAll(petId); setItems(data ?? []); }
    catch (_) {} finally { setLoading(false); }
  };

  const save = async () => {
    if (!f.visitDate || !f.description.trim() || !f.vetName.trim()) {
      Alert.alert('Required Fields',
        'Please select a visit date and fill in description and vet name.');
      return;
    }
    setSaving(true);
    try {
      await recordAPI.create(petId, {
        visitDate:   f.visitDate,
        description: f.description,
        vetName:     f.vetName,
        clinicName:  f.clinicName  || null,
        diagnosis:   f.diagnosis   || null,
        cost:        f.cost ? parseFloat(f.cost) : null,
      });
      setModal(false); setF(BLANK); load();
    } catch (ex) {
      Alert.alert('Error', ex.response?.data?.message ?? 'Failed to save record.');
    } finally { setSaving(false); }
  };

  const del = (id) =>
    Alert.alert('Delete record?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive',
        onPress: async () => { await recordAPI.remove(petId, id); load(); } },
    ]);

  if (loading) return <Spinner />;

  return (
    <View style={s.flex1}>
      <FlatList
        data={items}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={s.listPad}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <View style={s.datePill}>
                <Text style={s.datePillTxt}>{item.visitDate}</Text>
              </View>
              <TouchableOpacity onPress={() => del(item.id)}>
                <Text style={{ fontSize: 18 }}>🗑️</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.cardDesc}>{item.description}</Text>
            <Text style={s.cardMeta}>
              Dr. {item.vetName}{item.clinicName ? `  •  ${item.clinicName}` : ''}
            </Text>
            {item.diagnosis
              ? <Text style={s.cardMeta}>Dx: {item.diagnosis}</Text>
              : null}
            {item.cost
              ? <Text style={s.cardCost}>LKR {Number(item.cost).toLocaleString()}</Text>
              : null}
          </View>
        )}
        ListEmptyComponent={
          <Empty icon="🏥" title="No vet visits yet"
            sub="Tap + to add your first medical record"
            onAction={() => setModal(true)} actionLbl="Add Record" />
        }
      />
      <FAB onPress={() => setModal(true)} />

      <SheetModal visible={modal} title="Add Vet Visit"
        onClose={() => { setModal(false); setF(BLANK); }}
        onSave={save} saving={saving}>

        {/* 📅 Native date picker — no manual typing */}
        <DateField
          label="Visit Date *"
          value={f.visitDate}
          onChange={v => up('visitDate', v)}
          mode="date"
        />

        <Field label="Description *" value={f.description}
          onChangeText={v => up('description', v)}
          placeholder="Routine checkup, vaccination…"
          multiline numberOfLines={3}
          style={{ minHeight: 80 }} />

        <Field label="Vet Name *" value={f.vetName}
          onChangeText={v => up('vetName', v)}
          placeholder="Dr. Priya Silva" />

        <Field label="Clinic Name (optional)" value={f.clinicName}
          onChangeText={v => up('clinicName', v)}
          placeholder="Colombo Pet Clinic" />

        <Field label="Diagnosis (optional)" value={f.diagnosis}
          onChangeText={v => up('diagnosis', v)}
          placeholder="Healthy / Gastritis…" />

        <Field label="Cost LKR (optional)" value={f.cost}
          onChangeText={v => up('cost', v)}
          keyboardType="numeric" placeholder="2500" />
      </SheetModal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// Medications Tab
// ─────────────────────────────────────────────────────────
function MedicationsTab({ petId }) {
  const BLANK = { name: '', type: 'VACCINE', dateAdministered: '',
                  nextDueDate: '', dosage: '', notes: '' };
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [f,       setF]       = useState(BLANK);
  const [saving,  setSaving]  = useState(false);
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    try { const { data } = await medAPI.getAll(petId); setItems(data ?? []); }
    catch (_) {} finally { setLoading(false); }
  };

  const save = async () => {
    if (!f.name.trim() || !f.dateAdministered) {
      Alert.alert('Required Fields',
        'Medication name and date administered are required.');
      return;
    }
    setSaving(true);
    try {
      await medAPI.create(petId, {
        name:             f.name,
        type:             f.type,
        dateAdministered: f.dateAdministered,
        nextDueDate:      f.nextDueDate || null,
        dosage:           f.dosage      || null,
        notes:            f.notes       || null,
      });
      setModal(false); setF(BLANK); load();
    } catch (ex) {
      Alert.alert('Error', ex.response?.data?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <View style={s.flex1}>
      <FlatList
        data={items}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={s.listPad}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <View style={[s.typePill,
                item.type === 'VACCINE' ? s.vaccinePill : s.medicinePill]}>
                <Text style={s.typePillTxt}>
                  {item.type === 'VACCINE' ? '💉 Vaccine' : '💊 Medicine'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={async () => { await medAPI.remove(petId, item.id); load(); }}>
                <Text style={{ fontSize: 18 }}>🗑️</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.medName}>{item.name}</Text>
            <Text style={s.cardMeta}>Given: {item.dateAdministered}</Text>
            {item.nextDueDate
              ? <Text style={[s.cardMeta, { color: C.warning }]}>
                  Next due: {item.nextDueDate}
                </Text>
              : null}
            {item.dosage ? <Text style={s.cardMeta}>Dose: {item.dosage}</Text> : null}
            {item.notes  ? <Text style={s.cardMeta}>{item.notes}</Text>  : null}
          </View>
        )}
        ListEmptyComponent={
          <Empty icon="💊" title="No medications yet"
            onAction={() => setModal(true)} actionLbl="Add Medication" />
        }
      />
      <FAB onPress={() => setModal(true)} />

      <SheetModal visible={modal} title="Add Medication"
        onClose={() => { setModal(false); setF(BLANK); }}
        onSave={save} saving={saving}>

        {/* Type toggle */}
        <Text style={s.fieldLbl}>TYPE *</Text>
        <View style={s.toggleRow}>
          {[{ k:'VACCINE',ico:'💉',lbl:'Vaccine'},{k:'MEDICINE',ico:'💊',lbl:'Medicine'}]
            .map(t => (
              <TouchableOpacity key={t.k}
                style={[s.toggleBtn, f.type === t.k && s.toggleBtnOn]}
                onPress={() => up('type', t.k)}>
                <Text style={{ fontSize: FS.md }}>{t.ico}</Text>
                <Text style={[s.toggleLbl, f.type === t.k && { color: C.primary }]}>
                  {t.lbl}
                </Text>
              </TouchableOpacity>
          ))}
        </View>

        <Field label="Medication Name *" value={f.name}
          onChangeText={v => up('name', v)} placeholder="e.g. Rabies Vaccine" />

        {/* 📅 Native date pickers */}
        <DateField
          label="Date Given *"
          value={f.dateAdministered}
          onChange={v => up('dateAdministered', v)}
          mode="date"
        />
        <DateField
          label="Next Due Date (optional)"
          value={f.nextDueDate}
          onChange={v => up('nextDueDate', v)}
          mode="date"
        />

        <Field label="Dosage (optional)" value={f.dosage}
          onChangeText={v => up('dosage', v)} placeholder="e.g. 5 ml" />

        <Field label="Notes (optional)" value={f.notes}
          onChangeText={v => up('notes', v)} placeholder="Any additional notes…" />
      </SheetModal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// Reminders Tab
// ─────────────────────────────────────────────────────────
function RemindersTab({ petId }) {
  const TYPES = ['VET_VISIT','MEDICATION','VACCINATION','GROOMING','OTHER'];
  const BLANK = { title: '', description: '', reminderDateTime: '', type: 'VET_VISIT' };
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [f,       setF]       = useState(BLANK);
  const [saving,  setSaving]  = useState(false);
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    try { const { data } = await reminderAPI.getAll(petId); setItems(data ?? []); }
    catch (_) {} finally { setLoading(false); }
  };

  const save = async () => {
    if (!f.title.trim() || !f.reminderDateTime) {
      Alert.alert('Required Fields', 'Title and reminder date/time are required.');
      return;
    }
    setSaving(true);
    try {
      await reminderAPI.create(petId, {
        title:            f.title,
        description:      f.description || null,
        reminderDateTime: f.reminderDateTime,
        type:             f.type,
      });
      setModal(false); setF(BLANK); load();
    } catch (ex) {
      Alert.alert('Error', ex.response?.data?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  };

  const markDone = async (id) => {
    try { await reminderAPI.markComplete(petId, id); load(); }
    catch (_) { Alert.alert('Error', 'Could not mark as complete.'); }
  };

  const del = async (id) => {
    try { await reminderAPI.remove(petId, id); load(); }
    catch (_) {}
  };

  if (loading) return <Spinner />;

  const typeIcon = (t) =>
    ({ VET_VISIT:'🏥',MEDICATION:'💊',VACCINATION:'💉',GROOMING:'✂️',OTHER:'🔔' }[t] ?? '🔔');

  const typeColor = (t) =>
    ({ VET_VISIT:C.primary, MEDICATION:C.accent,
       VACCINATION:C.success, GROOMING:C.warning, OTHER:C.info }[t] ?? C.textSub);

  return (
    <View style={s.flex1}>
      <FlatList
        data={items}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={s.listPad}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[s.card, item.completed && s.cardDone]}>
            <View style={s.cardTop}>
              <View style={s.remTypeWrap}>
                <Text style={{ fontSize: 18, marginRight: 6 }}>{typeIcon(item.type)}</Text>
                <Text style={[s.remTypeTxt, { color: typeColor(item.type) }]}>
                  {item.type.replace(/_/g, ' ')}
                </Text>
              </View>
              <View style={s.remActions}>
                {!item.completed && (
                  <TouchableOpacity style={s.doneBtn}
                    onPress={() => markDone(item.id)}>
                    <Text style={s.doneTxt}>✓ Done</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => del(item.id)}>
                  <Text style={{ fontSize: 18 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[s.medName, item.completed && s.strikethrough]}>
              {item.title}
            </Text>
            {item.description
              ? <Text style={s.cardMeta}>{item.description}</Text>
              : null}
            <Text style={s.cardMeta}>
              {new Date(item.reminderDateTime).toLocaleString('en-LK', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
            {item.completed
              ? <Text style={s.completedTag}>✅  Completed</Text>
              : null}
          </View>
        )}
        ListEmptyComponent={
          <Empty icon="🔔" title="No reminders yet"
            sub="Tap + to set your first reminder"
            onAction={() => setModal(true)} actionLbl="Add Reminder" />
        }
      />
      <FAB onPress={() => setModal(true)} />

      <SheetModal visible={modal} title="Add Reminder"
        onClose={() => { setModal(false); setF(BLANK); }}
        onSave={save} saving={saving}>

        <Field label="Title *" value={f.title}
          onChangeText={v => up('title', v)} placeholder="e.g. Annual checkup" />

        {/* 📅 Native date+time picker */}
        <DateField
          label="Reminder Date & Time *"
          value={f.reminderDateTime}
          onChange={v => up('reminderDateTime', v)}
          mode="datetime"
        />

        <Field label="Description (optional)" value={f.description}
          onChangeText={v => up('description', v)}
          placeholder="Any extra notes…" />

        {/* Reminder type selector */}
        <Text style={s.fieldLbl}>TYPE *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom: SP.md }}>
          {TYPES.map(t => (
            <TouchableOpacity key={t}
              style={[s.typeChip,
                { marginRight: SP.sm,
                  borderColor: f.type === t ? typeColor(t) : C.border,
                  backgroundColor: f.type === t ? typeColor(t)+'18' : C.white,
                }]}
              onPress={() => up('type', t)}>
              <Text style={{ fontSize: 16 }}>{typeIcon(t)}</Text>
              <Text style={[s.typeChipTxt,
                { color: f.type === t ? typeColor(t) : C.textSub }]}>
                {t.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SheetModal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────
function FAB({ onPress }) {
  return (
    <TouchableOpacity style={s.fab} onPress={onPress} activeOpacity={0.88}>
      <Text style={s.fabTxt}>+</Text>
    </TouchableOpacity>
  );
}

// SheetModal — keyboard-avoiding so fields never hide behind the keyboard
function SheetModal({ visible, title, onClose, onSave, saving, children }) {
  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            {/* Header */}
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={{ padding: SP.xs }}>
                <Text style={{ fontSize: 22, color: C.textSub }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable content — fields scroll up above keyboard */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: SP.lg }}>
              {children}
            </ScrollView>

            {/* Save button always visible above keyboard */}
            <Btn title="Save" onPress={onSave} loading={saving}
              style={{ marginTop: SP.sm }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex:1, backgroundColor:C.bg },
  flex1:        { flex:1 },
  tabBar:       { flexDirection:'row', backgroundColor:C.surface,
    borderBottomWidth:1, borderBottomColor:C.border },
  tab:          { flex:1, paddingVertical:14, alignItems:'center',
    borderBottomWidth:2.5, borderBottomColor:'transparent' },
  tabOn:        { borderBottomColor:C.primary },
  tabTxt:       { fontSize:FS.sm, fontWeight:'600', color:C.textSub },
  tabTxtOn:     { color:C.primary },
  listPad:      { padding:SP.md, paddingBottom:110 },
  card:         { backgroundColor:C.surface, borderRadius:R.md,
    padding:SP.md, marginBottom:SP.sm, ...SH.sm },
  cardDone:     { opacity:0.55 },
  cardTop:      { flexDirection:'row', justifyContent:'space-between',
    alignItems:'center', marginBottom:SP.sm },
  datePill:     { backgroundColor:C.primary+'18', paddingHorizontal:SP.sm,
    paddingVertical:4, borderRadius:R.full },
  datePillTxt:  { fontSize:FS.xs, fontWeight:'800', color:C.primary },
  cardDesc:     { fontSize:FS.md, color:C.text, marginBottom:SP.xs },
  cardMeta:     { fontSize:FS.sm, color:C.textSub, marginTop:2 },
  cardCost:     { fontSize:FS.sm, fontWeight:'800', color:C.primary, marginTop:SP.xs },
  typePill:     { paddingHorizontal:SP.sm, paddingVertical:4, borderRadius:R.full },
  vaccinePill:  { backgroundColor:C.primaryLight+'30' },
  medicinePill: { backgroundColor:C.accent+'20' },
  typePillTxt:  { fontSize:FS.xs, fontWeight:'800' },
  medName:      { fontSize:FS.lg, fontWeight:'800', color:C.text },
  strikethrough:{ textDecorationLine:'line-through', color:C.textMuted },
  remTypeWrap:  { flexDirection:'row', alignItems:'center' },
  remTypeTxt:   { fontSize:FS.xs, fontWeight:'800',
    textTransform:'uppercase', letterSpacing:0.5 },
  remActions:   { flexDirection:'row', alignItems:'center', gap:SP.sm },
  doneBtn:      { backgroundColor:C.success+'22', paddingHorizontal:SP.sm,
    paddingVertical:4, borderRadius:R.full },
  doneTxt:      { fontSize:FS.xs, fontWeight:'800', color:C.success },
  completedTag: { fontSize:FS.xs, color:C.success, marginTop:SP.xs, fontWeight:'700' },
  fab:          { position:'absolute', bottom:SP.xl, right:SP.lg, width:58, height:58,
    borderRadius:29, backgroundColor:C.primary, alignItems:'center',
    justifyContent:'center', ...SH.lg },
  fabTxt:       { fontSize:30, color:C.white, lineHeight:34 },
  overlay:      { flex:1, backgroundColor:C.overlay, justifyContent:'flex-end' },
  sheet:        { backgroundColor:C.white, borderTopLeftRadius:24,
    borderTopRightRadius:24, padding:SP.xl, maxHeight:'90%' },
  sheetHeader:  { flexDirection:'row', justifyContent:'space-between',
    alignItems:'center', marginBottom:SP.lg },
  sheetTitle:   { fontSize:FS.xl, fontWeight:'900', color:C.text },
  fieldLbl:     { fontSize:FS.xs, fontWeight:'700', color:C.textSub,
    textTransform:'uppercase', letterSpacing:0.5, marginBottom:SP.sm },
  toggleRow:    { flexDirection:'row', gap:SP.md, marginBottom:SP.md },
  toggleBtn:    { flex:1, alignItems:'center', padding:SP.md, borderRadius:R.md,
    borderWidth:2, borderColor:C.border, backgroundColor:C.white, gap:4 },
  toggleBtnOn:  { borderColor:C.primary, backgroundColor:C.primary+'14' },
  toggleLbl:    { fontSize:FS.sm, fontWeight:'700', color:C.textSub },
  typeChip:     { alignItems:'center', paddingHorizontal:SP.md, paddingVertical:SP.sm,
    borderRadius:R.full, borderWidth:2, backgroundColor:C.white, gap:4 },
  typeChipTxt:  { fontSize:FS.xs, fontWeight:'700' },
});
