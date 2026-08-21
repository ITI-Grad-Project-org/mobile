# 02 — Tech Stack & Build Configuration

Every dependency, the reason it is here, and the places where versions have to
agree or the app breaks in ways the type-checker will not catch.

---

## 1. The platform

| | Version | Notes |
| --- | --- | --- |
| Expo SDK | `~56.0.12` | **Development build only.** Expo Go cannot load this app. |
| React Native | `0.85.3` | Supports the `boxShadow` style prop — the `shadow-*` utilities depend on it. |
| React | `19.2.3` | React Compiler is **enabled** (`app.json` → `experiments.reactCompiler`). |
| TypeScript | `~6.0.3` | `strict: true`, extends `expo/tsconfig.base`. |
| Expo Router | `~56.2.11` | File-based routing from `src/app`, `typedRoutes` on. |

### React Compiler is on

`experiments.reactCompiler: true` means the compiler auto-memoises components.
Two consequences:

- Do not reach for `useMemo` / `useCallback` as a reflex. Use them where the value
  is a **dependency of an effect or a query arg** (identity matters), not as
  general render optimisation.
- Rules of Hooks are enforced harder. A conditional hook that "worked" before will
  fail to compile.

---

## 2. Dependencies, grouped by job

### Navigation & shell

| Package | Why |
| --- | --- |
| `expo-router` | File-based routes, `NativeTabs`, typed hrefs. **Import navigation from `expo-router`, never `@react-navigation/*`.** |
| `react-native-screens` `4.25.2` | Native screen containers; backs `NativeTabs`. |
| `react-native-safe-area-context` `~5.7.0` | `SafeAreaProvider` is mounted in the root layout — required, see §5. |
| `react-native-gesture-handler` `~2.31.1` | `GestureHandlerRootView` wraps the app; sheets and swipes need it. |
| `expo-splash-screen` | Native splash held until the session is restored. |
| `expo-dev-client` | The custom dev client itself. |

### Styling

| Package | Why |
| --- | --- |
| `nativewind` `5.0.0-preview.4` | Tailwind for RN. **v5 is CSS-first** — no `tailwind.config.js`, no Babel plugin. |
| `tailwindcss` `^4` + `@tailwindcss/postcss` | The v4 engine that compiles `src/global.css`. |
| `react-native-css` `^3.0.7` | Provides `useCssElement` / `useNativeVariable`, which the `src/tw` wrappers are built on. |
| `lightningcss` **pinned to `1.30.1`** | Via `resolutions` **and** `overrides`. A different version emits CSS the RN runtime can't parse. Do not unpin. |
| `tailwind-merge` + `clsx` | `cn()` in `src/lib/utils.ts`. |
| `prettier-plugin-tailwindcss` | Class ordering. |

### Native UI & media

| Package | Why |
| --- | --- |
| `@expo/ui` `~56.0.18` | Real SwiftUI / Jetpack Compose controls — sheets, pickers, sliders, switches. See [`03-Expo-ui-guide.md`](03-Expo-ui-guide.md). |
| `expo-symbols` | SF Symbols; wrapped by [`shared/ui/Icon`](../src/shared/ui/Icon.tsx). |
| `@expo/vector-icons` | Fallback glyph set. |
| `expo-image` | The image component behind `@/tw/image` (`objectFit` → `contentFit` remap). |
| `expo-linear-gradient` | RN has no `background-image`; every gradient in the design system goes through this. |
| `expo-glass-effect` | iOS liquid-glass surfaces. |
| `expo-image-picker` / `expo-image-manipulator` | Photo capture and the client-side downscale in `api/imagePrep.ts`. |

### Animation

| Package | Why |
| --- | --- |
| `react-native-reanimated` `4.3.1` | All non-trivial animation. |
| `react-native-worklets` `0.8.3` | Reanimated 4's worklet runtime — **its version is coupled to Reanimated's.** |

### State & data

| Package | Why |
| --- | --- |
| `@reduxjs/toolkit` `^2.12.0` | Store + RTK Query. One `baseApi`, endpoints injected per domain. |
| `react-redux` `^9.3.0` | Bindings; typed `useAppSelector` / `useAppDispatch` in `src/store`. |
| `socket.io-client` `^4.8.3` | Two singletons: `/chat` namespace and the default namespace for AI. |
| `axios` `^1.18.1` | Only `src/api/client.ts` (legacy upload path). New work uses RTK Query. |
| `expo-secure-store` | Tokens, persona, active tenant, local flags. Never AsyncStorage. |

### Auth & misc

| Package | Why |
| --- | --- |
| `@react-native-google-signin/google-signin` `^16.1.4` | Native Google Sign-In; the iOS URL scheme is configured in `app.json`. |
| `expo-web-browser` / `expo-linking` | External links; deep-link scheme `uplyapp`. |
| `react-native-markdown-display` | Renders the assistant's Markdown answers. |
| `expo-device`, `expo-constants`, `expo-system-ui`, `expo-status-bar`, `expo-font` | Platform plumbing. |

---

## 3. The version traps

**Never hand-pick versions.** Use `npx expo install <pkg>` and verify with
`npx expo-doctor`. Three couplings matter:

1. **NativeWind ↔ react-native-css ↔ Tailwind v4.** NativeWind v5 is a preview
   release; `react-native-css` is its runtime. Bumping one without the other
   produces styles that silently compile to nothing.
2. **Reanimated 4 ↔ react-native-worklets.** Reanimated 4 moved worklets into a
   separate package. Mismatched versions crash at startup with a worklet-runtime
   error, not a build error.
3. **`lightningcss` pinned at `1.30.1`.** Enforced twice in `package.json`
   (`resolutions` for yarn/pnpm, `overrides` for npm). A transitive bump breaks
   colour parsing — `oklch()` values stop resolving and the whole theme goes flat.

After any dependency change:

```bash
npx expo install --fix
npx expo-doctor
npx expo start --clear
```

---

## 4. Build configuration files

### `app.json`

```jsonc
{
  "expo": {
    "name": "UPLY", "slug": "UPLY-App", "scheme": "uplyapp",
    "userInterfaceStyle": "automatic",         // dark mode follows the OS
    "ios":     { "bundleIdentifier": "com.hatoom.UPLYApp" },
    "android": { "package": "com.hatoom.UPLYApp",
                 "predictiveBackGestureEnabled": false },
    "plugins": ["expo-router", "expo-splash-screen", "expo-secure-store",
                "expo-image-picker", "@react-native-google-signin/google-signin"],
    "experiments": { "typedRoutes": true, "reactCompiler": true }
  }
}
```

- `userInterfaceStyle: "automatic"` is what makes `@media (prefers-color-scheme: dark)`
  in `global.css` work on native.
- `predictiveBackGestureEnabled: false` — Android's predictive back does not play
  well with the native tab stack yet.
- The `expo-image-picker` plugin carries the user-facing photo permission string.

### `metro.config.js`

```js
module.exports = withNativewind(config, {
  input: "./src/global.css",
  inlineVariables: false,        // keeps PlatformColor / light-dark() working
  globalClassNamePolyfill: false // className comes from the src/tw wrappers
});
```

Both flags are deliberate. **`globalClassNamePolyfill: false` is why plain RN
components ignore `className`** — see §5.

### `babel.config.js`

```js
presets: ["babel-preset-expo"]   // that's all
```

No NativeWind Babel plugin (v5 is CSS-first) and no Reanimated plugin
(`babel-preset-expo` handles worklets on SDK 56). Adding either will break the build.

### `tsconfig.json`

```jsonc
{ "extends": "expo/tsconfig.base",
  "compilerOptions": { "strict": true,
    "paths": { "@/*": ["./src/*"], "@/assets/*": ["./assets/*"] } } }
```

Always import through `@/…`. Relative `../../..` chains are not used in this repo.

### `eas.json`

| Profile | What it produces |
| --- | --- |
| `development` | Dev client, internal distribution — the build you install once and keep |
| `preview` | Internal distribution release build |
| `production` | Store build, `autoIncrement: true`, `appVersionSource: "remote"` |

---

## 5. The two setup traps that cost the most time

### `className` does not work on bare React Native components

`globalClassNamePolyfill` is off. `import { View } from "react-native"` gives you a
component that **silently ignores `className`** — no error, no style, usually a
blank screen.

```tsx
import { View, Text } from "@/tw";        // ✅ className works
import { View } from "react-native";      // ❌ className is dropped
```

`src/tw/index.tsx` exports CSS-enabled `View · Text · ScrollView · FlatList ·
Pressable · TextInput · SafeAreaView · TouchableHighlight · AnimatedScrollView ·
Link`, plus `useCSSVariable`. `@/tw/image` exports the `expo-image` wrapper and
`@/tw/Tone` the gradient surface. Anything not in there needs a wrapper — copy the
`useCssElement(Component, props, { className: "style" })` pattern.

### The root providers are mandatory

```tsx
<Provider store={store}>
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <StatusBar />
      <AppContent />
```

Dropping `GestureHandlerRootView` breaks every sheet and swipe with no error.
Dropping `SafeAreaProvider` makes `useSafeAreaInsets()` return zeros, so headers
sit under the notch.

---

## 6. Environment variables

`EXPO_PUBLIC_*` variables are **inlined at build time** — changing one requires a
Metro restart (`npx expo start --clear`), and none of them are secret.

| Key | Consumed by | Fallback |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | `src/api/config.ts` (REST + both sockets) | a hardcoded nip.io host |
| `EXPO_PUBLIC_DASHBOARD_URL` | `src/api/config.ts` | `''` → every dashboard link hides |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `features/shared/auth/hooks/useGoogleAuth` | — |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | same | — |
| `EXPO_PUBLIC_HOME_FIXTURES` | `features/coach/home/lib/fixtures.ts` | unset (live data) |

`EXPO_PUBLIC_HOME_FIXTURES` accepts `all` (every attention queue populated),
`clear` (all-clear state) or `nulls` (null adherence, empty MRR map) — a dev-only
way to see coach Home states live data won't produce on demand.

---

## 7. Deliberate non-dependencies

Things you might expect to find, and why they aren't here:

| Not used | Instead |
| --- | --- |
| `@react-navigation/*` directly | `expo-router` owns navigation |
| `redux-persist` | Only `expo-secure-store`, with explicit keys — the assistant thread must *never* persist |
| `AsyncStorage` | `expo-secure-store` for everything persisted |
| `@gorhom/bottom-sheet` | `@expo/ui` `BottomSheet` |
| A REST endpoint for the AI assistant | It is socket-only; nothing is persisted server-side |
| A test runner | **There is no test suite yet.** Verification is typecheck + lint + manual on both platforms |

That last row is the biggest gap in the project. See
[`13-conventions.md`](13-conventions.md) for what "done" means without tests.
