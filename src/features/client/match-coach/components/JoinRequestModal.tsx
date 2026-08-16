import { cn } from "@/lib/utils";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, TextInput, View } from "@/tw";
import { Image } from "@/tw/image";
import { useEffect, useState } from "react";
import { ActivityIndicator, Keyboard, Modal, Platform } from "react-native";

interface JoinRequestModalProps {
  coach: any | null;
  visible: boolean;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
}

export function JoinRequestModal({
  coach,
  visible,
  onClose,
  onSubmit,
}: JoinRequestModalProps) {
  const [message, setMessage] = useState(
    "Hi! I'd love to train with you and work on my fitness goals."
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardOpen(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardOpen(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (!coach) return null;

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

  const handleSend = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await onSubmit(message.trim());
      handleClose();
    } catch (err: any) {
      const msg =
        err?.data?.message || err?.error || "Failed to send request. Please try again.";
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
          <Text className="text-[20px] font-bold text-foreground">Send Join Request</Text>
          <Text className="text-[12.5px] text-muted-foreground mt-0.5">
            Add a personal message to {coachName.split(" ")[0]}
          </Text>
        </View>
        <GlassButton
          onPress={handleClose}
          className="h-9 w-9 justify-center items-center rounded-full bg-secondary active:opacity-75"
        >
          <Icon name="x" size={16} color="--muted-foreground" />
        </GlassButton>
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

      {/* Message Input */}
      <View className="gap-y-1.5 mb-5">
        <Text className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          Message to Coach (Optional)
        </Text>
        <View className="rounded-2xl border border-border bg-secondary/40 px-3.5 py-3 min-h-[100px]">
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Share your goals or ask any questions…"
            placeholderTextColor="#7c7c85"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="bg-transparent text-[14px] text-foreground p-0 min-h-[80px]"
          />
        </View>
      </View>

      {/* Submit Button */}
      <Pressable
        onPress={handleSend}
        disabled={isLoading}
        className={cn(
          "flex-row justify-center items-center rounded-2xl bg-primary py-3.5 shadow-soft active:opacity-90",
          isLoading && "opacity-50"
        )}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text className="text-center text-[14.5px] font-semibold text-primary-foreground">
            Send Request
          </Text>
        )}
      </Pressable>
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
        <View className={cn("w-full overflow-hidden shadow-pop bg-card rounded-t-3xl", isKeyboardOpen ? "min-h-[90%]" : "min-h-[55%]")}>
          {content}
        </View>
      </View>
    </Modal>
  );
}
