import { ActivityIndicator, Modal } from "react-native";

import { Icon } from "@/shared/ui/Icon";
import { Pressable, SafeAreaView, Text, View } from "@/tw";

/**
 * Destructive confirmation bottom sheet — used for both "delete intake" and
 * "delete review" on the coach profile screen.
 */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dismiss = busy ? undefined : onCancel;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
      <Pressable onPress={dismiss} className="flex-1 justify-end bg-black/40">
        <Pressable className="rounded-t-3xl bg-background pt-2">
          <SafeAreaView edges={["bottom"]}>
            <View className="items-center pt-1">
              <View className="h-1.5 w-10 rounded-full bg-border" />
            </View>

            <View className="items-center gap-3 px-6 pb-2 pt-5">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <Icon name="alert-triangle" size={26} color="--destructive" />
              </View>
              <Text className="text-[19px] font-bold text-foreground">{title}</Text>
              <Text className="max-w-xs text-center text-[13.5px] text-muted-foreground">
                {message}
              </Text>
            </View>

            {error ? (
              <Text className="px-6 pt-2 text-center text-[12px] font-medium text-destructive">
                {error}
              </Text>
            ) : null}

            <View className="gap-3 px-5 pb-4 pt-4">
              <Pressable
                onPress={onConfirm}
                disabled={busy}
                className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-destructive shadow-soft active:opacity-90 disabled:opacity-60"
              >
                {busy ? <ActivityIndicator color="white" /> : null}
                <Text className="text-[15px] font-semibold text-white">{confirmLabel}</Text>
              </Pressable>
              <Pressable
                onPress={onCancel}
                disabled={busy}
                className="h-14 items-center justify-center rounded-2xl bg-secondary active:opacity-90 disabled:opacity-60"
              >
                <Text className="text-[15px] font-semibold text-foreground">Cancel</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
