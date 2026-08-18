import { DASHBOARD_URL } from "@/api/config";
import { useGetAttentionQuery } from "@/api/endpoints/analytics.endpoints";
import type { ProgramEndingSoon } from "@/api/types";
import { useClientAvatars } from "@/features/coach/home/hooks/useClientAvatars";
import {
  DASH,
  DEFAULT_ENDING_HORIZON_DAYS,
  formatPctShort,
  formatShortDate,
  initialsOf,
  pluralise,
} from "@/features/coach/home/lib/format";
import { normalizeAttention } from "@/features/coach/home/lib/normalizeAttention";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { ProgressTrack } from "@/shared/ui/ProgressTrack";
import { Surface } from "@/shared/ui/Surface";
import { Pressable, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { Image } from "@/tw/image";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl } from "react-native";

/** Inside this many days the row reads as urgent rather than upcoming. */
const URGENT_DAYS = 3;

/** "Ends today" / "Ends tomorrow" / "Ends in 6 days" — never "in 0 days". */
function endsLabel(daysRemaining: number): string {
  if (daysRemaining <= 0) return "Ends today";
  if (daysRemaining === 1) return "Ends tomorrow";
  return `Ends in ${daysRemaining} ${pluralise(daysRemaining, "day")}`;
}

function RenewalCard({
  program,
  avatarUrl,
  onRenew,
}: {
  program: ProgramEndingSoon;
  avatarUrl?: string;
  onRenew: () => void;
}) {
  const urgent = program.daysRemaining <= URGENT_DAYS;
  // completionPct covers the whole programme run, not a window. null means no
  // denominator — a dash, never 0%, which would read as "nothing done".
  const ratio = program.completionPct === null ? null : program.completionPct / 100;

  const openPlan = () =>
    router.push({
      pathname: "/(coach)/plans/training/[programId]",
      params: { programId: program.programId },
    });

  return (
    <Surface
      radius="lg"
      // Urgent cards fade from the danger tint so the ones about to lapse read
      // apart at a glance; the rest stay on the lilac the Home row uses.
      from={urgent ? "--danger-tint" : "--indigo-tint"}
      to="--card"
      angle={140}
      className={cn(
        "gap-3 overflow-hidden p-3.5",
        urgent && "border border-danger/26"
      )}
    >
      <View className="flex-row items-center gap-3">
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            className="h-10 w-10 shrink-0 overflow-hidden rounded-full object-cover"
          />
        ) : (
          <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
            <Text className="text-[13px] font-semibold text-secondary-foreground">
              {initialsOf(program.clientName)}
            </Text>
          </View>
        )}

        <View className="min-w-0 flex-1">
          <Text className="text-[15.5px] font-semibold leading-tight text-foreground" numberOfLines={2}>
            {program.programName || "Untitled program"}
          </Text>
          <Text className="mt-0.5 text-[12.5px] text-muted-foreground" numberOfLines={1}>
            {program.clientName}
          </Text>
        </View>

        {/* The countdown is the reason this card exists, so it gets the pill. */}
        <View
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1",
            urgent ? "bg-danger/12" : "bg-lilac/20"
          )}
        >
          <Text
            className={cn(
              "text-[11.5px] font-semibold",
              urgent ? "text-danger" : "text-lilac-ink"
            )}
          >
            {endsLabel(program.daysRemaining)}
          </Text>
        </View>
      </View>

      <View className="gap-1.5">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-[11.5px] text-muted-foreground">
            {program.completionPct === null ? DASH : formatPctShort(program.completionPct)} complete
          </Text>
          <Text className="text-[11.5px] text-muted-foreground">
            Ends {formatShortDate(program.endsOn)}
          </Text>
        </View>
        <ProgressTrack
          value={ratio ?? 0}
          fillClassName={urgent ? "bg-danger" : "bg-lilac"}
        />
      </View>

      <View className="flex-row gap-2 pt-0.5">
        <Pressable
          onPress={openPlan}
          className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-secondary active:opacity-80"
        >
          <Icon name="clipboard-list" size={14} color="--foreground" />
          <Text className="text-[13px] font-semibold text-foreground">View plan</Text>
        </Pressable>
        <Pressable
          onPress={onRenew}
          className="h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary active:opacity-90"
        >
          {/* Same glyph CreatePlanSheet uses for its dashboard hand-off, so
              "this leaves the app" reads the same way in both places. */}
          <Icon name="arrow-up" size={14} color="--primary-foreground" />
          <Text className="text-[13px] font-semibold text-primary-foreground">Renew</Text>
        </Pressable>
      </View>
    </Surface>
  );
}

/**
 * Programmes running out, from /analytics/attention.
 *
 * The drill-down behind Home's "Renew" row. The queue arrives already sorted
 * most-urgent-first and is rendered in that order — never re-sorted, since the
 * server's ordering is the answer to "what needs writing next".
 *
 * The list comes from the same RTK cache Home already populated, so opening
 * this screen is usually a cache read rather than a request.
 */
export function RenewalsScreen() {
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";
  const { tenantId } = useActiveTenant();
  const avatars = useClientAvatars();
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Renewing means writing a new programme, and the app reads plans but can't
  // author them — same constraint CreatePlanSheet explains on the Plans tab. So
  // "Renew" hands the coach to the web dashboard rather than opening an editor
  // that doesn't exist here.
  const canOpenDashboard = DASHBOARD_URL.length > 0;

  const openDashboard = useCallback(async () => {
    setDashboardError(null);
    if (!canOpenDashboard) {
      setDashboardError("No dashboard is configured for this build.");
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(DASHBOARD_URL);
    } catch {
      setDashboardError("Couldn't open the dashboard. Try again from your browser.");
    }
  }, [canOpenDashboard]);

  const attention = useGetAttentionQuery(
    { tenantId: tenantId ?? "" },
    { skip: !tenantId }
  );

  // Same tolerant reader Home uses — a queue spelled differently would
  // otherwise render as "nothing ending", a confident wrong answer.
  const programs = useMemo(
    () => normalizeAttention(attention.data)?.programsEndingSoon ?? [],
    [attention.data]
  );

  const busy = !tenantId || attention.isLoading;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-4 px-5 pt-4 pb-screen"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={attention.isFetching && !busy}
          onRefresh={() => attention.refetch()}
          tintColor={primaryColor}
        />
      }
    >
      <View className="flex-row items-center gap-2">
        <GlassButton
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
        >
          <Icon name="chevron-left" size={20} color="--foreground" />
        </GlassButton>
        <View className="min-w-0 flex-1">
          <Text className="font-display text-[24px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
            Ending soon
          </Text>
          {!busy ? (
            <Text className="mt-0.5 text-[12.5px] text-muted-foreground">
              {programs.length > 0
                ? `${programs.length} ${pluralise(programs.length, "program")} in the next ${DEFAULT_ENDING_HORIZON_DAYS} days`
                : `Nothing ending in the next ${DEFAULT_ENDING_HORIZON_DAYS} days`}
            </Text>
          ) : null}
        </View>
      </View>

      {busy ? (
        <View className="items-center py-16">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : attention.isError ? (
        <Surface radius="lg" className="items-center gap-3 py-10">
          <Text className="text-sm text-muted-foreground">
            Couldn&apos;t load programs ending soon.
          </Text>
          <Pressable
            onPress={() => attention.refetch()}
            className="h-11 items-center justify-center rounded-2xl bg-secondary px-6 active:opacity-80"
          >
            <Text className="text-[14px] font-semibold text-foreground">Retry</Text>
          </Pressable>
        </Surface>
      ) : programs.length === 0 ? (
        <Surface radius="lg" className="items-center gap-1 py-10">
          <Text className="text-sm font-semibold text-foreground">Nothing ending soon</Text>
          <Text className="text-xs text-muted-foreground">
            Programs appear here {DEFAULT_ENDING_HORIZON_DAYS} days before they finish.
          </Text>
        </Surface>
      ) : (
        <View className="gap-3">
          {dashboardError ? (
            <Text className="text-[12.5px] text-danger">{dashboardError}</Text>
          ) : null}
          {programs.map((program) => (
            <RenewalCard
              key={program.programId}
              program={program}
              avatarUrl={
                program.membershipId ? avatars.get(program.membershipId) : undefined
              }
              onRenew={openDashboard}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
