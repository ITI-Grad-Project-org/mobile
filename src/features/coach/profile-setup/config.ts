import type { Step } from "@/features/shared/setup";

export const COACH_STEPS: Step[] = [
  {
    title: "About you",
    subtitle: "Show clients who you are — this lives on your public profile.",
    fields: [
      { key: "avatar", label: "Profile photo", type: "image" },
      {
        key: "phone",
        label: "Phone",
        type: "tel",
        placeholder: "+201000354540",
        helper: "Include your country code, e.g. +20 for Egypt.",
      },
      {
        key: "age",
        label: "Age",
        type: "number",
        placeholder: "32",
        min: 16,
        max: 100,
        maxLength: 3,
      },
      {
        key: "gender",
        label: "Gender",
        type: "chips",
        multi: false,
        options: ["Female", "Male", "Other"],
      },
      { key: "location", label: "Location", type: "text", placeholder: "Lisbon, PT" },
    ],
  },
  {
    title: "Your craft",
    subtitle: "Where do you shine?",
    fields: [
      {
        key: "specialization",
        label: "Specialization",
        type: "chips",
        options: [
          "Strength",
          "Hypertrophy",
          "Endurance",
          "Weight loss",
          "Mobility",
          "Rehab",
          "Postpartum",
          "Yoga",
          "Nutrition",
        ],
      },
      {
        key: "yoe",
        label: "Years of experience",
        type: "number",
        placeholder: "8",
        min: 0,
        max: 70,
        maxLength: 2,
      },
      {
        key: "experience",
        label: "Career experience",
        type: "textarea",
        placeholder: "Where have you worked, who have you trained?",
      },
    ],
  },
  {
    title: "Certifications",
    subtitle:
      "Upload each certificate with its issue and expiry date — clients trust receipts.",
    fields: [{ key: "certificates", label: "Your certifications", type: "certs" }],
  },
  {
    title: "Proof & portfolio",
    subtitle: "Show clients what you're capable of. All optional.",
    fields: [
      { key: "portfolio", label: "Portfolio URL", type: "url", placeholder: "https://…" },
      { key: "transformations", label: "Transformation photos", type: "images" },
      {
        key: "reviews",
        label: "Featured reviews",
        type: "textarea",
        placeholder: "Quote a couple of client wins",
      },
      {
        key: "bio",
        label: "Short bio",
        type: "textarea",
        placeholder: "A paragraph that makes a client want to work with you.",
      },
    ],
  },
  {
    title: "Availability & pricing",
    subtitle: "Set the basics — fine-tune later.",
    fields: [
      {
        key: "offline",
        label: "Available offline?",
        type: "chips",
        multi: false,
        options: ["Yes", "No", "Hybrid"],
      },
      {
        key: "hours",
        label: "Availability hours",
        type: "hours",
        helper: "Pick the days you coach, then your working hours.",
      },
      {
        key: "priceMin",
        label: "Price from",
        type: "number",
        placeholder: "120",
        unit: "$",
        min: 0,
        max: 100000,
        maxLength: 6,
      },
      {
        key: "priceMax",
        label: "Price to",
        type: "number",
        placeholder: "320",
        unit: "$",
        min: 0,
        max: 100000,
        maxLength: 6,
      },
    ],
  },
];
