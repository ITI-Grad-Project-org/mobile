import { MAX_PROMPT_LENGTH, useAiChat } from "@/features/shared/assistant";
import { AiMarkdown } from "@/features/shared/assistant/components/AiMarkdown";
import { AssistantComposer } from "@/features/shared/assistant/components/AssistantComposer";
import { ThinkingLabel } from "@/features/shared/assistant/components/ThinkingLabel";
import { useRole } from "@/lib/role";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { Card } from "@/shared/ui/Card";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Pressable, Text, View } from "@/tw";
import type { ToneName } from "@/tw/Tone";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView as RNScrollView,
} from "react-native";

interface Suggestion {
  icon: IconName;
  text: string;
}

const suggestions: Suggestion[] = [
  { icon: "dumbbell", text: "How do I do a proper Romanian Deadlift?" },
  { icon: "apple", text: "Quick high-protein lunch under 600 kcal?" },
  { icon: "flame", text: "I'm sore from yesterday — should I train today?" },
  { icon: "help-circle", text: "How do I read my streak grid?" },
];

export function AssistantScreen() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<RNScrollView>(null);
  const { accent } = useRole();

  // No `membershipId` is ever sent from here: a client is always scoped to
  // themselves, resolved server-side from their own token. The field would be
  // ignored anyway.
  const { thread, busy, send, stop } = useAiChat();

  const glowTone: ToneName = accent === "orange" ? "primary" : "mint";
  const hasChat = thread.length > 0;

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [thread]);

  const handleSend = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || busy || t.length > MAX_PROMPT_LENGTH) return;
      sfx.send();
      Keyboard.dismiss();
      setInput("");
      void send(t);
    },
    [busy, send]
  );

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={90} style={{ flex: 1 }}>
      <View className="flex-1">
        <RNScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 16, rowGap: hasChat ? 8 : 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            hasChat && scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {/* ── Empty state ─────────────────────────────────────── */}
          {!hasChat && (
            <>
              <View className="flex-row items-center gap-3 px-1">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
                  <Icon name="sparkles" size={20} color="--primary-foreground" />
                </View>
                <View className="flex-1">
                  <Text className="text-[24px] font-bold tracking-tight text-foreground">
                    Ask UPLY AI
                  </Text>
                  <Text className="text-[12.5px] text-muted-foreground">
                    Form tips, nutrition, recovery — anytime.
                  </Text>
                </View>
              </View>

              <Card tone="ink" glass>
                <Text className="text-[11px] font-semibold uppercase tracking-[4px] text-ink-foreground/60">
                  Grounded in your plan
                </Text>
                <Text className="mt-2 text-[14px] leading-relaxed text-ink-foreground/90">
                  Answers draw on your coach{"'"}s own methodology and material, plus your
                  intake and check-ins — not generic internet advice.
                </Text>
              </Card>

              <View>
                <SectionTitle title="Try asking" />
                <View className="gap-y-2">
                  {suggestions.map((s) => (
                    <Pressable
                      key={s.text}
                      onPress={() => handleSend(s.text)}
                      disabled={busy}
                      className={cn(
                        "flex-row items-center gap-3 rounded-2xl bg-secondary/60 p-3 active:opacity-80",
                        busy && "opacity-50"
                      )}
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-xl bg-card">
                        <Icon name={s.icon} size={16} color="--primary" />
                      </View>
                      <Text className="flex-1 text-[13.5px] font-medium text-foreground">
                        {s.text}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* ── Thread ──────────────────────────────────────────── */}
          {thread.map((m) => {
            const isMe = m.role === "user";
            const isThinking = m.state === "thinking" || m.state === "slow";
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
                {isThinking ? (
                  <View className="rounded-3xl rounded-bl-md border border-border/30 bg-card px-4 py-3 shadow-soft">
                    {/* `ai.timed_out` is advisory — the answer may still land. */}
                    <ThinkingLabel slow={m.state === "slow"} />
                  </View>
                ) : (
                  <View
                    className={cn(
                      "max-w-[80%] px-4 py-2.5",
                      isMe
                        ? "rounded-3xl rounded-br-md bg-primary"
                        : m.state === "failed"
                          ? "rounded-3xl rounded-bl-md border border-destructive/40 bg-destructive/10"
                          : m.state === "stopped"
                            ? "rounded-3xl rounded-bl-md border border-border/40 bg-secondary/50"
                            : "rounded-3xl rounded-bl-md border border-border/30 bg-card shadow-soft"
                    )}
                  >
                    {isMe || m.state === "failed" || m.state === "stopped" ? (
                      <Text
                        className={cn(
                          "text-[14px] leading-snug",
                          isMe ? "text-primary-foreground" : "text-foreground"
                        )}
                      >
                        {m.text}
                      </Text>
                    ) : (
                      <AiMarkdown text={m.text} />
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </RNScrollView>

        <AssistantComposer
          value={input}
          onChangeText={setInput}
          onSend={() => handleSend(input)}
          onStop={stop}
          busy={busy}
          placeholder={busy ? "Thinking…" : "Ask UPLY AI"}
          glowTone={glowTone}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
