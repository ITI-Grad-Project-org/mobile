import { Feather } from "@expo/vector-icons";

import { cn } from "@/lib/utils";
import { Pressable, Text, View, useCSSVariable } from "@/tw";
import { Image } from "@/tw/image";
import type { SearchCoach } from "../data";

// A coach result card: cover image, avatar, meta, and a Send-request action.
export function CoachCard({
  coach: c,
  requested,
  onOpen,
  onRequest,
}: {
  coach: SearchCoach;
  requested: boolean;
  onOpen: () => void;
  onRequest: () => void;
}) {
  const muted = useCSSVariable("--muted-foreground") as string;
  const success = useCSSVariable("--success") as string;
  const onPrimary = useCSSVariable("--primary-foreground") as string;

  return (
    <View className="overflow-hidden rounded-3xl bg-card shadow-soft">
      <Pressable onPress={onOpen} className="active:opacity-90">
        <View className="h-32 w-full">
          <Image
            source={c.cover}
            className="h-full w-full"
            style={{ objectFit: "cover" }}
          />
          <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-full bg-black/55 px-2 py-1">
            <Feather name="star" size={11} color="#ffffff" />
            <Text className="text-[11px] font-semibold text-white">{c.rating}</Text>
          </View>
        </View>
        <View className="flex-row items-start gap-3 px-4 pb-3 pt-4">
          <Image
            source={c.avatar}
            className="h-16 w-16 rounded-2xl bg-secondary"
            style={{ objectFit: "cover" }}
          />
          <View className="min-w-0 flex-1">
            <Text className="text-[16px] font-bold text-foreground" numberOfLines={1}>
              {c.name}
            </Text>
            <View className="mt-0.5 flex-row items-center gap-1">
              <Feather name="map-pin" size={11} color={muted} />
              <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
                {c.location} · {c.yoe} yrs
              </Text>
            </View>
            <Text className="mt-1.5 text-[12.5px] leading-snug text-foreground/75" numberOfLines={2}>
              {c.bio}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {c.specialties.slice(0, 2).map((s) => (
                <View key={s} className="rounded-full bg-secondary px-2 py-0.5">
                  <Text className="text-[10.5px] font-semibold text-foreground">{s}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Pressable>

      <View className="flex-row items-center justify-between gap-3 border-t border-border/10 px-4 py-3">
        <Text className="text-[12px] text-muted-foreground">
          From{" "}
          <Text className="text-[14px] font-bold text-foreground">${c.priceFrom}</Text>
          /mo
        </Text>
        <Pressable
          onPress={onRequest}
          disabled={requested}
          className={cn(
            "flex-row items-center gap-1.5 rounded-full px-4 py-2 active:opacity-90",
            requested ? "bg-success/15" : "bg-primary shadow-soft"
          )}
        >
          <Feather
            name={requested ? "check" : "send"}
            size={13}
            color={requested ? success : onPrimary}
          />
          <Text
            className={cn(
              "text-[12.5px] font-semibold",
              requested ? "text-success" : "text-primary-foreground"
            )}
          >
            {requested ? "Requested" : "Send request"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
