import type { Exercise } from "@/lib/data";
import { cn } from "@/lib/utils";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import { Tone } from "@/tw/Tone";
import { Image } from "@/tw/image";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
} from "react-native";

interface ExerciseSheetProps {
  exercise: Exercise | null;
  isDone?: boolean;
  onClose: () => void;
  onDone: (id: string) => void;
}

const isIOS = Platform.OS === "ios";

export function ExerciseSheet({
  exercise,
  isDone = false,
  onClose,
  onDone,
}: ExerciseSheetProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // The prescription copies the library fields onto itself (instructionSteps,
  // demoGifUrl, …), so everything shown here is already in the day payload —
  // no lookup against /exercises, which is coach-scoped anyway.
  const instructions: string[] = exercise?.instructions ?? [];

  // Animated demo: whatever the coach uploaded, in order of preference. A still
  // that is itself a GIF counts; there is no stock fallback clip.
  const animatedSource =
    exercise?.gifUrl ||
    exercise?.demoGifUrl ||
    exercise?.videoUrl ||
    exercise?.demoVideoUrl ||
    (typeof exercise?.image === "string" && exercise.image.endsWith(".gif")
      ? exercise.image
      : "");

  const stillSource = exercise?.image || "";

  // Warm the disk/memory cache as soon as the sheet opens so the first tap on
  // play swaps frames instantly instead of downloading the GIF right then.
  useEffect(() => {
    if (!animatedSource) return;
    ExpoImage.prefetch(animatedSource, { cachePolicy: "memory-disk" });
  }, [animatedSource]);

  if (!exercise) return null;

  const displaySource = isPlaying && animatedSource ? animatedSource : stillSource;

  const content = (
    <View className="flex-1 bg-card overflow-hidden">
      <KeyboardAvoidingView
        behavior={isIOS ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Scrollable body */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero image with video play overlays */}
          <View className="relative w-full aspect-16/11 bg-secondary overflow-hidden">
            <Pressable
              onPress={() => animatedSource && setIsPlaying((prev) => !prev)}
              disabled={!animatedSource}
              className="w-full h-full"
            >
              <Image
                source={displaySource}
                className="w-full h-full"
                contentFit="cover"
                // The still stays on screen while the GIF decodes, so the swap
                // reads as playback starting rather than a flash of empty box.
                placeholder={stillSource ? { uri: stillSource } : undefined}
                placeholderContentFit="cover"
                cachePolicy="memory-disk"
                priority="high"
                transition={0}
              />
            </Pressable>

            {/* Fade gradient overlay from bottom to top */}
            <LinearGradient
              colors={[
                "rgba(0,0,0,0.85)",
                "rgba(0,0,0,0.15)",
                "rgba(0,0,0,0.4)",
              ]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />



            {/* Close Button — sits closer to the top on iOS since the native sheet has no status-bar inset */}
            <GlassButton
              onPress={onClose}
              className={`absolute right-4 ${isIOS ? "top-4" : "top-10"} h-9 w-9 bg-black/50 rounded-full items-center justify-center active:bg-black/75 z-10`}
              accessibilityLabel="Close"
            >
              <Icon name="x" size={16} color="#ffffff" />
            </GlassButton>

            {/* Play/Pause Video Overlay Button — only when the coach actually
                uploaded a demo for this exercise. */}
            {animatedSource ? (
              <GlassButton
                onPress={() => setIsPlaying((prev) => !prev)}
                className={cn(
                  "absolute top-1/2 left-1/2 -ml-8 -mt-8 h-16 w-16 rounded-full shadow-pop z-10",
                  isPlaying ? "bg-black/50 border border-white/30" : "bg-white/70"
                )}
                accessibilityLabel={isPlaying ? "Pause demonstration" : "Play demonstration"}
              >
                <Icon
                  name={isPlaying ? "pause" : "play"}
                  size={28}
                  color={isPlaying ? "#ffffff" : "#000000"}
                />
              </GlassButton>
            ) : null}

            {/* Workout muscle group and Title details */}
            <View className="absolute bottom-4 left-5 right-5 pointer-events-none">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
                {exercise.muscle}
              </Text>
              <Text className="mt-0.5 text-[24px] font-bold leading-tight text-white shadow-sm">
                {exercise.name}
              </Text>
            </View>
          </View>

          {/* Workout Info, Instructions, and Input Form */}
          <View className="px-5 pt-5 gap-y-6">
            {/* Stats boxes */}
            <View className="flex-row gap-2">
              {[
                { l: "Sets", v: exercise.sets },
                { l: "Reps", v: exercise.reps },
                { l: "Weight", v: exercise.weight },
              ].map((s) => (
                <View
                  key={s.l}
                  className="flex-1 rounded-2xl bg-secondary p-3 items-center justify-center"
                >
                  <Text className="text-[11px] font-medium text-muted-foreground">
                    {s.l}
                  </Text>
                  <Text className="mt-0.5 text-[17px] font-bold tracking-tight text-foreground">
                    {s.v}
                  </Text>
                </View>
              ))}
            </View>

            {/* Instructions list */}
            <View>
              <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                Instructions
              </Text>
              {instructions.length > 0 ? (
                <View className="gap-3">
                  {instructions.map((step, i) => (
                    <View key={i} className="flex-row gap-3 items-start">
                      <View className="h-6 w-6 rounded-full bg-primary items-center justify-center mt-0.5">
                        <Text className="text-[12px] font-bold text-primary-foreground">
                          {i + 1}
                        </Text>
                      </View>
                      <Text className="flex-1 text-[13.5px] leading-relaxed text-foreground/80">
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-[13px] leading-relaxed text-muted-foreground">
                  Your coach hasn&apos;t added instructions for this exercise yet.
                </Text>
              )}
            </View>

            {/* Log performance inputs */}
            <View>
              <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">
                Log performance
              </Text>
              <View className="flex-row gap-2">
                {[
                  { l: "Reps done", p: "e.g. 8" },
                  { l: "Weight (kg)", p: "e.g. 82.5" },
                  { l: "RPE (1–10)", p: "e.g. 8" },
                ].map((f) => (
                  <View key={f.l} className="flex-1">
                    <Text className="mb-1.5 text-[11px] text-muted-foreground">
                      {f.l}
                    </Text>
                    <TextInput
                      placeholder={f.p}
                      placeholderTextColor="#888888"
                      keyboardType="numeric"
                      className="w-full rounded-2xl bg-secondary px-3 py-3 text-[13.5px] font-medium text-foreground outline-none focus:border focus:border-primary"
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Coach note card — Tone gradient (dark-aware: its `useCSSVariable`
              falls through to the global, color-scheme-aware root variables). */}
            {exercise.coachNotes ? (
              <Tone name="sky" className="rounded-2xl p-3.5" glass>
                <Text className="text-[12.5px] text-sky-ink leading-relaxed">
                  <Text className="font-semibold">Coach note: </Text>
                  {exercise.coachNotes}
                </Text>
              </Tone>
            ) : null}
          </View>
        </ScrollView>

        {/* Sticky footer mark as completed button */}
        <View className="border-t border-border/60 bg-card/95 px-5 pt-3 pb-8 mb-8">
          <Pressable
            onPress={() => {
              onDone(exercise.id);
              onClose();
            }}
            className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 shadow-soft active:opacity-90 ${
              isDone ? "bg-success" : "bg-primary"
            }`}
          >
            <Icon
              name="check"
              size={20}
              color={isDone ? "#ffffff" : "--primary-foreground"}
            />
            <Text
              className={`text-[15px] ${
                isDone
                  ? "font-bold text-white"
                  : "font-semibold text-primary-foreground"
              }`}
            >
              {isDone ? "Completed ✓ (Tap to undo)" : "Mark as completed"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  // iOS: present as a native page sheet — a card that stops short of the top,
  // keeps the previous screen visible behind it, and supports swipe-to-dismiss.
  if (isIOS) {
    return (
      <Modal
        visible={exercise !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        {content}
      </Modal>
    );
  }

  // Android: custom bottom sheet with a dimmed, tap-to-dismiss backdrop.
  return (
    <Modal
      visible={exercise !== null}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View className="min-h-[90%] w-full overflow-hidden shadow-pop">
          {content}
        </View>
      </View>
    </Modal>
  );
}
