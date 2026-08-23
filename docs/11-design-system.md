# 11 — Design System

One theme file, a set of `className`-enabled wrappers, and four surface recipes.
Everything visual in the app resolves through these — there are no inline hex
values in components, and there is no `tailwind.config.js`.

---

## 1. Where the design system lives

| File | Owns |
| --- | --- |
| [`src/global.css`](../src/global.css) | **Every** colour, radius, shadow, font and animation, in both themes |
| [`src/tw/index.tsx`](../src/tw/index.tsx) | `className`-enabled RN primitives + `useCSSVariable` |
| [`src/tw/Tone.tsx`](../src/tw/Tone.tsx) | Branded gradient surfaces + `GlassSheen` |
| [`src/tw/image.tsx`](../src/tw/image.tsx) | `expo-image` with `objectFit` → `contentFit` |
| [`src/shared/ui/`](../src/shared/ui/) | The component recipes: `Surface`, `Card`, `Icon`, `GlassButton`, … |
| [`src/shared/hooks/useNativeTabsTheme.ts`](../src/shared/hooks/useNativeTabsTheme.ts) | The one place native tab colours are mirrored as literals |

---

## 2. Tailwind v4, CSS-first

NativeWind v5 + Tailwind v4 register the theme **in CSS**, not in a JS config:

```css
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css";
@source "../src";              /* where class names are scanned */

@theme inline { … }            /* token → utility registration */
:root { … }                    /* light values */
@media (prefers-color-scheme: dark) { :root { … } }   /* dark values */
```

`@theme inline` matters: it makes the generated utilities reference the live
`var()`, so `bg-mint` / `text-primary` follow light/dark **automatically** with no
`dark:` variants anywhere in the codebase.

Two native constraints shape the file:

- **px only.** No `rem`, no mixed-unit `calc()` — the RN runtime can't resolve
  those. The radius scale is written in px around a 20px base.
- **Colours are `oklch()`**, compiled to hex by `lightningcss` for native. That
  library is pinned to `1.30.1`; an unpinned bump breaks colour parsing and the
  theme goes flat.

Dark mode needs no `.dark` class: `app.json` sets
`userInterfaceStyle: "automatic"`, so `prefers-color-scheme` follows the OS (and
NativeWind's `setColorScheme`, which the header's theme toggle calls).

---

## 3. The token palette

### Semantic base

`background` · `foreground` · `card` · `card-foreground` · `popover` ·
`primary` · `primary-foreground` · `secondary` · `muted` · `muted-foreground` ·
`accent` · `destructive` · `border` · `input` · `ring`

`--primary` is UPLY orange (`oklch(0.68 0.19 38)` light, `0.72` dark).

### Brand tones

Each is a pale fill plus a readable ink, and each **inverts** in dark mode — the
fill becomes dark and the ink becomes light:

| Token pair | Used for |
| --- | --- |
| `mint` / `mint-ink` (+ `mint-600`, `mint-800`) | success, streaks, stacked chart segments |
| `lilac` / `lilac-ink` (+ `lilac-on`, `lilac-bright`) | AI, insights, week bars |
| `sun` / `sun-ink` (+ `sun-tint`) | praise, reviews |
| `peach` / `peach-ink` | warm accents |
| `sky` / `sky-ink` | calm/rest states |
| `ink` / `ink-foreground` | the dark statement surface |

`mint-600` / `mint-800` exist so a stacked chart can read as **one category** in
three steps instead of introducing hues the palette doesn't have. In dark mode the
ramp inverts (each step lightens) so the segments stay separable.

### Semantic extras — and why they aren't aliases

| Token | Deliberately not | Because |
| --- | --- | --- |
| `danger` / `danger-tint` / `danger-muted` | `destructive` | `destructive` means "this button destroys data" and is tuned as a solid fill at chroma .22. `danger` is tuned as a **tint** (26% border, 15% bubble) and as 12px body text |
| `info` / `info-tint` | `sky` | `sky` is a pale fill with no readable text step |
| `star` | `sun-ink` | Rating glyphs only — **never a fill, never text**. Kept apart so a star is the same colour whatever it sits on. Identical in both themes |
| `primary-tint` / `primary-light` | `primary` | The client's own review card. `primary-light` is "light" in **role**, not luminance — in light mode it is *darker* than `primary`, because the tint under it is near-white |
| `surface-hi` / `surface-lo` | `card` | The gradient every card runs through — see §5 |
| `indigo-tint` | `lilac` | Gradient start for the AI insight card |

Contrast is not decorative here. Several tokens carry a comment recording the
exact reason for their lightness — `--success` was darkened from L .72 because at
.72 on a white card it measured ~2.6:1 and failed AA for the 12px delta chip;
`--danger` sits at L .585 so `text-danger` clears 4.5:1; `--primary-light` at
L .575 so 9.5px kicker text clears 4.5:1 on `--primary-tint`. **If you change a
value, re-check the contrast that comment names.**

### Radius, shadow, type, motion

```
--radius-sm 16  --radius-md 18  --radius-lg 20  --radius-xl 24
--radius-2xl 28 --radius-3xl 32 --radius-4xl 36        (--radius: 20px base)

--shadow-soft   the default card lift
--shadow-pop    raised / glass surfaces
--shadow-ink    the dark statement card
--shadow-cta    the filled-primary CTA glow — tinted with the button's own
                orange so it reads as the button glowing, not a grey drop shadow

--font-sans / --font-display : "Sora", "Inter", system-ui

--animate-fade-up   400ms entrance
--animate-streak    700ms streak pop
```

> **Shadow values are baked at compile time.** `@theme inline` inlines the literal
> into the `.shadow-*` utility, so the dark-mode redefinitions of
> `--shadow-soft/pop/ink` further down the file are **dead code** — they are never
> read. `--shadow-cta` is written once, for both themes, on purpose.

### The two padding utilities

```css
@utility pb-tabbar { padding-bottom: 120px; @media android { padding-bottom: 48px; } }
@utility pb-screen { padding-bottom: 32px; }
```

The native tab bar **overlays** content on both platforms — a translucent
`UITabBar` on iOS, a `BottomNavigationView` pinned over a `MATCH_PARENT` content
view on Android — and the required clearance differs (iOS: 49pt bar + 34pt home
indicator; Android: a shorter Material bar that absorbs the gesture inset).

**Use `pb-tabbar` inside `(tabs)`, `pb-screen` on pushed screens. Tune the numbers
in `global.css`, never per screen.**

---

## 4. `src/tw` — where `className` comes from

`globalClassNamePolyfill` is **off** in `metro.config.js`. A bare RN component
silently ignores `className`: no error, no style, usually a blank screen.

```tsx
import { View, Text, ScrollView, Pressable } from "@/tw";   // ✅
import { View } from "react-native";                         // ❌ className dropped
```

**Exported from `@/tw`:** `View` · `Text` · `ScrollView` · `FlatList` ·
`Pressable` · `TextInput` · `SafeAreaView` · `TouchableHighlight` ·
`AnimatedScrollView` · `Link` · `useCSSVariable`
**From `@/tw/image`:** `Image` · **From `@/tw/animated`:** `Animated.View` ·
**From `@/tw/Tone`:** `Tone` · `GlassSheen`

Need another one? Copy the pattern:

```tsx
export const Foo = (props: React.ComponentProps<typeof RNFoo> & { className?: string }) =>
  useCssElement(RNFoo as React.ComponentType<any>, props, { className: "style" });
```

Wrappers that take a content container map a second prop:

```tsx
{ className: "style", contentContainerClassName: "contentContainerStyle" }
```

### `useCSSVariable` — reading a token from JS

Some props are not styles: gradient colours, `tintColor`, native tab colours.

```tsx
const primary = useCSSVariable("--primary") as string | undefined;
```

It resolves against the **current colour scheme**, so a value read this way
flips with the theme for free. This is how `Tone`, `Surface`, `Icon` and
`GlassButton` stay themed without duplicating the palette.

---

## 5. The four surface recipes

RN has **no `background-image`**, so `bg-gradient-to-br` compiles to *nothing* —
a card written that way renders transparent. Every gradient in this app is
`expo-linear-gradient` fed by the same theme variables.

### `Surface` — the neutral elevated card

```tsx
<Surface radius="lg" sheen className="p-5">…</Surface>
<Surface from="--danger-tint" to="--card" angle={135} radius="md">…</Surface>
```

| Prop | |
| --- | --- |
| `from` / `to` | CSS variable **names**, not colours. Default `--surface-hi` → `--surface-lo` |
| `angle` | CSS gradient degrees (0 = to top, 135 = to bottom-right) |
| `sheen` | The inner hairline highlight |
| `glass` | Frosted: translucent fill + the glossy diagonal pass |
| `radius` | `none · sm · md · lg · xl` — maps to `--radius-*` |
| `onPress` | Renders a `Pressable` with the standard active state |

The sheen is an absolutely-filled hairline ring, not an inset shadow: an arbitrary
`shadow-[...]` value compiles into a five-way `--tw-*` var chain that nothing in
this app uses. RN lays absolute children out against the padding box, so the ring
lands exactly one border-width inside — where an inset shadow would draw.

**This is the default.** Every card and row on a rebuilt screen goes through it so
the fill, radius and highlight stay in one place.

### `Tone` — a branded gradient surface

```tsx
<Tone name="mint" className="rounded-3xl p-5">
  <Text className="text-mint-ink font-display">Streak</Text>
</Tone>
```

`name` ∈ `mint · lilac · sky · peach · sun · ink · primary`. Each tone blends its
fill toward its ink (`mix: 0.22`, or `0.25` for `ink`/`primary`), at 135°.

- `raised` — a straight top→bottom ramp with a white lift and a dark foot.
- `glass` — translucent fill (opacity .8) plus `GlassSheen`, a white/30 rim and
  `shadow-pop`.

`GlassSheen` is exported separately: drop it over **any** fill to get the
liquid-glass finish.

### `Card` — Surface + padding + tone + press

```tsx
<Card>…</Card>                              // border + bg-card + shadow-soft
<Card tone="lilac">…</Card>                 // gradient fill
<Card glass>…</Card>                        // frosted
<Card raised>…</Card>                       // the lifted variant
<Card interactive onPress={…}>…</Card>
```

Use `Card` for content blocks; drop to `Surface` when you need a custom gradient
or a non-card row.

### `GlassButton` — the round chrome control

Wraps `expo-glass-effect`'s `GlassView` when
`isLiquidGlassAvailable()`, and falls back cleanly when it isn't. `className` is
applied to the **GlassView**, not the inner `Pressable` — the glass surface is the
outer element and owns size, radius and positioning. Used for every header
control, and anywhere a floating action sits over content.

---

## 6. `Icon`

One wrapper over `expo-symbols`' `SymbolView`, with a hand-maintained map of ~60
semantic names to an SF Symbol **and** a Material name:

```tsx
<Icon name="bell" size={18} color="--muted-foreground" />
<Icon name="star" size={14} color="--star" />
```

`color` accepts a **CSS variable name** (starts with `--`, resolved through
`useCSSVariable`, so it follows the theme) or a literal. **Prefer the variable
form** — a literal hex is a theme bug waiting to happen.

Adding an icon means adding one row to `SYMBOLS` with both platform names, plus
the name to the `IconName` union. Do not import glyphs ad hoc.

---

## 7. The component recipe library

| Component | Use for |
| --- | --- |
| `Surface` · `Card` | Every elevated block |
| `Icon` · `GlassButton` | Glyphs and chrome controls |
| `SectionHeader` · `SectionTitle` | Section headings |
| `StatCell` · `MetricGrid` | A card's data row — value over an all-caps label. `unit` rides inside the value ("185" + "g"); `valueClassName` exists so an empty cell's "—" renders muted rather than as a result |
| `ProgressTrack` · `WeekProgress` · `WeekStepper` | Progress and week navigation |
| `Segmented` · `SegmentedControl` · `FilterPill` | Switches and filters |
| `SearchField` | Debounced search input |
| `AvatarStack` | Overlapping roster faces |
| `WeightChart` · `StarRating` | Charts and ratings |
| `PlanDetailHeader` | The shared plan/program detail header |

---

## 8. Rules

1. **No hex in components.** New colour → a token in `global.css`, in both themes.
2. **Import RN primitives from `@/tw`.** Bare RN components ignore `className`.
3. **No `dark:` variants.** Tokens flip themselves; a `dark:` class means a token
   is missing.
4. **No `bg-gradient-*`.** Use `Surface` or `Tone`.
5. **Use `Surface`/`Card` rather than hand-rolling a bordered `View`** — that is how
   radius and elevation drift.
6. **`pb-tabbar` in tabs, `pb-screen` elsewhere.** Never a magic `pb-[112px]`.
7. **Pass CSS variable names to `Icon`, `Surface` and `GlassButton`**, not resolved
   colours.
8. **Check both themes and both platforms.** Blur, tab bars and safe-area insets
   differ, and half the tokens invert.
9. **Animate with Reanimated 4 directly.** NativeWind is for static styling; the
   `@keyframes` in `global.css` are for simple entrances only.
10. **Read the comment before changing a token.** Several encode a measured
    contrast ratio.
