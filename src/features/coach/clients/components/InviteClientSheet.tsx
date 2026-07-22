import { useCreateInvitationMutation } from "@/api/endpoints/invitations.endpoints";
import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, TextInput, View } from "@/tw";
import { useState } from "react";
import { ActivityIndicator, Modal, Platform } from "react-native";

interface InviteClientSheetProps {
  visible: boolean;
  tenantId: string;
  onClose: () => void;
}

export function InviteClientSheet({ visible, tenantId, onClose }: InviteClientSheetProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [createInvitation, { isLoading }] = useCreateInvitationMutation();

  const handleReset = () => {
    setEmail("");
    setName("");
    setErrorMsg(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setErrorMsg(null);

    try {
      await createInvitation({
        tenantId,
        body: {
          email: email.trim(),
          name: name.trim() ? name.trim() : undefined,
        },
      }).unwrap();

      handleClose();
    } catch (err: any) {
      const msg =
        err?.data?.message || err?.error || "Failed to send invitation. Please try again.";
      setErrorMsg(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  const isIOS = Platform.OS === "ios";

  const content = (
    <View className="flex-1 bg-card px-5 pt-3 pb-8">
      {/* Handle */}
      <View className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-[20px] font-bold text-foreground">Invite Client</Text>
          <Text className="text-[12.5px] text-muted-foreground mt-0.5">
            Send an invitation code via email
          </Text>
        </View>
        <Pressable
          onPress={handleClose}
          className="h-9 w-9 justify-center items-center rounded-full bg-secondary active:opacity-75"
        >
          <Icon name="x" size={16} color="--muted-foreground" />
        </Pressable>
      </View>

      {errorMsg ? (
        <View className="mb-4 rounded-xl bg-destructive/10 p-3 border border-destructive/20">
          <Text className="text-[13px] font-medium text-destructive">{errorMsg}</Text>
        </View>
      ) : null}

      <View className="gap-y-4">
        {/* Email Input */}
        <View className="gap-y-1.5">
          <Text className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
            Client Email <Text className="text-destructive">*</Text>
          </Text>
          <View className="rounded-2xl border border-border bg-secondary/40 px-3.5 py-3">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="client@example.com"
              placeholderTextColor="#7c7c85"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              className="bg-transparent text-[14px] text-foreground p-0"
            />
          </View>
        </View>

        {/* Name Input */}
        <View className="gap-y-1.5">
          <Text className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
            Client Name (Optional)
          </Text>
          <View className="rounded-2xl border border-border bg-secondary/40 px-3.5 py-3">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sarah Smith"
              placeholderTextColor="#7c7c85"
              className="bg-transparent text-[14px] text-foreground p-0"
            />
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={isLoading || !email.trim()}
          className={cn(
            "mt-3 flex-row justify-center items-center rounded-2xl bg-primary py-3.5 shadow-soft active:opacity-90",
            (isLoading || !email.trim()) && "opacity-50"
          )}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text className="text-center text-[14.5px] font-semibold text-primary-foreground">
              Send Invitation
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
        <View className="min-h-[50%] w-full overflow-hidden shadow-pop bg-card rounded-t-3xl">
          {content}
        </View>
      </View>
    </Modal>
  );
}
