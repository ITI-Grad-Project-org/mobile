# 03 — `@expo/ui` Guide

`@expo/ui` gives you **real native components** — SwiftUI on iOS, Jetpack Compose on Android — driven from React. As of SDK 56 it's **stable** (the SwiftUI and Compose APIs went stable after three SDK cycles). This doc is how to use it well in CoachHub and, just as importantly, **when not to**.

## The three flavors of import

`@expo/ui` exposes components three ways. Know which you're using:

1. **Universal** — `import { Host, Row, Column, Text, TextInput, Button, Switch, Slider, Checkbox, BottomSheet } from '@expo/ui'`
   One import, renders SwiftUI on iOS and Compose on Android automatically. No `.ios.tsx`/`.android.tsx` split. **Web is still experimental — don't rely on it.** This is your default for cross-platform native UI.

2. **Platform-specific (iOS)** — `import { ... } from '@expo/ui/swift-ui'` plus `from '@expo/ui/swift-ui/modifiers'`
   Full SwiftUI surface (e.g. `TabView`, `SwipeActions`, `Mask`, `LazyVStack`, glass effects). Use when you need a SwiftUI feature the universal layer doesn't cover.

3. **Platform-specific (Android)** — `import { ... } from '@expo/ui/jetpack-compose'` plus `from '@expo/ui/jetpack-compose/modifiers'`
   Full Compose surface (e.g. `Snackbar`, `LoadingIndicator`, `LazyRow`, `useMaterialColors`). Use for Material-specific UI.

4. **Community drop-ins** — `import DateTimePicker from '@expo/ui/community/datetime-picker'` (and picker, slider, segmented-control, masked-view, etc.)
   Drop-in replacements for popular community libs. Change the import, keep most props. Lets you drop several native dependencies.

**Default rule:** reach for **universal** first. Drop to platform-specific only when you need a feature it doesn't expose. Isolate any platform-specific component behind a wrapper in `src/shared/ui` so the rest of the app stays platform-agnostic.

## The `Host` boundary — the thing people get wrong

`@expo/ui` components must live inside a **`Host`**. Inside a `Host`, **layout is SwiftUI/Compose, not Yoga flexbox.** That means:

- You lay out with `Row` / `Column` (and SwiftUI/Compose modifiers), **not** with React Native `View` + flexbox + NativeWind classes.
- **NativeWind `className` does not style the inside of a `Host`.** `@expo/ui` components are not RN views; Tailwind classes won't reach them. Style them with `@expo/ui` modifiers (`from '@expo/ui/.../modifiers'`) — e.g. padding, fillMaxWidth, background — not with NativeWind.
- You can freely **mix** trees: an RN/NativeWind screen can contain a `Host` island, and you compose at the component level. But don't expect styling to cross the boundary in either direction.

This is the key to keeping NativeWind and `@expo/ui` from fighting: **NativeWind styles RN views; `@expo/ui` modifiers style native components.** Draw the line at the `Host`.

## Native state & worklets (the SDK 56 headline feature)

SDK 56 added `useNativeState` and `WorkletCallback`:

- `useNativeState` creates state shared directly between JS and the native view (`MutableState` on Compose, `ObservableObject` on SwiftUI). Reads/writes to `.value` are tracked by the native framework **without going through the React render cycle**.
- `WorkletCallback` lets you pass synchronous UI-thread callbacks as props. `TextField`'s `onValueChange` accepts one, giving **flicker-free controlled text inputs** (e.g. live input masking).

**Where CoachHub should use this:** high-frequency native inputs where a JS round-trip causes lag — e.g. a weight/reps logging stepper, an RPE slider, a masked phone field on intake. For ordinary forms, you don't need worklets; plain controlled inputs are fine.

**Requirement:** worklet features need `react-native-reanimated` + `react-native-worklets` installed (SDK 56 ships Reanimated 4, which already brings worklets). `useNativeState` itself works without them, but the *synchronous UI-thread* updates need the worklet runtime. See the version trap in [doc 02](02-tech-stack-decisions.md).

## Decision guide: `@expo/ui` vs RN + NativeWind

Use this table when building any screen.

| Build it with… | When the UI is… | CoachHub examples |
| --- | --- | --- |
| **`@expo/ui`** | Something users expect to "look like the OS" — system controls, native feel, platform conventions | Settings screens, modal **bottom sheets**, **pickers** (date, options), **segmented controls** (week/biweekly), switches/toggles, native-feeling forms, swipe actions on list rows, tab bars |
| **RN + NativeWind** | Custom, branded, data-dense, or visually distinctive | The coach **dashboard**, progress **charts** (with Skia/victory), branded client cards, the AI chat bubble UI, onboarding hero screens, anything using the CoachHub brand palette |
| **Either / mix** | A custom screen that contains a native control island | A branded program-builder screen (NativeWind layout) with a native `BottomSheet` for picking exercises |

**Heuristic:** if you'd struggle to make it match the brand, that's a sign it should be native (`@expo/ui`). If you'd struggle to make it feel native, that's a sign it should be NativeWind. Branding lives in NativeWind-land; OS-native interactions live in `@expo/ui`-land.

## Theming

- `@expo/ui` components inherit platform theming. On Android, `useMaterialColors` gives you Material 3 dynamic colors that follow the system theme; the `Icon` component + `@expo/material-symbols` gives the full Material Symbols catalog.
- The **CoachHub brand palette** (from the spec's tenant branding) applies to the **NativeWind/RN** side. Don't try to force brand colors onto every native control — let native controls be native, and express brand in the custom UI. Per-tenant branding (logo, brand colors) themes the *custom* surfaces.

## Practical conventions for this project

1. **Wrap every `@expo/ui` component you use in `src/shared/ui`.** Even a thin wrapper. This gives you one place to swap implementations, apply defaults, and keep platform-specific imports from spreading.
2. **Keep `Host` islands small and self-contained.** Don't nest deep RN trees inside a `Host` or vice-versa more than necessary.
3. **Pin the `@expo/ui` version via `expo install`** and re-check after any SDK bump — its API stabilized in 56 but still iterates (check the `@expo/ui` CHANGELOG on upgrades).
4. **Don't use the universal web target for anything user-facing in v1.** It's experimental. CoachHub v1 is iOS + Android.