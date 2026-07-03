import { NativeTabs } from "expo-router/unstable-native-tabs";
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

export default function ClientTabsLayout() {
  const colorScheme = useColorScheme();
  const c = palette[colorScheme === "dark" ? "dark" : "light"];

  return (
    <NativeTabs
      tintColor={c.active}
      iconColor={{ default: c.inactive, selected: c.active }}
      labelStyle={{
        default: { color: c.inactive, fontSize: 11 },
        selected: { color: c.active, fontWeight: "600" },
      }}
      backgroundColor={c.background}
      blurEffect={c.blur} // iOS only
      indicatorColor={c.active + "22"} // ~13% alpha
      rippleColor={c.active + "22"}
      minimizeBehavior="never"
    >
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="message" md="chat" />
        <NativeTabs.Trigger.Badge>3</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="chart.line.uptrend.xyaxis"
          md="show_chart"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
