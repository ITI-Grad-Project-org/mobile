import { useCreateInvitationMutation } from "@/api/endpoints/invitations.endpoints";
import { cn } from "@/lib/utils";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, TextInput, View } from "@/tw";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform } from "react-native";

interface InviteClientSheetProps {
  visible: boolean;
  tenantId: string;
  /** Lowercased emails already on the roster — blocks re-inviting a client. */
  existingClientEmails?: string[];
  onClose: () => void;
}

// Loose but practical email shape check (server does the authoritative validation).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Map an RTK Query error into a coach-friendly message. */
function messageForError(err: any): string {
  const status = err?.status ?? err?.originalStatus;
  const serverMsg = err?.data?.message;
  const flat = Array.isArray(serverMsg) ? serverMsg.join(" ") : serverMsg;

  if (status === 400) {
    // The API returns 400 when a pending invitation for this email already exists.
    return typeof flat === "string" && flat
      ? flat
      : "This email already has a pending invitation.";
  }
  if (status === 401 || status === 403) {
    return "You don't have permission to invite clients to this business.";
  }
  if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") {
    return "Network error — check your connection and try again.";
  }
  if (typeof flat === "string" && flat) return flat;
  return "Failed to send invitation. Please try again.";
}

export function InviteClientSheet({
  visible,
  tenantId,
  existingClientEmails = [],
  onClose,
}: InviteClientSheetProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const [createInvitation, { isLoading }] = useCreateInvitationMutation();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedEmail = email.trim();
  const isValidEmail = EMAIL_RE.test(trimmedEmail);
  const alreadyClient =
    isValidEmail && existingClientEmails.includes(trimmedEmail.toLowerCase());
  const canSubmit = isValidEmail && !alreadyClient && !isLoading && !sentTo;

  const handleReset = () => {
    setEmail("");
    setName("");
    setErrorMsg(null);
    setSentTo(null);
  };

  const handleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    handleReset();
    onClose();
  };

  // Clear any pending auto-close timer if the sheet unmounts.
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const handleSubmit = async () => {
    if (!isValidEmail) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (alreadyClient) {
      setErrorMsg(`${trimmedEmail} is already a client in your business.`);
      return;
    }

    setErrorMsg(null);

    try {
      await createInvitation({
        tenantId,
        body: {
          email: trimmedEmail,
          name: name.trim() ? name.trim() : undefined,
        },
      }).unwrap();

      // Brief success confirmation, then close.
      setSentTo(trimmedEmail);
      closeTimer.current = setTimeout(handleClose, 1400);
    } catch (err: any) {
      setErrorMsg(messageForError(err));
    }
  };

  const isIOS = Platform.OS === "ios";

  const successView = (
    <View className="items-center justify-center py-8 gap-y-3">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-mint">
        <Icon name="check" size={30} color="--mint-ink" />
      </View>
      <Text className="text-[17px] font-bold text-foreground">Invitation sent</Text>
      <Text className="text-[13px] text-muted-foreground text-center px-6" numberOfLines={2}>
        {sentTo} will get a 6-digit code by email to join your business.
      </Text>
    </View>
  );

  const formView = (
    <>
      {errorMsg ? (
        <View className="mb-4 flex-row items-start gap-x-2 rounded-xl bg-destructive/10 p-3 border border-destructive/20">
          <Icon name="alert-triangle" size={16} color="--destructive" />
          <Text className="flex-1 text-[13px] font-medium text-destructive">{errorMsg}</Text>
        </View>
      ) : alreadyClient ? (
        <View className="mb-4 flex-row items-start gap-x-2 rounded-xl bg-sun/15 p-3 border border-sun/30">
          <Icon name="user-check" size={16} color="--sun-ink" />
          <Text className="flex-1 text-[13px] font-medium text-sun-ink">
            {trimmedEmail} is already a client in your business.
          </Text>
        </View>
      ) : null}

      <View className="gap-y-4">
        {/* Email Input */}
        <View className="gap-y-1.5">
          <Text className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
            Client Email <Text className="text-destructive">*</Text>
          </Text>
          <View
            className={cn(
              "rounded-2xl border bg-secondary/40 px-3.5 py-3",
              trimmedEmail.length > 0 && !isValidEmail ? "border-destructive/50" : "border-border"
            )}
          >
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="client@example.com"
              placeholderTextColor="#7c7c85"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={() => canSubmit && handleSubmit()}
              className="bg-transparent text-[14px] text-foreground p-0"
            />
          </View>
          {trimmedEmail.length > 0 && !isValidEmail ? (
            <Text className="text-[11.5px] text-destructive">Enter a valid email address.</Text>
          ) : null}
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
              autoCapitalize="words"
              returnKeyType="send"
              onSubmitEditing={() => canSubmit && handleSubmit()}
              className="bg-transparent text-[14px] text-foreground p-0"
            />
          </View>
          <Text className="text-[11.5px] text-muted-foreground">
            Personalises the invitation email.
          </Text>
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "mt-3 flex-row justify-center items-center gap-x-2 rounded-2xl bg-primary py-3.5 shadow-soft active:opacity-90",
            !canSubmit && "opacity-50"
          )}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Icon name="send" size={16} color="#ffffff" />
              <Text className="text-center text-[14.5px] font-semibold text-primary-foreground">
                Send Invitation
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "flex-end" }}
        behavior={isIOS ? "padding" : undefined}
      >
        <Pressable className="absolute inset-0 bg-black/40" onPress={handleClose} />
        <View className="w-full overflow-hidden bg-card rounded-t-3xl shadow-pop px-5 pt-3 pb-10">
          {/* Handle */}
          <View className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-3">
              <Text className="text-[20px] font-bold text-foreground">Invite Client</Text>
              <Text className="text-[12.5px] text-muted-foreground mt-0.5">
                Send an invitation code via email
              </Text>
            </View>
            <GlassButton
              onPress={handleClose}
              className="h-9 w-9 justify-center items-center rounded-full bg-secondary active:opacity-75"
            >
              <Icon name="x" size={16} color="--muted-foreground" />
            </GlassButton>
          </View>

          {sentTo ? successView : formView}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
