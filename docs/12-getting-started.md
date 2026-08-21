# 12 — Getting Started

From a clean machine to a running app, plus the things that go wrong and what
they mean.

---

## 1. Prerequisites

| | |
| --- | --- |
| Node.js | LTS, with npm |
| iOS | macOS + Xcode (+ Command Line Tools), an iOS 17+ simulator |
| Android | Android Studio, an SDK platform and an emulator (or a device with USB debugging) |
| EAS | `npm install -g eas-cli` — only for cloud builds |
| Watchman | Optional but recommended on macOS |

---

## 2. First run

```bash
git clone <repo> && cd UPLY-App
npm install                    # commit + pull package-lock.json so versions match
cp .env.example .env           # then fill it in — see §3
npx expo prebuild              # generates ios/ and android/ (both gitignored)
npx expo run:ios               # or npx expo run:android
```

`expo run:*` compiles the native project **and** installs the development client
on the simulator. You only need it on the first run and after any native change.

After that, day-to-day:

```bash
npx expo start --dev-client
# i → iOS simulator   a → Android emulator   r → reload   --clear → reset Metro cache
```

> ### This is a development build, not Expo Go
> `@expo/ui` native controls, `NativeTabs`, `expo-secure-store`, `expo-glass-effect`,
> Google Sign-In and the socket transports all require the custom dev client.
> Opening this project in Expo Go fails immediately, and no code in this repo may
> assume Expo Go.

---

## 3. Environment

`.env` is gitignored. `EXPO_PUBLIC_*` values are **inlined at bundle time** — none
of them are secret, and changing one requires a Metro restart.

```bash
EXPO_PUBLIC_API_URL=https://api.example.com     # REST + both socket.io gateways
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...            # Google Sign-In (Android / server)
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...            # Google Sign-In (iOS)
EXPO_PUBLIC_DASHBOARD_URL=                      # web dashboard; empty hides every link to it
# EXPO_PUBLIC_HOME_FIXTURES=all                 # dev only: all | clear | nulls
```

| Variable | Read by | If unset |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | `src/api/config.ts` | falls back to a hardcoded nip.io host — **set it** |
| `EXPO_PUBLIC_DASHBOARD_URL` | `src/api/config.ts` | `''` → every "open in dashboard" link hides |
| `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` | `useGoogleAuth` | Google Sign-In fails at the native call |
| `EXPO_PUBLIC_HOME_FIXTURES` | `useCoachHomeAnalytics` | live data (guarded by `__DEV__`) |

The iOS Google URL scheme is **not** an env var — it lives in `app.json` under the
`@react-native-google-signin/google-signin` plugin, and changing it requires a
prebuild + rebuild.

### Pointing at a local backend

`localhost` does not resolve from a device or an Android emulator. Use your LAN IP
(`http://192.168.x.x:PORT`) or a tunnel. Both socket gateways derive from the same
`BASE_URL`, so one change covers REST, `/chat` and the AI namespace. Restart Metro
with `--clear` afterwards.

---

## 4. Signing in during development

The app has two personas and the toggle is on the login screen:

- **Coach** (`persona: 'coach'`) → one tenant, `role: 'owner'` → Coach UI
- **Client** (`persona: 'customer'`) → 0..N memberships → Client UI

A freshly-registered client has **no tenant**. That is a normal state, not a bug:
they land on `/(setup)/match-coach` to find a coach, and the client AI tab stays
hidden until a membership exists.

To test the tenant switcher you need a client account with **two** accepted
memberships — either two coaches invite them, or they send two join requests.

### Resetting local flags

Setup and onboarding completion are device-local SecureStore flags. To force
either flow again, flip the constant at the top of the module and reload:

```ts
// src/shared/hooks/useProfileSetup.ts
const ALWAYS_SHOW_SETUP = true;
// src/shared/hooks/useOnboarding.ts
const ALWAYS_SHOW_ONBOARDING = true;
```

Never commit these as `true`. Logging out also clears tokens, persona and the
active tenant — but *not* `uply.hasCompletedProfile` / `uply.hasOnboarded`.

---

## 5. Dev builds and EAS

`eas.json` defines three profiles:

```bash
eas build --profile development --platform ios      # dev client, internal
eas build --profile preview     --platform android  # release build, internal
eas build --profile production  --platform all      # store build, autoIncrement
```

`appVersionSource: "remote"` means EAS owns the build number — do not bump it by
hand in `app.json`.

For a local dev client (no EAS account needed):

```bash
npx expo run:ios --configuration Debug
npx expo run:android --variant debug
```

You install that build **once**; from then on `npx expo start --dev-client` is
enough until a native dependency changes.

---

## 6. When to re-run prebuild

`ios/` and `android/` are generated and gitignored. Regenerate after:

- adding or removing a dependency with native code,
- editing `app.json` (plugins, bundle id, permissions, splash, icons),
- an Expo SDK upgrade,
- anything that leaves the native project in a weird state.

```bash
npx expo prebuild --clean       # deletes and regenerates both projects
```

Never hand-edit files inside `ios/` or `android/` — the next prebuild discards them.
Native config belongs in `app.json` or a config plugin.

---

## 7. Verifying a change

There is **no automated test suite** in this repo. The gate before a PR is:

```bash
npm run typecheck     # tsc --noEmit — must be clean
npm run lint          # eslint-config-expo — must be clean
npx expo-doctor       # after any dependency change
```

…plus running the change on **both** iOS and Android. The tab bars, safe-area
insets, blur effects and keyboard behaviour genuinely differ.

Manual checklists worth working through when you touch those areas:
[`10-chat-messaging.md §16`](10-chat-messaging.md) for chat, and
[`06-Ai-Integration.md`](06-Ai-Integration.md) for the assistant.

---

## 8. Troubleshooting

### Styles do nothing / the screen is blank

Almost always a bare RN import. `className` is silently dropped by
`react-native`'s own components:

```tsx
import { View } from "@/tw";          // ✅
import { View } from "react-native";  // ❌
```

If the imports are right, restart with `npx expo start --clear` — the Tailwind
output is cached by Metro.

### Colours look flat / `oklch` values aren't resolving

`lightningcss` drifted off `1.30.1`. It is pinned twice in `package.json`
(`resolutions` **and** `overrides`). Reinstall:

```bash
rm -rf node_modules package-lock.json && npm install && npx expo-doctor
```

### A worklet / Reanimated crash on startup

`react-native-reanimated` and `react-native-worklets` versions disagree. Fix with
`npx expo install --fix`, then rebuild the native app — not just Metro.

### Sheets, swipes or gestures do nothing

`GestureHandlerRootView` is missing from the root layout, or a screen renders
outside it. Same for zero safe-area insets → `SafeAreaProvider`.

### "Cannot find native module …"

The dev client is out of date with the JS. Rebuild:
`npx expo prebuild && npx expo run:ios`.

### Every screen renders empty / "0 clients"

The active tenant never resolved. Check that `/auth/me` (coach) or
`/auth/customer/memberships` (client) succeeded — the root layout uses
`refetchOnMountOrArgChange: true` precisely because a cached *error* entry would
otherwise leave `activeTenantId` null for the whole session. See
[`01-architecture.md §5`](01-architecture.md#5-boot-sequence).

### The app logged me out on its own

Something returned 401 and the refresh failed. Two common causes: an expired
refresh token, or an endpoint that isn't implemented server-side — an unimplemented
route returning 401 gets escalated to a full logout by the reauth wrapper. That is
why `CLIENT_INVITATIONS_READY` exists.

### After switching coaches I still see the old coach's data

The token swap failed. `useSwitchCoach` throws when the response carries no token
pair — check the console for `switch-tenant returned no token pair (keys: …)`. The
tenant lives in the JWT; a switch that doesn't persist new tokens is cosmetic.
See [`08-auth-and-tenancy.md §6`](08-auth-and-tenancy.md#6-tenant-switching).

### The AI answer never arrives

Check, in order: is the tab even available (a tenant-less client's token is
rejected at handshake); did `ai.accepted` arrive within 20s; did the socket
disconnect (rooms do not survive a reconnect, and nothing is persisted, so an
outstanding answer is permanently gone). In `__DEV__` every inbound frame is
logged with an `[ai] ←` prefix.

### Messages send twice, or an optimistic bubble never clears

The `clientMsgId` reconciliation broke. Both the socket ack path and the REST
fallback must tag the saved message with the `clientMsgId` it was sent with —
see [`10-chat-messaging.md`](10-chat-messaging.md).

### Metro resolves the wrong file after a rename

```bash
npx expo start --clear
watchman watch-del-all      # macOS, if watchman is installed
```

---

## 9. Useful one-liners

```bash
npx expo-doctor                     # dependency version sanity
npx expo install --fix              # snap deps to the SDK's expected versions
npx expo start --clear              # reset the Metro + Tailwind cache
npx expo prebuild --clean           # regenerate ios/ and android/
npx expo run:ios --device           # pick a physical device
adb reverse tcp:8081 tcp:8081       # Android device can't reach Metro
npx tsc --noEmit --watch            # typecheck continuously while working
```
