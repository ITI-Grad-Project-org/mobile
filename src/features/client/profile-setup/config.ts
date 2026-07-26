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
      {
        key: "phone",
        label: "Phone",
        type: "tel",
        placeholder: "+201000354540",
        helper: "Include your country code, e.g. +20 for Egypt.",
      },
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
      {
        key: "weight",
        label: "Weight",
        type: "number",
        placeholder: "75",
        unit: "kg",
        decimal: true,
        min: 20,
        max: 400,
        maxLength: 6,
      },
      {
        key: "height",
        label: "Height",
        type: "number",
        placeholder: "178",
        unit: "cm",
        min: 80,
        max: 260,
        maxLength: 3,
      },
    ],
  },
];
