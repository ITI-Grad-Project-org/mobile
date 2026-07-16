import { Feather } from "@expo/vector-icons";
import { Modal } from "react-native";

import { cn } from "@/lib/utils";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Pressable, SafeAreaView, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { Image } from "@/tw/image";
import { Tone } from "@/tw/Tone";
import type { SearchCoach } from "../data";

// Full-screen coach detail with a "why we matched you" note and a request CTA.
export function CoachSheet({
  coach: c,
  requested,
  onClose,
  onRequest,
}: {
  coach: SearchCoach;
  requested: boolean;
  onClose: () => void;
  onRequest: () => void;
}) {
  const primary = useCSSVariable("--primary") as string;
  const success = useCSSVariable("--success") as string;
  const onPrimary = useCSSVariable("--primary-foreground") as string;
  const muted = useCSSVariable("--muted-foreground") as string;
  const lilacInk = useCSSVariable("--lilac-ink") as string;
  const foreground = useCSSVariable("--foreground") as string;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/55">
        <View className="max-h-[92%] overflow-hidden rounded-t-3xl bg-card">
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="h-40 w-full">
              <Image source={c.cover} className="h-full w-full" style={{ objectFit: "cover" }} />
              <View className="absolute right-4 top-4">
                <GlassButton
                  onPress={onClose}
                  accessibilityLabel="Close"
                  className="h-9 w-9 rounded-full"
                >
                  <Feather name="x" size={16} color={foreground} />
                </GlassButton>
              </View>
            </View>

            <View className="px-5 pb-5">
              <View className="-mt-10 self-start rounded-3xl bg-card p-1.5 shadow-pop">
                <Image
                  source={c.avatar}
                  className="h-20 w-20 rounded-3xl bg-secondary"
                  style={{ objectFit: "cover" }}
                />
              </View>

              <View className="mt-3 flex-row items-center gap-2">
                <Text className="text-[22px] font-bold text-foreground">{c.name}</Text>
                <View className="flex-row items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                  <Feather name="star" size={11} color={primary} />
                  <Text className="text-[11px] font-semibold text-foreground">{c.rating}</Text>
                  <Text className="text-[11px] text-muted-foreground">· {c.reviews}</Text>
                </View>
              </View>

              <View className="mt-1 flex-row items-center gap-1">
                <Feather name="map-pin" size={13} color={muted} />
                <Text className="text-[12.5px] text-muted-foreground">
                  {c.location} · {c.yoe} yrs
                </Text>
              </View>

              <Text className="mt-4 text-[14px] leading-relaxed text-foreground/85">{c.bio}</Text>

              <Text className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Specialties
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-1.5">
                {c.specialties.map((s) => (
                  <View key={s} className="flex-row items-center gap-1 rounded-full bg-secondary px-3 py-1">
                    <Feather name="award" size={11} color={muted} />
                    <Text className="text-[12px] font-semibold text-foreground">{s}</Text>
                  </View>
                ))}
              </View>

              <Tone name="lilac" className="mt-5 rounded-2xl p-4">
                <View className="flex-row items-center gap-2">
                  <Feather name="zap" size={13} color={lilacInk} />
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lilac-ink opacity-80">
                    Why we matched you
                  </Text>
                </View>
                <Text className="mt-1 text-[13.5px] font-medium text-lilac-ink">
                  Specializes in {c.specialties[0].toLowerCase()} — aligned with your stated goal.
                </Text>
              </Tone>
            </View>
          </ScrollView>

          <SafeAreaView edges={["bottom"]} className="border-t border-border/20 px-5 pt-3">
            <Pressable
              onPress={onRequest}
              disabled={requested}
              className={cn(
                "h-14 flex-row items-center justify-center gap-2 rounded-2xl active:opacity-90",
                requested ? "bg-success/15" : "bg-primary shadow-soft"
              )}
            >
              <Feather
                name={requested ? "check" : "send"}
                size={16}
                color={requested ? success : onPrimary}
              />
              <Text
                className={cn(
                  "text-[15px] font-semibold",
                  requested ? "text-success" : "text-primary-foreground"
                )}
              >
                {requested ? "Request sent" : "Send a request"}
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
