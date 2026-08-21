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
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

const LIQUID_GLASS = isLiquidGlassAvailable();

export function ConversationScreen({ clientId }: { clientId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const [input, setInput] = useState("");
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
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={90} style={{ flex: 1 }}>
      <View className="flex-1 bg-background">
        {/* Chat header — who you're talking to + back */}
        <View className="flex-row items-center gap-x-3 px-4 py-3 border-b border-border">
          {LIQUID_GLASS ? (
            <GlassView
              glassEffectStyle="regular"
              isInteractive
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }}
            >
              <Pressable
                onPress={() => router.back()}
                className="h-full w-full items-center justify-center rounded-full active:opacity-70"
                accessibilityLabel="Back"
              >
                <Icon name="chevron-left" size={22} color="--foreground" />
              </Pressable>
            </GlassView>
          ) : (
            <Pressable
              onPress={() => router.back()}
              className="h-9 w-9 -ml-1 items-center justify-center rounded-full bg-secondary active:opacity-70"
              accessibilityLabel="Back"
            >
              <Icon name="chevron-left" size={22} color="--foreground" />
            </Pressable>
          )}
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="h-11 w-11 rounded-full bg-secondary"
            />
          ) : (
            <View className="h-11 w-11 items-center justify-center rounded-full bg-secondary">
              <Icon name="user" size={20} color="--muted-foreground" />
            </View>
          )}
          <View className="flex-1 min-w-0">
            <Text className="text-[17px] font-bold text-foreground" numberOfLines={1}>
              {fullName}
            </Text>
            {subtitle ? (
              <Text className="text-[12.5px] text-muted-foreground mt-0.5" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
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
          <View className="flex-1 px-3">
            {isError ? (
              <Pressable
                onPress={() => refetch()}
                className="mt-2 rounded-xl border border-border bg-card px-3 py-2 active:opacity-80"
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
          <View className="mx-4 mb-4 rounded-2xl border border-border bg-card px-4 py-3">
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
                  className="min-w-0 flex-1 bg-transparent px-3 text-[15px] text-foreground h-11 py-0"
                />
                <Pressable
                  onPress={onSend}
                  disabled={!canSend}
                  className={cn(
                    "h-11 w-11 justify-center items-center rounded-full bg-primary active:opacity-85",
                    !canSend && "opacity-40"
                  )}
                  accessibilityLabel="Send"
                >
                  <Icon name="send" size={18} color="#ffffff" />
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
                  marginHorizontal: 16,
                  borderRadius: 28,
                  marginBottom: insets.bottom + 8,
                }}
              >
                {composerControls}
              </GlassView>
            ) : (
              <View
                className="flex-row items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-1.5 mx-4 shadow-soft"
                style={{ marginBottom: insets.bottom + 8 }}
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
