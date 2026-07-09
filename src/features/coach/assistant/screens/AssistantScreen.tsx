import { useRole } from "@/lib/role";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { Pressable, Text, TextInput, View, useCSSVariable } from "@/tw";
import { Animated } from "@/tw/animated";
import { Tone, type ToneName } from "@/tw/Tone";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, ScrollView as RNScrollView, StyleSheet } from "react-native";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Msg = { id: string; from: "me" | "ai"; text: string; typing?: boolean };

interface Suggestion {
  icon: IconName;
  text: string;
}

const suggestions: Suggestion[] = [
  { icon: "trending-up", text: "Who's at risk of dropping off?" },
  { icon: "message-square", text: "Draft a check-in reply for Mia" },
  { icon: "lightbulb", text: "Suggest a 4-week deload for Alex" },
];

export function AssistantScreen() {
  const { accent } = useRole();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const scrollRef = useRef<RNScrollView>(null);
  const nextId = useRef(0);

  const placeholderColor = useCSSVariable("--muted-foreground");
  const glowTone: ToneName = accent === "orange" ? "primary" : "mint";

  const hasChat = msgs.length > 0;
  const loading = msgs.some((m) => m.typing);

  const glow = useSharedValue(0);
  useEffect(() => {
    if (loading) {
      glow.value = withRepeat(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      );
    } else {
      glow.value = withTiming(0, { duration: 450 });
    }
  }, [loading, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + glow.value * 0.55,
    transform: [{ scaleX: 1 + glow.value * 0.04 }, { scaleY: 1 + glow.value * 0.12 }],
  }));

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [msgs]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    sfx.send();
    const id = String(nextId.current++);
    setMsgs((m) => [
      ...m,
      { id, from: "me", text: t },
      { id: id + "-t", from: "ai", text: "", typing: true },
    ]);
    setInput("");
    setTimeout(() => {
      sfx.pop();
      setMsgs((m) =>
        m.map((x) =>
          x.id === id + "-t"
            ? {
                ...x,
                typing: false,
                text: "Here are 3 clients to prioritize this week, ranked by risk and last check-in.",
              }
            : x
        )
      );
    }, 2200);
  };

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={90} style={{ flex: 1 }}>
      <View className="flex-1">
        {/* ── Empty state: hero ─────────────────────────────────── */}
        {!hasChat && (
          <View className="flex-1 items-center justify-center px-4">
            <Text className="text-center text-[34px] font-bold tracking-tight text-foreground">
              Ask anything
            </Text>
            <Text className="mt-2 text-center text-[14px] text-muted-foreground">
              Your second pair of eyes
            </Text>
          </View>
        )}

        {/* ── Chat thread ───────────────────────────────────────── */}
        {hasChat && (
          <RNScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 12, rowGap: 8 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {msgs.map((m) => {
              const isMe = m.from === "me";
              return (
                <View
                  key={m.id}
                  className={cn("flex-row items-end", isMe ? "justify-end" : "justify-start")}
                >
                  {!isMe && (
                    <View className="mr-2 h-7 w-7 items-center justify-center rounded-full bg-primary">
                      <Icon name="sparkles" size={14} color="--primary-foreground" />
                    </View>
                  )}
                  {m.typing ? (
                    <View className="rounded-3xl rounded-bl-md border border-border/30 bg-card px-4 py-3 shadow-soft">
                      <View className="flex-row items-center gap-1">
                        <View className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                        <View className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                        <View className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                      </View>
                    </View>
                  ) : (
                    <View
                      className={cn(
                        "max-w-[80%] px-4 py-2.5",
                        isMe
                          ? "rounded-3xl rounded-br-md bg-primary"
                          : "rounded-3xl rounded-bl-md border border-border/30 bg-card shadow-soft"
                      )}
                    >
                      <Text
                        className={cn(
                          "text-[14px] leading-snug",
                          isMe ? "text-primary-foreground" : "text-foreground"
                        )}
                      >
                        {m.text}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </RNScrollView>
        )}

        {/* ── Suggestion chips (empty state only) ───────────────── */}
        {!hasChat && (
          <View className="mb-3 gap-y-2 px-1">
            {suggestions.map((s) => (
              <Pressable
                key={s.text}
                onPress={() => send(s.text)}
                className="flex-row items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-2.5 active:opacity-80"
              >
                <Icon name={s.icon} size={15} color="--primary" />
                <Text className="flex-1 text-[13px] font-medium text-foreground" numberOfLines={1}>
                  {s.text}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Input pill with animated glow ─────────────────────── */}
        <View className="relative pt-3" style={{ marginBottom: insets.bottom + 8 }}>
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { top: 12 }, glowStyle]}
          >
            <Tone name={glowTone} className="h-full w-full rounded-full opacity-60" />
          </Animated.View>

          <View className="flex-row items-center gap-2 rounded-full border border-border/60 bg-card p-1.5 shadow-soft">
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-85"
              accessibilityLabel="Add"
            >
              <Icon name="plus" size={16} color="--muted-foreground" />
            </Pressable>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              placeholder="Ask Coach AI"
              placeholderTextColor={placeholderColor}
              className="min-w-0 flex-1 self-center bg-transparent px-1 py-2 text-[14.5px] leading-tight text-foreground"
            />
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-85"
              accessibilityLabel="Voice"
            >
              <Icon name="mic" size={16} color="--muted-foreground" />
            </Pressable>
            <Pressable
              onPress={() => send(input)}
              disabled={!input.trim()}
              className={cn(
                "h-10 w-10 items-center justify-center rounded-full bg-foreground active:opacity-85",
                !input.trim() && "opacity-40"
              )}
              accessibilityLabel="Send"
            >
              <Icon name="arrow-up" size={18} color="--background" />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
