# 🔧 PetBuddy – All Fixes Applied

## Errors Fixed This Round

### ❌ Error 1: ENOENT: no such file or directory, scandir '…\assets'
**Cause:** The `assets/` folder was missing entirely.
**Fix:** Created `assets/` folder with all required files:
- `icon.png` (1024×1024)
- `adaptive-icon.png` (1024×1024, Android)
- `splash.png` (splash screen)
- `favicon.png` (web)

Also updated `app.json` to reference these files correctly.

---

### ❌ Error 2: "unknown error: could not connect to server" on iOS
**Cause 1:** `config.js` had placeholder `http://192.168.x.x:8080` — not a real IP.
**Cause 2:** The `exp://127.0.0.1:8081` in the iOS error refers to the Expo Dev Server
port (8081), NOT your backend. The app was simply never reaching `172.20.10.2:8080`.

**Fix:** `config.js` now uses your real IP `172.20.10.2` and auto-selects based on platform:
- Android Emulator → `http://10.0.2.2:8080`
- iOS / Physical device → `http://172.20.10.2:8080`

---

### ❌ Error 3: websocket.js fully commented out (from last round)
**Fix:** Fully restored — all functions active.

---

## ✅ Steps to Run

### 1. Delete old cache and reinstall

**Windows CMD:**
```
cd petbuddy-fix
rmdir /s /q node_modules
del package-lock.json
npm install
```

### 2. Make sure your Spring Boot backend is running
```
cd backend
mvn spring-boot:run
```
Verify it works: open browser → `http://172.20.10.2:8080`
You should see a 404 or Whitelabel Error (not a "connection refused").

### 3. Allow port 8080 through Windows Firewall
This is REQUIRED for your iPhone to reach the backend.

Option A — Quick (CMD as Administrator):
```
netsh advfirewall firewall add rule name="PetBuddy Backend" dir=in action=allow protocol=TCP localport=8080
```

Option B — GUI:
1. Search "Windows Defender Firewall" → Advanced Settings
2. Inbound Rules → New Rule → Port → TCP → 8080 → Allow

### 4. Start Expo
```
npx expo start --clear
```

### 5. Connect your iPhone
- Install **Expo Go** from the App Store
- Make sure iPhone is on the **same WiFi** as your Windows PC
- Scan the QR code shown in the terminal

---

## If it still fails — use the Diagnostic Screen

The app now has a built-in connection tester.
On the Login screen tap **"🔌 Test Backend Connection"**.

It will auto-test your IP and several others, showing ✅ or ❌ for each.
If none work, check the Windows Firewall and make sure backend is running.

---

## Your IP Details

| Item | Value |
|---|---|
| Windows IP (your machine) | `172.20.10.2` |
| Backend port | `8080` |
| Full API URL | `http://172.20.10.2:8080/api` |
| Full WS URL | `http://172.20.10.2:8080/ws` |

If you change WiFi networks, run `ipconfig` again and update `WINDOWS_IP` in `src/utils/config.js`.
