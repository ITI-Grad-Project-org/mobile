import { Icon } from "@/shared/ui/Icon";
import { cn } from "@/lib/utils";
import { Pressable, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { useState } from "react";
import { ActivityIndicator, Modal, Platform } from "react-native";

interface WithdrawRequestModalProps {
  coach: any | null;
  requestId: string | null;
  visible: boolean;
  onClose: () => void;
  onWithdraw: (requestId: string) => Promise<void>;
}

export function WithdrawRequestModal({
  coach,
  requestId,
  visible,
  onClose,
  onWithdraw,
}: WithdrawRequestModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!coach || !requestId) return null;

  const coachName =
    coach?.firstName && coach?.lastName
      ? `${coach.firstName} ${coach.lastName}`
      : coach?.name || coach?.businessName || "Coach";

  const businessName = coach?.businessName || "Fitness Business";
  const avatarUrl = coach?.avatarUrl || coach?.avatar;
  const isIOS = Platform.OS === "ios";

  const handleClose = () => {
    setErrorMsg(null);
    onClose();
  };

  const handleConfirmWithdraw = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await onWithdraw(requestId);
      handleClose();
    } catch (err: any) {
      const msg =
        err?.data?.message || err?.error || "Failed to withdraw request. Please try again.";
      setErrorMsg(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <View className="flex-1 bg-card px-5 pt-3 pb-8">
      {/* Handle */}
      <View className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-[20px] font-bold text-foreground">Withdraw Request</Text>
          <Text className="text-[12.5px] text-muted-foreground mt-0.5">
            Cancel your pending join request
          </Text>
        </View>
        <Pressable
          onPress={handleClose}
          className="h-9 w-9 justify-center items-center rounded-full bg-secondary active:opacity-75"
        >
          <Icon name="x" size={16} color="--muted-foreground" />
        </Pressable>
      </View>

      {/* Coach Info Preview */}
      <View className="flex-row items-center gap-x-3 rounded-2xl bg-secondary/50 p-3 mb-4 border border-border/40">
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="h-12 w-12 rounded-xl object-cover"
          />
        ) : (
          <View className="h-12 w-12 rounded-xl bg-secondary items-center justify-center">
            <Icon name="person" size={22} color="--muted-foreground" />
          </View>
        )}
        <View className="flex-1 min-w-0">
          <Text className="text-[15px] font-bold text-foreground truncate" numberOfLines={1}>
            {coachName}
          </Text>
          <Text className="text-[12px] text-muted-foreground truncate" numberOfLines={1}>
            {businessName}
          </Text>
        </View>
      </View>

      {errorMsg ? (
        <View className="mb-4 rounded-xl bg-destructive/10 p-3 border border-destructive/20">
          <Text className="text-[13px] font-medium text-destructive">{errorMsg}</Text>
        </View>
      ) : null}

      <Text className="text-[13.5px] leading-relaxed text-foreground/85 mb-6">
        Are you sure you want to withdraw your pending request to train with{" "}
        <Text className="font-bold text-foreground">{coachName}</Text>? You can send another request anytime later.
      </Text>

      {/* Actions */}
      <View className="flex-row items-center gap-x-3">
        <Pressable
          onPress={handleClose}
          disabled={isLoading}
          className="flex-1 flex-row justify-center items-center rounded-2xl bg-secondary py-3.5 active:opacity-85"
        >
          <Text className="text-[14px] font-semibold text-foreground">Keep Request</Text>
        </Pressable>

        <Pressable
          onPress={handleConfirmWithdraw}
          disabled={isLoading}
          className={cn(
            "flex-1 flex-row justify-center items-center rounded-2xl bg-destructive py-3.5 shadow-soft active:opacity-90",
            isLoading && "opacity-50"
          )}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-center text-[14px] font-semibold text-destructive-foreground">
              Withdraw Request
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );

  if (isIOS) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        {content}
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={handleClose} />
        <View className="min-h-[45%] w-full overflow-hidden shadow-pop bg-card rounded-t-3xl">
          {content}
        </View>
      </View>
    </Modal>
  );
}
