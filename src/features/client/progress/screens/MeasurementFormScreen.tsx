import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator } from "react-native";

import {
  useCreateMeasurementMutation,
  useGetMeasurementQuery,
  useUpdateMeasurementMutation,
} from "@/api/endpoints/measurements.endpoints";
import type { CreateMeasurementDto, Measurement } from "@/api/types";
import { SignupFlow } from "@/features/shared/setup";
import type { ProfileData } from "@/features/shared/setup";
import { resolveImages } from "@/features/shared/setup/uploadImages";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildBody(data: ProfileData, photos: string[]): CreateMeasurementDto {
  const body: CreateMeasurementDto = {
    measuredAt:
      typeof data.measuredAt === "string" && data.measuredAt ? data.measuredAt : todayISO(),
    ...(photos.length ? { photos } : {}),
  };
  for (const key of NUMBER_KEYS) {
    const n = toNumber(data[key]);
    if (n !== undefined) body[key] = n;
  }
  return body;
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

    const photos = await resolveImages(data.photos, "client");
    const body = buildBody(data, photos);

    if (isEdit && id) {
      await updateMeasurement({ id, body, tenantId }).unwrap();
    } else {
      await createMeasurement({ body, tenantId }).unwrap();
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
      showWelcome={false}
      initialData={initialData}
      onClose={() => router.back()}
      onSubmit={handleSubmit}
      onDone={() => router.back()}
    />
  );
}
