import type { Exercise } from "@/lib/data";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, TextInput, View } from "@/tw";
import { Tone } from "@/tw/Tone";
import { Image } from "@/tw/image";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet } from "react-native";

interface ExerciseSheetProps {
  exercise: Exercise | null;
  onClose: () => void;
  onDone: (id: string) => void;
}

export function ExerciseSheet({ exercise, onClose, onDone }: ExerciseSheetProps) {
  if (!exercise) return null;

  return (
    <Modal
      visible={exercise !== null}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-background">
        {/* Click outside to close (background dismiss area) */}
        <Pressable className="absolute inset-0" onPress={onClose} />

        {/* Content Sheet */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="bg-card rounded-t-3xl max-h-[92%] overflow-hidden shadow-pop"
        >
          {/* Scrollable body */}
          <ScrollView
            className="flex-grow-0"
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero image with video play overlays */}
            <View className="relative w-full aspect-[16/11] bg-secondary">
              <Image source={exercise.image} className="w-full h-full" />

              {/* Fade gradient overlay from bottom to top */}
              <LinearGradient
                colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.4)"]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
              />

              {/* Close Button */}
              <Pressable
                onPress={onClose}
                className="absolute right-4 top-10 h-9 w-9 bg-black/50 rounded-full items-center justify-center active:bg-black/75"
                accessibilityLabel="Close"
              >
                <Icon name="x" size={16} color="#ffffff" />
              </Pressable>

              {/* Play Video Overlay Button */}
              <Pressable className="absolute top-1/2 left-1/2 -ml-8 -mt-8 h-16 w-16 bg-white/85 rounded-full items-center justify-center shadow-pop active:scale-95 active:opacity-90">
                <Icon name="play" size={28} color="#000000" />
              </Pressable>

              {/* Workout muscle group and Title details */}
              <View className="absolute bottom-4 left-5 right-5">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
                  {exercise.muscle}
                </Text>
                <Text className="mt-0.5 text-[24px] font-bold leading-tight text-white shadow-sm">
                  {exercise.name}
                </Text>
              </View>
            </View>

            {/* Workout Info, Instructions, and Input Form */}
            <View className="px-5 pt-4">
              {/* Stats boxes */}
              <View className="flex-row gap-2">
                {[
                  { l: "Sets", v: exercise.sets },
                  { l: "Reps", v: exercise.reps },
                  { l: "Weight", v: exercise.weight },
                ].map((s) => (
                  <View key={s.l} className="flex-1 rounded-2xl bg-secondary p-3 items-center justify-center">
                    <Text className="text-[11px] font-medium text-muted-foreground">{s.l}</Text>
                    <Text className="mt-0.5 text-[17px] font-bold tracking-tight text-foreground">{s.v}</Text>
                  </View>
                ))}
              </View>

              {/* Instructions list */}
              <View className="mt-5">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2.5">
                  Instructions
                </Text>
                <View className="gap-2.5">
                  {exercise.instructions.map((step, i) => (
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
              </View>

              {/* Log performance inputs */}
              <View className="mt-5">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                  Log performance
                </Text>
                <View className="flex-row gap-2">
                  {[
                    { l: "Reps done", p: "e.g. 8" },
                    { l: "Weight (kg)", p: "e.g. 82.5" },
                    { l: "RPE (1–10)", p: "e.g. 8" },
                  ].map((f) => (
                    <View key={f.l} className="flex-1">
                      <Text className="mb-1 text-[11px] text-muted-foreground">{f.l}</Text>
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

              {/* Coach note card */}
              <Tone name="sky" className="mt-4 rounded-2xl p-3">
                <Text className="text-[12.5px] text-sky-ink leading-relaxed">
                  <Text className="font-semibold">Coach note: </Text>
                  Keep your chest tall through the descent — film set 3 for me.
                </Text>
              </Tone>
            </View>
          </ScrollView>

          {/* Sticky footer mark as completed button */}
          <View className="border-t border-border/60 bg-card/95 px-5 pt-3 pb-8">
            <Pressable
              onPress={() => {
                onDone(exercise.id);
                onClose();
              }}
              className="flex-row items-center justify-center gap-2 rounded-2xl bg-success py-4 shadow-soft active:opacity-90"
            >
              <Icon name="check" size={20} color="#ffffff" />
              <Text className="text-[15px] font-semibold text-white">Mark as completed</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
