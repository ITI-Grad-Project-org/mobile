import type { Measurement } from "@/api/types";
import { useCoachHomeData } from "@/features/coach/home/hooks/useCoachHomeData";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Segmented } from "@/shared/ui/Segmented";
import { Surface } from "@/shared/ui/Surface";
import { Pressable, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { Animated } from "@/tw/animated";
import { Image } from "@/tw/image";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator } from "react-native";
import { FadeOut, LinearTransition } from "react-native-reanimated";

import { CheckinEntryRow } from "../components/CheckinEntryRow";
import { useCheckinReviews } from "../hooks/useCheckinReviews";
import { useRosterMeasurements, type RosterClient } from "../hooks/useRosterMeasurements";
import { GlassButton } from "@/shared/ui/GlassButton";

/** Whole history per client, bounded so one long-standing client can't flood it. */
const PER_CLIENT_LIMIT = 50;

/** How long the undo bar stays up after a mark. */
const UNDO_MS = 5000;

type Tab = "pending" | "reviewed" | "all";

const TABS = [
  { value: "pending", label: "Needs review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "all", label: "All" },
] as const;

/** A client's history split by what the coach has already read. */
interface ClientQueue {
  client: RosterClient;
  /** Newest first. */
  measurements: Measurement[];
  /** The unread ones, newest first. */
  pending: Measurement[];
  reviewedCount: number;
}

/** GlassButton is already a 36px target, so no hitSlop is needed on the back. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "—";
}

/**
 * Every client's check-ins, triaged into what the coach still has to read.
 *
 * A "check-in" here is a measurement — see useRosterCheckins for why. There is
 * no roster-wide endpoint, so this fans out per client; that is also why the
 * page is capped rather than paged.
 *
 * "Reviewed" is device-local (see useCheckinReviews): the API has no review
 * state to write to. Marking never deletes anything — it moves the card to the
 * Reviewed tab, which is why the filter exists at all.
 */
export function CheckinsScreen() {
  const primaryColor = (useCSSVariable("--primary") as string) || "#e5673a";
  const { checkinTargets, isLoading: rosterLoading } = useCoachHomeData();
  const reviews = useCheckinReviews();

  const [tab, setTab] = useState<Tab>("pending");
  // The last mark, kept just long enough to offer an undo.
  const [undo, setUndo] = useState<{
    clientId: string;
    name: string;
    previous: string | undefined;
  } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // No `from`: this screen is the history, so it deliberately drops the
  // 14-day window the Home queue uses.
  const { data, isLoading } = useRosterMeasurements(checkinTargets, {
    enabled: checkinTargets.length > 0,
    limit: PER_CLIENT_LIMIT,
  });

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    []
  );

  const { queues, withoutCheckins, pendingTotal } = useMemo(() => {
    const has: ClientQueue[] = [];
    let pendingCount = 0;

    for (const entry of data) {
      if (entry.measurements.length === 0) continue;
      const pending = entry.measurements.filter(
        (m) => !reviews.isReviewed(entry.client.clientId, m.measuredAt)
      );
      pendingCount += pending.length;
      has.push({
        client: entry.client,
        measurements: entry.measurements,
        pending,
        reviewedCount: entry.measurements.length - pending.length,
      });
    }

    // Longest-waiting first while there is something to read — that is the
    // order a coach works a queue in. Once everything is read the queue is
    // history, so it flips back to most-recent-first.
    has.sort((a, b) => {
      const aWait = a.pending[a.pending.length - 1]?.measuredAt;
      const bWait = b.pending[b.pending.length - 1]?.measuredAt;
      if (aWait && bWait) return aWait.localeCompare(bWait);
      if (aWait) return -1;
      if (bWait) return 1;
      return b.measurements[0].measuredAt.localeCompare(a.measurements[0].measuredAt);
    });

    return {
      queues: has,
      withoutCheckins: data.filter((entry) => entry.measurements.length === 0),
      pendingTotal: pendingCount,
    };
  }, [data, reviews]);

  // Which cards this tab shows, and which of their rows.
  const visible = useMemo(
    () =>
      queues
        .map((queue) => ({
          queue,
          rows:
            tab === "pending"
              ? queue.pending
              : tab === "reviewed"
                ? queue.measurements.filter((m) => !queue.pending.includes(m))
                : queue.measurements,
        }))
        .filter((row) => row.rows.length > 0),
    [queues, tab]
  );

  const markReviewed = useCallback(
    (queue: ClientQueue) => {
      const newest = queue.pending[0];
      if (!newest) return;
      const previous = reviews.markReviewed(queue.client.clientId, newest.measuredAt);
      sfx.success();
      if (undoTimer.current) clearTimeout(undoTimer.current);
      setUndo({ clientId: queue.client.clientId, name: queue.client.name, previous });
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
    },
    [reviews]
  );

  const applyUndo = useCallback(() => {
    if (!undo) return;
    reviews.restore(undo.clientId, undo.previous ?? null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(null);
  }, [undo, reviews]);

  const busy = rosterLoading || isLoading || !reviews.hydrated;
  const total = queues.reduce((sum, queue) => sum + queue.measurements.length, 0);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-y-4 px-5 pt-4 pb-screen"
        showsVerticalScrollIndicator={false}
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
              Check-ins
            </Text>
            {!busy && total > 0 ? (
              <Text className="mt-0.5 text-[12.5px] text-muted-foreground">
                {pendingTotal > 0
                  ? `${pendingTotal} awaiting review · ${total} total`
                  : `${total} across ${queues.length} ${queues.length === 1 ? "client" : "clients"}`}
              </Text>
            ) : null}
          </View>
        </View>

        {!busy && total > 0 ? (
          <Segmented options={TABS} value={tab} onChange={(next) => setTab(next as Tab)} />
        ) : null}

        {busy ? (
          <View className="items-center py-16">
            <ActivityIndicator color={primaryColor} />
          </View>
        ) : total === 0 && withoutCheckins.length === 0 ? (
          <Surface radius="lg" className="items-center gap-1 py-10">
            <Text className="text-sm font-semibold text-foreground">No clients yet</Text>
            <Text className="text-xs text-muted-foreground">
              Check-ins appear once a client logs measurements.
            </Text>
          </Surface>
        ) : visible.length === 0 ? (
          <Surface radius="lg" className="items-center gap-2 py-10">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-success/12">
              <Icon
                name={tab === "pending" ? "check" : "clipboard-list"}
                size={20}
                color="--success"
              />
            </View>
            <Text className="text-sm font-semibold text-foreground">
              {tab === "pending" ? "All caught up" : "Nothing reviewed yet"}
            </Text>
            <Text className="px-8 text-center text-xs text-muted-foreground">
              {tab === "pending"
                ? "Every check-in on your roster has been reviewed."
                : "Check-ins you mark as reviewed are kept here."}
            </Text>
          </Surface>
        ) : (
          <>
            {visible.map(({ queue, rows }) => {
              const { client, pending, reviewedCount } = queue;
              const caughtUp = pending.length === 0;

              return (
                <Animated.View
                  key={client.clientId}
                  layout={LinearTransition.duration(220)}
                  exiting={FadeOut.duration(160)}
                >
                  <Surface radius="lg">
                    <Pressable
                      onPress={() =>
                        // The detail screen needs BOTH ids: measurements are keyed by
                        // the client's user id, the strength series by membershipId.
                        router.push({
                          pathname: "/(coach)/check-ins/[clientId]",
                          params: {
                            clientId: client.clientId,
                            membershipId: client.membershipId,
                            name: client.name,
                            avatarUrl: client.avatarUrl,
                          },
                        })
                      }
                      className="flex-row items-center gap-3 px-3.5 py-3.5 active:opacity-80"
                    >
                      {client.avatarUrl ? (
                        <Image
                          source={{ uri: client.avatarUrl }}
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                          <Text className="text-[12px] font-semibold text-secondary-foreground">
                            {initialsOf(client.name)}
                          </Text>
                        </View>
                      )}
                      <View className="min-w-0 flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text
                            className="shrink text-[15px] font-semibold text-foreground"
                            numberOfLines={1}
                          >
                            {client.name}
                          </Text>
                          {/* The dot is the only thing that has to survive a
                              glance, so it rides next to the name rather than
                              in the metadata line below. */}
                          {pending.length > 0 ? (
                            <View className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          ) : null}
                        </View>
                        <Text className="mt-0.5 text-[12px] text-muted-foreground">
                          {pending.length > 0
                            ? `${pending.length} new · ${reviewedCount} reviewed`
                            : `${reviewedCount} reviewed`}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={16} color="--muted-foreground" />
                    </Pressable>

                    {/* Each row's delta is against the check-in directly beneath
                        it in the FULL history, not just the ones this tab shows —
                        otherwise a filtered view would report a fabricated jump. */}
                    {rows.map((entry) => {
                      const index = queue.measurements.indexOf(entry);
                      return (
                        <CheckinEntryRow
                          key={entry.id ?? `${client.clientId}-${entry.measuredAt}`}
                          entry={entry}
                          previous={queue.measurements[index + 1]}
                          latest={index === 0}
                          divided
                        />
                      );
                    })}

                    {caughtUp ? (
                      <View className="flex-row items-center justify-center gap-1.5 border-t border-border py-2.5">
                        <Icon name="check" size={12} color="--success" />
                        <Text className="text-[11.5px] font-medium text-success">Reviewed</Text>
                        <Text className="text-[11.5px] text-muted-foreground">·</Text>
                        <Pressable
                          onPress={() => reviews.restore(client.clientId, null)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          className="active:opacity-70"
                        >
                          <Text className="text-[11.5px] font-medium text-muted-foreground">
                            Mark unread
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => markReviewed(queue)}
                        className="flex-row items-center justify-center gap-2 border-t border-border py-3 active:opacity-70"
                      >
                        <Icon name="check" size={14} color="--primary" />
                        <Text className="text-[13px] font-semibold text-primary">
                          {pending.length === 1
                            ? "Mark reviewed"
                            : `Mark ${pending.length} reviewed`}
                        </Text>
                      </Pressable>
                    )}
                  </Surface>
                </Animated.View>
              );
            })}

            {tab === "all" && withoutCheckins.length > 0 ? (
              <View className="gap-2 px-0.5">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  No check-ins yet
                </Text>
                {withoutCheckins.map(({ client }) => (
                  <Text
                    key={client.clientId}
                    className={cn("text-[12.5px] text-muted-foreground")}
                    numberOfLines={1}
                  >
                    {client.name}
                  </Text>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Sits over the list rather than in it: the card it refers to has just
          animated away, so an inline bar would land somewhere unrelated. */}
      {undo ? (
        <Animated.View
          className="absolute inset-x-5 bottom-8"
          layout={LinearTransition.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          <Surface
            radius="md"
            glass
            className="flex-row items-center gap-3 px-4 py-3 shadow-pop"
          >
            <Icon name="check" size={14} color="--success" />
            <Text className="flex-1 text-[13px] text-foreground" numberOfLines={1}>
              {undo.name} reviewed
            </Text>
            <Pressable
              onPress={applyUndo}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="active:opacity-70"
            >
              <Text className="text-[13px] font-semibold text-primary">Undo</Text>
            </Pressable>
          </Surface>
        </Animated.View>
      ) : null}
    </View>
  );
}
