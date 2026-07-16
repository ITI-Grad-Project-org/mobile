import type { Step } from "@/features/shared/setup";

// Steps a new client fills in after onboarding, before matching with a coach.
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
  {
    title: "Goals & health",
    subtitle: "What are you here for? You can refine this later.",
    fields: [
      {
        key: "goal",
        label: "Primary goal",
        type: "chips",
        multi: false,
        options: [
          "Lose fat",
          "Build muscle",
          "Recomp",
          "Endurance",
          "Wellness",
          "Yoga & mobility",
        ],
      },
      {
        key: "injuries",
        label: "Injury record",
        type: "textarea",
        placeholder: "Anything we should know about? (optional)",
      },
      {
        key: "chronic",
        label: "Chronic conditions",
        type: "textarea",
        placeholder: "Diabetes, asthma, etc. (optional)",
      },
    ],
  },
  {
    title: "Preferences",
    subtitle: "Skip if you're not sure — your coach will help.",
    fields: [
      {
        key: "trainingPrefs",
        label: "Training style",
        type: "chips",
        options: ["Strength", "Hypertrophy", "Cardio", "HIIT", "Mobility", "Yoga"],
      },
      {
        key: "foodPrefs",
        label: "Food preferences",
        type: "chips",
        options: [
          "Omnivore",
          "Vegetarian",
          "Vegan",
          "Pescatarian",
          "Halal",
          "Kosher",
          "Gluten-free",
        ],
      },
    ],
  },
];
