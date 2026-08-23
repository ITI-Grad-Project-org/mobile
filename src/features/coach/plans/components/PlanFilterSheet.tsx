import { cn } from "@/lib/utils";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Modal } from "react-native";
import type { PlanLifecycle } from "../lib/normalizePlan";

export type StatusFilter = PlanLifecycle | "all";

const OPTIONS: { value: StatusFilter; label: string; hint: string }[] = [
  { value: "all", label: "All", hint: "Everything you've built" },
  { value: "published", label: "Published", hint: "Live for the client" },
  { value: "draft", label: "Draft", hint: "Not sent yet" },
  { value: "archived", label: "Archived", hint: "Out of the way" },
];

interface PlanFilterSheetProps {
  visible: boolean;
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  onClose: () => void;
}

/**
 * Status picker behind the filter pill. It's a sheet rather than a second pill
 * row so the header keeps to one filter line no matter how many states exist.
 */
export function PlanFilterSheet({ visible, value, onChange, onClose }: PlanFilterSheetProps) {
  const pick = (next: StatusFilter) => {
    onChange(next);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View className="w-full overflow-hidden rounded-t-3xl bg-card px-5 pb-10 pt-3 shadow-pop">
          <View className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[20px] font-bold text-foreground">Status</Text>
            <GlassButton
              onPress={onClose}
              accessibilityLabel="Close"
              className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-75"
            >
              <Icon name="x" size={16} color="--muted-foreground" />
            </GlassButton>
          </View>

          <View className="gap-y-1.5">
            {OPTIONS.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => pick(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={cn(
                    "min-h-11 flex-row items-center gap-3 rounded-2xl px-3.5 py-3 active:opacity-85",
                    active ? "bg-secondary" : "bg-transparent"
                  )}
                >
                  <View className="min-w-0 flex-1">
                    <Text
                      className={cn(
                        "text-[14.5px]",
                        active ? "font-semibold text-primary" : "font-medium text-foreground"
                      )}
                    >
                      {option.label}
                    </Text>
                    <Text className="mt-0.5 text-[12px] text-muted-foreground">{option.hint}</Text>
                  </View>
                  {active ? <Icon name="check" size={16} color="--primary" /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
