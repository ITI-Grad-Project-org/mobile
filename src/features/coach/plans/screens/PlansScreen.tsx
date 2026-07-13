import { clientsList, nutritionPlans, trainingPlans } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import { Image } from "@/tw/image";
import { useState, useMemo } from "react";
import { Modal, Platform } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

const LIQUID_GLASS = isLiquidGlassAvailable();

type TrainingPlan = (typeof trainingPlans)[number];
type NutritionPlan = (typeof nutritionPlans)[number];

type Plan =
  | (TrainingPlan & { type: "training" })
  | (NutritionPlan & { type: "nutrition" });

type PlanFilter = "All" | "Training" | "Nutrition";

export function PlansScreen() {
  const [filter, setFilter] = useState<PlanFilter>("All");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Plan | null>(null);

  // Initialize assignment mapping (plan.id -> array of client.id) based on initial mock counts
  const initialAssignments = useMemo(() => {
    const initial: Record<string, string[]> = {};
    trainingPlans.forEach((p) => {
      initial[p.id] = clientsList.slice(0, p.assigned).map((c) => c.id);
    });
    nutritionPlans.forEach((p) => {
      initial[p.id] = clientsList.slice(0, p.assigned).map((c) => c.id);
    });
    return initial;
  }, []);

  const [assignments, setAssignments] = useState<Record<string, string[]>>(initialAssignments);

  const allPlans = useMemo(() => {
    const tp: Plan[] = trainingPlans.map((p) => ({ ...p, type: "training" }));
    const np: Plan[] = nutritionPlans.map((p) => ({ ...p, type: "nutrition" }));
    return [...tp, ...np];
  }, []);

  const filtered = useMemo(() => {
    return allPlans.filter((p) => {
      const matchesFilter =
        filter === "All" ||
        (filter === "Training" && p.type === "training") ||
        (filter === "Nutrition" && p.type === "nutrition");

      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [allPlans, filter, search]);

  const handleSaveAssignments = (planId: string, clientIds: string[]) => {
    setAssignments((prev) => ({
      ...prev,
      [planId]: clientIds,
    }));
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-y-5 pt-5 pb-30"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="flex-row items-end justify-between px-1">
          <View>
            <Text className="text-[26px] font-bold tracking-tight text-foreground">Plans</Text>
            <Text className="text-[13.5px] text-muted-foreground mt-0.5">
              {allPlans.length} total · {trainingPlans.length} training · {nutritionPlans.length} nutrition
            </Text>
          </View>
          <Pressable className="h-10 w-10 justify-center items-center rounded-full bg-primary shadow-soft active:opacity-85">
            <Text className="text-primary-foreground text-lg font-bold">+</Text>
          </Pressable>
        </View>

        {/* Search & Filter bar */}
        {(() => {
          const searchControls = (
            <>
              <Icon name="search" size={16} color="--muted-foreground" />
              <TextInput
                placeholder="Search plans…"
                placeholderTextColor="#7c7c85"
                value={search}
                onChangeText={setSearch}
                className="flex-1 bg-transparent text-[14px] text-foreground p-0"
                autoCapitalize="none"
              />
              {search.length > 0 ? (
                <Pressable onPress={() => setSearch("")} className="p-1 active:opacity-70">
                  <Icon name="x" size={14} color="--muted-foreground" />
                </Pressable>
              ) : (
                <Icon name="filter" size={16} color="--muted-foreground" />
              )}
            </>
          );

          return LIQUID_GLASS ? (
            <GlassView
              glassEffectStyle="regular"
              isInteractive
              style={{
                flexDirection: "row",
                alignItems: "center",
                columnGap: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 9999,
              }}
            >
              {searchControls}
            </GlassView>
          ) : (
            <View className="flex-row items-center gap-x-2 rounded-full border border-border bg-card px-3 py-2 shadow-soft">
              {searchControls}
            </View>
          );
        })()}

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-x-2 pb-1"
        >
          {(["All", "Training", "Nutrition"] as PlanFilter[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setFilter(s)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 active:opacity-85",
                filter === s ? "bg-foreground" : "bg-secondary"
              )}
            >
              <Text
                className={cn(
                  "text-[12.5px] font-semibold",
                  filter === s ? "text-background" : "text-muted-foreground"
                )}
              >
                {s}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Plans List */}
        <View className="gap-y-3">
          {filtered.length > 0 ? (
            filtered.map((p) => {
              const assignedCount = (assignments[p.id] || []).length;
              return (
                <Card
                  key={p.id}
                  interactive
                  onPress={() => setActive(p)}
                  className="flex-row items-center gap-x-3 p-3"
                  glass
                >
                  <Image
                    source={{ uri: p.cover }}
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-x-2">
                      <Text className="truncate text-[15px] font-semibold text-foreground" numberOfLines={1}>
                        {p.name}
                      </Text>
                      <View
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5",
                          p.type === "training" ? "bg-primary/10" : "bg-mint"
                        )}
                      >
                        <Text
                          className={cn(
                            "text-[9px] font-bold uppercase tracking-wider",
                            p.type === "training" ? "text-primary" : "text-mint-ink"
                          )}
                        >
                          {p.type}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[12px] text-muted-foreground mt-0.5">
                      {p.type === "training"
                        ? `${p.weeks} weeks · ${p.days} d/wk · ${p.level}`
                        : `${p.kcal} kcal · ${p.protein}g protein`}
                    </Text>
                  </View>
                  <View className="shrink-0 items-end justify-center">
                    <Text className="text-[15px] font-bold text-foreground">
                      {assignedCount}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground mt-0.5">assigned</Text>
                  </View>
                </Card>
              );
            })
          ) : (
            <View className="py-12 items-center justify-center">
              <Text className="text-[14px] text-muted-foreground">No plans found</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Detail drawer sheet */}
      <PlanDetail
        key={active ? active.id : "none"}
        plan={active}
        onClose={() => setActive(null)}
        assignedClientIds={active ? (assignments[active.id] || []) : []}
        onSave={(clientIds) => active && handleSaveAssignments(active.id, clientIds)}
      />
    </View>
  );
}

function PlanDetail({
  plan,
  onClose,
  assignedClientIds,
  onSave,
}: {
  plan: Plan | null;
  onClose: () => void;
  assignedClientIds: string[];
  onSave: (clientIds: string[]) => void;
}) {
  const [picked, setPicked] = useState<Record<string, boolean>>(() => {
    const initialPicked: Record<string, boolean> = {};
    if (plan) {
      clientsList.forEach((c) => {
        initialPicked[c.id] = assignedClientIds.includes(c.id);
      });
    }
    return initialPicked;
  });
  const [confirmed, setConfirmed] = useState(false);

  if (!plan) return null;

  const count = Object.values(picked).filter(Boolean).length;
  const isIOS = Platform.OS === "ios";

  const handleClose = () => {
    setPicked({});
    setConfirmed(false);
    onClose();
  };

  const handleConfirm = () => {
    const selectedIds = Object.keys(picked).filter((id) => picked[id]);
    onSave(selectedIds);
    setConfirmed(true);
  };

  const content = (
    <View className="flex-1 bg-card px-5 pt-3 pb-8">
      {/* Notch handle indicator */}
      <View className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

      {/* Header */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-x-3">
          <Image
            source={{ uri: plan.cover }}
            className="h-14 w-14 rounded-2xl object-cover"
          />
          <View className="min-w-0 max-w-[70%]">
            <Text className="text-[18px] font-bold leading-tight text-foreground" numberOfLines={1}>
              {plan.name}
            </Text>
            <Text className="text-[12px] text-muted-foreground mt-0.5">
              {plan.type === "training"
                ? `${plan.weeks} weeks · ${plan.days} d/wk · ${plan.level}`
                : `${plan.kcal} kcal · ${plan.protein}g protein`}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleClose}
          className="h-9 w-9 justify-center items-center rounded-full bg-secondary active:opacity-75"
        >
          <Icon name="x" size={16} color="--muted-foreground" />
        </Pressable>
      </View>

      {confirmed ? (
        <View className="my-8 items-center text-center justify-center flex-1">
          <View className="h-16 w-16 justify-center items-center rounded-full bg-success shadow-soft">
            <Icon name="check" size={32} color="#ffffff" />
          </View>
          <Text className="mt-4 text-[17px] font-bold text-foreground text-center">
            {plan.name} assigned to {count} client{count !== 1 ? "s" : ""}
          </Text>
          <Pressable
            onPress={handleClose}
            className="mt-6 w-full rounded-2xl bg-foreground py-3.5 active:opacity-90"
          >
            <Text className="text-center text-[14px] font-semibold text-background">Done</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView className="flex-1 mt-4" showsVerticalScrollIndicator={false}>
          {/* Client List Section */}
          <View>
            <SectionTitle
              title="Assign to clients"
              action={
                <View className="flex-row items-center gap-x-1">
                  <Icon name="person" size={13} color="--muted-foreground" />
                  <Text className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Clients
                  </Text>
                </View>
              }
            />
            <View className="gap-y-2 mt-1 mb-4">
              {clientsList.map((c) => (
                <ClientPickRow
                  key={c.id}
                  avatar={c.avatar}
                  name={c.name}
                  sub={`${c.goal} · adherence: ${c.adh}%`}
                  picked={!!picked[c.id]}
                  onToggle={() => setPicked((s) => ({ ...s, [c.id]: !s[c.id] }))}
                />
              ))}
            </View>
          </View>

          {/* Submit action */}
          <Pressable
            onPress={handleConfirm}
            className="mt-2 w-full rounded-2xl bg-primary py-4 shadow-soft active:opacity-90"
          >
            <Text className="text-center text-[15px] font-semibold text-primary-foreground">
              Save Assignments ({count} client{count !== 1 ? "s" : ""})
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );

  if (isIOS) {
    return (
      <Modal
        visible={plan !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        {content}
      </Modal>
    );
  }

  return (
    <Modal
      visible={plan !== null}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={handleClose} />
        <View className="min-h-[85%] w-full overflow-hidden shadow-pop bg-card rounded-t-3xl">
          {content}
        </View>
      </View>
    </Modal>
  );
}

function ClientPickRow({
  avatar,
  name,
  sub,
  picked,
  onToggle,
}: {
  avatar: string;
  name: string;
  sub: string;
  picked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row w-full items-center gap-x-3 rounded-2xl bg-secondary/50 p-2 active:bg-secondary"
    >
      <Image source={{ uri: avatar }} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
      <View className="min-w-0 flex-1">
        <Text className="truncate text-[13.5px] font-semibold text-foreground" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-[11.5px] text-muted-foreground mt-0.5">{sub}</Text>
      </View>
      <View
        className={cn(
          "h-7 w-7 shrink-0 justify-center items-center rounded-full border-2",
          picked ? "border-primary bg-primary" : "border-border bg-card"
        )}
      >
        <Icon name="check" size={12} color={picked ? "#ffffff" : "transparent"} />
      </View>
    </Pressable>
  );
}
