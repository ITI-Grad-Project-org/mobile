import { useGetAnalyticsActivityQuery } from "@/api/endpoints/analytics.endpoints";
import { cn } from "@/lib/utils";
import { ActivityRow } from "@/features/coach/home/components/ActivityRow";
import { useClientAvatars } from "@/features/coach/home/hooks/useClientAvatars";
import {
  describeActivityShape,
  toActivityRows,
} from "@/features/coach/home/lib/normalizeActivity";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Surface } from "@/shared/ui/Surface";
import { Pressable, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView as RNScrollView,
} from "react-native";

import { DayStrip } from "../components/DayStrip";
import { groupByDay } from "../lib/groupByDay";

/**
 * The full feed behind Home's "See all".
 *
 * 200 is the endpoint's hard ceiling and it rejects anything above rather than
 * clamping, so this asks for 50 — the endpoint's own default page. Paging is by
 * date window, not by offset; a coach who needs to go further back needs a
 * range picker, not a "load more".
 */
const FEED_LIMIT = 50;

/**
 * How far above a day's heading the jump lands, so the heading clears the
 * sticky slot instead of sitting flush under the rail.
 */
const JUMP_OFFSET = 8;

/**
 * A heading counts as "the day you're reading" once it's within this of the
 * top. Without the slack the active chip flips a frame late on every scroll.
 */
const ACTIVE_SLACK = 24;

export function ActivityScreen() {
  const { tenantId } = useActiveTenant();
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";

  const feed = useGetAnalyticsActivityQuery(
    { tenantId: tenantId ?? "", limit: FEED_LIMIT },
    { skip: !tenantId }
  );
  // The feed carries no avatar — only membershipId — so faces come from the
  // client list, which the Clients tab has usually already cached.
  const avatars = useClientAvatars();

  const rows = useMemo(() => {
    describeActivityShape(feed.data ?? []);
    return toActivityRows(feed.data);
  }, [feed.data]);

  // Grouping only — the rows keep the order the API sent them in.
  const sections = useMemo(() => groupByDay(rows), [rows]);

  const scrollRef = useRef<RNScrollView>(null);
  // Heading offsets inside the scroll content, filled in by onLayout. A ref
  // rather than state: these are read during a scroll and on a tap, and
  // re-rendering the whole feed every time one lands would be wasteful.
  const offsets = useRef(new Map<string, number>());
  const [activeDate, setActiveDate] = useState<string | null>(null);

  const onHeadingLayout = useCallback((date: string, event: LayoutChangeEvent) => {
    offsets.current.set(date, event.nativeEvent.layout.y);
  }, []);

  const jumpTo = useCallback((date: string) => {
    const y = offsets.current.get(date);
    if (y === undefined) return;
    setActiveDate(date);
    scrollRef.current?.scrollTo({ y: Math.max(0, y - JUMP_OFFSET), animated: true });
  }, []);

  // Scrolling drives the chip too, so the rail can't end up pointing at a day
  // the coach scrolled away from after tapping it.
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y + ACTIVE_SLACK;
      let current: string | null = null;
      for (const section of sections) {
        const offset = offsets.current.get(section.date);
        if (offset === undefined || offset > y) break;
        current = section.date;
      }
      // Above the first heading there is no active day; React bails out when
      // the value is unchanged, so this is a no-op for most scroll frames.
      setActiveDate(current ?? sections[0]?.date ?? null);
    },
    [sections]
  );

  const isLoading = !tenantId || feed.isLoading;
  // The list is the only branch with headings in it; the loading, error and
  // empty branches render a single child, and sticky indices aimed at those
  // would pin a spinner or an error card to the top of the screen.
  const showList = !isLoading && !feed.isError && sections.length > 0;

  return (
    <View className="flex-1 bg-background">
      {/* Header and rail sit outside the ScrollView so the day chips stay
          reachable at any scroll depth — a jump control that scrolls away is
          useless exactly when you need it. */}
      <View className="flex-row items-center gap-2 px-5 pt-4">
        <GlassButton
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
        >
          <Icon name="chevron-left" size={20} color="--foreground" />
        </GlassButton>
        <Text className="font-display text-[24px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
          Activity
        </Text>
      </View>

      {showList ? (
        <View className="mt-3.5 border-b border-border pb-3.5">
          <DayStrip sections={sections} activeDate={activeDate} onSelect={jumpTo} />
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-30"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        // Every day heading sticks; RN swaps one for the next as they meet.
        stickyHeaderIndices={showList ? sections.map((_, i) => i * 2) : undefined}
        refreshControl={
          <RefreshControl
            refreshing={feed.isFetching && !isLoading}
            onRefresh={() => feed.refetch()}
            tintColor={primaryColor}
          />
        }
      >
        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color={primaryColor} />
          </View>
        ) : feed.isError ? (
          // Including a 404 — that means the tenant scoping is wrong, so it must
          // not be dressed up as "this coach has no activity".
          <Surface radius="lg" className="items-center gap-2 p-6">
            <Icon name="alert-triangle" size={22} color="--danger" />
            <Text className="text-[15px] font-semibold text-foreground">
              Couldn&apos;t load the feed
            </Text>
            <Pressable
              onPress={() => feed.refetch()}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              className="mt-1 rounded-full bg-primary px-3.5 py-2 active:opacity-85"
            >
              <Text className="text-[12.5px] font-semibold text-primary-foreground">
                Try again
              </Text>
            </Pressable>
          </Surface>
        ) : sections.length === 0 ? (
          <Surface radius="lg" className="items-center gap-1 py-10">
            <Text className="text-sm font-semibold text-foreground">
              Nothing logged yet
            </Text>
            <Text className="text-xs text-muted-foreground">
              Workouts, meals and check-ins land here.
            </Text>
          </Surface>
        ) : (
          // Flattened on purpose: stickyHeaderIndices only tracks DIRECT
          // children, so a heading wrapped together with its card would never
          // stick. Hence the heading/card pairs and the even indices above.
          sections.flatMap((section, sectionIndex) => [
            <View
              key={`${section.date}-heading`}
              onLayout={(event) => onHeadingLayout(section.date, event)}
              className={cn(
                "flex-row items-baseline justify-between bg-background pb-2",
                sectionIndex > 0 && "pt-5"
              )}
            >
              <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {section.label}
              </Text>
              <Text className="text-[11px] text-muted-foreground">
                {section.rows.length}
              </Text>
            </View>,
            <Surface key={`${section.date}-rows`} radius="lg">
              {/* Order is the API's — newest by loggedAt, never re-sorted. */}
              {section.rows.map((row, i) => (
                <ActivityRow
                  key={row.id}
                  row={row}
                  divided={i > 0}
                  avatarUrl={row.membershipId ? avatars.get(row.membershipId) : undefined}
                />
              ))}
            </Surface>,
          ])
        )}
      </ScrollView>
    </View>
  );
}
