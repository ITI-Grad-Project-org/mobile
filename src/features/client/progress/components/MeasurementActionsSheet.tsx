import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Modal } from "react-native";

import { useDeleteMeasurementMutation } from "@/api/endpoints/measurements.endpoints";
import type { Measurement } from "@/api/types";
import { Icon } from "@/shared/ui/Icon";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Pressable, SafeAreaView, Text, View } from "@/tw";
import { formatShortDate } from "../lib/measurements";

export function MeasurementActionsSheet({
  measurement,
  onClose,
}: {
  measurement: Measurement | null;
  onClose: () => void;
}) {
  const { tenantId } = useActiveTenant();
  const [deleteMeasurement] = useDeleteMeasurementMutation();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = measurement !== null;

  const [trackedId, setTrackedId] = useState<string | null>(null);
  const currentId = measurement?.id ?? null;
  if (currentId !== trackedId) {
    setTrackedId(currentId);
    setConfirming(false);
    setBusy(false);
    setError(null);
  }

  const close = () => {
    if (busy) return;
    onClose();
  };

  const openEdit = () => {
    if (!measurement) return;
    onClose();
    router.push({ pathname: "/(client)/measurement", params: { id: measurement.id } });
  };

  const confirmDelete = async () => {
    if (!measurement || !tenantId) {
      setError("No active coach selected.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteMeasurement({ id: measurement.id, tenantId }).unwrap();
      onClose();
    } catch (e: any) {
      setError(e?.data?.message || e?.message || "Couldn't delete. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <Pressable onPress={close} className="flex-1 justify-end bg-black/40">
        <Pressable className="rounded-t-3xl bg-background pt-2">
          <SafeAreaView edges={["bottom"]}>
            <View className="items-center pt-1">
              <View className="h-1.5 w-10 rounded-full bg-border" />
            </View>

            <View className="items-center gap-1 px-6 pb-2 pt-4">
              <Text className="text-[17px] font-bold text-foreground">
                {confirming ? "Delete this log?" : "Measurement log"}
              </Text>
              <Text className="text-[13px] text-muted-foreground">
                {measurement ? formatShortDate(measurement.measuredAt) : ""}
                {measurement?.weightKg !== undefined ? ` · ${measurement.weightKg} kg` : ""}
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
                    disabled={busy}
                    className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-destructive shadow-soft active:opacity-90 disabled:opacity-60"
                  >
                    {busy ? <ActivityIndicator color="white" /> : null}
                    <Text className="text-[15px] font-semibold text-white">Delete log</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirming(false)}
                    disabled={busy}
                    className="h-14 items-center justify-center rounded-2xl bg-secondary active:opacity-90 disabled:opacity-60"
                  >
                    <Text className="text-[15px] font-semibold text-foreground">Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={openEdit}
                    className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90"
                  >
                    <Icon name="pencil" size={16} color="--primary-foreground" />
                    <Text className="text-[15px] font-semibold text-primary-foreground">Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirming(true)}
                    className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-destructive/10 active:opacity-80"
                  >
                    <Icon name="trash" size={16} color="--destructive" />
                    <Text className="text-[15px] font-semibold text-destructive">Delete</Text>
                  </Pressable>
                  <Pressable
                    onPress={close}
                    className="h-14 items-center justify-center rounded-2xl bg-secondary active:opacity-90"
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
