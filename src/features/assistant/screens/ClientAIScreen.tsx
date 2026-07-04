import { useActiveCoach } from "@/lib/role";
import { Card } from "@/shared/ui/Card";
import { Icon, type IconName } from "@/shared/ui/Icon";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Pressable, ScrollView, Text, TextInput, View, useCSSVariable } from "@/tw";
import { useCallback, useState } from "react";
import { Keyboard, Platform } from "react-native";

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

export function ClientAIScreen() {
  const [input, setInput] = useState("");
  const coach = useActiveCoach();

  const handleSuggestion = useCallback((text: string) => {
    setInput(text);
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    // TODO: POST to async AI job-ticket endpoint (see docs/06)
    Keyboard.dismiss();
    setInput("");
  }, [input]);

  const placeholderColor = useCSSVariable("--muted-foreground");

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-10 p-2 pt-5"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <View className="flex-row items-center gap-3 px-1">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
          <Icon name="sparkles" size={20} color="--primary-foreground" />
        </View>
        <View>
          <Text className="text-[24px] font-bold tracking-tight text-foreground">
            Ask UPLY AI
          </Text>
          <Text className="text-[12.5px] text-muted-foreground">
            Form tips, nutrition, recovery — anytime.
          </Text>
        </View>
      </View>

      {/* ── Coach heads-up card ────────────────────────────────── */}
      <Card tone="ink" glass>
        <Text className="text-[11px] font-semibold uppercase tracking-[4px] text-ink-foreground/60">
          Coach{"'"}s heads-up
        </Text>
        <Text className="mt-2 text-[14px] leading-relaxed text-ink-foreground/90">
          You crushed Day 4 — RPE was high on squats. The AI can suggest a
          smarter warm-up and explain the form cue{" "}
          {coach.name.split(" ")[0]} gave you.
        </Text>
      </Card>

      {/* ── Suggestion chips ──────────────────────────────────── */}
      <View>
        <SectionTitle title="Try asking" />
        <View className="gap-y-2">
          {suggestions.map((s) => (
            <Pressable
              key={s.text}
              onPress={() => handleSuggestion(s.text)}
              className="flex-row items-center gap-3 rounded-2xl bg-secondary/60 p-3 active:opacity-80"
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

      {/* ── Input bar ─────────────────────────────────────────── */}
      <Card className="p-3">
        <View className="flex-row items-end gap-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your training, nutrition, or recovery…"
            placeholderTextColor={placeholderColor}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="flex-1 rounded-2xl bg-secondary/60 p-3 text-[13.5px] text-foreground"
            style={Platform.OS === "ios" ? { minHeight: 72 } : { minHeight: 72 }}
          />
          <Pressable
            onPress={handleSend}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-primary active:opacity-80"
          >
            <Icon name="send" size={16} color="--primary-foreground" />
          </Pressable>
        </View>
      </Card>
    </ScrollView>
  );
}
