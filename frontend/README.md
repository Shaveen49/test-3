# 🐾 PetBuddy – Expo Frontend
### Matched to your uploaded Spring Boot backend

---

## ⚡ Quick Start (3 commands)

```bash
cd petbuddy-expo
npm install
npx expo start
```

---

## 📁 Project Structure

```
petbuddy-expo/
├── App.js                              # Root entry point
├── app.json                            # Expo config + Maps API keys
├── babel.config.js
├── package.json
└── src/
    ├── utils/
    │   ├── config.js      ← SET YOUR IP HERE
    │   ├── storage.js     # SecureStore JWT persistence
    │   └── theme.js       # Colors, spacing, shadows
    ├── context/
    │   └── AuthContext.js # Global JWT auth state
    ├── services/
    │   ├── api.js         # All Axios calls (verified against your backend)
    │   └── websocket.js   # STOMP over SockJS real-time tracking
    ├── components/
    │   └── index.js       # Spinner, Btn, Field, StatusBadge, PetCard, Empty
    ├── navigation/
    │   └── AppNavigator.js # Auth / User tabs / Driver stack
    └── screens/
        ├── AuthScreens.js     # Login + Register
        ├── HomeScreen.js      # Dashboard
        ├── PetScreens.js      # Pet list + Add pet
        ├── MedicalScreen.js   # Records / Medications / Reminders (3 tabs)
        ├── RideScreens.js     # Book ride + Track ride + Ride history
        └── DriverDashboard.js # Driver: toggle / accept / GPS broadcast
```

---

## 🔧 Step 1 – Set Your Backend IP

Open **`src/utils/config.js`** and change one line:

```js
const BACKEND_HOST = 'http://10.0.2.2:8080';  // ← CHANGE THIS
```

| Environment | Value |
|---|---|
| Android Emulator | `http://10.0.2.2:8080` |
| iOS Simulator | `http://localhost:8080` |
| Physical device (Expo Go) | `http://192.168.x.x:8080` (your machine's LAN IP) |

Your backend runs on port **8080** with DB password **Pass1234** (from your `application.properties`).

---

## 🔧 Step 2 – Install Dependencies

```bash
npm install
```

Packages installed:
- `expo` ~51.0.28
- `react-native-maps` 1.14.0  (Google Maps)
- `@stomp/stompjs` + `sockjs-client`  (WebSocket)
- `expo-location`  (real GPS for driver)
- `expo-secure-store`  (encrypted JWT storage)
- `@react-navigation/native` + stacks + tabs
- `@expo/vector-icons`  (tab icons)
- `text-encoding`  (STOMP polyfill for React Native)

---

## 🔧 Step 3 – Add Google Maps API Key

Without a Maps key the map tiles won't load (the rest of the app still works).

1. Go to https://console.cloud.google.com
2. Create a project → Enable "Maps SDK for Android" and "Maps SDK for iOS"
3. Create an API key
4. Add it to **`app.json`**:

```json
"android": {
  "config": {
    "googleMaps": { "apiKey": "AIzaSy..." }
  }
},
"ios": {
  "config": {
    "googleMapsApiKey": "AIzaSy..."
  }
}
```

---

## 🔧 Step 4 – Start the App

```bash
npx expo start
```

Then:
- Press **`a`** → Android emulator
- Press **`i`** → iOS simulator
- **Scan QR code** with Expo Go app on your phone

---

## 🌐 Backend API Coverage

Every endpoint in your backend is called. Here's the mapping:

### Auth
| Screen | Method | Endpoint |
|---|---|---|
| Register | POST | `/api/auth/register` |
| Login | POST | `/api/auth/login` |

### Pets
| Screen | Method | Endpoint |
|---|---|---|
| Pet List | GET | `/api/pets` |
| Add Pet | POST | `/api/pets` |
| Delete Pet | DELETE | `/api/pets/{id}` |

### Medical (all scoped under `/api/pets/{petId}/`)
| Tab | Method | Endpoint |
|---|---|---|
| Records | GET/POST/DELETE | `/medical-records` |
| Medications | GET/POST/DELETE | `/medications` |
| Reminders | GET/POST/PATCH/DELETE | `/reminders` / `/reminders/pending` / `/reminders/{id}/complete` |

### Rides
| Actor | Method | Endpoint |
|---|---|---|
| User – Book | POST | `/api/rides` |
| User – History | GET | `/api/rides` |
| User – Track | GET | `/api/rides/{id}` |
| User – Cancel | DELETE | `/api/rides/{id}` |
| Driver – My rides | GET | `/api/rides/driver/my-rides` |
| Driver – Accept | PATCH | `/api/rides/{id}/accept` |
| Driver – Start | PATCH | `/api/rides/{id}/start` |
| Driver – Complete | PATCH | `/api/rides/{id}/complete` |
| Driver – Availability | PATCH | `/api/rides/driver/availability` |

### WebSocket
| Direction | Destination | Payload |
|---|---|---|
| Driver → Server | `/app/location.update` | `{ rideId, driverId, latitude, longitude, timestamp }` |
| Server → User/Driver | `/topic/ride/{rideId}` | `LocationUpdate` or `RideResponse` |

---

## 🧪 Testing Flow

### Full ride cycle:

1. **Register** a Pet Owner (role: USER)
2. **Register** a Driver (role: DRIVER, fill vehicle details)
3. As Pet Owner → **Add a pet**
4. As Pet Owner → **Book a Ride** (GPS auto-fills pickup)
5. As Driver → **Toggle availability ON**
6. As Driver → **Accept ride** → **Start ride** (GPS broadcasting begins)
7. As Pet Owner → **Track Ride** screen → see driver moving on map in real time
8. As Driver → **Complete ride**

### Enum values (must match exactly):
- `role`: `USER` or `DRIVER`
- `medication type`: `VACCINE` or `MEDICINE`
- `reminder type`: `VET_VISIT`, `MEDICATION`, `VACCINATION`, `GROOMING`, `OTHER`
- `ride status`: `REQUESTED`, `ACCEPTED`, `STARTED`, `COMPLETED`, `CANCELLED`

### Date formats:
- `birthday`, `visitDate`, `dateAdministered`, `nextDueDate` → `YYYY-MM-DD`
- `reminderDateTime` → ISO 8601: `2024-06-15T10:00:00`

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| `Network Error` / `ECONNREFUSED` | Change IP in `src/utils/config.js`. Ensure backend is running (`mvn spring-boot:run`) |
| `401 Unauthorized` | Token expired – log out and log back in |
| `403 Forbidden` on ride endpoints | Role mismatch – USER tries driver endpoint or vice versa |
| Map shows blank | Add Google Maps API key to `app.json` |
| WebSocket fails to connect | Verify backend is running; check CORS is `*` in `SecurityConfig.java` |
| `TextEncoder is not defined` | Already patched in `websocket.js` via `text-encoding` package |
| `Reanimated` error on start | Ensure `babel.config.js` has `react-native-reanimated/plugin` as LAST plugin, then clear cache: `npx expo start --clear` |
| Location permission denied | Accept the permission dialog, or go to device Settings → Apps → PetBuddy → Permissions |
| `expo-secure-store` crash on emulator | Ensure Google Play Services is installed on the emulator image |

---

## 📱 Running on a Physical Device

1. Install **Expo Go** from Play Store / App Store
2. Find your computer's LAN IP:
   - Windows: `ipconfig` → look for IPv4 Address
   - Mac/Linux: `ifconfig` → look for `inet` under en0/wlan0
3. Set `BACKEND_HOST = 'http://192.168.x.x:8080'` in `config.js`
4. Make sure phone and computer are on the **same WiFi network**
5. Run `npx expo start` → scan QR code with Expo Go
