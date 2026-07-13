import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Pressable, ScrollView, Text, useCSSVariable, View } from "@/tw";
import { LinearGradient } from "expo-linear-gradient";

const triage = [
  {
    tone: "primary" as const,
    icon: "alert-triangle" as const,
    title: "Sarah hasn't logged in 4 days",
    sub: "Attrition risk · last session Jun 22",
    cta: "Reach out",
  },
  {
    tone: "ink" as const,
    icon: "message-square" as const,
    title: "3 check-ins waiting for review",
    sub: "Alex · Mia · Daniel",
    cta: "Review",
  },
  {
    tone: "sun" as const,
    icon: "clock" as const,
    title: "2 plans ending this week",
    sub: "Renew before Sunday",
    cta: "Renew",
  },
];

const feed = [
  { name: "Alex Rivera", avatar: "🏃", action: "completed Lower body day", time: "12m", color: "mint" },
  { name: "Mia Chen", avatar: "🧘", action: "submitted weekly check-in", time: "1h", color: "lilac" },
  { name: "Daniel Park", avatar: "🚴", action: "logged 5 km Zone 2 run", time: "2h", color: "sky" },
  { name: "Sofia Reyes", avatar: "🏋️", action: "hit a new squat PR · 95 kg", time: "5h", color: "peach" },
] as const;

const colorMap: Record<string, { bg: string; text: string }> = {
  mint: { bg: "bg-mint", text: "text-mint-ink" },
  lilac: { bg: "bg-lilac", text: "text-lilac-ink" },
  sky: { bg: "bg-sky", text: "text-sky-ink" },
  peach: { bg: "bg-peach", text: "text-peach-ink" },
  sun: { bg: "bg-sun", text: "text-sun-ink" },
};

export function HomeScreen() {
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";
  const peachColor = (useCSSVariable("--peach") as string) || "#f7a083";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-5 pt-5 pb-30"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-1">
        <Text className="text-[13px] text-muted-foreground">Friday morning</Text>
        <Text className="text-[26px] font-bold tracking-tight text-foreground mt-0.5">Hey, Marco 👋</Text>
      </View>

      {/* KPI row */}
      <View className="flex-row gap-x-2">
        {[
          { v: "24", l: "Active", tone: "" },
          { v: "92%", l: "Adherence", tone: "text-success" },
          { v: "$8.4k", l: "MRR", tone: "" },
        ].map((k) => (
          <Card key={k.l} className="flex-1 items-center justify-center py-4 px-1" glass>
            <Text className={cn("text-[20px] font-black text-foreground", k.tone)}>{k.v}</Text>
            <Text className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
              {k.l}
            </Text>
          </Card>
        ))}
      </View>

      {/* Triage */}
      <View>
        <SectionTitle
          title="Needs you now"
          action={
            <Text className="text-[12px] text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full font-semibold">
              3
            </Text>
          }
        />
        <View className="gap-y-3">
          {triage.map((t) => {
            return (
              <Card
                key={t.title}
                tone={t.tone}
                glass
                className="flex-row items-center gap-x-4 p-4"
              >
                <View
                  className={cn(
                    "h-12 w-12 shrink-0 rounded-2xl justify-center items-center",
                    t.tone === "primary" || t.tone === "ink" ? "bg-white/15" : "bg-black/10",
                  )}
                >
                  <Icon
                    name={t.icon}
                    size={20}
                    color={
                      t.tone === "primary" || t.tone === "ink"
                        ? "#ffffff"
                        : t.tone === "sun"
                          ? "--sun-ink"
                          : "#000000"
                    }
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[14.5px] font-bold text-foreground" numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text className="text-[12px] text-foreground opacity-80 mt-0.5" numberOfLines={1}>
                    {t.sub}
                  </Text>
                </View>
                <Pressable
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 active:opacity-85",
                    t.tone === "primary" || t.tone === "ink"
                      ? "bg-white"
                      : "bg-ink",
                  )}
                >
                  <Text
                    className={cn(
                      "text-[12px] font-semibold",
                      t.tone === "primary" || t.tone === "ink"
                        ? "text-ink"
                        : "text-ink-foreground",
                    )}
                  >
                    {t.cta}
                  </Text>
                </Pressable>
              </Card>
            );
          })}
        </View>
      </View>

      {/* AI suggestion */}
      <Card tone="lilac" glass className="p-4">
        <View className="flex-row items-start gap-x-3">
          <View className="h-10 w-10 shrink-0 bg-lilac-ink rounded-2xl justify-center items-center">
            <Icon name="sparkles" size={20} color="--lilac" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] font-bold uppercase tracking-[0.14em] text-lilac-ink opacity-70">
              AI insight
            </Text>
            <Text className="mt-1 text-[14.5px] font-semibold leading-snug text-lilac-ink">
              Mia{"'"}s adherence dropped 18% — suggest swapping Wednesday HIIT for steady-state cardio?
            </Text>
            <View className="mt-3 flex-row gap-x-2">
              <Pressable className="bg-lilac-ink rounded-full px-3 py-1.5 active:opacity-85">
                <Text className="text-[11.5px] font-bold text-lilac">
                  Draft message
                </Text>
              </Pressable>
              <Pressable className="bg-background/60 rounded-full px-3 py-1.5 active:opacity-85">
                <Text className="text-[11.5px] font-bold text-foreground">
                  Dismiss
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Card>

      {/* Activity feed */}
      <View>
        <SectionTitle
          title="Today's activity"
          action={<Icon name="chevron-right" size={16} color="--muted-foreground" className="opacity-80" />}
        />
        <Card className="p-2" glass>
          {feed.map((f, i) => {
            const colors = colorMap[f.color] || { bg: "bg-muted", text: "text-muted-foreground" };
            return (
              <Pressable
                key={f.name}
                className={cn(
                  "flex-row w-full items-center gap-x-3 rounded-2xl p-3 active:bg-secondary/60",
                  i !== feed.length - 1 && "border-b border-border/50"
                )}
              >
                <View className={cn("h-11 w-11 shrink-0 rounded-full justify-center items-center", colors.bg)}>
                  <Text className="text-lg">{f.avatar}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[14px] font-semibold text-foreground">{f.name}</Text>
                  <Text className="text-[12px] text-muted-foreground mt-0.5" numberOfLines={1}>
                    {f.action}
                  </Text>
                </View>
                <Text className="shrink-0 text-[11px] text-muted-foreground">{f.time}</Text>
              </Pressable>
            );
          })}
        </Card>
      </View>

      {/* Weekly perf */}
      <Card tone="ink" className="p-5" glass>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-foreground/60">
              This week
            </Text>
            <Text className="mt-1 text-[20px] font-bold text-ink-foreground">112 sessions logged</Text>
          </View>
          <View className="flex-row items-center gap-x-1 rounded-full bg-success/20 px-3 py-1">
            <Icon name="trending-up" size={13} color="--success" />
            <Text className="text-[12px] font-bold text-success">+14%</Text>
          </View>
        </View>
        <View className="mt-8 flex-row items-end justify-between px-1">
          {[50, 70, 48, 85, 90, 75, 110].map((h, i) => (
            <View key={i} className="items-center flex-1">
              <LinearGradient
                colors={[primaryColor, peachColor]}
                start={{ x: 0, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={{
                  width: 28,
                  height: h,
                  borderTopLeftRadius: 14,
                  borderTopRightRadius: 14,
                  overflow: "hidden",
                }}
              />
              <Text className="mt-2.5 text-center text-[10px] font-bold text-ink-foreground/50">
                {["S", "M", "T", "W", "T", "F", "S"][i]}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}
