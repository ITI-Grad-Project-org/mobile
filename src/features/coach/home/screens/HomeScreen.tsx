import { cn } from "@/lib/utils";
import { AvatarStack } from "@/shared/ui/AvatarStack";
import { Icon } from "@/shared/ui/Icon";
import { Surface } from "@/shared/ui/Surface";
import { todayIso } from "@/shared/utils/date";
import { Pressable, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, RefreshControl } from "react-native";

import { ActivityRow } from "../components/ActivityRow";
import { AttentionRow } from "../components/AttentionRow";
import { InsightCard } from "../components/InsightCard";
import { StatTile } from "../components/StatTile";
import { WeekActivityChart } from "../components/WeekActivityChart";
import { useCoachHomeAnalytics } from "../hooks/useCoachHomeAnalytics";
import { useClientAvatars } from "../hooks/useClientAvatars";
import { useCoachHomeData } from "../hooks/useCoachHomeData";
import { useDismissedInsights } from "../hooks/useDismissedInsights";
import { useRosterCheckins } from "../hooks/useRosterCheckins";
import {
  buildInsight,
  buildQueues,
  type AttentionRowModel,
} from "../lib/attentionQueues";
import {
  DEFAULT_ENDING_HORIZON_DAYS,
  DEFAULT_RISK_THRESHOLD_DAYS,
  formatMrrLines,
  formatPctShort,
  todayWeekdayMondayBased,
  weekLabelFrom,
} from "../lib/format";

const HIT_SLOP = { top: 8, bottom: 8, left: 6, right: 6 };

export function HomeScreen() {
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";

  const {
    greeting,
    firstName,
    roster,
    clientUserIds,
    checkinTargets,
    isFetching: identityFetching,
    refetchAll,
  } = useCoachHomeData();
  const {
    overview,
    attention,
    activity,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useCoachHomeAnalytics();
  const { dismiss, isDismissed } = useDismissedInsights();
  // Activity rows carry no avatar — only membershipId — so faces are looked up
  // from the client list this screen already fetches via useCoachHomeData.
  const avatars = useClientAvatars();

  // The check-in entity /analytics/attention reports on doesn't exist in
  // core-api — a client check-in is a measurement — so the queue is rebuilt
  // from the coach-side measurement reads whenever analytics returns none.
  const fallbackCheckins = useRosterCheckins(
    checkinTargets,
    attention !== undefined && attention.checkinsAwaitingReview.length === 0
  );

  const queues = useMemo(
    () => buildQueues(attention, { fallbackCheckins }),
    [attention, fallbackCheckins]
  );
  const insight = useMemo(() => buildInsight(attention), [attention]);

  const counts = overview?.attentionCounts;
  // The badge comes from overview, never from the list lengths: the counts are
  // the authority for the number (the lists can be server-capped) and both are
  // computed at the same default thresholds, which is why nothing custom is
  // passed to /attention.
  //
  // Summed defensively because attentionCounts has no response schema either —
  // a key spelled differently would otherwise make the whole sum NaN and put
  // "NaN" in the badge.
  const countedTotal = counts
    ? [counts.atRisk, counts.checkinsAwaitingReview, counts.programsEndingSoon]
        .filter((n) => typeof n === "number" && Number.isFinite(n))
        .reduce((sum, n) => sum + n, 0)
    : null;
  const listTotal = attention
    ? attention.atRisk.length +
      attention.checkinsAwaitingReview.length +
      attention.programsEndingSoon.length
    : null;
  // Prefer the counts; fall back to the lists rather than showing nothing when
  // the counts are absent. Measurement-derived check-ins are added on top,
  // since analytics counted none of them.
  const derivedCheckins = queues.usedFallbackCheckins ? fallbackCheckins.length : 0;
  const badgeTotal =
    countedTotal !== null
      ? countedTotal + derivedCheckins
      : listTotal !== null
        ? listTotal + derivedCheckins
        : null;

  if (
    __DEV__ &&
    !queues.usedFallbackCheckins &&
    countedTotal !== null &&
    listTotal !== null &&
    countedTotal !== listTotal
  ) {
    console.warn(
      `[HomeScreen] attentionCounts (${countedTotal}) disagrees with the attention lists ` +
        `(${listTotal}). Either a custom threshold reached /attention, the lists are capped, ` +
        `or a queue is spelled differently than normalizeAttention expects — check the ` +
        `"[attention] top-level keys" log.`
    );
  }

  const openClient = useCallback(
    (membershipId: string | undefined) => {
      const userId = membershipId ? clientUserIds.get(membershipId) : undefined;
      // The chat route wants the client's user id. Without it, land on the
      // roster rather than pushing a route that can't resolve.
      if (userId) {
        router.push({ pathname: "/(coach)/chat/[id]", params: { id: userId } });
        return;
      }
      router.push("/(coach)/(tabs)/clients");
    },
    [clientUserIds]
  );

  const onRowAction = useCallback(
    (row: AttentionRowModel) => {
      if (row.key === "atRisk") return openClient(row.membershipId);
      if (row.key === "checkins") return router.push("/(coach)/check-ins");
      return router.push("/(coach)/(tabs)/plans");
    },
    [openClient]
  );

  const onRefresh = useCallback(() => {
    refetch();
    refetchAll();
  }, [refetch, refetchAll]);

  const mrrLines = formatMrrLines(overview?.mrr);
  // thisWeek is derived from the WINDOW's end date, not from today. Home sends
  // no window, so the end is today and "THIS WEEK" is honest — the moment a
  // range picker lands here, this has to be labelled from that window instead.
  const weekLabel = weekLabelFrom(todayIso());
  const byDay = useMemo(() => overview?.thisWeek.byDay ?? [], [overview]);
  const sessionsLogged = overview?.thisWeek.sessionsLogged ?? 0;
  const weekChangePct = overview?.thisWeek.changePct ?? null;
  // The chart speaks in `count`; the payload speaks in `sessions`. Mapped here
  // rather than renaming the prop, since the bars are a generic per-weekday
  // count and nothing about the component is session-specific.
  const weekBars = useMemo(
    () => byDay.map((day) => ({ weekday: day.weekday, count: day.sessions })),
    [byDay]
  );
  const showInsight = insight !== null && !isDismissed(insight.key);

  const refreshControl = (
    <RefreshControl
      refreshing={(isFetching || identityFetching) && !isLoading}
      onRefresh={onRefresh}
      tintColor={primaryColor}
    />
  );

  const header = (
    <View className="gap-0.75">
      <Text className="text-[12.5px] text-muted-foreground">{greeting}</Text>
      <Text className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
        {firstName ? `Hey, ${firstName}` : "Hey there"}
      </Text>
    </View>
  );

  if (isError) {
    // Every failure lands here, including a 404 — that means the tenant scoping
    // is wrong, and rendering it as "nothing to show" would hide the bug.
    return (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-y-5 px-5 pt-5 pb-30"
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {header}
        <Surface radius="lg" className="items-center gap-2 p-6">
          <Icon name="alert-triangle" size={22} color="--danger" />
          <Text className="text-[15px] font-semibold text-foreground">
            Couldn&apos;t load your dashboard
          </Text>
          <Text className="text-center text-[12.5px] text-muted-foreground">
            Check your connection and try again.
          </Text>
          <Pressable
            onPress={onRefresh}
            hitSlop={HIT_SLOP}
            className="mt-1 rounded-full bg-primary px-3.5 py-2 active:opacity-85"
          >
            <Text className="text-[12.5px] font-semibold text-primary-foreground">
              Try again
            </Text>
          </Pressable>
        </Surface>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-5 px-5 pt-5 pb-30"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {header}

      {isLoading ? (
        <View className="items-center py-16">
          <ActivityIndicator color={primaryColor} />
        </View>
      ) : (
        <>
          {/* Stat tiles */}
          <View className="flex-row gap-2.25">
            <StatTile
              value={overview ? String(overview.roster.active) : null}
              label="Active"
            />
            <StatTile
              // null means no sessions were scheduled — not 0% adherence.
              value={
                overview && overview.sessionAdherencePct !== null
                  ? formatPctShort(overview.sessionAdherencePct)
                  : null
              }
              label="Adherence"
              tone="success"
              // The API has no per-day adherence series, so this traces the
              // week's logged sessions — the only daily shape it does return.
              sparkline={byDay.map((day) => day.sessions)}
            />
            <StatTile label="MRR" className="flex-[1.25]">
              {mrrLines.length > 0 ? (
                <View className="relative gap-0.5">
                  {/* A map keyed by ISO 4217, not a total: there is no FX rate
                      in the system, so one line each. Summing invents a number. */}
                  {mrrLines.map((line) => (
                    <Text
                      key={line}
                      className="text-[15px] font-semibold text-foreground"
                    >
                      {line}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text className="relative text-[21px] font-bold leading-none text-muted-foreground">
                  —
                </Text>
              )}
            </StatTile>
          </View>

          {/* Roster strip */}
          {roster.length > 0 && overview ? (
            <View className="flex-row items-center gap-3 px-0.5">
              <AvatarStack
                people={roster}
                max={3}
                total={overview.roster.total}
              />
              <Text
                className="text-[12.5px] text-muted-foreground"
                numberOfLines={1}
              >
                <Text className="font-semibold text-foreground">
                  {overview.roster.active} active
                </Text>
                {` · ${overview.roster.paused} paused`}
              </Text>
            </View>
          ) : null}

          {/* Needs you now */}
          <View className="gap-2.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
                Needs you now
              </Text>
              {badgeTotal !== null ? (
                <View className="h-6 min-w-6 items-center justify-center rounded-full bg-secondary px-2">
                  <Text className="text-xs font-bold text-secondary-foreground">
                    {badgeTotal}
                  </Text>
                </View>
              ) : null}
            </View>

            {queues.allClear ? (
              <Surface
                radius="md"
                glass
                className="flex-row items-center gap-3 px-3.25 py-3"
              >
                <View className="h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-success/15">
                  <Icon name="check" size={15} color="--success" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[14.5px] font-semibold leading-tight text-foreground">
                    Nothing needs you
                  </Text>
                  <Text
                    className="mt-0.5 text-xs text-muted-foreground"
                    numberOfLines={2}
                  >
                    {`Nobody silent past ${DEFAULT_RISK_THRESHOLD_DAYS} days, no check-ins waiting, nothing ending in ${DEFAULT_ENDING_HORIZON_DAYS} days`}
                  </Text>
                </View>
              </Surface>
            ) : (
              <>
                {/* Rendered in the order received — the API sorts them. */}
                {queues.rows.map((row, i) => (
                  <AttentionRow
                    key={row.key}
                    tone={row.tone}
                    fromVar={row.fromVar}
                    icon={row.icon}
                    count={row.count}
                    bubbleClassName={row.bubbleClassName}
                    bubbleTextClassName={row.bubbleTextClassName}
                    title={row.title}
                    subtitle={row.subtitle}
                    actionLabel={row.actionLabel}
                    emphasis={i === 0}
                    onPress={() => onRowAction(row)}
                  />
                ))}
                {queues.collapsed.map((line) => (
                  <View
                    key={line.key}
                    className="flex-row items-center gap-2 px-0.5 py-1"
                  >
                    <Icon name="clock" size={13} color="--muted-foreground" />
                    <Text className="text-[12.5px] text-muted-foreground">
                      {line.label}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* AI insight */}
          {showInsight ? (
            <InsightCard
              body={insight.body}
              onDraft={() => openClient(insight.membershipId)}
              onDismiss={() => dismiss(insight.key)}
            />
          ) : null}

          {/* Today's activity */}
          <View className="gap-2.5">
            <View className="flex-row items-center justify-between">
              <Text className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
                Today&apos;s activity
              </Text>
              <Pressable
                onPress={() => router.push("/(coach)/activity")}
                hitSlop={HIT_SLOP}
                className="active:opacity-70"
              >
                <Text className="text-[12.5px] font-semibold text-primary">
                  See all
                </Text>
              </Pressable>
            </View>

            <Surface radius="lg">
              {activity.length === 0 ? (
                <View className="items-center gap-1 py-8">
                  <Text className="text-sm font-semibold text-foreground">
                    No activity yet
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Logged workouts and meals show up here.
                  </Text>
                </View>
              ) : (
                // Order is the API's — by when it was logged, never by
                // trainingDate, which many rows share.
                activity.map((row, i) => (
                  <ActivityRow
                    key={row.id}
                    row={row}
                    divided={i > 0}
                    avatarUrl={row.membershipId ? avatars.get(row.membershipId) : undefined}
                    onPress={() => openClient(row.membershipId)}
                  />
                ))
              )}
            </Surface>
          </View>

          {/* This week — sessions the roster trained, straight off
              overview.thisWeek. These are SESSION counts, not tonnage: the
              endpoint has no volume figure. Counting /analytics/activity rows
              instead would count set reports (many per session) and cap at the
              endpoint's 200-row ceiling, so the number would be both inflated
              and a floor. */}
          <Surface radius="lg" className="gap-3.5 p-3.75">
            <View className="flex-row items-start justify-between">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {weekLabel ? `This week · ${weekLabel}` : "This week"}
                </Text>
                <Text className="text-[22px] font-bold leading-none tracking-[-0.02em] text-foreground">
                  {sessionsLogged}
                  <Text className="text-sm font-normal text-muted-foreground">
                    {" "}
                    {sessionsLogged === 1 ? "session" : "sessions"}
                  </Text>
                </Text>
              </View>
              {/* Hidden entirely when null — no prior week or a zero baseline,
                  neither of which is "no change". */}
              {weekChangePct !== null ? (
                <View
                  className={cn(
                    "rounded-[14px] px-2.5 py-1",
                    weekChangePct >= 0 ? "bg-success/12" : "bg-danger/12"
                  )}
                >
                  <Text
                    className={cn(
                      "text-xs font-semibold",
                      weekChangePct >= 0 ? "text-success" : "text-danger"
                    )}
                  >
                    {weekChangePct > 0 ? "+" : ""}
                    {formatPctShort(weekChangePct)}
                  </Text>
                </View>
              ) : null}
            </View>

            <WeekActivityChart
              byDay={weekBars}
              todayWeekday={todayWeekdayMondayBased()}
            />
          </Surface>
        </>
      )}
    </ScrollView>
  );
}
