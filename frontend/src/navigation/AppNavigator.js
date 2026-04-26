// src/navigation/AppNavigator.js
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { C, FS } from '../utils/theme';

// Screens
import { LoginScreen, RegisterScreen }                          from '../screens/AuthScreens';
import HomeScreen                                               from '../screens/HomeScreen';
import { PetListScreen, AddPetScreen }                          from '../screens/PetScreens';
import MedicalScreen                                            from '../screens/MedicalScreen';
import { BookRideScreen, TrackRideScreen, RideHistoryScreen }   from '../screens/RideScreens';
import DriverDashboard                                          from '../screens/DriverDashboard';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// Shared header style
const HDR = {
  headerStyle:          { backgroundColor: C.white },
  headerTintColor:      C.text,
  headerTitleStyle:     { fontWeight: '800', fontSize: FS.lg },
  headerShadowVisible:  false,
  headerBackTitleVisible: false,
};

// ── Auth Stack (unauthenticated users) ────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ── Bottom Tabs (USER role) ───────────────────────────────
function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...HDR,
        tabBarActiveTintColor:   C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.white,
          borderTopColor:  C.border,
          borderTopWidth:  1,
          height:          62,
          paddingBottom:   10,
        },
        tabBarLabelStyle: { fontSize: FS.xs, fontWeight: '700' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Home:     focused ? 'home'        : 'home-outline',
            MyPets:   focused ? 'paw'         : 'paw-outline',
            BookRide: focused ? 'car'         : 'car-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}
        options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tab.Screen name="MyPets"   component={PetListScreen}
        options={{ title: 'My Pets', tabBarLabel: 'Pets' }} />
      <Tab.Screen name="BookRide" component={BookRideScreen}
        options={{ title: 'Book a Ride', tabBarLabel: 'Ride' }} />
    </Tab.Navigator>
  );
}

// ── User Stack (tabs + push screens) ─────────────────────
function UserStack() {
  return (
    <Stack.Navigator screenOptions={HDR}>
      <Stack.Screen name="Tabs"        component={UserTabs}
        options={{ headerShown: false }} />
      <Stack.Screen name="AddPet"      component={AddPetScreen}
        options={{ title: 'Add New Pet' }} />
      <Stack.Screen name="PetList"     component={PetListScreen}
        options={{ title: 'My Pets' }} />
      <Stack.Screen name="Medical"     component={MedicalScreen}
        options={{ title: 'Health Records' }} />
      <Stack.Screen name="TrackRide"   component={TrackRideScreen}
        options={{ title: 'Track Ride', headerTransparent: true,
          headerTintColor: C.white }} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen}
        options={{ title: 'Ride History' }} />
    </Stack.Navigator>
  );
}

// ── Driver Stack ──────────────────────────────────────────
function DriverStack() {
  return (
    <Stack.Navigator screenOptions={HDR}>
      <Stack.Screen name="DriverHome" component={DriverDashboard}
        options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ── Splash (shown while restoring session) ────────────────
function Splash() {
  return (
    <View style={sp.wrap}>
      <Text style={sp.icon}>🐾</Text>
      <Text style={sp.title}>PetBuddy</Text>
      <ActivityIndicator color={C.primaryLight} style={{ marginTop: 32 }} />
    </View>
  );
}

// ── Root Navigator ────────────────────────────────────────
// Automatically switches between Auth / User / Driver stacks
// based on the current auth state (user role).
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <Splash />;

  return (
    <NavigationContainer>
      {!user
        ? <AuthStack />
        : user.role === 'DRIVER'
          ? <DriverStack />
          : <UserStack />
      }
    </NavigationContainer>
  );
}

const sp = StyleSheet.create({
  wrap:  { flex:1, alignItems:'center', justifyContent:'center',
    backgroundColor: C.primary },
  icon:  { fontSize: 72 },
  title: { fontSize: 36, fontWeight: '900', color: C.white,
    marginTop: 16, letterSpacing: 1 },
});
