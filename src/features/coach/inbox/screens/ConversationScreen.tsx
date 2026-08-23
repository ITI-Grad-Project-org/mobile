import { useGetClientQuery } from "@/api/endpoints/clients.endpoints";
import { MessageList } from "@/features/shared/messaging/components/MessageList";
import { useChatThread } from "@/features/shared/messaging/useChatThread";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { describeQueryError } from "@/shared/utils/query";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, TextInput, View } from "@/tw";
import { Image } from "@/tw/image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

const LIQUID_GLASS = isLiquidGlassAvailable();

/** Client avatar, falling back to a neutral placeholder when none is set. */
function ClientAvatar({ url, className }: { url?: string; className: string }) {
  if (!url) {
    return (
      <View className={cn("items-center justify-center bg-secondary", className)}>
        <Icon name="user" size={14} color="--muted-foreground" />
      </View>
    );
  }
  return <Image source={{ uri: url }} className={className} />;
}

export function ConversationScreen({ clientId }: { clientId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const canGoBack = router.canGoBack();
  const { tenantId } = useActiveTenant();
  const { data: clientData } = useGetClientQuery(
    { id: clientId, tenantId: tenantId! },
    { skip: !clientId || !tenantId }
  );

  // The record comes back either as a plain client or as a membership wrapping one.
  const cObj = clientData?.client || clientData;
  const fullName =
    [cObj?.firstName, cObj?.lastName].filter(Boolean).join(" ") ||
    cObj?.name ||
    cObj?.email ||
    "Conversation";
  const firstName = fullName.split(" ")[0];
  const avatarUrl: string | undefined = cObj?.avatarUrl || undefined;
  const status = clientData?.status || clientData?.membershipStatus || cObj?.status;
  const subtitle = [status, cObj?.email].filter(Boolean).join(" · ");

  const {
    messages,
    isLoading,
    isError,
    error,
    refetch,
    loadEarlier,
    hasEarlier,
    isLoadingEarlier,
    send,
    retry,
    notifyTyping,
    stopTyping,
    otherTyping,
    connected,
    canChat,
    mySide,
  } = useChatThread(clientId, status);

  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardOpen(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardOpen(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [input, setInput] = useState("");
  // When keyboard is open, give comfortable breathing room above keyboard.
  // When closed, lift above system navigation bar / home indicator.
  const composerBottom = keyboardOpen
    ? 8
    : Platform.OS === "ios"
    ? insets.bottom + 12
    : Math.max(insets.bottom, 14) + 8;
  const canSend = canChat && input.trim().length > 0;

  // A failed read only owns the screen when there is nothing else to show.
  // Paging backwards writes into the SAME cache entry as the first page, so a
  // failed older-page fetch used to replace a perfectly good thread with
  // "couldn't load this conversation".
  const blankedByError = isError && messages.length === 0;
  const errorDetail = isError ? describeQueryError(error) : "";

  const onSend = () => {
    if (!canSend) return;
    sfx.send();
    const body = input;
    setInput("");
    void send(body);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      style={{ flex: 1 }}
    >
      {/* No status-bar inset here: AppHeader already sits above this screen and
          consumes insets.top, so adding it again double-counts the notch. */}
      <View className="flex-1 pt-2">
        {/* Chat header — clean, integrated */}
        {/* Chat header — clean, integrated */}
        <View className="mb-3 flex-row items-center gap-3 rounded-lg border border-border/50 bg-card p-4 shadow-soft">
          {canGoBack ? (
            <Pressable
              onPress={() => router.back()}
              className="h-8 w-8 items-center justify-center rounded-full active:opacity-70"
              accessibilityLabel="Back"
            >
              <Icon name="chevron-left" size={16} color="--muted-foreground" />
            </Pressable>
          ) : null}
          <ClientAvatar url={avatarUrl} className="h-10 w-10 rounded-full" />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-[14.5px] font-semibold text-foreground">
              {fullName}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <View
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  connected ? "bg-success" : "bg-muted-foreground"
                )}
              />
              <Text className="text-[11px] text-muted-foreground">
                {otherTyping ? "Typing…" : connected ? subtitle || "Connected" : "Reconnecting…"}
              </Text>
            </View>
          </View>
        </View>

        {/* Thread */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : blankedByError ? (
          <View className="flex-1 items-center justify-center gap-y-3 px-8">
            <Text className="text-center text-[13.5px] text-muted-foreground">
              Couldn&apos;t load this conversation.
            </Text>
            {errorDetail ? (
              <Text className="text-center text-[12px] text-muted-foreground/80">
                {errorDetail}
              </Text>
            ) : null}
            <Pressable
              onPress={() => refetch()}
              className="rounded-full bg-primary px-4 py-2 active:opacity-85"
            >
              <Text className="text-[13px] font-semibold text-primary-foreground">Try again</Text>
            </Pressable>
          </View>
        ) : messages.length === 0 && !otherTyping ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-[13.5px] text-muted-foreground">
              No messages yet — say hello to {firstName}.
            </Text>
          </View>
        ) : (
          <View className="flex-1">
            {isError ? (
              <Pressable
                onPress={() => refetch()}
                className="rounded-xl border border-border bg-card px-3 py-2 active:opacity-80"
              >
                <Text className="text-center text-[12px] text-muted-foreground">
                  {errorDetail || "Couldn't load older messages."} Tap to retry.
                </Text>
              </Pressable>
            ) : null}
            <MessageList
              messages={messages}
              mySide={mySide}
              avatarUrl={avatarUrl}
              otherTyping={otherTyping}
              onLoadEarlier={loadEarlier}
              hasEarlier={hasEarlier}
              isLoadingEarlier={isLoadingEarlier}
              onRetry={retry}
            />
          </View>
        )}

        {/* Chat needs a confirmed relationship — the server rejects the rest. */}
        {!canChat ? (
          <View
            className="rounded-2xl border border-border bg-card px-4 py-3"
            style={{ marginBottom: composerBottom }}
          >
            <Text className="text-center text-[12.5px] text-muted-foreground">
              Messaging opens once this coaching relationship is active.
            </Text>
          </View>
        ) : (
          /* Composer */
          (() => {
            const composerControls = (
              <>
                <TextInput
                  value={input}
                  onChangeText={(t: string) => {
                    setInput(t);
                    if (t.length > 0) notifyTyping();
                    else stopTyping();
                  }}
                  onBlur={stopTyping}
                  onSubmitEditing={onSend}
                  placeholder={connected ? `Message ${firstName}…` : "Reconnecting…"}
                  placeholderTextColor="#7c7c85"
                  className="min-w-0 flex-1 bg-transparent px-3 text-[14px] text-foreground h-12"
                />
                <Pressable
                  onPress={onSend}
                  disabled={!canSend}
                  className={cn(
                    "h-9 w-9 justify-center items-center rounded-full bg-primary active:opacity-85",
                    !canSend && "opacity-40"
                  )}
                  accessibilityLabel="Send"
                >
                  <Icon name="send" size={16} color="#ffffff" />
                </Pressable>
              </>
            );

            return LIQUID_GLASS ? (
              <GlassView
                glassEffectStyle="regular"
                isInteractive
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  padding: 6,
                  borderRadius: 9999,
                  marginBottom: composerBottom,
                }}
              >
                {composerControls}
              </GlassView>
            ) : (
              <View
                className="flex-row items-center gap-2 rounded-full border border-border/60 bg-card/80 p-1.5 shadow-soft"
                style={{ marginBottom: composerBottom }}
              >
                {composerControls}
              </View>
            );
          })()
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
