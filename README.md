# UPLY App

A React Native mobile app built with [Expo](https://expo.dev) (SDK 56), [Expo Router](https://docs.expo.dev/router/introduction/) for file-based routing, and [NativeWind](https://www.nativewind.dev/) for Tailwind CSS styling.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS) and npm
- For iOS: macOS with Xcode
- For Android: Android Studio with an emulator/SDK configured
- [EAS CLI](https://docs.expo.dev/eas/) (`npm install -g eas-cli`) — only needed for cloud builds

## Getting started

1. **Clone and install dependencies**

   ```bash
   git clone https://github.com/ITI-Grad-Project-org/mobile.git
   cd mobile
   npm install
   ```

   > Always commit and pull `package-lock.json` so everyone installs the exact same dependency versions.

2. **Generate the native projects** (the `ios/` and `android/` folders are gitignored)

   ```bash
   npx expo prebuild
   ```

3. **Start the dev server**

   ```bash
   npx expo start --clear
   ```

   This project uses a custom [development build](https://docs.expo.dev/develop/development-builds/introduction/) (`expo-dev-client`), not Expo Go. From the dev server output you can open the app on:

   - **iOS simulator** — press `i` (or run `npm run ios`)
   - **Android emulator** — press `a` (or run `npm run android`)
   - A physical device with a development build installed

   The `--clear` flag resets the Metro cache and is recommended after pulling config changes (Babel, Metro, Tailwind, etc.).

## Project structure

```
src/
  app/            # Screens & routes (file-based routing via expo-router)
    index.tsx     # Entry route
  global.css      # Tailwind directives consumed by NativeWind
assets/           # Images, fonts, icons
app.json          # Expo app config
eas.json          # EAS build/submit profiles
tailwind.config.js
metro.config.js   # Wires global.css into NativeWind
babel.config.js
```

## Styling (NativeWind)

Use Tailwind utility classes via the `className` prop:

```tsx
<View className="flex-1 items-center justify-center bg-white">
  <Text className="text-xl font-bold text-blue-600">Hello</Text>
</View>
```

The Tailwind entry file is [src/global.css](src/global.css), wired into Metro through [metro.config.js](metro.config.js). If styles stop applying, restart with `npx expo start --clear`.

## Available scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm start`       | Start the Expo dev server            |
| `npm run ios`     | Build & run on the iOS simulator     |
| `npm run android` | Build & run on the Android emulator  |
| `npm run web`     | Run in the browser                   |
| `npm run lint`    | Run ESLint                           |

## Environment variables

Secrets are **not** committed. Create a local `.env` (gitignored) for any API keys or backend URLs. If you add new variables, document the required keys here so your teammate knows what to set.

## Working together

- Branch off `main` for each feature (`git checkout -b feature/<name>`), then open a Pull Request.
- Pull `main` and run `npm install` whenever dependencies change.
- Re-run `npx expo prebuild` if native config or native dependencies change.
