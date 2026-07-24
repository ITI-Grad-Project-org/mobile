import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Modal } from "react-native";

import { useDeleteIntakeMutation } from "@/api/endpoints/intake.endpoints";
import type { ReduxMembership } from "@/store/membershipsSlice";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, SafeAreaView, Text, View } from "@/tw";

export function CoachActionsSheet({
  membership,
  isActive,
  switching,
  onSwitch,
  onClose,
}: {
  membership: ReduxMembership | null;
  isActive: boolean;
  switching: boolean;
  onSwitch: (tenantId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [deleteIntake] = useDeleteIntakeMutation();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = membership !== null;

  // Reset transient state when the sheet targets a different coach.
  const [trackedId, setTrackedId] = useState<string | null>(null);
  const currentId = membership?.tenantId ?? null;
  if (currentId !== trackedId) {
    setTrackedId(currentId);
    setConfirming(false);
    setBusy(false);
    setError(null);
  }

  const anyBusy = busy || switching;

  const close = () => {
    if (anyBusy) return;
    onClose();
  };

  // Intake is scoped to the active tenant — switch to this coach first if needed.
  const ensureActive = async (tenantId: string) => {
    if (!isActive) await onSwitch(tenantId);
  };

  const doSwitch = async () => {
    if (!membership || anyBusy) return;
    await onSwitch(membership.tenantId);
    onClose();
  };

  const openEdit = async () => {
    if (!membership || anyBusy) return;
    setBusy(true);
    setError(null);
    try {
      await ensureActive(membership.tenantId);
      onClose();
      // Dismiss the Profile modal first — the intake screen is a root-stack
      // route and would otherwise render behind it.
      if (router.canDismiss()) router.dismiss();
      router.push({
        pathname: "/(setup)/intake",
        params: { edit: "1", tenantId: membership.tenantId, coachName: membership.tenantName },
      });
    } catch (e: any) {
      setError(e?.data?.message || e?.message || "Couldn't open intake.");
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!membership) return;
    setBusy(true);
    setError(null);
    try {
      await ensureActive(membership.tenantId);
      await deleteIntake({ tenantId: membership.tenantId }).unwrap();
      onClose();
    } catch (e: any) {
      setError(e?.data?.message || e?.message || "Couldn't delete intake. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable onPress={close} className="flex-1 justify-end bg-black/40">
        <Pressable className="rounded-t-3xl bg-background pt-2">
          <SafeAreaView edges={["bottom"]}>
            <View className="items-center pt-1">
              <View className="h-1.5 w-10 rounded-full bg-border" />
            </View>

            <View className="items-center gap-1 px-6 pb-2 pt-4">
              <Text className="text-[17px] font-bold text-foreground" numberOfLines={1}>
                {confirming ? "Delete intake?" : membership?.tenantName || "Coach"}
              </Text>
              <Text className="text-[13px] text-muted-foreground">
                {confirming
                  ? "This removes your goals & preferences for this coach."
                  : isActive
                    ? "Active coach"
                    : "Tap an action below"}
              </Text>
            </View>

            {error ? (
              <Text className="px-6 pb-1 text-center text-[12px] font-medium text-destructive">
                {error}
              </Text>
            ) : null}

            <View className="gap-3 px-5 pb-4 pt-3">
              {confirming ? (
                <>
                  <Pressable
                    onPress={confirmDelete}
                    disabled={anyBusy}
                    className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-destructive shadow-soft active:opacity-90 disabled:opacity-60"
                  >
                    {anyBusy ? <ActivityIndicator color="white" /> : null}
                    <Text className="text-[15px] font-semibold text-white">Delete intake</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirming(false)}
                    disabled={anyBusy}
                    className="h-14 items-center justify-center rounded-2xl bg-secondary active:opacity-90 disabled:opacity-60"
                  >
                    <Text className="text-[15px] font-semibold text-foreground">Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  {!isActive ? (
                    <Pressable
                      onPress={doSwitch}
                      disabled={anyBusy}
                      className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90 disabled:opacity-60"
                    >
                      {switching ? <ActivityIndicator color="white" /> : (
                        <Icon name="check" size={16} color="--primary-foreground" />
                      )}
                      <Text className="text-[15px] font-semibold text-primary-foreground">
                        Switch to this coach
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    onPress={openEdit}
                    disabled={anyBusy}
                    className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-secondary active:opacity-90 disabled:opacity-60"
                  >
                    {busy ? <ActivityIndicator color="#888" /> : (
                      <Icon name="pencil" size={16} color="--foreground" />
                    )}
                    <Text className="text-[15px] font-semibold text-foreground">Edit intake</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setConfirming(true)}
                    disabled={anyBusy}
                    className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-destructive/10 active:opacity-80 disabled:opacity-60"
                  >
                    <Icon name="trash" size={16} color="--destructive" />
                    <Text className="text-[15px] font-semibold text-destructive">Delete intake</Text>
                  </Pressable>

                  <Pressable
                    onPress={close}
                    disabled={anyBusy}
                    className="h-14 items-center justify-center rounded-2xl bg-secondary active:opacity-90 disabled:opacity-60"
                  >
                    <Text className="text-[15px] font-semibold text-foreground">Cancel</Text>
                  </Pressable>
                </>
              )}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
