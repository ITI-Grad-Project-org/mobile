import { useGetConversationsQuery } from "@/api/endpoints/chat.endpoints";
import { useGetClientsQuery } from "@/api/endpoints/clients.endpoints";
import { useGetCoachProfileQuery } from "@/api/endpoints/profile.endpoints";
import { useListProgramsQuery } from "@/api/endpoints/programs.endpoints";
import { clientName, formatThreadTime } from "@/features/shared/messaging/format";
import type { ConversationSummary } from "@/features/shared/messaging/types";
import { resolveCoachFields } from "@/lib/coach";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { addIsoDays, todayIso } from "@/shared/utils/date";
import { useCallback, useMemo } from "react";

/** Avatar tints for the activity feed, cycled by position. */
const FEED_COLORS = ["mint", "lilac", "sky", "peach"] as const;

/** Newest-first activity rows shown under "Today's activity". */
export interface FeedItem {
  key: string;
  name: string;
  action: string;
  time: string;
  color: (typeof FEED_COLORS)[number];
}

export interface CoachHomeData {
  /** "Friday morning" — device clock, not the server. */
  greeting: string;
  /** First name for the header; empty when the profile hasn't loaded. */
  firstName: string;
  /** Full name, used for the monogram fallback. */
  fullName: string;
  avatarUrl?: string;
  activeClients: number;
  /** Threads with at least one message the coach hasn't read. */
  unreadThreads: number;
  /** Up to three client names behind those unread threads. */
  unreadNames: string[];
  plansEndingSoon: number;
  feed: FeedItem[];
  isLoading: boolean;
  /** True while any query is in flight, including background refetches. */
  isFetching: boolean;
  isError: boolean;
  refetchAll: () => void;
}

function partOfDay(hour: number): string {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/**
 * The programs list is typed `any[]` and the DTOs only guarantee `startDate` +
 * `durationWeeks` — there is no `endDate` field — so derive the end day and
 * skip anything missing either part rather than assuming a shape.
 */
function endsWithinAWeek(program: any, today: string, weekOut: string): boolean {
  const startDate = program?.startDate;
  const durationWeeks = Number(program?.durationWeeks);
  if (typeof startDate !== "string" || !Number.isFinite(durationWeeks)) return false;

  const end = addIsoDays(startDate.slice(0, 10), Math.round(durationWeeks * 7));
  if (!end) return false;
  return end >= today && end <= weekOut;
}

function lastMessageAt(c: ConversationSummary): number {
  const iso = c.lastMessage?.createdAt;
  const ms = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Everything the coach Home screen shows that the API can actually answer.
 *
 * There is no dashboard/aggregate endpoint, so each number is composed here
 * from the same per-resource queries the Clients and Inbox screens already use
 * — which is what keeps the counts consistent across those screens.
 */
export function useCoachHomeData(): CoachHomeData {
  const { tenantId } = useActiveTenant();
  const skip = { skip: !tenantId };

  const profile = useGetCoachProfileQuery(undefined, skip);
  const clients = useGetClientsQuery({ tenantId: tenantId ?? "" }, skip);
  const conversations = useGetConversationsQuery({ tenantId: tenantId ?? "" }, skip);
  const programs = useListProgramsQuery({ status: "published" }, skip);

  const coach = useMemo(() => resolveCoachFields(profile.data), [profile.data]);

  const greeting = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
    return `${weekday} ${partOfDay(now.getHours())}`;
  }, []);

  const threads = useMemo(() => conversations.data ?? [], [conversations.data]);

  const unread = useMemo(() => threads.filter((c) => (c.unreadCount || 0) > 0), [threads]);

  const unreadNames = useMemo(() => unread.slice(0, 3).map(clientName), [unread]);

  const plansEndingSoon = useMemo(() => {
    const today = todayIso();
    const weekOut = addIsoDays(today, 7) ?? today;
    return (programs.data ?? []).filter((p) => endsWithinAWeek(p, today, weekOut)).length;
  }, [programs.data]);

  const feed = useMemo<FeedItem[]>(() => {
    // Messages are the only per-client activity the API exposes to a coach —
    // there is no coach-visible workout/check-in feed endpoint yet.
    return threads
      .filter((c) => c.lastMessage)
      .slice()
      .sort((a, b) => lastMessageAt(b) - lastMessageAt(a))
      .slice(0, 4)
      .map((c, i) => ({
        key: c.clientId,
        name: clientName(c),
        action:
          c.lastMessage!.senderType === "coach"
            ? `You: ${c.lastMessage!.body}`
            : c.lastMessage!.body,
        time: formatThreadTime(c.lastMessage!.createdAt),
        color: FEED_COLORS[i % FEED_COLORS.length],
      }));
  }, [threads]);

  const refetchAll = useCallback(() => {
    if (!tenantId) return;
    profile.refetch();
    clients.refetch();
    conversations.refetch();
    programs.refetch();
    // Refetch identities are stable per query, so this only re-creates when the
    // tenant changes — which is exactly when the caches change too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return {
    greeting,
    firstName: coach.firstName ?? "",
    fullName: coach.name ?? "",
    avatarUrl: coach.avatarUrl,
    activeClients: (clients.data ?? []).length,
    unreadThreads: unread.length,
    unreadNames,
    plansEndingSoon,
    feed,
    isLoading:
      profile.isLoading || clients.isLoading || conversations.isLoading || programs.isLoading,
    isFetching:
      profile.isFetching || clients.isFetching || conversations.isFetching || programs.isFetching,
    isError: profile.isError || clients.isError || conversations.isError || programs.isError,
    refetchAll,
  };
}
