import { ActivityIndicator, Modal } from "react-native";

import { Icon } from "@/shared/ui/Icon";
import { Pressable, SafeAreaView, Text, View } from "@/tw";


export function DeleteAccountSheet({
  visible,
  busy,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={busy ? undefined : onCancel}
    >
      <Pressable
        onPress={busy ? undefined : onCancel}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable className="rounded-t-3xl bg-background pt-2">
          <SafeAreaView edges={["bottom"]}>
            <View className="items-center pt-1">
              <View className="h-1.5 w-10 rounded-full bg-border" />
            </View>
            <View className="items-center gap-3 px-6 pb-2 pt-5">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <Icon name="alert-triangle" size={26} color="--destructive" />
              </View>
              <Text className="text-[19px] font-bold text-foreground">
                Delete account?
              </Text>
              <Text className="max-w-xs text-center text-[13.5px] text-muted-foreground">
                This permanently deletes your account and data. This can&apos;t be
                undone.
              </Text>
            </View>

            <View className="gap-3 px-5 pb-4 pt-4">
              <Pressable
                onPress={onConfirm}
                disabled={busy}
                className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-destructive shadow-soft active:opacity-90 disabled:opacity-60"
              >
                {busy ? <ActivityIndicator color="white" /> : null}
                <Text className="text-[15px] font-semibold text-white">
                  Delete account
                </Text>
              </Pressable>
              <Pressable
                onPress={onCancel}
                disabled={busy}
                className="h-14 items-center justify-center rounded-2xl bg-secondary active:opacity-90 disabled:opacity-60"
              >
                <Text className="text-[15px] font-semibold text-foreground">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
