import { Icon } from "@/shared/ui/Icon";
import { FilterPill } from "@/shared/ui/FilterPill";
import { GlassButton } from "@/shared/ui/GlassButton";
import { SearchField } from "@/shared/ui/SearchField";
import { SegmentedControl, type SegmentedControlOption } from "@/shared/ui/SegmentedControl";
import { FlatList, Text, View } from "@/tw";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CreatePlanSheet } from "../components/CreatePlanSheet";
import { PlanCard } from "../components/PlanCard";
import { PlanFilterSheet, type StatusFilter } from "../components/PlanFilterSheet";
import { useCoachPlans, type TypeFilter } from "../hooks/useCoachPlans";
import type { CoachPlan } from "../lib/normalizePlan";

const TYPE_OPTIONS: SegmentedControlOption<TypeFilter>[] = [
  { value: "all", label: "All" },
  {
    value: "training",
    label: "Training",
    activeClassName: "bg-lilac",
    activeLabelClassName: "text-lilac-ink",
  },
  {
    value: "nutrition",
    label: "Nutrition",
    activeClassName: "bg-mint",
    activeLabelClassName: "text-mint-ink",
  },
];

export function PlansScreen() {
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const queryArgs = useMemo(() => ({ search, type, status }), [search, type, status]);
  const { plans, counts, isLoading, isFetching, refetch } = useCoachPlans(queryArgs);

  const openPlan = useCallback((plan: CoachPlan) => {
    if (plan.kind === "training") {
      router.push({
        pathname: "/(coach)/plans/training/[programId]",
        params: { programId: plan.id },
      });
      return;
    }
    router.push({
      pathname: "/(coach)/plans/nutrition/[planId]",
      params: { planId: plan.id },
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CoachPlan }) => (
      <PlanCard
        plan={item}
        onPress={() => openPlan(item)}
        // Finishing a draft is a dashboard job — the sheet says where to go.
        onContinue={() => setShowCreateSheet(true)}
      />
    ),
    [openPlan]
  );

  return (
    <View className="flex-1 bg-background">
      {/* Header block: title, summary, and the one action that creates work */}
      <View className="px-5 pb-2.5 pt-4.5">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="font-display text-[32px] font-bold leading-none tracking-[-0.02em] text-foreground">
              Plans
            </Text>
            <View className="mt-1.5 flex-row items-center gap-2">
              <Text className="text-[12.5px] font-semibold text-foreground">
                {counts.total} {counts.total === 1 ? "plan" : "plans"}
              </Text>
              <View className="h-1.25 w-1.25 rounded-full bg-mint" />
              <Text className="text-[12.5px] text-muted-foreground">
                {counts.nutrition} nutrition
              </Text>
              <View className="h-1.25 w-1.25 rounded-full bg-lilac" />
              <Text className="text-[12.5px] text-muted-foreground">
                {counts.training} training
              </Text>
            </View>
          </View>

          {/* Glass, but tinted primary — the bg class alone sits behind the
              glass material and comes out looking disabled. */}
          <GlassButton
            onPress={() => setShowCreateSheet(true)}
            accessibilityLabel="Create a plan"
            tint="--primary"
            className="h-10 w-10 items-center justify-center rounded-full bg-primary shadow-soft active:opacity-85"
          >
            <Text className="text-lg font-bold text-primary-foreground">+</Text>
          </GlassButton>
        </View>

        <View className="mt-3.5">
          <SearchField onChange={setSearch} placeholder="Search plans or clients…" />
        </View>

        {/* One filter row — type on the left, status behind a sheet on the right */}
        <View className="mt-3 flex-row items-center gap-2">
          <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />
          <View className="ml-auto flex-row items-center gap-2">
            {isFetching && !isLoading ? <ActivityIndicator size="small" color="--primary" /> : null}
            <FilterPill
              label={status === "all" ? "Status" : status}
              active={status !== "all"}
              icon="filter"
              onPress={() => setShowFilterSheet(true)}
            />
          </View>
        </View>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(plan) => plan.id}
        renderItem={renderItem}
        contentContainerClassName="px-5 pt-3.5 pb-[110px] gap-3"
        ListFooterComponent={<View className={insets.bottom > 0 ? "h-8.5" : "h-0"} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshing={isFetching && !isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="--primary" />
            </View>
          ) : (
            <View className="items-center py-12">
              <Icon name="clipboard-list" size={24} color="--muted-foreground" />
              <Text className="mt-2 text-[13.5px] text-muted-foreground">No plans to show</Text>
            </View>
          )
        }
      />

      <PlanFilterSheet
        visible={showFilterSheet}
        value={status}
        onChange={setStatus}
        onClose={() => setShowFilterSheet(false)}
      />

      <CreatePlanSheet visible={showCreateSheet} onClose={() => setShowCreateSheet(false)} />
    </View>
  );
}
