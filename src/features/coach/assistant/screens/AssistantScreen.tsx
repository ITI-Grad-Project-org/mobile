import { MAX_PROMPT_LENGTH, useAiChat } from "@/features/shared/assistant";
import { AiMarkdown } from "@/features/shared/assistant/components/AiMarkdown";
import { AssistantComposer } from "@/features/shared/assistant/components/AssistantComposer";
import { ThinkingLabel } from "@/features/shared/assistant/components/ThinkingLabel";
import { useRole } from "@/lib/role";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import type { ToneName } from "@/tw/Tone";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, ScrollView as RNScrollView } from "react-native";
import { ClientScopePicker, type ScopedClient } from "../components/ClientScopePicker";

interface Suggestion {
  icon: IconName;
  text: string;
}

// Retrieval covers the coach's own library/corpus, plus AT MOST ONE client
// (whichever the scope picker selects). So no roster-wide questions here —
// "who's at risk of dropping off?" can't be answered by the assistant and
// belongs to a REST query over the database.
const GENERAL_SUGGESTIONS: Suggestion[] = [
  { icon: "lightbulb", text: "How should I progress a beginner's squat?" },
  { icon: "dumbbell", text: "Give me safe alternatives to overhead pressing." },
  { icon: "apple", text: "Build a high-protein day around 2,200 kcal." },
];

/**
 * Shown once a client is selected. These are the questions the scoping is FOR:
 * each one only has an answer because the server can now reach that client's
 * intake (goals, injuries, conditions) and check-ins.
 */
const scopedSuggestions = (name: string): Suggestion[] => [
  { icon: "clipboard-list", text: `What should I watch for with ${name}?` },
  { icon: "trending-up", text: `How is ${name} progressing against their goal?` },
  { icon: "dumbbell", text: `What should I change in ${name}'s next block?` },
];

export function AssistantScreen() {
  const { accent } = useRole();
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<ScopedClient | null>(null);
  const scrollRef = useRef<RNScrollView>(null);

  const { thread, busy, send, stop } = useAiChat();

  const glowTone: ToneName = accent === "orange" ? "primary" : "mint";

  const hasChat = thread.length > 0;

  // First name only: these read as questions, not database rows.
  const scopeFirstName = scope?.name.split(" ")[0] ?? "";
  const suggestions = scope ? scopedSuggestions(scopeFirstName) : GENERAL_SUGGESTIONS;

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [thread]);

  const handleSend = (text: string) => {
    const t = text.trim();
    // Validated locally: an empty or over-long prompt is rejected server-side
    // anyway, and this turns a round trip into an instant response.
    if (!t || busy || t.length > MAX_PROMPT_LENGTH) return;
    sfx.send();
    setInput("");
    void send(t, { membershipId: scope?.membershipId, scopeName: scope?.name });
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
            {thread.map((m) => {
              const isMe = m.role === "user";
              const isThinking = m.state === "thinking" || m.state === "slow";
              return (
                <View key={m.id}>
                  {/* Which client this question was about. Per-question, not
                      per-thread, so it belongs on the message. */}
                  {m.scopeName && (
                    <View className="mb-1 flex-row items-center justify-end gap-1 pr-1">
                      <Icon name="user" size={11} color="--muted-foreground" />
                      <Text className="text-[11px] text-muted-foreground">
                        About {m.scopeName}
                      </Text>
                    </View>
                  )}
                  <View
                    className={cn(
                      "flex-row items-end",
                      isMe ? "justify-end" : "justify-start"
                    )}
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
                </View>
              );
            })}
          </RNScrollView>
        )}

        {/* ── Suggestion chips (empty state only) ───────────────── */}
        {!hasChat && (
          <View className="mb-3 flex-row flex-wrap gap-2 px-1">
            {suggestions.map((s) => (
              <Pressable
                key={s.text}
                onPress={() => handleSend(s.text)}
                disabled={busy}
                className={cn(
                  "flex-row items-center gap-2 self-start rounded-full border border-border/60 bg-card/70 px-3 py-3 active:opacity-80",
                  busy && "opacity-50"
                )}
              >
                <Icon name={s.icon} size={15} color="--primary" />
                <Text className="text-[13px] font-medium text-foreground">{s.text}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <AssistantComposer
          value={input}
          onChangeText={setInput}
          onSend={() => handleSend(input)}
          onStop={stop}
          busy={busy}
          placeholder={
            busy ? "Thinking…" : scope ? `Ask about ${scopeFirstName}` : "Ask Coach AI"
          }
          glowTone={glowTone}
          accessory={
            <ClientScopePicker value={scope} onChange={setScope} disabled={busy} />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}
