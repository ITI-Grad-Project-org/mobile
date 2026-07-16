import type { ToneName } from "@/tw/Tone";

const U = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=80`;

// Mock coach directory for the matchCoach flow (no backend in v1).
export type SearchCoach = {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  planType: "strength" | "yoga" | "weightloss" | "endurance";
  tone: ToneName;
  cover: string;
  rating: number;
  reviews: number;
  yoe: number;
  location: string;
  priceFrom: number;
  bio: string;
  specialties: string[];
};

export const COACHES: SearchCoach[] = [
  {
    id: "c1",
    name: "Marco Lewis",
    avatar: U("photo-1571019613454-1cb2f99b2d8b"),
    specialty: "Strength & hypertrophy",
    planType: "strength",
    tone: "primary",
    cover: U("photo-1581009146145-b5ef050c2e1e"),
    rating: 4.9,
    reviews: 187,
    yoe: 9,
    location: "Lisbon · Online",
    priceFrom: 120,
    bio: "9 yrs in performance coaching. Built 200+ recomp programs.",
    specialties: ["Strength", "Hypertrophy"],
  },
  {
    id: "c2",
    name: "Elena Park",
    avatar: U("photo-1544005313-94ddf0286df2"),
    specialty: "Yoga & mobility",
    planType: "yoga",
    tone: "lilac",
    cover: U("photo-1518611012118-696072aa579a"),
    rating: 4.8,
    reviews: 124,
    yoe: 7,
    location: "Online only",
    priceFrom: 90,
    bio: "Vinyasa & yin teacher. Mobility-first programming.",
    specialties: ["Yoga", "Mobility"],
  },
  {
    id: "c3",
    name: "Jordan Reyes",
    avatar: U("photo-1500648767791-00dcc994a43e"),
    specialty: "Weight loss & nutrition",
    planType: "weightloss",
    tone: "peach",
    cover: U("photo-1517649763962-0c623066013b"),
    rating: 4.95,
    reviews: 312,
    yoe: 11,
    location: "Madrid · Hybrid",
    priceFrom: 150,
    bio: "Sustainable fat loss with no nonsense. NCI Nutrition L2.",
    specialties: ["Weight loss", "Nutrition"],
  },
  {
    id: "c4",
    name: "Daniel Kim",
    avatar: U("photo-1507003211169-0a1dd7228f2d"),
    specialty: "Powerlifting",
    planType: "strength",
    tone: "ink",
    cover: U("photo-1534438327276-14e5300c3a48"),
    rating: 4.9,
    reviews: 256,
    yoe: 10,
    location: "Seoul · Hybrid",
    priceFrom: 140,
    bio: "Competitive PL coach. Big on technique and steady PRs.",
    specialties: ["Strength", "Powerlifting"],
  },
  {
    id: "c5",
    name: "Sofia Anand",
    avatar: U("photo-1521146764736-56c929d59c83"),
    specialty: "Endurance & running",
    planType: "endurance",
    tone: "mint",
    cover: U("photo-1517649763962-0c623066013b"),
    rating: 4.85,
    reviews: 92,
    yoe: 6,
    location: "Online only",
    priceFrom: 80,
    bio: "Marathoner & PT. Loves smart progression and recovery work.",
    specialties: ["Endurance", "Mobility"],
  },
];

/** Filter chips shown above the search results. */
export const SPECIALTY_TAGS = [
  "Strength",
  "Yoga",
  "Hypertrophy",
  "Weight loss",
  "Endurance",
  "Mobility",
  "Nutrition",
];

export const VALID_CODES = ["MARCO2026", "ELENA-YOGA", "UPLY-VIP"];

/** Resolve an invite code to the coach it unlocks, or null if invalid. */
export function coachForCode(raw: string): SearchCoach | null {
  const c = raw.trim().toUpperCase();
  if (!VALID_CODES.includes(c)) return null;
  if (c.startsWith("ELENA")) return COACHES[1];
  if (c.startsWith("UPLY")) return COACHES[2];
  return COACHES[0];
}
