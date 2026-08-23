import {
  CLIENT_INVITATIONS_READY,
  useListInvitationsQuery,
  useListMyInvitationsQuery,
} from "@/api/endpoints/invitations.endpoints";
import { useListTenantJoinRequestsQuery } from "@/api/endpoints/joinRequests.endpoints";
import {
  useGetClientProfileQuery,
  useGetCoachProfileQuery,
} from "@/api/endpoints/profile.endpoints";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, View } from "@/tw";
import { Image } from "@/tw/image";
import { useRouter, useSegments } from "expo-router";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function AppHeader() {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();
  // Key off the active route group to decide which profile to open and which
  // avatar to show — the mounted group already reflects the active membership.
  const segments = useSegments() as string[];
  const isCoach = segments.includes("(coach)");

  // The signed-in user's own avatar. Only the persona's endpoint is hit.
  const { data: coachMe } = useGetCoachProfileQuery(undefined, { skip: !isCoach });
  const { data: clientMe } = useGetClientProfileQuery(undefined, { skip: isCoach });
  const me = isCoach ? coachMe : clientMe;
  const avatarUrl: string | undefined = me?.avatarUrl || me?.avatar || undefined;

  // Show the badge only when there's something new for the active persona:
  // a coach's pending join requests or pending sent invitations, or a client's
  // pending invitations (dormant until the backend serves that route).
  const { tenantId } = useActiveTenant();
  const { data: joinRequests } = useListTenantJoinRequestsQuery(
    { tenantId: tenantId ?? "" },
    { skip: !isCoach || !tenantId }
  );
  const { data: coachInvitations } = useListInvitationsQuery(
    { tenantId: tenantId ?? "" },
    { skip: !isCoach || !tenantId }
  );
  const { data: clientInvitations } = useListMyInvitationsQuery(undefined, {
    skip: isCoach || !CLIENT_INVITATIONS_READY,
  });

  const hasNotifications = isCoach
    ? (joinRequests ?? []).some((r) => !r.status || r.status === "pending") ||
      (coachInvitations ?? []).some((i) => String(i.status ?? "pending").toLowerCase() === "pending")
    : (clientInvitations ?? []).some((i) => !i.status || i.status === "pending");

  const isDark = colorScheme === "dark";

  const toggleTheme = () => {
    setColorScheme(isDark ? "light" : "dark");
  };

  // One route for both personas — it renders the coach or client profile from
  // the signed-in persona, and pushes full-screen over this header either way.
  const handleProfilePress = () => {
    router.navigate("/my-profile");
  };

  const handleNotificationPress = () => {
    router.navigate(isCoach ? "/(coach)/notifications" : "/(client)/notifications");
  };

  return (
    <View
      style={{ paddingTop: Math.max(top, 12) }}
      className="bg-background border-b border-border shadow-soft z-50"
    >
      <View className="h-14 px-4 flex-row items-center justify-between">
        {/* Logo and Brand */}
        <View className="flex-row items-center gap-2">
          <Image
            source={
              !isDark
                ? require("@/assets/images/Uply-dark-logo.png")
                : require("@/assets/images/Uply-light-logo.png")
            }
            className="h-12 w-40 object-cover"
          />
        </View>

        {/* Action Controls */}
        <View className="flex-row items-center gap-4">
          {/* Dark Mode Toggle */}
          <GlassButton
            onPress={toggleTheme}
            className="h-9 w-9 rounded-full"
            accessibilityLabel="Toggle theme"
          >
            <Icon
              name={isDark ? "sun" : "moon"}
              size={18}
              color={isDark ? "--sun-ink" : "--muted-foreground"}
            />
          </GlassButton>

          {/* Notification Button */}
          <GlassButton
            onPress={handleNotificationPress}
            className="h-9 w-9 rounded-full"
            accessibilityLabel="Notifications"
          >
            <Icon name="bell" size={18} color="--muted-foreground" />
            {/* Red badge dot — only when there's a new notification */}
            {hasNotifications ? (
              <View className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border border-card" />
            ) : null}
          </GlassButton>

          {/* Profile Button — the avatar fills the surface, so no glass tint. */}
          <Pressable
            onPress={handleProfilePress}
            className="h-9 w-9 rounded-full overflow-hidden border border-border active:opacity-70"
            accessibilityLabel="View profile"
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} className="h-full w-full" />
            ) : (
              <View className="h-full w-full bg-muted items-center justify-center">
                <Icon name="person" size={20} color="--muted-foreground" />
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
