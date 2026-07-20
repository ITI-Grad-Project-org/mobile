import type { Step } from "@/features/shared/setup";

// Basic profile a new client fills in right after signup. Goals & preferences
// are collected later, during coach matching — see match-coach/config.ts.
export const CLIENT_STEPS: Step[] = [
  {
    title: "Make it yours",
    subtitle:
      "Profile photo + a couple of basics. All optional — you can edit anytime.",
    fields: [
      { key: "avatar", label: "Profile photo", type: "image" },
      { key: "phone", label: "Phone", type: "tel", placeholder: "+1 555 0123" },
      { key: "birthdate", label: "Birthdate", type: "date" },
      {
        key: "gender",
        label: "Gender",
        type: "chips",
        multi: false,
        options: ["Female", "Male", "Other"],
      },
    ],
  },
  {
    title: "Body basics",
    subtitle: "Helps your future coach personalize your plan.",
    fields: [
      { key: "weight", label: "Weight", type: "number", placeholder: "75", unit: "kg" },
      { key: "height", label: "Height", type: "number", placeholder: "178", unit: "cm" },
    ],
  },
];
