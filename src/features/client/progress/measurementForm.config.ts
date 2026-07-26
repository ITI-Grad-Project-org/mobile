import type { Field, Step } from "@/features/shared/setup";

/** A tape measurement in cm — decimals allowed, clamped to a plausible range. */
function cm(key: string, label: string): Field {
  return {
    key,
    label,
    type: "number",
    unit: "cm",
    placeholder: "0",
    decimal: true,
    min: 1,
    max: 300,
    maxLength: 5,
  };
}

// Body-measurement check-in. Fields map 1:1 onto `CreateMeasurementDto`
// (numeric fields carry a trailing unit; `photos` is the multi-image field).
export const MEASUREMENT_STEPS: Step[] = [
  {
    title: "Weight & body fat",
    subtitle: "Log today's numbers. Everything is optional — fill what you have.",
    fields: [
      { key: "measuredAt", label: "Date", type: "date" },
      {
        key: "weightKg",
        label: "Weight",
        type: "number",
        unit: "kg",
        placeholder: "0.0",
        decimal: true,
        min: 20,
        max: 400,
        maxLength: 6,
      },
      {
        key: "bodyFatPct",
        label: "Body fat",
        type: "number",
        unit: "%",
        placeholder: "0.0",
        decimal: true,
        min: 1,
        max: 70,
        maxLength: 4,
      },
    ],
  },
  {
    title: "Measurements",
    subtitle: "Tape measurements, in centimetres.",
    fields: [
      cm("chestCm", "Chest"),
      cm("waistCm", "Waist"),
      cm("hipsCm", "Hips"),
      cm("armCm", "Arm"),
      cm("thighCm", "Thigh"),
    ],
  },
  {
    title: "Progress photos",
    subtitle: "Optional. Front / side / back — however you like to track.",
    fields: [{ key: "photos", label: "Photos", type: "images" }],
  },
];
