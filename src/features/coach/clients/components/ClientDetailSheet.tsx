import {
  useGetClientQuery,
  useRemoveClientMutation,
} from "@/api/endpoints/clients.endpoints";
import { useRevokeInvitationMutation } from "@/api/endpoints/invitations.endpoints";
import { useListClientMeasurementsQuery } from "@/api/endpoints/measurements.endpoints";
import { CheckinEntryRow } from "@/features/coach/checkins/components/CheckinEntryRow";
import { useCheckinReviews } from "@/features/coach/checkins/hooks/useCheckinReviews";
import { extractMeasurements } from "@/features/shared/measurements/stats";
import { sfx } from "@/lib/sfx";
import { router } from "expo-router";
import { useClientAnalytics } from "../hooks/useClientAnalytics";
import { ClientStatsCard } from "./ClientStatsCard";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Platform } from "react-native";

/** Enough history to read the trend without turning the sheet into a screen. */
const CHECKIN_PREVIEW = 5;

interface ClientDetailSheetProps {
  client: any | null;
  tenantId: string;
  onClose: () => void;
}
export function ClientDetailSheet({ client, tenantId, onClose }: ClientDetailSheetProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clientUserId = client?.client?.id;
  const membershipId = client?.id || client?.membershipId || "";
  const fetchId = clientUserId || membershipId;

  const { data: clientDetails, isLoading: isFetching } = useGetClientQuery(
    { id: fetchId, tenantId },
    { skip: !fetchId || !tenantId }
  );

  // Invited and requested memberships have no training history, so the card
  // would be an empty box on every pending row. /analytics/* is keyed by
  // MEMBERSHIP id — passing clientUserId here 404s.
  const hasJoined = client?.status !== "invited" && client?.status !== "requested";
  const stats = useClientAnalytics(hasJoined ? membershipId : undefined, tenantId);

  // Check-in history, newest first. Keyed by the client's USER id like every
  // other measurements read; a pending membership has none to fetch.
  const measurements = useListClientMeasurementsQuery(
    { clientId: clientUserId ?? "", tenantId, limit: CHECKIN_PREVIEW },
    { skip: !clientUserId || !tenantId || !hasJoined }
  );
  const reviews = useCheckinReviews();

  const checkins = useMemo(
    () =>
      [...extractMeasurements(measurements.data)]
        .filter((m) => typeof m?.measuredAt === "string")
        .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt)),
    [measurements.data]
  );
  const latestCheckin = checkins[0];
  const checkinUnread =
    !!clientUserId &&
    !!latestCheckin &&
    !reviews.isReviewed(clientUserId, latestCheckin.measuredAt);

  const [removeClient, { isLoading: isRemoving }] = useRemoveClientMutation();
  const [revokeInvitation, { isLoading: isRevoking }] = useRevokeInvitationMutation();

  const activeClient = clientDetails || client;

  const handleClose = () => {
    setConfirmDelete(false);
    setErrorMsg(null);
    onClose();
  };

  const handleRemove = async () => {
    if (!client || !tenantId) return;

    setErrorMsg(null);
    const targetUserId = client?.client?.id;
    const targetMembershipId = client?.id || client?.membershipId;
    const isInvited = client?.status === "invited";

    try {
      if (isInvited && targetMembershipId) {
        // Try revoking invitation first if status is invited
        try {
          await revokeInvitation({ id: targetMembershipId, tenantId }).unwrap();
        } catch {
          // Fallback to remove client
          const removeId = targetUserId || targetMembershipId;
          await removeClient({ id: removeId, tenantId }).unwrap();
        }
      } else {
        // Try removing client using client.user.id first, fallback to membership.id
        const primaryId = targetUserId || targetMembershipId;
        try {
          await removeClient({ id: primaryId, tenantId }).unwrap();
        } catch (err: any) {
          if (targetUserId && targetMembershipId && targetUserId !== targetMembershipId) {
            await removeClient({ id: targetMembershipId, tenantId }).unwrap();
          } else {
            throw err;
          }
        }
      }

      sfx.success();
      handleClose();
    } catch (err: any) {
      sfx.error();
      const msg =
        err?.data?.message || err?.error || "Failed to remove client from tenant.";
      setErrorMsg(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  if (!client) return null;

  const isIOS = Platform.OS === "ios";
  const cObj = activeClient?.client || activeClient;

  const firstName = cObj?.firstName || activeClient?.firstName;
  const lastName = cObj?.lastName || activeClient?.lastName;
  const fullName =
    firstName || lastName
      ? `${firstName || ""} ${lastName || ""}`.trim()
      : cObj?.name || cObj?.email || activeClient?.name || activeClient?.email || "Client Profile";

  const email = cObj?.email || activeClient?.email;
  const phone = cObj?.phone || activeClient?.phone;
  const gender = cObj?.gender || activeClient?.gender;
  const dateOfBirth = cObj?.dateOfBirth || activeClient?.dateOfBirth;
  const heightCm = cObj?.heightCm || activeClient?.heightCm;
  const weightKg = cObj?.weightKg || activeClient?.weightKg;
  const avatarUrl = cObj?.avatarUrl || activeClient?.avatarUrl || activeClient?.avatar;
  const status = activeClient?.status || activeClient?.membershipStatus || "Active";
  const requestMessage = activeClient?.requestMessage || client?.requestMessage;

  const isLoadingAction = isRemoving || isRevoking;

  const content = (
    <View className="flex-1 bg-card px-5 pt-3 pb-8">
      {/* Handle */}
      <View className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

      {/* Header */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-x-3 flex-1">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="h-14 w-14 rounded-2xl object-cover"
            />
          ) : (
            <View className="h-14 w-14 rounded-2xl bg-secondary items-center justify-center">
              <Icon name="user" size={24} color="--muted-foreground" />
            </View>
          )}

          <View className="flex-1 min-w-0">
            <Text className="text-[18px] font-bold leading-tight text-foreground truncate" numberOfLines={1}>
              {fullName}
            </Text>
            {email ? (
              <Text className="text-[12.5px] text-muted-foreground mt-0.5 truncate" numberOfLines={1}>
                {email}
              </Text>
            ) : null}
            <View className="flex-row items-center gap-x-2 mt-1.5">
              <View className="rounded-full bg-mint px-2 py-0.5">
                <Text className="text-[10px] font-bold text-mint-ink uppercase">{status}</Text>
              </View>
            </View>
          </View>
        </View>

        <GlassButton
          onPress={handleClose}
          className="h-9 w-9 justify-center items-center rounded-full bg-secondary active:opacity-75"
        >
          <Icon name="x" size={16} color="--muted-foreground" />
        </GlassButton>
      </View>

      {isFetching ? (
        <View className="py-12 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView className="flex-1 mt-5" showsVerticalScrollIndicator={false}>
          {/* Details Card */}
          <View className="rounded-2xl border border-border bg-secondary/30 p-4 gap-y-3">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Client Details
            </Text>

            {email ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-muted-foreground">Email</Text>
                <Text className="text-[13.5px] font-semibold text-foreground">
                  {email}
                </Text>
              </View>
            ) : null}

            {phone ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-muted-foreground">Phone</Text>
                <Text className="text-[13.5px] font-semibold text-foreground">
                  {phone}
                </Text>
              </View>
            ) : null}

            {gender ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-muted-foreground">Gender</Text>
                <Text className="text-[13.5px] font-semibold text-foreground capitalize">
                  {gender}
                </Text>
              </View>
            ) : null}

            {dateOfBirth ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-muted-foreground">Date of Birth</Text>
                <Text className="text-[13.5px] font-semibold text-foreground">
                  {dateOfBirth}
                </Text>
              </View>
            ) : null}

            {heightCm ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-muted-foreground">Height</Text>
                <Text className="text-[13.5px] font-semibold text-foreground">
                  {heightCm} cm
                </Text>
              </View>
            ) : null}

            {weightKg ? (
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-muted-foreground">Weight</Text>
                <Text className="text-[13.5px] font-semibold text-foreground">
                  {weightKg} kg
                </Text>
              </View>
            ) : null}
          </View>

          {hasJoined ? (
            <ClientStatsCard
              adherence={stats.adherence}
              progress={stats.progress}
              isLoading={stats.isLoading}
              isError={stats.isError}
            />
          ) : null}

          {/* Check-in History */}
          {hasJoined && clientUserId ? (
            <View className="mt-4 rounded-2xl border border-border bg-secondary/30 overflow-hidden">
              <View className="flex-row items-center gap-x-2 px-4 pt-4 pb-1">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Check-ins
                </Text>
                {checkinUnread ? (
                  <View className="rounded-full bg-primary/12 px-2 py-0.5">
                    <Text className="text-[9.5px] font-bold uppercase tracking-wider text-primary">
                      New
                    </Text>
                  </View>
                ) : null}
                <View className="flex-1" />
                {checkins.length > 0 ? (
                  <Pressable
                    onPress={() => {
                      // The sheet is a Modal — pushing under it would leave the
                      // route stacked behind an open sheet.
                      handleClose();
                      router.push({
                        pathname: "/(coach)/check-ins/[clientId]",
                        params: {
                          clientId: clientUserId,
                          membershipId,
                          name: fullName,
                          avatarUrl: avatarUrl ?? "",
                        },
                      });
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className="active:opacity-70"
                  >
                    <Text className="text-[12px] font-semibold text-primary">View all</Text>
                  </Pressable>
                ) : null}
              </View>

              {measurements.isLoading ? (
                <View className="py-6 items-center">
                  <ActivityIndicator size="small" />
                </View>
              ) : checkins.length === 0 ? (
                <Text className="px-4 pb-4 pt-1 text-[12.5px] text-muted-foreground">
                  No check-ins logged yet.
                </Text>
              ) : (
                <>
                  {checkins.map((entry, i) => (
                    <CheckinEntryRow
                      key={entry.id ?? `${clientUserId}-${entry.measuredAt}`}
                      entry={entry}
                      previous={checkins[i + 1]}
                      latest={i === 0}
                      divided={i > 0}
                    />
                  ))}

                  {checkinUnread && latestCheckin ? (
                    <Pressable
                      onPress={() => {
                        reviews.markReviewed(clientUserId, latestCheckin.measuredAt);
                        sfx.success();
                      }}
                      className="flex-row items-center justify-center gap-x-2 border-t border-border py-3 active:opacity-70"
                    >
                      <Icon name="check" size={14} color="--primary" />
                      <Text className="text-[13px] font-semibold text-primary">
                        Mark reviewed
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              )}
            </View>
          ) : null}

          {/* Request Message Section */}
          {requestMessage ? (
            <View className="mt-4 rounded-2xl bg-secondary/50 p-4 border border-border/40">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Join Request Message
              </Text>
              <Text className="text-[13px] text-foreground leading-relaxed italic">
                {`"${requestMessage}"`}
              </Text>
            </View>
          ) : null}

          {/* Remove Client Section */}
          <View className="mt-6 pt-4 border-t border-border">
            {confirmDelete ? (
              <View className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 gap-y-3">
                <Text className="text-[14px] font-bold text-destructive">
                  Remove {fullName} from tenant?
                </Text>
                <Text className="text-[12px] text-muted-foreground">
                  This client will lose access to your training programs and tenant features.
                </Text>

                {errorMsg ? (
                  <View className="rounded-xl bg-destructive/20 p-2.5">
                    <Text className="text-[12px] font-medium text-destructive">{errorMsg}</Text>
                  </View>
                ) : null}

                <View className="flex-row items-center gap-x-2 pt-1">
                  <Pressable
                    onPress={handleRemove}
                    disabled={isLoadingAction}
                    className="flex-1 flex-row justify-center items-center rounded-xl bg-destructive py-2.5 active:opacity-85"
                  >
                    {isLoadingAction ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text className="text-[13px] font-semibold text-destructive-foreground">
                        Confirm Remove
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setConfirmDelete(false);
                      setErrorMsg(null);
                    }}
                    disabled={isLoadingAction}
                    className="flex-1 justify-center items-center rounded-xl bg-secondary py-2.5 active:opacity-85"
                  >
                    <Text className="text-[13px] font-semibold text-foreground">Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setConfirmDelete(true)}
                className="flex-row items-center justify-center gap-x-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-3.5 active:bg-destructive/10"
              >
                <Icon name="user-minus" size={16} color="--destructive" />
                <Text className="text-[13.5px] font-semibold text-destructive">
                  Remove Client from Tenant
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );

  if (isIOS) {
    return (
      <Modal
        visible={client !== null}
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
      visible={client !== null}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={handleClose} />
        <View className="min-h-[70%] w-full overflow-hidden shadow-pop bg-card rounded-t-3xl">
          {content}
        </View>
      </View>
    </Modal>
  );
}
