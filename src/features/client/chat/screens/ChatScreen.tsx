import { useGetDirectoryCoachQuery } from "@/api/endpoints/directory.endpoints";
import { MessageList } from "@/features/shared/messaging/components/MessageList";
import { useChatThread } from "@/features/shared/messaging/useChatThread";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, TextInput, View } from "@/tw";
import { Image } from "@/tw/image";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LIQUID_GLASS = isLiquidGlassAvailable();

/** Coach avatar, falling back to a neutral placeholder when none is set. */
function CoachAvatar({ url, className }: { url?: string; className: string }) {
  if (!url) {
    return (
      <View className={cn("items-center justify-center bg-secondary", className)}>
        <Icon name="user" size={14} color="--muted-foreground" />
      </View>
    );
  }
  return <Image source={{ uri: url }} className={className} />;
}

export function ChatScreen() {
  // The coach on the other end of this thread is the owner of the ACTIVE tenant.
  const { tenantId, membership } = useActiveTenant();
  const { data: coachDir } = useGetDirectoryCoachQuery(tenantId ?? "", {
    skip: !tenantId,
  });

  const coachObj = coachDir?.coach || coachDir;
  const coachName =
    [coachObj?.firstName, coachObj?.lastName].filter(Boolean).join(" ") ||
    membership?.tenantName ||
    "Your coach";
  const coachAvatar: string | undefined = coachObj?.avatarUrl || undefined;

  // Keyed by tenant: switching coaches means a different thread entirely, so
  // composer/pagination state is thrown away rather than carried across.
  return (
    <ChatThread
      key={tenantId ?? "no-tenant"}
      coachName={coachName}
      coachAvatar={coachAvatar}
    />
  );
}

function ChatThread({
  coachName,
  coachAvatar,
}: {
  coachName: string;
  coachAvatar?: string;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Chat is a tab root, so there is usually nothing to go back to.
  const canGoBack = router.canGoBack();

  // No clientId: a client is locked to its own thread and must omit it.
  const {
    messages,
    isLoading,
    isError,
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
  } = useChatThread();

  const [input, setInput] = useState("");
  const canSend = canChat && input.trim().length > 0;

  const onSend = () => {
    if (!canSend) return;
    sfx.send();
    const body = input;
    setInput("");
    void send(body);
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={90}
      style={{ flex: 1 }}
    >
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
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
          <CoachAvatar url={coachAvatar} className="h-10 w-10 rounded-full" />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-[14.5px] font-semibold text-foreground">
              {coachName}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <View
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  connected ? "bg-success" : "bg-muted-foreground"
                )}
              />
              <Text className="text-[11px] text-muted-foreground">
                {otherTyping ? "Typing…" : connected ? "Connected" : "Reconnecting…"}
              </Text>
            </View>
          </View>
        </View>

        {/* Thread */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : isError ? (
          <View className="flex-1 items-center justify-center gap-y-3 px-8">
            <Text className="text-center text-[13.5px] text-muted-foreground">
              Couldn&apos;t load your messages.
            </Text>
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
              No messages yet — send {coachName.split(" ")[0]} a note.
            </Text>
          </View>
        ) : (
          <MessageList
            messages={messages}
            mySide={mySide}
            avatarUrl={coachAvatar}
            otherTyping={otherTyping}
            onLoadEarlier={loadEarlier}
            hasEarlier={hasEarlier}
            isLoadingEarlier={isLoadingEarlier}
            onRetry={retry}
          />
        )}

        {/* Chat needs a confirmed relationship — the server rejects the rest. */}
        {!canChat ? (
          <View
            className="rounded-2xl border border-border bg-card px-4 py-3"
            style={{ marginBottom: insets.bottom + 8 }}
          >
            <Text className="text-center text-[12.5px] text-muted-foreground">
              Messaging opens once your coach confirms you.
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
                  placeholder={
                    connected ? `Message ${coachName.split(" ")[0]}…` : "Reconnecting…"
                  }
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
                  marginBottom: insets.bottom,
                }}
              >
                {composerControls}
              </GlassView>
            ) : (
              <View
                className="flex-row items-center gap-2 rounded-full border border-border/60 bg-card/80 p-1.5 shadow-soft"
                style={{ marginBottom: 8 }}
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
