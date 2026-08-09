import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator } from "react-native";

import {
  useCreateMeasurementMutation,
  useGetMeasurementQuery,
  useUpdateMeasurementMutation,
} from "@/api/endpoints/measurements.endpoints";
import type { Measurement, MeasurementFields } from "@/api/types";
import { SignupFlow } from "@/features/shared/setup";
import type { ProfileData } from "@/features/shared/setup";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { todayIso } from "@/shared/utils/date";
import { View } from "@/tw";
import { MEASUREMENT_STEPS } from "../measurementForm.config";

// Numeric metric keys collected by the form. `photos` and `measuredAt` are
// handled separately below.
type NumberKey =
  | "weightKg"
  | "bodyFatPct"
  | "chestCm"
  | "waistCm"
  | "hipsCm"
  | "armCm"
  | "thighCm";

const NUMBER_KEYS: NumberKey[] = [
  "weightKg",
  "bodyFatPct",
  "chestCm",
  "waistCm",
  "hipsCm",
  "armCm",
  "thighCm",
];

function toNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

const todayISO = todayIso;

function buildFields(data: ProfileData): MeasurementFields {
  const fields: MeasurementFields = {
    measuredAt:
      typeof data.measuredAt === "string" && data.measuredAt ? data.measuredAt : todayISO(),
  };
  for (const key of NUMBER_KEYS) {
    const n = toNumber(data[key]);
    if (n !== undefined) fields[key] = n;
  }
  return fields;
}

/** Photo URIs as the picker returns them — already-hosted ones are skipped. */
function photoUris(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((u): u is string => typeof u === "string" && Boolean(u.trim()))
    : [];
}

/** Map a saved measurement back into form values (TextInput needs strings). */
function measurementToFormData(m: Measurement): ProfileData {
  const data: ProfileData = { measuredAt: m.measuredAt, photos: m.photos ?? [] };
  for (const key of NUMBER_KEYS) {
    const v = m[key];
    data[key] = typeof v === "number" ? String(v) : "";
  }
  return data;
}

export function MeasurementFormScreen() {
  const { tenantId } = useActiveTenant();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : undefined;
  const isEdit = Boolean(id);

  const [createMeasurement] = useCreateMeasurementMutation();
  const [updateMeasurement] = useUpdateMeasurementMutation();

  // In edit mode, load the existing log to pre-fill the form.
  const { data: existing, isLoading: loadingExisting } = useGetMeasurementQuery(
    { id: id ?? "", tenantId: tenantId ?? "" },
    { skip: !isEdit || !tenantId }
  );

  const handleSubmit = async (data: ProfileData) => {
    if (!tenantId) throw new Error("No active coach selected.");

    const fields = buildFields(data);
    const photos = photoUris(data.photos);

    if (isEdit && id) {
      await updateMeasurement({ id, fields, photoUris: photos, tenantId }).unwrap();
    } else {
      await createMeasurement({ fields, photoUris: photos, tenantId }).unwrap();
    }
  };

  // Wait for the existing log before mounting the form (SignupFlow captures
  // initialData once on mount).
  if (isEdit && loadingExisting) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const initialData: ProfileData =
    isEdit && existing ? measurementToFormData(existing) : { measuredAt: todayISO() };

  return (
    <SignupFlow
      title={isEdit ? "Edit measurement" : "New measurement"}
      steps={MEASUREMENT_STEPS}
      uploadPersona="client"
      // This route lives inside the `(client)` group, under the AppHeader — the
      // top inset is already spoken for, so only the bottom edge is padded.
      edges={["bottom"]}
      showWelcome={false}
      initialData={initialData}
      onClose={() => router.back()}
      onSubmit={handleSubmit}
      onDone={() => router.back()}
    />
  );
}
