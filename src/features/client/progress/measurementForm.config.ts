import type { Step } from "@/features/shared/setup";

// Body-measurement check-in. Fields map 1:1 onto `CreateMeasurementDto`
// (numeric fields carry a trailing unit; `photos` is the multi-image field).
export const MEASUREMENT_STEPS: Step[] = [
  {
    title: "Weight & body fat",
    subtitle: "Log today's numbers. Everything is optional — fill what you have.",
    fields: [
      { key: "measuredAt", label: "Date", type: "date" },
      { key: "weightKg", label: "Weight", type: "number", unit: "kg", placeholder: "0.0" },
      { key: "bodyFatPct", label: "Body fat", type: "number", unit: "%", placeholder: "0.0" },
    ],
  },
  {
    title: "Measurements",
    subtitle: "Tape measurements, in centimetres.",
    fields: [
      { key: "chestCm", label: "Chest", type: "number", unit: "cm", placeholder: "0" },
      { key: "waistCm", label: "Waist", type: "number", unit: "cm", placeholder: "0" },
      { key: "hipsCm", label: "Hips", type: "number", unit: "cm", placeholder: "0" },
      { key: "armCm", label: "Arm", type: "number", unit: "cm", placeholder: "0" },
      { key: "thighCm", label: "Thigh", type: "number", unit: "cm", placeholder: "0" },
    ],
  },
  {
    title: "Progress photos",
    subtitle: "Optional. Front / side / back — however you like to track.",
    fields: [{ key: "photos", label: "Photos", type: "images" }],
  },
];
