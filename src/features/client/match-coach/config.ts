import type { Step } from "@/features/shared/setup";

// Goals & preferences — collected during coach matching so we can pair the
// client with a relevant coach. Moved here from the client profile setup.
export const GOAL_STEPS: Step[] = [
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
