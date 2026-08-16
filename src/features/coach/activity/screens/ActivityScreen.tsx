import { useGetAnalyticsActivityQuery } from "@/api/endpoints/analytics.endpoints";
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
import { useMemo } from "react";
import { ActivityIndicator, RefreshControl } from "react-native";

/**
 * The full feed behind Home's "See all".
 *
 * 200 is the endpoint's hard ceiling and it rejects anything above rather than
 * clamping, so this asks for 50 — the endpoint's own default page. Paging is by
 * date window, not by offset; a coach who needs to go further back needs a
 * range picker, not a "load more".
 */
const FEED_LIMIT = 50;

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

  const isLoading = !tenantId || feed.isLoading;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-y-4 px-5 pt-4 pb-30"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={feed.isFetching && !isLoading}
          onRefresh={() => feed.refetch()}
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
        <Text className="font-display text-[24px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
          Activity
        </Text>
      </View>

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
      ) : rows.length === 0 ? (
        <Surface radius="lg" className="items-center gap-1 py-10">
          <Text className="text-sm font-semibold text-foreground">
            Nothing logged yet
          </Text>
          <Text className="text-xs text-muted-foreground">
            Workouts, meals and check-ins land here.
          </Text>
        </Surface>
      ) : (
        <Surface radius="lg">
          {/* Order is the API's — newest by loggedAt, never re-sorted. */}
          {rows.map((row, i) => (
            <ActivityRow
              key={row.id}
              row={row}
              divided={i > 0}
              avatarUrl={row.membershipId ? avatars.get(row.membershipId) : undefined}
            />
          ))}
        </Surface>
      )}
    </ScrollView>
  );
}
