// src/screens/RideScreens.js
// New features added:
//  1. Vehicle category selection (auto-suggested by pet count + multi-pet selector)
//  2. Payment method selection
//  3. Multi-pet support (select multiple pets when using Van/Large Vehicle)
//  4. Fare estimate shown before booking
//  All extra data is packed into the backend `notes` field (no backend changes needed)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, FlatList, Modal,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { petAPI, rideAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  wsConnect, wsSubscribeRide, wsUnsubscribeRide, wsIsConnected,
} from '../services/websocket';
import { Field, Btn, Spinner, StatusBadge, Empty } from '../components';
import { C, SP, FS, R, SH } from '../utils/theme';

// ─────────────────────────────────────────────────────────
// Vehicle categories for Sri Lanka
// Rule: 1 pet → Three-wheeler or Car; 2+ pets → Car or Van
// ─────────────────────────────────────────────────────────
const VEHICLE_CATEGORIES = [
  {
    id:        'THREE_WHEELER',
    label:     'Three Wheeler',
    emoji:     '🛺',
    desc:      'Best for 1 small pet',
    maxPets:   1,
    baseRate:  80,    // LKR per km
    color:     '#F57C00',
    colorBg:   '#FFF3E0',
  },
  {
    id:        'CAR',
    label:     'Car',
    emoji:     '🚗',
    desc:      'Comfortable for 1–2 pets',
    maxPets:   2,
    baseRate:  120,
    color:     '#1565C0',
    colorBg:   '#E3F2FD',
  },
  {
    id:        'VAN',
    label:     'Small Van',
    emoji:     '🚐',
    desc:      'Spacious for 2+ pets',
    maxPets:   10,
    baseRate:  180,
    color:     '#2E7D5E',
    colorBg:   '#E8F5E9',
  },
  {
    id:        'LARGE_VEHICLE',
    label:     'Large Vehicle',
    emoji:     '🚌',
    desc:      'For many pets or large breeds',
    maxPets:   10,
    baseRate:  250,
    color:     '#6A1B9A',
    colorBg:   '#F3E5F5',
  },
];

// ─────────────────────────────────────────────────────────
// Payment methods
// ─────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'CASH',         label: 'Cash',          emoji: '💵', desc: 'Pay driver on arrival' },
  { id: 'CARD',         label: 'Credit / Debit', emoji: '💳', desc: 'Visa, Mastercard' },
  { id: 'ONLINE',       label: 'Online Transfer',emoji: '📱', desc: 'Bank transfer / eZ Cash' },
];

// ─────────────────────────────────────────────────────────
// Helper: estimate fare
// ─────────────────────────────────────────────────────────
function estimateFare(category, pickupLat, pickupLng, dropLat, dropLng) {
  if (!pickupLat || !pickupLng || !dropLat || !dropLng) return null;
  const R = 6371; // km
  const dLat = (dropLat - pickupLat) * Math.PI / 180;
  const dLng = (dropLng - pickupLng) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(pickupLat * Math.PI / 180) * Math.cos(dropLat * Math.PI / 180) *
    Math.sin(dLng/2)**2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const base = category?.baseRate ?? 120;
  return Math.round((dist * base) + 150); // base fare 150 LKR + per km
}

// ─────────────────────────────────────────────────────────
// BookRideScreen
// ─────────────────────────────────────────────────────────
export function BookRideScreen({ navigation }) {
  const [allPets,       setAllPets]       = useState([]);
  const [selectedPets,  setSelectedPets]  = useState([]);   // array for multi-select
  const [vehicleCat,    setVehicleCat]    = useState(null); // selected VEHICLE_CATEGORIES entry
  const [paymentMethod, setPaymentMethod] = useState(null); // selected PAYMENT_METHODS entry
  const [userCoord,     setUserCoord]     = useState(null);
  const [f, setF] = useState({
    pickupAddress: '', pickupLatitude: '', pickupLongitude: '',
    dropAddress:   '', dropLatitude:   '', dropLongitude:   '',
    notes: '',
  });
  const [loading,  setLoading]  = useState(true);
  const [booking,  setBooking]  = useState(false);
  const [step,     setStep]     = useState(1);   // wizard step 1–4
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const { data } = await petAPI.getAll();
        const list = data ?? [];
        setAllPets(list);
        // Auto-select first pet
        if (list.length > 0) setSelectedPets([list[0]]);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const { latitude, longitude } = loc.coords;
          setUserCoord({ latitude, longitude });
          up('pickupLatitude',  String(latitude.toFixed(6)));
          up('pickupLongitude', String(longitude.toFixed(6)));
          try {
            const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (addr) {
              up('pickupAddress',
                [addr.name, addr.street, addr.district, addr.city].filter(Boolean).join(', '));
            }
          } catch (_) {}
        }
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, []);

  // Auto-suggest vehicle category whenever pet selection changes
  useEffect(() => {
    if (selectedPets.length === 0) { setVehicleCat(null); return; }
    if (selectedPets.length === 1) {
      setVehicleCat(VEHICLE_CATEGORIES.find(v => v.id === 'THREE_WHEELER'));
    } else if (selectedPets.length === 2) {
      setVehicleCat(VEHICLE_CATEGORIES.find(v => v.id === 'CAR'));
    } else {
      setVehicleCat(VEHICLE_CATEGORIES.find(v => v.id === 'VAN'));
    }
  }, [selectedPets]);

  const togglePet = (pet) => {
    const already = selectedPets.find(p => p.id === pet.id);
    if (already) {
      // Don't allow deselecting last pet
      if (selectedPets.length === 1) return;
      setSelectedPets(selectedPets.filter(p => p.id !== pet.id));
    } else {
      setSelectedPets([...selectedPets, pet]);
    }
  };

  const fare = estimateFare(
    vehicleCat,
    parseFloat(f.pickupLatitude),  parseFloat(f.pickupLongitude),
    parseFloat(f.dropLatitude),    parseFloat(f.dropLongitude),
  );

  // ── Step validation ───────────────────────────────────
  const canGoStep2 = selectedPets.length > 0 && vehicleCat;
  const canGoStep3 = canGoStep2 &&
    f.pickupAddress && !isNaN(parseFloat(f.pickupLatitude)) &&
    f.dropAddress   && !isNaN(parseFloat(f.dropLatitude));
  const canBook = canGoStep3 && paymentMethod;

  const book = async () => {
    if (!canBook) return;
    setBooking(true);
    try {
      // Pack extra info into notes (no backend change needed)
      const petNames = selectedPets.map(p => p.name).join(', ');
      const notesPayload = [
        `Vehicle: ${vehicleCat.label}`,
        `Pets: ${petNames}`,
        `Payment: ${paymentMethod.label}`,
        f.notes ? `Note: ${f.notes}` : '',
      ].filter(Boolean).join(' | ');

      // Backend only takes one petId — use primary (first) selected pet
      const payload = {
        petId:           selectedPets[0].id,
        pickupAddress:   f.pickupAddress,
        pickupLatitude:  parseFloat(f.pickupLatitude),
        pickupLongitude: parseFloat(f.pickupLongitude),
        dropAddress:     f.dropAddress,
        dropLatitude:    parseFloat(f.dropLatitude),
        dropLongitude:   parseFloat(f.dropLongitude),
        notes:           notesPayload,
      };

      const { data: ride } = await rideAPI.request(payload);
      Alert.alert(
        '🚗  Ride Requested!',
        ride.driverName
          ? `Driver ${ride.driverName} has been assigned.`
          : 'Searching for a nearby driver…',
        [{ text: 'Track Ride', onPress: () =>
            navigation.replace('TrackRide', { rideId: ride.id }) }]
      );
    } catch (ex) {
      Alert.alert('Booking Failed',
        ex.response?.data?.message ?? 'Failed to request ride. Please try again.');
    } finally { setBooking(false); }
  };

  if (loading) return <Spinner msg="Getting your location…" />;

  if (allPets.length === 0) return (
    <View style={s.noPets}>
      <Text style={{ fontSize: 64 }}>🐾</Text>
      <Text style={s.noPetsTitle}>No Pets Found</Text>
      <Text style={s.noPetsSub}>Add a pet before booking a ride.</Text>
      <Btn title="Add a Pet" onPress={() => navigation.navigate('AddPet')}
        style={{ marginTop: SP.xl, paddingHorizontal: SP.xl }} />
    </View>
  );

  return (
    <View style={s.screen}>
      {/* ── Step indicator ── */}
      <StepBar step={step} />

      <ScrollView contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ══════════════════════════════════════════
            STEP 1 — Pet selection + Vehicle category
            ══════════════════════════════════════════ */}
        {step === 1 && (
          <>
            <SectionTitle icon="🐾" title="Select Your Pets"
              sub="Tap to select all pets travelling today" />

            {/* Multi-pet grid */}
            <View style={s.petGrid}>
              {allPets.map(pet => {
                const ico = { Cat:'🐱', Bird:'🐦', Rabbit:'🐰', Fish:'🐟' }[pet.species] ?? '🐶';
                const sel = !!selectedPets.find(p => p.id === pet.id);
                return (
                  <TouchableOpacity key={pet.id}
                    style={[s.petGridCard, sel && s.petGridCardOn]}
                    onPress={() => togglePet(pet)}
                    activeOpacity={0.8}>
                    {sel && <View style={s.checkBadge}><Text style={s.checkTxt}>✓</Text></View>}
                    <Text style={{ fontSize: 32 }}>{ico}</Text>
                    <Text style={[s.petGridName, sel && { color: C.primary }]}>{pet.name}</Text>
                    <Text style={s.petGridBreed}>{pet.breed}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.petCountRow}>
              <Text style={s.petCountTxt}>
                {selectedPets.length} pet{selectedPets.length !== 1 ? 's' : ''} selected
              </Text>
            </View>

            {/* Vehicle category */}
            <SectionTitle icon="🚗" title="Vehicle Type"
              sub="Auto-suggested based on pet count — tap to change" />

            <View style={s.vehicleGrid}>
              {VEHICLE_CATEGORIES.map(vc => {
                const sel = vehicleCat?.id === vc.id;
                const disabled = selectedPets.length > vc.maxPets;
                return (
                  <TouchableOpacity key={vc.id}
                    style={[s.vehicleCard,
                      sel && { borderColor: vc.color, backgroundColor: vc.colorBg },
                      disabled && s.vehicleCardDisabled,
                    ]}
                    onPress={() => { if (!disabled) setVehicleCat(vc); }}
                    activeOpacity={0.8}
                    disabled={disabled}>
                    <Text style={s.vehicleEmoji}>{vc.emoji}</Text>
                    <Text style={[s.vehicleLabel, sel && { color: vc.color }]}>{vc.label}</Text>
                    <Text style={s.vehicleDesc}>{vc.desc}</Text>
                    <Text style={[s.vehicleRate, sel && { color: vc.color }]}>
                      ~LKR {vc.baseRate}/km
                    </Text>
                    {disabled && (
                      <Text style={s.vehicleDisabledTxt}>Too many pets</Text>
                    )}
                    {sel && (
                      <View style={[s.vehicleSelBadge, { backgroundColor: vc.color }]}>
                        <Text style={s.vehicleSelTxt}>✓ Selected</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Btn title="Next: Set Locations →" onPress={() => setStep(2)}
              disabled={!canGoStep2} style={s.nextBtn} />
          </>
        )}

        {/* ══════════════════════════════════════════
            STEP 2 — Locations
            ══════════════════════════════════════════ */}
        {step === 2 && (
          <>
            {/* Map preview */}
            {userCoord && (
              <MapView provider={PROVIDER_GOOGLE} style={s.miniMap}
                initialRegion={{ ...userCoord, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
                scrollEnabled={false} zoomEnabled={false}>
                <Marker coordinate={userCoord} title="You">
                  <View style={s.youMk}><Text style={{ fontSize: 18 }}>📍</Text></View>
                </Marker>
              </MapView>
            )}

            <SectionTitle icon="📍" title="Pickup Location" />
            <View style={[s.locCard, { borderLeftColor: C.primary }]}>
              <View style={[s.locDot, { backgroundColor: C.primary }]} />
              <View style={s.flex1}>
                <Field value={f.pickupAddress} onChangeText={v => up('pickupAddress', v)}
                  placeholder="Pickup address" />
                <View style={s.coordRow}>
                  <Field value={f.pickupLatitude} onChangeText={v => up('pickupLatitude', v)}
                    placeholder="Latitude" keyboardType="decimal-pad" style={s.half} />
                  <Field value={f.pickupLongitude} onChangeText={v => up('pickupLongitude', v)}
                    placeholder="Longitude" keyboardType="decimal-pad" style={s.half} />
                </View>
                {userCoord && (
                  <TouchableOpacity onPress={() => {
                    up('pickupLatitude',  String(userCoord.latitude.toFixed(6)));
                    up('pickupLongitude', String(userCoord.longitude.toFixed(6)));
                  }}>
                    <Text style={s.gpsLink}>📱 Use my GPS location</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <SectionTitle icon="🏁" title="Drop-off Location" />
            <View style={[s.locCard, { borderLeftColor: C.accent }]}>
              <View style={[s.locDot, { backgroundColor: C.accent }]} />
              <View style={s.flex1}>
                <Field value={f.dropAddress} onChangeText={v => up('dropAddress', v)}
                  placeholder="Drop-off address" />
                <View style={s.coordRow}>
                  <Field value={f.dropLatitude} onChangeText={v => up('dropLatitude', v)}
                    placeholder="Latitude" keyboardType="decimal-pad" style={s.half} />
                  <Field value={f.dropLongitude} onChangeText={v => up('dropLongitude', v)}
                    placeholder="Longitude" keyboardType="decimal-pad" style={s.half} />
                </View>
                <TouchableOpacity onPress={() => {
                  up('dropAddress',   'Kandy, Central Province, Sri Lanka');
                  up('dropLatitude',  '7.2906');
                  up('dropLongitude', '80.6337');
                }}>
                  <Text style={s.gpsLink}>📍 Quick-fill: Kandy (demo)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Field label="Special Notes (optional)" value={f.notes}
              onChangeText={v => up('notes', v)}
              placeholder="e.g. My dog is anxious, please drive gently"
              multiline numberOfLines={2} />

            <View style={s.stepBtnRow}>
              <TouchableOpacity style={s.backBtn} onPress={() => setStep(1)}>
                <Text style={s.backBtnTxt}>← Back</Text>
              </TouchableOpacity>
              <Btn title="Next: Payment →" onPress={() => setStep(3)}
                disabled={!canGoStep3} style={s.flex1} />
            </View>
          </>
        )}

        {/* ══════════════════════════════════════════
            STEP 3 — Payment method
            ══════════════════════════════════════════ */}
        {step === 3 && (
          <>
            <SectionTitle icon="💳" title="Payment Method"
              sub="How will you pay the driver?" />

            {PAYMENT_METHODS.map(pm => {
              const sel = paymentMethod?.id === pm.id;
              return (
                <TouchableOpacity key={pm.id}
                  style={[s.paymentCard, sel && s.paymentCardOn]}
                  onPress={() => setPaymentMethod(pm)}
                  activeOpacity={0.82}>
                  <Text style={s.paymentEmoji}>{pm.emoji}</Text>
                  <View style={s.flex1}>
                    <Text style={[s.paymentLabel, sel && { color: C.primary }]}>
                      {pm.label}
                    </Text>
                    <Text style={s.paymentDesc}>{pm.desc}</Text>
                  </View>
                  <View style={[s.radioOuter, sel && { borderColor: C.primary }]}>
                    {sel && <View style={s.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={s.stepBtnRow}>
              <TouchableOpacity style={s.backBtn} onPress={() => setStep(2)}>
                <Text style={s.backBtnTxt}>← Back</Text>
              </TouchableOpacity>
              <Btn title="Review Booking →" onPress={() => setStep(4)}
                disabled={!paymentMethod} style={s.flex1} />
            </View>
          </>
        )}

        {/* ══════════════════════════════════════════
            STEP 4 — Review + Confirm
            ══════════════════════════════════════════ */}
        {step === 4 && (
          <>
            <SectionTitle icon="✅" title="Review Your Booking"
              sub="Check details before confirming" />

            {/* Summary card */}
            <View style={s.summaryCard}>
              {/* Pets */}
              <SummaryRow
                icon="🐾"
                label="Pets"
                value={selectedPets.map(p => p.name).join(', ')}
              />
              {/* Vehicle */}
              <SummaryRow
                icon={vehicleCat?.emoji}
                label="Vehicle"
                value={vehicleCat?.label}
                valueColor={vehicleCat?.color}
              />
              {/* Pickup */}
              <SummaryRow icon="📍" label="Pickup" value={f.pickupAddress} />
              {/* Drop */}
              <SummaryRow icon="🏁" label="Drop-off" value={f.dropAddress} />
              {/* Payment */}
              <SummaryRow
                icon={paymentMethod?.emoji}
                label="Payment"
                value={paymentMethod?.label}
              />
              {/* Notes */}
              {f.notes ? <SummaryRow icon="📝" label="Notes" value={f.notes} /> : null}
            </View>

            {/* Fare estimate */}
            <View style={s.fareCard}>
              <Text style={s.fareLabel}>Estimated Fare</Text>
              {fare
                ? <>
                    <Text style={s.fareAmount}>LKR {fare.toLocaleString()}</Text>
                    <Text style={s.fareSub}>
                      Based on straight-line distance • Actual fare may vary
                    </Text>
                  </>
                : <Text style={s.fareSub}>
                    Enter coordinates in Step 2 to see an estimate
                  </Text>
              }
            </View>

            {/* Info banner */}
            <View style={s.infoBanner}>
              <Text style={{ fontSize: 16 }}>ℹ️</Text>
              <Text style={s.infoTxt}>
                The nearest available {vehicleCat?.label} driver will be assigned automatically.
                You can track their live location after booking.
              </Text>
            </View>

            <View style={s.stepBtnRow}>
              <TouchableOpacity style={s.backBtn} onPress={() => setStep(3)}>
                <Text style={s.backBtnTxt}>← Back</Text>
              </TouchableOpacity>
              <Btn
                title={`${vehicleCat?.emoji} Confirm Booking`}
                onPress={book}
                loading={booking}
                disabled={!canBook}
                style={s.flex1}
              />
            </View>
          </>
        )}

        <View style={{ height: SP.xxl }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// TrackRideScreen  (unchanged logic, extended panel)
// ─────────────────────────────────────────────────────────
export function TrackRideScreen({ route, navigation }) {
  const { rideId } = route.params;
  const { token }  = useAuth();

  const [ride,      setRide]      = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [wsLive,    setWsLive]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    loadRide();
    wsConnect(token, () => {
      setWsLive(true);
      wsSubscribeRide(rideId, handleWsMsg);
    });
    return () => wsUnsubscribeRide(rideId);
  }, []);

  const loadRide = async () => {
    try {
      const { data } = await rideAPI.getById(rideId);
      setRide(data);
    } catch (_) {
      Alert.alert('Error', 'Could not load ride details.');
    } finally { setLoading(false); }
  };

  const handleWsMsg = useCallback((data) => {
    if (data.latitude != null && data.longitude != null) {
      const coord = { latitude: data.latitude, longitude: data.longitude };
      setDriverLoc(coord);
      mapRef.current?.animateToRegion(
        { ...coord, latitudeDelta: 0.025, longitudeDelta: 0.025 }, 700
      );
    }
    if (data.status) setRide(prev => ({ ...prev, ...data }));
  }, []);

  const cancelRide = () =>
    Alert.alert('Cancel Ride?', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try {
            await rideAPI.cancel(rideId);
            navigation.canGoBack() ? navigation.goBack()
              : navigation.replace('Tabs', { screen: 'Home' });
          } catch (_) {
            Alert.alert('Error', 'Cannot cancel – ride may have already started.');
          }
      }},
    ]);

  if (loading || !ride) return <Spinner msg="Loading ride…" />;

  // Parse vehicle / payment info from notes
  const noteLines = (ride.notes ?? '').split(' | ');
  const vehicleLine  = noteLines.find(l => l.startsWith('Vehicle:'))?.replace('Vehicle: ', '') ?? '';
  const petsLine     = noteLines.find(l => l.startsWith('Pets:'))?.replace('Pets: ', '') ?? '';
  const paymentLine  = noteLines.find(l => l.startsWith('Payment:'))?.replace('Payment: ', '') ?? '';

  const pickupCoord = { latitude: ride.pickupLatitude,  longitude: ride.pickupLongitude };
  const dropCoord   = { latitude: ride.dropLatitude,    longitude: ride.dropLongitude   };

  return (
    <View style={s.screen}>
      <MapView ref={mapRef} provider={PROVIDER_GOOGLE} style={s.map}
        initialRegion={{ ...pickupCoord, latitudeDelta: 0.07, longitudeDelta: 0.07 }}>
        <Marker coordinate={pickupCoord} title="Pickup">
          <View style={s.mkWrap}><Text style={{ fontSize: 20 }}>📍</Text></View>
        </Marker>
        <Marker coordinate={dropCoord} title="Drop-off">
          <View style={s.mkWrap}><Text style={{ fontSize: 20 }}>🏁</Text></View>
        </Marker>
        {driverLoc && (
          <Marker coordinate={driverLoc} title="Driver" anchor={{ x:0.5, y:0.5 }}>
            <View style={s.driverMk}><Text style={{ fontSize: 22 }}>🚗</Text></View>
          </Marker>
        )}
        {driverLoc && (
          <Polyline coordinates={[driverLoc, pickupCoord, dropCoord]}
            strokeColor={C.primary} strokeWidth={3.5} lineDashPattern={[10,5]} />
        )}
      </MapView>

      <View style={s.panel}>
        <View style={s.panelRow}>
          <StatusBadge status={ride.status} />
          <View style={s.wsRow}>
            <View style={[s.wsDot, { backgroundColor: wsLive ? C.success : C.error }]} />
            <Text style={s.wsTxt}>{wsLive ? 'Live Tracking' : 'Connecting…'}</Text>
          </View>
        </View>

        {/* Vehicle + payment chips */}
        {(vehicleLine || paymentLine) && (
          <View style={s.trackChipsRow}>
            {vehicleLine ? (
              <View style={s.trackChip}>
                <Text style={s.trackChipTxt}>🚗 {vehicleLine}</Text>
              </View>
            ) : null}
            {petsLine ? (
              <View style={s.trackChip}>
                <Text style={s.trackChipTxt}>🐾 {petsLine}</Text>
              </View>
            ) : null}
            {paymentLine ? (
              <View style={[s.trackChip, { backgroundColor: C.successBg }]}>
                <Text style={[s.trackChipTxt, { color: C.success }]}>💳 {paymentLine}</Text>
              </View>
            ) : null}
          </View>
        )}

        {ride.driverName ? (
          <View style={s.driverRow}>
            <Text style={{ fontSize: 38 }}>🧑‍✈️</Text>
            <View style={{ marginLeft: SP.md }}>
              <Text style={s.driverName}>{ride.driverName}</Text>
              {ride.vehicleNumber
                ? <Text style={s.vehicleNum}>{ride.vehicleNumber}</Text>
                : null}
            </View>
          </View>
        ) : (
          <Text style={s.searchingTxt}>🔍  Searching for a driver nearby…</Text>
        )}

        <View style={s.routeBox}>
          <Text style={s.routeAddr} numberOfLines={1}>📍  {ride.pickupAddress}</Text>
          <Text style={{ color: C.textMuted, marginLeft: SP.md }}>↓</Text>
          <Text style={s.routeAddr} numberOfLines={1}>🏁  {ride.dropAddress}</Text>
        </View>

        {ride.status === 'REQUESTED' && (
          <Btn title="Cancel Ride" onPress={cancelRide} danger style={{ marginTop: SP.sm }} />
        )}
        {ride.status === 'COMPLETED' && (
          <View style={s.completeBanner}>
            <Text style={s.completeTxt}>✅  Ride completed! Your pet is safe.</Text>
          </View>
        )}
        {ride.status === 'CANCELLED' && (
          <View style={[s.completeBanner, { backgroundColor: C.errorBg }]}>
            <Text style={[s.completeTxt, { color: C.error }]}>❌  Ride was cancelled.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// RideHistoryScreen
// ─────────────────────────────────────────────────────────
export function RideHistoryScreen({ navigation }) {
  const [rides,   setRides]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rideAPI.getMyRides()
      .then(({ data }) => setRides(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  // Parse vehicle/payment from notes
  const parseNotes = (notes = '') => {
    const lines = notes.split(' | ');
    return {
      vehicle: lines.find(l => l.startsWith('Vehicle:'))?.replace('Vehicle: ','') ?? '',
      payment: lines.find(l => l.startsWith('Payment:'))?.replace('Payment: ','') ?? '',
    };
  };

  return (
    <FlatList
      data={rides}
      keyExtractor={i => i.id.toString()}
      contentContainerStyle={{ padding: SP.md, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => {
        const { vehicle, payment } = parseNotes(item.notes);
        return (
          <TouchableOpacity style={s.histCard} activeOpacity={0.85}
            onPress={() => navigation.navigate('TrackRide', { rideId: item.id })}>
            <View style={s.histTop}>
              <StatusBadge status={item.status} />
              <Text style={s.histDate}>
                {new Date(item.requestedAt).toLocaleDateString('en-LK',
                  { day:'numeric', month:'short', year:'numeric' })}
              </Text>
            </View>
            <Text style={s.histPet}>🐾  {item.petName}</Text>
            {vehicle ? <Text style={s.histMeta}>🚗 {vehicle}</Text> : null}
            <Text style={s.histAddr} numberOfLines={1}>📍  {item.pickupAddress}</Text>
            <Text style={s.histAddr} numberOfLines={1}>🏁  {item.dropAddress}</Text>
            <View style={s.histFooter}>
              {item.driverName
                ? <Text style={s.histDriver}>Driver: {item.driverName}</Text>
                : null}
              {payment
                ? <Text style={s.histPayment}>💳 {payment}</Text>
                : null}
            </View>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={
        <Empty icon="🛣️" title="No rides yet"
          sub="Your ride history will appear here after you book a ride." />
      }
    />
  );
}

// ─────────────────────────────────────────────────────────
// Shared small components
// ─────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Pets & Vehicle', 'Locations', 'Payment', 'Confirm'];
  return (
    <View style={sb.wrap}>
      {steps.map((lbl, i) => {
        const idx = i + 1;
        const done    = idx < step;
        const active  = idx === step;
        return (
          <React.Fragment key={idx}>
            <View style={sb.step}>
              <View style={[sb.circle,
                done   && sb.circleDone,
                active && sb.circleActive]}>
                <Text style={[sb.circleNum,
                  (done || active) && { color: C.white }]}>
                  {done ? '✓' : idx}
                </Text>
              </View>
              <Text style={[sb.lbl, active && { color: C.primary, fontWeight:'700' }]}
                numberOfLines={1}>
                {lbl}
              </Text>
            </View>
            {idx < steps.length && (
              <View style={[sb.line, done && sb.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function SectionTitle({ icon, title, sub }) {
  return (
    <View style={{ marginBottom: SP.sm }}>
      <Text style={st.title}>{icon}  {title}</Text>
      {sub ? <Text style={st.sub}>{sub}</Text> : null}
    </View>
  );
}

function SummaryRow({ icon, label, value, valueColor }) {
  return (
    <View style={sr.row}>
      <Text style={sr.icon}>{icon}</Text>
      <Text style={sr.label}>{label}</Text>
      <Text style={[sr.value, valueColor && { color: valueColor }]}
        numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:       { flex:1, backgroundColor:C.bg },
  content:      { padding:SP.md, paddingBottom:40 },
  flex1:        { flex:1 },
  noPets:       { flex:1, alignItems:'center', justifyContent:'center', padding:SP.xl },
  noPetsTitle:  { fontSize:FS.xxl, fontWeight:'900', color:C.text, marginTop:SP.md },
  noPetsSub:    { fontSize:FS.md, color:C.textSub, textAlign:'center', marginTop:SP.xs },
  // Pet grid
  petGrid:      { flexDirection:'row', flexWrap:'wrap', gap:SP.sm, marginBottom:SP.sm },
  petGridCard:  { width:'47%', alignItems:'center', padding:SP.md, borderRadius:R.md,
    borderWidth:2, borderColor:C.border, backgroundColor:C.white,
    position:'relative', ...SH.sm },
  petGridCardOn:{ borderColor:C.primary, backgroundColor:C.primary+'12' },
  checkBadge:   { position:'absolute', top:8, right:8, width:22, height:22,
    borderRadius:11, backgroundColor:C.primary, alignItems:'center', justifyContent:'center' },
  checkTxt:     { color:C.white, fontSize:FS.xs, fontWeight:'900' },
  petGridName:  { fontSize:FS.md, fontWeight:'800', color:C.text, marginTop:SP.xs },
  petGridBreed: { fontSize:FS.xs, color:C.textSub, textAlign:'center' },
  petCountRow:  { alignItems:'flex-end', marginBottom:SP.lg },
  petCountTxt:  { fontSize:FS.sm, color:C.textSub, fontWeight:'600' },
  // Vehicle grid
  vehicleGrid:  { flexDirection:'row', flexWrap:'wrap', gap:SP.sm, marginBottom:SP.lg },
  vehicleCard:  { width:'47%', alignItems:'center', padding:SP.md, borderRadius:R.md,
    borderWidth:2, borderColor:C.border, backgroundColor:C.white,
    position:'relative', ...SH.sm },
  vehicleCardDisabled: { opacity:0.38 },
  vehicleEmoji: { fontSize:32, marginBottom:SP.xs },
  vehicleLabel: { fontSize:FS.md, fontWeight:'800', color:C.text, textAlign:'center' },
  vehicleDesc:  { fontSize:FS.xs, color:C.textSub, textAlign:'center', marginTop:2 },
  vehicleRate:  { fontSize:FS.xs, fontWeight:'700', color:C.textSub,
    marginTop:SP.xs, textAlign:'center' },
  vehicleDisabledTxt: { fontSize:FS.xs, color:C.error, fontWeight:'700', marginTop:4 },
  vehicleSelBadge:    { marginTop:SP.sm, paddingHorizontal:SP.sm, paddingVertical:3,
    borderRadius:R.full },
  vehicleSelTxt:      { color:C.white, fontSize:FS.xs, fontWeight:'800' },
  // Payment
  paymentCard:  { flexDirection:'row', alignItems:'center', backgroundColor:C.white,
    borderRadius:R.md, padding:SP.md, marginBottom:SP.sm, borderWidth:2,
    borderColor:C.border, gap:SP.md, ...SH.sm },
  paymentCardOn:{ borderColor:C.primary, backgroundColor:C.primary+'10' },
  paymentEmoji: { fontSize:28 },
  paymentLabel: { fontSize:FS.md, fontWeight:'800', color:C.text },
  paymentDesc:  { fontSize:FS.sm, color:C.textSub, marginTop:2 },
  radioOuter:   { width:22, height:22, borderRadius:11, borderWidth:2,
    borderColor:C.border, alignItems:'center', justifyContent:'center' },
  radioInner:   { width:11, height:11, borderRadius:6, backgroundColor:C.primary },
  // Summary
  summaryCard:  { backgroundColor:C.white, borderRadius:R.md, padding:SP.md,
    marginBottom:SP.md, ...SH.sm },
  fareCard:     { backgroundColor:C.primary+'12', borderRadius:R.md, padding:SP.lg,
    marginBottom:SP.md, alignItems:'center', borderWidth:1.5, borderColor:C.primary+'44' },
  fareLabel:    { fontSize:FS.sm, fontWeight:'700', color:C.primary,
    textTransform:'uppercase', letterSpacing:0.5 },
  fareAmount:   { fontSize:FS.h1, fontWeight:'900', color:C.primary, marginTop:4 },
  fareSub:      { fontSize:FS.xs, color:C.textSub, marginTop:4, textAlign:'center' },
  // Location
  miniMap:      { height:160, borderRadius:R.md, marginBottom:SP.md, overflow:'hidden' },
  youMk:        { backgroundColor:C.white, borderRadius:16, padding:4, ...SH.sm },
  locCard:      { flexDirection:'row', backgroundColor:C.white, borderRadius:R.md,
    padding:SP.md, marginBottom:SP.md, borderLeftWidth:4, ...SH.sm },
  locDot:       { width:14, height:14, borderRadius:7, marginTop:5, marginRight:SP.sm },
  coordRow:     { flexDirection:'row', gap:SP.sm },
  half:         { flex:1 },
  gpsLink:      { fontSize:FS.xs, color:C.primary, fontWeight:'700', marginBottom:SP.sm },
  infoBanner:   { flexDirection:'row', backgroundColor:C.infoBg, borderRadius:R.md,
    padding:SP.md, marginBottom:SP.lg, gap:SP.sm, alignItems:'flex-start' },
  infoTxt:      { flex:1, fontSize:FS.sm, color:C.info, lineHeight:20 },
  // Nav buttons
  stepBtnRow:   { flexDirection:'row', gap:SP.sm, marginTop:SP.sm },
  backBtn:      { paddingHorizontal:SP.lg, paddingVertical:14, borderRadius:R.sm,
    borderWidth:1.5, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  backBtnTxt:   { fontSize:FS.md, color:C.textSub, fontWeight:'700' },
  nextBtn:      { marginTop:SP.md },
  // Track ride
  map:          { flex:1 },
  mkWrap:       { backgroundColor:C.white, borderRadius:18, padding:5, ...SH.sm },
  driverMk:     { backgroundColor:C.primary, borderRadius:22, padding:8, ...SH.md },
  panel:        { backgroundColor:C.white, padding:SP.lg,
    borderTopLeftRadius:24, borderTopRightRadius:24, ...SH.lg },
  panelRow:     { flexDirection:'row', justifyContent:'space-between',
    alignItems:'center', marginBottom:SP.sm },
  trackChipsRow:{ flexDirection:'row', flexWrap:'wrap', gap:SP.xs, marginBottom:SP.sm },
  trackChip:    { backgroundColor:C.bg, paddingHorizontal:SP.sm, paddingVertical:4,
    borderRadius:R.full },
  trackChipTxt: { fontSize:FS.xs, fontWeight:'700', color:C.textSub },
  wsRow:        { flexDirection:'row', alignItems:'center', gap:6 },
  wsDot:        { width:8, height:8, borderRadius:4 },
  wsTxt:        { fontSize:FS.xs, fontWeight:'700', color:C.textSub },
  driverRow:    { flexDirection:'row', alignItems:'center',
    backgroundColor:C.bg, borderRadius:R.md, padding:SP.md, marginBottom:SP.sm },
  driverName:   { fontSize:FS.lg, fontWeight:'800', color:C.text },
  vehicleNum:   { fontSize:FS.sm, color:C.textSub, marginTop:2 },
  searchingTxt: { fontSize:FS.md, color:C.textSub, marginBottom:SP.sm },
  routeBox:     { marginBottom:SP.sm },
  routeAddr:    { fontSize:FS.sm, color:C.textSub },
  completeBanner:{ backgroundColor:C.successBg, borderRadius:R.md,
    padding:SP.md, alignItems:'center' },
  completeTxt:  { fontSize:FS.md, fontWeight:'800', color:C.success },
  // History
  histCard:     { backgroundColor:C.white, borderRadius:R.md, padding:SP.md,
    marginBottom:SP.sm, ...SH.sm },
  histTop:      { flexDirection:'row', justifyContent:'space-between',
    alignItems:'center', marginBottom:SP.sm },
  histDate:     { fontSize:FS.sm, color:C.textSub },
  histPet:      { fontSize:FS.md, fontWeight:'800', color:C.text },
  histMeta:     { fontSize:FS.sm, color:C.primary, fontWeight:'700', marginTop:2 },
  histAddr:     { fontSize:FS.sm, color:C.textSub, marginTop:3 },
  histFooter:   { flexDirection:'row', justifyContent:'space-between',
    alignItems:'center', marginTop:SP.sm },
  histDriver:   { fontSize:FS.sm, color:C.primary, fontWeight:'700' },
  histPayment:  { fontSize:FS.sm, color:C.success, fontWeight:'700' },
});

// Step bar styles
const sb = StyleSheet.create({
  wrap:        { flexDirection:'row', alignItems:'center', backgroundColor:C.white,
    paddingHorizontal:SP.md, paddingVertical:SP.sm,
    borderBottomWidth:1, borderBottomColor:C.border },
  step:        { alignItems:'center', width:60 },
  circle:      { width:26, height:26, borderRadius:13, backgroundColor:C.bg,
    borderWidth:2, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  circleDone:  { backgroundColor:C.success, borderColor:C.success },
  circleActive:{ backgroundColor:C.primary, borderColor:C.primary },
  circleNum:   { fontSize:FS.xs, fontWeight:'900', color:C.textSub },
  lbl:         { fontSize:9, color:C.textSub, marginTop:3, textAlign:'center' },
  line:        { flex:1, height:2, backgroundColor:C.border, marginBottom:12 },
  lineDone:    { backgroundColor:C.success },
});

// Section title styles
const st = StyleSheet.create({
  title: { fontSize:FS.lg, fontWeight:'900', color:C.text, marginBottom:2 },
  sub:   { fontSize:FS.sm, color:C.textSub, marginBottom:SP.sm },
});

// Summary row styles
const sr = StyleSheet.create({
  row:   { flexDirection:'row', alignItems:'flex-start', paddingVertical:SP.sm,
    borderBottomWidth:1, borderBottomColor:C.border },
  icon:  { fontSize:18, width:28 },
  label: { fontSize:FS.sm, fontWeight:'700', color:C.textSub, width:72 },
  value: { flex:1, fontSize:FS.sm, color:C.text, fontWeight:'600', lineHeight:20 },
});
