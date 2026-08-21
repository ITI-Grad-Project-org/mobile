import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Text, View, useCSSVariable } from "@/tw";
import { Image } from "@/tw/image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

import { initialsOf } from "../lib/initials";

interface ProfileHeroProps {
  name: string;
  businessName?: string | null;
  avatarUrl?: string;
  city?: string | null;
  yearsExperience?: number | null;
}

/**
 * Identity, with no container around it. The hero is the one thing on the
 * screen that doesn't sit on a card — it reads as the page's own header, and a
 * card would put a box around the coach's face for no reason.
 */
export function ProfileHero({
  name,
  businessName,
  avatarUrl,
  city,
  yearsExperience,
}: ProfileHeroProps) {
  const meta = [city, yearsExperience != null ? `${yearsExperience} yrs experience` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <View className="flex-row items-center gap-3.5">
      <Avatar name={name} url={avatarUrl} />

      <View className="min-w-0 flex-1 gap-1.5">
        {/* Two lines, and `leading-[1.15]` so they sit tight enough to still
            read as one name. Never truncated — a coach's name is the one
            string on this screen that has to arrive whole. */}
        <Text
          className="font-display text-[23px] font-bold leading-[1.15] tracking-[-0.02em] text-foreground"
          numberOfLines={2}
        >
          {name}
        </Text>

        {businessName ? (
          <Text className="text-[13px] text-foreground/80" numberOfLines={1}>
            {businessName}
          </Text>
        ) : null}

        {meta ? (
          <View className="flex-row items-center gap-1">
            <Icon name="map-pin" size={12} color="--muted-foreground" />
            <Text className="min-w-0 flex-1 text-xs text-muted-foreground" numberOfLines={1}>
              {meta}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Photo, or initials on the same surface gradient every card uses. The gradient
 * is expo-linear-gradient rather than `bg-gradient-to-br`, for the reason
 * spelled out in shared/ui/Surface.tsx — RN has no background-image.
 */
function Avatar({ name, url }: { name: string; url?: string }) {
  const from = useCSSVariable("--surface-hi") as string | undefined;
  const to = useCSSVariable("--surface-lo") as string | undefined;

  const shape = "h-[74px] w-[74px] shrink-0 overflow-hidden rounded-full border border-border";

  if (url) {
    return <Image source={{ uri: url }} className={cn(shape, "object-cover")} />;
  }

  return (
    <View className={cn(shape, "items-center justify-center")}>
      <LinearGradient
        colors={[from ?? "transparent", to ?? "transparent"]}
        start={{ x: 0.146, y: 0.146 }}
        end={{ x: 0.854, y: 0.854 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Text className="font-display text-[24px] font-bold text-foreground/70">
        {initialsOf(name)}
      </Text>
    </View>
  );
}
