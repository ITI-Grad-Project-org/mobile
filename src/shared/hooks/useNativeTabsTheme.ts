import { useColorScheme } from "react-native";

// NativeTabs props take literal ColorValues — they can't read the --primary /
// --muted CSS vars from global.css, so mirror the light/dark tokens here.
const palette = {
  light: {
    active: "#e5673a", // --primary
    inactive: "#7c7c85", // --muted-foreground
    background: "#f4f2ee", // --muted
    blur: "systemChromeMaterialLight",
  },
  dark: {
    active: "#f2764a", // --primary (dark)
    inactive: "#a8a8b0", // --muted-foreground (dark)
    background: "#33333b", // --muted (dark)
    blur: "systemChromeMaterialDark",
  },
} as const;

/**
 * Shared `<NativeTabs>` props for both the coach and client tab bars.
 *
 * Android is tuned to read like the iOS bar — every label always visible and no
 * Material pill behind the selected icon, so selection is carried by tint +
 * weight exactly as on iOS — while keeping the platform-native touch feedback
 * (ripple on press).
 */
export function useNativeTabsTheme() {
  const colorScheme = useColorScheme();
  const c = palette[colorScheme === "dark" ? "dark" : "light"];

  return {
    tintColor: c.active,
    iconColor: { default: c.inactive, selected: c.active },
    labelStyle: {
      default: { color: c.inactive, fontSize: 11 },
      selected: { color: c.active, fontWeight: "600" as const },
    },
    backgroundColor: c.background,
    // iOS only
    blurEffect: c.blur,
    minimizeBehavior: "never" as const,
    // Android only
    labelVisibilityMode: "labeled" as const,
    disableIndicator: true,
    rippleColor: c.active + "22", // ~13% alpha
    badgeTextColor: "#ffffff",
    tabBarRespectsIMEInsets: true,
  };
}
