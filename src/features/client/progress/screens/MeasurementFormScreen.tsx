import { router } from "expo-router";

import { useCreateMeasurementMutation } from "@/api/endpoints/measurements.endpoints";
import type { CreateMeasurementDto } from "@/api/types";
import { SignupFlow } from "@/features/shared/setup";
import type { ProfileData } from "@/features/shared/setup";
import { resolveImages } from "@/features/shared/setup/uploadImages";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
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

export function MeasurementFormScreen() {
  const { tenantId } = useActiveTenant();
  const [createMeasurement] = useCreateMeasurementMutation();

  const handleSubmit = async (data: ProfileData) => {
    if (!tenantId) throw new Error("No active coach selected.");

    const photos = await resolveImages(data.photos, "client");

    const body: CreateMeasurementDto = {
      measuredAt: typeof data.measuredAt === "string" && data.measuredAt ? data.measuredAt : todayISO(),
      ...(photos.length ? { photos } : {}),
    };
    for (const key of NUMBER_KEYS) {
      const n = toNumber(data[key]);
      if (n !== undefined) body[key] = n;
    }

    await createMeasurement({ body, tenantId }).unwrap();
  };

  return (
    <SignupFlow
      title="New measurement"
      steps={MEASUREMENT_STEPS}
      showWelcome={false}
      initialData={{ measuredAt: todayISO() }}
      onClose={() => router.back()}
      onSubmit={handleSubmit}
      onDone={() => router.back()}
    />
  );
}
