import { useGetClientsQuery } from "@/api/endpoints/clients.endpoints";
import { useListInvitationsQuery } from "@/api/endpoints/invitations.endpoints";
import { useListTenantJoinRequestsQuery } from "@/api/endpoints/joinRequests.endpoints";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import { Image } from "@/tw/image";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useState } from "react";
import { ActivityIndicator } from "react-native";

import { ClientDetailSheet } from "../components/ClientDetailSheet";
import { InvitationCard } from "../components/InvitationCard";
import { InviteClientSheet } from "../components/InviteClientSheet";
import { JoinRequestCard } from "../components/JoinRequestCard";

const LIQUID_GLASS = isLiquidGlassAvailable();

type FilterStatus = "All" | "Active" | "Pending";

export function ClientsScreen() {
  const { tenantId } = useActiveTenant();

  const [filter, setFilter] = useState<FilterStatus>("All");
  const [search, setSearch] = useState("");
  const [activeClient, setActiveClient] = useState<any | null>(null);
  const [showInviteSheet, setShowInviteSheet] = useState(false);

  // Fetch clients, invitations, and join requests
  const {
    data: clients,
    isLoading: isClientsLoading,
    isError: isClientsError,
    refetch: refetchClients,
  } = useGetClientsQuery({ tenantId: tenantId! }, { skip: !tenantId });

  const { data: invitations } = useListInvitationsQuery(
    { tenantId: tenantId! },
    { skip: !tenantId }
  );

  const { data: joinRequests } = useListTenantJoinRequestsQuery(
    { tenantId: tenantId! },
    { skip: !tenantId }
  );

  const pendingInvitations = invitations || [];
  const pendingRequests = joinRequests || [];
  const clientList = clients || [];

  const totalClientsCount = clientList.length;
  const pendingCount = pendingInvitations.length + pendingRequests.length;

  // Filter client roster
  const filteredClients = clientList.filter((c: any) => {
    const cObj = c.client || c;
    const firstName = cObj.firstName || c.firstName || "";
    const lastName = cObj.lastName || c.lastName || "";
    const email = cObj.email || c.email || "";
    const searchTarget = `${firstName} ${lastName} ${email}`.toLowerCase();
    return searchTarget.includes(search.toLowerCase());
  });

  const isLoading = isClientsLoading;

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
            <Text className="text-[26px] font-bold tracking-tight text-foreground">Clients</Text>
            <Text className="text-[13.5px] text-muted-foreground mt-0.5">
              {totalClientsCount} total client{totalClientsCount !== 1 ? "s" : ""}
              {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowInviteSheet(true)}
            className="h-10 w-10 justify-center items-center rounded-full bg-primary shadow-soft active:opacity-85"
          >
            <Text className="text-primary-foreground text-lg font-bold">+</Text>
          </Pressable>
        </View>

        {/* Search & Filter bar */}
        {(() => {
          const searchControls = (
            <>
              <Icon name="search" size={16} color="--muted-foreground" />
              <TextInput
                placeholder="Search clients…"
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

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-x-2 pb-1"
        >
          {(["All", "Active", "Pending"] as FilterStatus[]).map((s) => (
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
                {s} {s === "Pending" && pendingCount > 0 ? `(${pendingCount})` : ""}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Loading State */}
        {isLoading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="text-[13px] text-muted-foreground mt-3">Loading clients…</Text>
          </View>
        ) : isClientsError ? (
          <View className="py-10 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 p-4">
            <Text className="text-[14px] font-medium text-destructive">Failed to load clients</Text>
            <Pressable
              onPress={() => refetchClients()}
              className="mt-3 rounded-xl bg-destructive px-4 py-2"
            >
              <Text className="text-[12px] font-semibold text-destructive-foreground">Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-y-4">
            {/* Pending Requests & Invitations (shown when "All" or "Pending" filter is active) */}
            {(filter === "All" || filter === "Pending") &&
              (pendingRequests.length > 0 || pendingInvitations.length > 0) ? (
              <View className="gap-y-3">
                <Text className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Pending Actions ({pendingCount})
                </Text>

                {/* Join Requests */}
                {pendingRequests.map((req: any) => (
                  <JoinRequestCard key={req.id} request={req} tenantId={tenantId!} />
                ))}

                {/* Email Invitations */}
                {pendingInvitations.map((inv: any) => (
                  <InvitationCard key={inv.id} invitation={inv} tenantId={tenantId!} />
                ))}
              </View>
            ) : null}

            {/* Client Roster List (shown when "All" or "Active" filter is active) */}
            {filter === "All" || filter === "Active" ? (
              <View className="gap-y-3">
                {(filter === "All" && pendingCount > 0) ? (
                  <Text className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground px-1 mt-1">
                    Client Roster ({filteredClients.length})
                  </Text>
                ) : null}

                {filteredClients.length > 0 ? (
                  filteredClients.map((c: any) => {
                    const cObj = c.client || c;
                    const firstName = cObj.firstName || c.firstName;
                    const lastName = cObj.lastName || c.lastName;
                    const fullName =
                      firstName || lastName
                        ? `${firstName || ""} ${lastName || ""}`.trim()
                        : cObj.name || cObj.email || c.name || c.email || "Client";
                    const email = cObj.email || c.email || "";
                    const avatarUrl = cObj.avatarUrl || c.avatarUrl || c.avatar;
                    const status = c.status || c.membershipStatus || "Active";

                    return (
                      <Card
                        key={c.id || c.membershipId}
                        interactive
                        onPress={() => setActiveClient(c)}
                        className="flex-row items-center gap-x-3 p-3"
                        glass
                      >
                        {avatarUrl ? (
                          <Image
                            source={{ uri: avatarUrl }}
                            className="h-12 w-12 shrink-0 rounded-2xl object-cover"
                          />
                        ) : (
                          <View className="h-12 w-12 shrink-0 rounded-2xl bg-secondary items-center justify-center">
                            <Icon name="user" size={20} color="--muted-foreground" />
                          </View>
                        )}

                        <View className="min-w-0 flex-1">
                          <View className="flex-row items-center gap-x-2">
                            <Text
                              className="truncate text-[15px] font-semibold text-foreground"
                              numberOfLines={1}
                            >
                              {fullName}
                            </Text>
                          </View>

                          <Text className="text-[12px] text-muted-foreground mt-0.5" numberOfLines={1}>
                            {email || status}
                          </Text>
                        </View>

                        <View className="shrink-0 items-end justify-center">
                          <View className="rounded-full bg-mint px-2 py-0.5">
                            <Text className="text-[10px] font-bold text-mint-ink uppercase">
                              {status}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    );
                  })
                ) : filter === "Active" || pendingCount === 0 ? (
                  <View className="py-12 items-center justify-center">
                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-secondary mb-3">
                      <Icon name="users" size={24} color="--muted-foreground" />
                    </View>
                    <Text className="text-[14px] font-medium text-foreground">No clients found</Text>
                    <Text className="text-[12px] text-muted-foreground mt-1 text-center">
                      Tap {`"+"`} above to invite your first client by email.
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Invite Client Sheet */}
      {tenantId ? (
        <InviteClientSheet
          visible={showInviteSheet}
          tenantId={tenantId}
          onClose={() => setShowInviteSheet(false)}
        />
      ) : null}

      {/* Detail drawer sheet */}
      {tenantId ? (
        <ClientDetailSheet
          client={activeClient}
          tenantId={tenantId}
          onClose={() => setActiveClient(null)}
        />
      ) : null}
    </View>
  );
}
