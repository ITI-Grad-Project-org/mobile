import { cn } from "@/lib/utils";
import { Text, View } from "@/tw";
import { Image } from "@/tw/image";

export interface StackPerson {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface AvatarStackProps {
  people: StackPerson[];
  /** How many faces before the +N chip. */
  max?: number;
  /** Roster size when it's bigger than `people` — drives the +N chip. */
  total?: number;
  className?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "—";
}

/**
 * Overlapping faces with a +N chip. Deliberately not ClientAvatar: that one is
 * typed to PlanClient and its SIZES map has no 26px step.
 */
export function AvatarStack({ people, max = 3, total, className }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const remaining = Math.max(0, (total ?? people.length) - shown.length);

  if (shown.length === 0) return null;

  // The ring is the background color, so faces read as separate discs while
  // overlapping — it has to match whatever they sit on.
  const disc = "h-[26px] w-[26px] shrink-0 overflow-hidden rounded-full border-[1.5px] border-background";

  return (
    <View className={cn("flex-row items-center", className)}>
      {shown.map((person, i) =>
        person.avatarUrl ? (
          <Image
            key={person.id}
            source={{ uri: person.avatarUrl }}
            className={cn(disc, "object-cover", i > 0 && "-ml-2")}
          />
        ) : (
          <View
            key={person.id}
            className={cn(disc, "items-center justify-center bg-secondary", i > 0 && "-ml-2")}
          >
            <Text className="text-[10px] font-semibold text-secondary-foreground">
              {initialsOf(person.name)}
            </Text>
          </View>
        )
      )}
      {remaining > 0 ? (
        <View className={cn(disc, "items-center justify-center bg-card -ml-2")}>
          <Text className="text-[10px] font-semibold text-muted-foreground">+{remaining}</Text>
        </View>
      ) : null}
    </View>
  );
}
AvatarStack.displayName = "AvatarStack";
