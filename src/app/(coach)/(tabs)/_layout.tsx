import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

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
export default function CoachTabsLayout() {
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
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={"house"} md={"home"} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="plans">
        <NativeTabs.Trigger.Label>Plans</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={"calendar"} md={"calendar_month"} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inbox">
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={"message"} md={"inbox"} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="clients">
        <NativeTabs.Trigger.Label>Clients</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={"person.3"} md={"group"} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ai">
        <NativeTabs.Trigger.Label>AI</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={"brain"} md={"auto_awesome"} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
