import { useState } from "react";
import { ExerciseSheet } from "@/features/client/today/components/ExerciseSheet";
import { animatedSourceOf, type Exercise } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { Tone } from "@/tw/Tone";
import { router } from "expo-router";
import { Modal, Platform } from "react-native";
import { TONE_ON, type DayPlan } from "../data";
import { GlassButton } from "@/shared/ui/GlassButton";

const isIOS = Platform.OS === "ios";

export function DaySheet({
  day,
  onClose,
}: {
  day: DayPlan | null;
  onClose: () => void;
}) {
  const [openExercise, setOpenExercise] = useState<Exercise | null>(null);
  // Row key of the exercise whose demo is playing inline. Only one at a time so
  // the sheet never has several GIFs decoding at once.
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  if (!day) return null;

  const onTone = TONE_ON[day.tone];

  const handleStartSession = () => {
    const dayId = (day as any).id || "demo-day";
    onClose();
    router.push(`/workout/${dayId}` as any);
  };

  /* Shared content — identical on both platforms, only the Modal chrome differs. */
  const content = (
    <View className="flex-1 bg-card overflow-hidden">
      {/* Tone header */}
      <Tone name={day.tone} className={cn("pl-5 pr-14 pb-5", isIOS ? "pt-5" : "pt-12")} glass>
        <GlassButton
          onPress={onClose}
          className={cn(
            "absolute right-4 z-10 h-9 w-9 items-center justify-center rounded-full bg-black/30 active:bg-black/50",
            isIOS ? "top-4" : "top-11",
          )}
          accessibilityLabel="Close"
        >
          <Icon name="x" size={16} color="#ffffff" />
        </GlassButton>
        <Text
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80",
            onTone,
          )}
        >
          {day.d} · {day.date} · {day.type}
        </Text>
        <Text className={cn("mt-1 text-[26px] font-bold leading-tight", onTone)}>
          {day.title}
        </Text>
        <View className="mt-2 flex-row items-center gap-2">
          <Icon
            name="clock"
            size={14}
            color={day.tone === "primary" || day.tone === "ink" ? "#ffffff" : `--${day.tone}-ink`}
          />
          <Text className={cn("text-[12.5px] opacity-85", onTone)}>
            {day.mins} min
          </Text>
          <Text className={cn("text-[12.5px] opacity-85", onTone)}>·</Text>
          <Text className={cn("text-[12.5px] opacity-85", onTone)}>
            {day.exercises.length} blocks
          </Text>
        </View>
      </Tone>

      {/* Body */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {day.notes ? (
          <Tone name="sky" className="mb-4 rounded-2xl p-3" glass>
            <Text className="text-[12.5px] leading-relaxed text-sky-ink">
              <Text className="font-semibold">Coach note: </Text>
              {day.notes}
            </Text>
          </Tone>
        ) : null}

        <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          What you&apos;ll do
        </Text>
        <View className="mt-3 gap-2.5">
          {day.exercises.map((ex, i) => {
            const fullExercise: Exercise = {
              id: (ex as any).id || `ex-${i}`,
              exerciseId: (ex as any).exerciseId,
              name: ex.name,
              sets: typeof ex.sets === "number" ? ex.sets : parseInt(String(ex.sets)) || 3,
              reps: (ex as any).reps || "10",
              weight: (ex as any).weight || "Bodyweight",
              muscle: (ex as any).muscle || "Full Body",
              image: ex.image,
              instructions: (ex as any).instructions || [],
              gifUrl: (ex as any).gifUrl,
              videoUrl: (ex as any).videoUrl,
              demoGifUrl: (ex as any).demoGifUrl,
              demoVideoUrl: (ex as any).demoVideoUrl,
              // Not day.notes — the day-level note already has its own card above.
              coachNotes: (ex as any).coachNotes || "",
            };

            const rowKey = `${ex.name}-${i}`;
            const animatedSource = animatedSourceOf(fullExercise);
            const isPlaying = playingKey === rowKey;

            return (
              <Pressable
                key={rowKey}
                onPress={() => setOpenExercise(fullExercise)}
                className="rounded-2xl bg-secondary/60 p-2.5 active:bg-secondary/90"
              >
                <View className="flex-row items-center gap-3">
                  {ex.image ? (
                    <Image
                      source={ex.image}
                      className="h-14 w-14 shrink-0 rounded-2xl bg-secondary"
                    />
                  ) : (
                    <View className="h-14 w-14 shrink-0 rounded-2xl bg-secondary/80 items-center justify-center border border-border/40">
                      <Icon name="dumbbell" size={24} color="--primary" />
                    </View>
                  )}
                  <View className="min-w-0 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[14.5px] font-semibold text-foreground"
                    >
                      {ex.name}
                    </Text>
                    <Text className="text-[12px] text-muted-foreground">
                      {ex.sets}
                    </Text>
                  </View>
                  {/* With a demo, play expands it in place; without one the row
                      press (opening the full sheet) stays the only action. */}
                  {animatedSource ? (
                    <Pressable
                      onPress={() => setPlayingKey(isPlaying ? null : rowKey)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isPlaying
                          ? `Hide ${ex.name} demonstration`
                          : `Play ${ex.name} demonstration`
                      }
                      className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card shadow-sm active:opacity-70"
                    >
                      <Icon
                        name={isPlaying ? "pause" : "play"}
                        size={14}
                        color="--foreground"
                      />
                    </Pressable>
                  ) : (
                    <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card/60 shadow-sm">
                      <Icon name="chevron-right" size={14} color="--muted-foreground" />
                    </View>
                  )}
                </View>

                {isPlaying ? (
                  <Image
                    source={animatedSource}
                    className="mt-2.5 w-full aspect-16/11 rounded-xl bg-secondary"
                    contentFit="cover"
                    transition={0}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View className="border-t border-border/60 bg-card/95 px-5 pt-3 pb-8 mb-8">
        <Pressable
          onPress={handleStartSession}
          className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4 shadow-soft active:opacity-90"
        >
          <Text className="text-[15px] font-semibold text-primary-foreground">
            Start session
          </Text>
        </Pressable>
      </View>

      {/* Exercise Detail / GIF Video Player Modal */}
      <ExerciseSheet
        key={openExercise?.id}
        exercise={openExercise}
        onClose={() => setOpenExercise(null)}
        onDone={() => {}}
      />
    </View>
  );

  // iOS: native page sheet (swipe-to-dismiss, previous screen visible behind).
  if (isIOS) {
    return (
      <Modal
        visible
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        {content}
      </Modal>
    );
  }

  // Android: transparent modal with a dimmed, tap-to-dismiss backdrop.
  return (
    <Modal
      visible
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View className="min-h-[90%] overflow-hidden shadow-pop">
          {content}
        </View>
      </View>
    </Modal>
  );
}
