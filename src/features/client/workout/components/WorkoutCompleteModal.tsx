import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import { Tone } from "@/tw/Tone";
import { useState } from "react";
import { Modal, Platform } from "react-native";

interface WorkoutCompleteModalProps {
  visible: boolean;
  defaultDurationMinutes?: number;
  isLoading?: boolean;
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
  onClose,
  onConfirm,
}: WorkoutCompleteModalProps) {
  const [duration, setDuration] = useState<string>(String(defaultDurationMinutes));
  const [overallRpe, setOverallRpe] = useState<number | undefined>(8);
  const [notes, setNotes] = useState<string>("");

  const handleSubmit = () => {
    onConfirm({
      durationMinutes: duration ? Number(duration) : undefined,
      overallRpe,
      clientNotes: notes.trim() || undefined,
    });
  };

  const content = (
    <View className="flex-1 bg-card">
      {/* Header */}
      <Tone name="mint" className={cn("px-5 pb-5", isIOS ? "pt-5" : "pt-10")} glass>
        <Pressable
          onPress={onClose}
          className={cn(
            "absolute right-4 h-9 w-9 items-center justify-center rounded-full bg-black/20 active:bg-black/40",
            isIOS ? "top-4" : "top-9"
          )}
        >
          <Icon name="x" size={16} color="--foreground" />
        </Pressable>
        <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mint-ink opacity-80">
          Finish Workout
        </Text>
        <Text className="mt-1 text-[24px] font-bold text-mint-ink">
          Great job completing your session! 🎉
        </Text>
      </Tone>

      <ScrollView contentContainerClassName="p-5 gap-y-5" showsVerticalScrollIndicator={false}>
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
            className="min-h-[90px] rounded-2xl bg-secondary/70 p-3.5 text-[14px] text-foreground border border-border/50 align-top"
          />
        </View>

        {/* Action Button */}
        <View className="mt-4 pb-6">
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4 active:opacity-90"
          >
            <Icon name="check" size={18} color="#ffffff" />
            <Text className="text-[16px] font-bold text-primary-foreground">
              {isLoading ? "Saving..." : "Finalize & Complete Workout"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
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
        <View className="min-h-[85%] overflow-hidden rounded-t-3xl">{content}</View>
      </View>
    </Modal>
  );
}
