import { useGetDirectoryCoachQuery } from "@/api/endpoints/directory.endpoints";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, TextInput, View } from "@/tw";
import { Animated } from "@/tw/animated";
import { Image } from "@/tw/image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, ScrollView as RNScrollView } from "react-native";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

const LIQUID_GLASS = isLiquidGlassAvailable();

type Msg = { id: string; from: "me" | "coach"; t: string; time: string };

const seed: Msg[] = [
  { id: "1", from: "coach", t: "Great session today! Form on squats looked tight", time: "9:14" },
  { id: "2", from: "me", t: "Thanks! Felt strong. Quads are toast", time: "9:16" },
  { id: "3", from: "coach", t: "Good. Tomorrow push it on the RDLs — try 75kg for 8.", time: "9:18" },
  { id: "4", from: "me", t: "Got it. Should I film a set?", time: "9:20" },
  { id: "5", from: "coach", t: "Yes please. Set 3 will do.", time: "9:21" },
];

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

/** Green presence dot with the expanding "ping" halo. */
function OnlineDot() {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, [p]);

  const ping = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + p.value * 1.6 }],
    opacity: 0.7 * (1 - p.value),
  }));

  return (
    <View className="h-1.5 w-1.5 items-center justify-center">
      <Animated.View
        style={ping}
        className="absolute h-1.5 w-1.5 rounded-full bg-success"
      />
      <View className="h-1.5 w-1.5 rounded-full bg-success" />
    </View>
  );
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

  // Keyed by tenant: switching tenants means a different coach, so the thread
  // state is thrown away rather than carried across.
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
  const [msgs, setMsgs] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<RNScrollView>(null);

  useEffect(() => {
    // Force a scroll to bottom whenever message history changes or typing occurs
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, [msgs, typing]);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    sfx.send();
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    setMsgs((m) => [...m, { id: String(Date.now()), from: "me", t, time }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      sfx.pop();
      setMsgs((m) => [
        ...m,
        { id: String(Date.now() + 1), from: "coach", t: "On it — I'll take a look and get back to you 👌", time },
      ]);
    }, 1600);
  };

  return (
    <KeyboardAvoidingView
      behavior={"padding"}
      keyboardVerticalOffset={90}
      style={{ flex: 1 }}
    >
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }} >
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
              <OnlineDot />
              <Text className="text-[11px] text-muted-foreground">
                Online · usually replies in 1h
              </Text>
            </View>
          </View>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70"
            accessibilityLabel="Call"
          >
            <Icon name="phone" size={16} color="--foreground" />
          </Pressable>
          <Pressable
            className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70"
            accessibilityLabel="Video"
          >
            <Icon name="video" size={16} color="--foreground" />
          </Pressable>
        </View>

        {/* Thread */}
        <RNScrollView
          ref={scrollRef}
          style={{ flex: 1, paddingRight: 4 }}
          contentContainerStyle={{ paddingBottom: 12, rowGap: 8 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <View className="mx-auto my-2 rounded-full bg-secondary/70 px-3 py-1">
            <Text className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              Today
            </Text>
          </View>
          {msgs.map((m, i) => {
            const prev = msgs[i - 1];
            const grouped = prev && prev.from === m.from;
            const isMe = m.from === "me";
            return (
              <View
                key={m.id}
                className={cn(
                  "flex-row items-end",
                  isMe ? "justify-end" : "justify-start",
                  grouped ? "mt-0.5" : "mt-2"
                )}
              >
                {!isMe && !grouped ? (
                  <CoachAvatar url={coachAvatar} className="mr-2 h-7 w-7 rounded-full" />
                ) : !isMe ? (
                  <View className="mr-2 w-7" />
                ) : null}
                <View
                  className={cn(
                    "max-w-[78%] px-4 py-2",
                    isMe
                      ? "rounded-3xl rounded-br-md bg-primary"
                      : "rounded-3xl rounded-bl-md bg-card border border-border/30 shadow-soft"
                  )}
                >
                  <Text className={cn("text-[14px] leading-snug", isMe ? "text-primary-foreground" : "text-foreground")}>
                    {m.t}
                  </Text>
                  <Text
                    className={cn(
                      "text-[10px] mt-0.5",
                      isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {m.time}
                  </Text>
                </View>
              </View>
            );
          })}
          {typing && (
            <View className="flex-row items-end justify-start mt-2">
              <CoachAvatar url={coachAvatar} className="mr-2 h-7 w-7 rounded-full" />
              <View className="rounded-3xl rounded-bl-md bg-card border border-border/30 px-4 py-3">
                <View className="flex-row items-center gap-1">
                  <View className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                  <View className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                  <View className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                </View>
              </View>
            </View>
          )}
        </RNScrollView>

        {/* Composer */}
        {(() => {
          const composerControls = (
            <>
              <Pressable
                className="h-12 w-9 justify-center items-center rounded-full bg-foreground/5 active:opacity-70"
                accessibilityLabel="Attach"
              >
                <Icon name="paperclip" size={16} color="--muted-foreground" />
              </Pressable>
              <TextInput
                value={input}
                onChangeText={setInput}
                onSubmitEditing={send}
                placeholder={`Message ${coachName.split(" ")[0]}…`}
                placeholderTextColor="#7c7c85"
                className="min-w-0 flex-1 bg-transparent px-1 text-[14px] text-foreground h-12"
              />
              <Pressable
                className="h-9 w-9 justify-center items-center rounded-full bg-foreground/5 active:opacity-70"
                accessibilityLabel="Emoji"
              >
                <Icon name="smile" size={16} color="--muted-foreground" />
              </Pressable>
              <Pressable
                onPress={send}
                disabled={!input.trim()}
                className={cn(
                  "h-9 w-9 justify-center items-center rounded-full bg-primary active:opacity-85",
                  !input.trim() && "opacity-40"
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
                marginBottom: insets.bottom + 8,
              }}
            >
              {composerControls}
            </GlassView>
          ) : (
            <View
              className="flex-row items-center gap-2 rounded-full border border-border/60 bg-card/80 p-1.5 shadow-soft"
              style={{ marginBottom: insets.bottom + 8 }}
            >
              {composerControls}
            </View>
          );
        })()}
      </View>
    </KeyboardAvoidingView>
  );
}
