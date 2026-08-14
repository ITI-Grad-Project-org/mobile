import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Text, View } from "@/tw";
import { Image } from "@/tw/image";
import type { PlanClient } from "../lib/normalizePlan";

/** Fixed sizes only — a computed `h-[${n}px]` would never reach the compiler. */
const SIZES = {
  sm: { box: "h-6 w-6", initials: "text-[10px]", icon: 12 },
  md: { box: "h-8 w-8", initials: "text-[11px]", icon: 15 },
} as const;

interface ClientAvatarProps {
  client: PlanClient | null;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * The client's photo, falling back to initials — and, when no client is linked
 * at all, to a dashed placeholder that reads as an empty slot rather than a
 * person.
 */
export function ClientAvatar({ client, size = "sm", className }: ClientAvatarProps) {
  const dimensions = SIZES[size];
  const box = cn("shrink-0 overflow-hidden rounded-full", dimensions.box, className);

  if (!client) {
    return (
      <View className={cn(box, "items-center justify-center border border-dashed border-border")}>
        <Icon name="user" size={dimensions.icon} color="--muted-foreground" />
      </View>
    );
  }

  if (client.avatarUrl) {
    return <Image source={{ uri: client.avatarUrl }} className={cn(box, "object-cover")} />;
  }

  return (
    <View className={cn(box, "items-center justify-center bg-secondary")}>
      <Text className={cn("font-semibold text-secondary-foreground", dimensions.initials)}>
        {initialsOf(client.name)}
      </Text>
    </View>
  );
}

function initialsOf(name: string | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "—";
}
