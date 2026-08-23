import { cn } from "@/lib/utils";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import { Tone } from "@/tw/Tone";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform } from "react-native";

interface WorkoutCompleteModalProps {
  visible: boolean;
  defaultDurationMinutes?: number;
  isLoading?: boolean;
  /** Surfaced inside the sheet — the screen behind it is not visible from here. */
  error?: string | null;
  onClose: () => void;
  onConfirm: (data: {
    durationMinutes?: number;
    clientNotes?: string;
    overallRpe?: number;
  }) => void;
}

const isIOS = Platform.OS === "ios";

export function WorkoutCompleteModal({
  visible,
  defaultDurationMinutes = 45,
  isLoading,
  error,
  onClose,
  onConfirm,
}: WorkoutCompleteModalProps) {
  const [duration, setDuration] = useState<string>(String(defaultDurationMinutes));
  const [overallRpe, setOverallRpe] = useState<number | undefined>(8);
  const [notes, setNotes] = useState<string>("");

  // The Modal stays mounted while hidden, so seed the duration each time it
  // opens — otherwise it keeps whatever the elapsed time was at screen mount.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDuration(String(defaultDurationMinutes));
  }

  // The API caps durationMinutes at 1–32767; anything unparseable is omitted.
  const parsedDuration = Number(duration);
  const durationMinutes =
    Number.isFinite(parsedDuration) && parsedDuration >= 1
      ? Math.min(32767, Math.round(parsedDuration))
      : undefined;

  const handleSubmit = () => {
    if (isLoading) return;
    onConfirm({
      durationMinutes,
      overallRpe,
      clientNotes: notes.trim() || undefined,
    });
  };

  const content = (
    <View className="flex-1 bg-card">
      {/* Header */}
      <Tone name="mint" className={cn("pl-5 pr-14 pb-5", isIOS ? "pt-5" : "pt-10")} glass>
        <GlassButton
          onPress={onClose}
          disabled={isLoading}
          hitSlop={12}
          accessibilityLabel="Close"
          className={cn(
            "absolute right-4 z-10 h-9 w-9 items-center justify-center rounded-full bg-black/30 active:bg-black/50",
            isIOS ? "top-4" : "top-9"
          )}
        >
          <Icon name="x" size={16} color="#ffffff" />
        </GlassButton>
        <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mint-ink opacity-80">
          Finish Workout
        </Text>
        <Text className="mt-1 text-[24px] font-bold text-mint-ink">
          Great job completing your session! 🎉
        </Text>
      </Tone>

      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={10}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerClassName="p-5 pb-20 gap-y-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
        >
          {/* Workout Duration */}
          <View className="gap-y-2">
            <Text className="text-[13px] font-semibold text-foreground">
              Duration (minutes)
            </Text>
            <View className="flex-row items-center rounded-2xl bg-secondary/70 px-4 py-3 border border-border/50">
              <Icon name="clock" size={18} color="--muted-foreground" />
              <TextInput
                keyboardType="numeric"
                value={duration}
                onChangeText={setDuration}
                placeholder="e.g. 45"
                className="flex-1 ml-3 text-[15px] font-semibold text-foreground p-0"
              />
            </View>
          </View>

          {/* Overall RPE Selector (1 to 10) */}
          <View className="gap-y-2">
            <Text className="text-[13px] font-semibold text-foreground">
              Overall RPE (Rating of Perceived Exertion: 1–10)
            </Text>
            <Text className="text-[11.5px] text-muted-foreground">
              1 = Very Easy · 5 = Moderate · 8 = Hard · 10 = Max Effort
            </Text>
            <View className="flex-row flex-wrap gap-2 mt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                const isSelected = overallRpe === val;
                return (
                  <Pressable
                    key={val}
                    onPress={() => setOverallRpe(val)}
                    className={cn(
                      "h-10 w-10 items-center justify-center rounded-xl font-bold border",
                      isSelected
                        ? "bg-primary border-primary"
                        : "bg-secondary/60 border-border/60 active:bg-secondary"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-[14px] font-bold",
                        isSelected ? "text-primary-foreground" : "text-foreground"
                      )}
                    >
                      {val}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Client Notes */}
          <View className="gap-y-2">
            <Text className="text-[13px] font-semibold text-foreground">
              Notes for your coach (optional)
            </Text>
            <TextInput
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did this workout feel? Mention any joint pain or pump..."
              className="min-h-22.5 rounded-2xl bg-secondary/70 p-3.5 text-[14px] text-foreground border border-border/50 align-top"
              style={{ textAlignVertical: "top" }}
            />
          </View>

          {/* Action Button */}
          <View className="mt-4 pb-6 gap-y-3">
            {error ? (
              <View className="flex-row items-center gap-2 rounded-2xl bg-destructive/10 px-3.5 py-3">
                <Icon name="alert-triangle" size={16} color="--destructive" />
                <Text className="flex-1 text-[12.5px] text-destructive">{error}</Text>
              </View>
            ) : null}
            <Pressable
              onPress={handleSubmit}
              disabled={isLoading}
              className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4 active:opacity-90"
            >
              <Icon name="check" size={18} color="--ink" />
              <Text className="text-[16px] font-bold text-ink">
                {isLoading ? "Saving..." : "Finalize & Complete Workout"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );

  if (isIOS) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        {content}
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View className="h-[88%] overflow-hidden rounded-t-3xl">{content}</View>
      </View>
    </Modal>
  );
}
