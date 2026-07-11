// Centralized dummy data with real image URLs (Unsplash)
const U = (id: string, w = 600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  muscle: string;
  image: string;
  instructions: string[];
};

export const exercises: Exercise[] = [
  {
    id: "1",
    name: "Barbell Back Squat",
    sets: 4,
    reps: "8",
    weight: "80 kg",
    muscle: "Legs",
    image: U("photo-1574680096145-d05b474e2155"),
    instructions: [
      "Set the bar on your upper traps, brace your core.",
      "Sit back and down, knees tracking over toes — 3 sec descent.",
      "Drive through mid-foot and stand explosively, lock out hips.",
      "Keep chest tall throughout; no rounding of the lower back.",
    ],
  },
  {
    id: "2",
    name: "Romanian Deadlift",
    sets: 3,
    reps: "10",
    weight: "70 kg",
    muscle: "Hamstrings",
    image: U("photo-1517836357463-d25dfeac3438"),
    instructions: [
      "Stand tall, bar against thighs, soft knees.",
      "Hinge at the hips, push hips back — bar travels close to legs.",
      "Lower until you feel a deep hamstring stretch.",
      "Drive hips forward to return; squeeze glutes at the top.",
    ],
  },
  {
    id: "3",
    name: "Walking Lunges",
    sets: 3,
    reps: "12 / side",
    weight: "20 kg",
    muscle: "Glutes",
    image: U("photo-1599058917212-d750089bc07e"),
    instructions: [
      "Hold dumbbells at your sides, chest up.",
      "Step forward into a long lunge, back knee just above floor.",
      "Push through the front heel to step into the next lunge.",
      "Keep torso upright — don't let the front knee cave in.",
    ],
  },
  {
    id: "4",
    name: "Leg Press",
    sets: 4,
    reps: "12",
    weight: "140 kg",
    muscle: "Quads",
    image: U("photo-1605296867304-46d5465a13f1"),
    instructions: [
      "Feet shoulder-width on the platform, mid-foot pressure.",
      "Lower under control until knees reach 90°.",
      "Press through the whole foot, don't lock out hard.",
      "Keep lower back glued to the pad.",
    ],
  },
  {
    id: "5",
    name: "Standing Calf Raise",
    sets: 4,
    reps: "15",
    weight: "60 kg",
    muscle: "Calves",
    image: U("photo-1517438476312-10d79c077509"),
    instructions: [
      "Balls of feet on the platform, full stretch at the bottom.",
      "Rise up onto the toes as high as possible — pause 1 sec.",
      "Lower slowly for a 3 sec eccentric.",
      "Keep knees straight but not locked.",
    ],
  },
];

export const yogaExercises: Exercise[] = [
  {
    id: "y1",
    name: "Sun Salutation A",
    sets: 3,
    reps: "5 rounds",
    weight: "Bodyweight",
    muscle: "Full body",
    image: U("photo-1545205597-3d9d02c29597"),
    instructions: [
      "Begin in Mountain pose, palms together at heart.",
      "Inhale arms up, exhale fold forward — lengthen the spine.",
      "Step back to Plank, lower to Chaturanga with elbows in.",
      "Upward Dog inhale, Downward Dog exhale — hold 5 breaths.",
    ],
  },
  {
    id: "y2",
    name: "Warrior II flow",
    sets: 2,
    reps: "8 / side",
    weight: "Bodyweight",
    muscle: "Hips & shoulders",
    image: U("photo-1593810450967-f9c42742e326"),
    instructions: [
      "Step the right foot back, align heel-to-arch.",
      "Bend front knee over ankle, arms parallel to floor.",
      "Soften the shoulders down the back, gaze over front hand.",
      "Hold 5 breaths, transition with control.",
    ],
  },
  {
    id: "y3",
    name: "Pigeon pose",
    sets: 1,
    reps: "2 min / side",
    weight: "Bodyweight",
    muscle: "Hips",
    image: U("photo-1599447421416-3414500d18a5"),
    instructions: [
      "From all fours, bring right knee behind right wrist.",
      "Slide left leg long, square the hips.",
      "Fold forward over the front shin — breathe into the hip.",
      "Switch sides; stay easy on the knee.",
    ],
  },
  {
    id: "y4",
    name: "Bridge → Wheel",
    sets: 3,
    reps: "8",
    weight: "Bodyweight",
    muscle: "Posterior chain",
    image: U("photo-1506629082955-511b1aa562c8"),
    instructions: [
      "Lie on back, feet hip-width, fingertips brush heels.",
      "Press hips up, knit ribs in — drive through heels.",
      "Optional: place hands by ears and press into Wheel.",
      "Lower with control; rest a breath between reps.",
    ],
  },
  {
    id: "y5",
    name: "Savasana + box breath",
    sets: 1,
    reps: "5 min",
    weight: "—",
    muscle: "Recovery",
    image: U("photo-1599901860904-17e6ed7083a0"),
    instructions: [
      "Lie down, palms up, soften the jaw and shoulders.",
      "Inhale 4 · hold 4 · exhale 4 · hold 4.",
      "Stay 5–10 minutes; let the practice integrate.",
    ],
  },
];

export const enduranceExercises: Exercise[] = [
  {
    id: "e1",
    name: "Zone 2 run",
    sets: 1,
    reps: "40 min",
    weight: "@ 140 bpm",
    muscle: "Cardio",
    image: U("photo-1517649763962-0c623066013b"),
    instructions: [
      "Warm up 10 min easy.",
      "Hold a conversational pace — heart rate 65–75% max.",
      "Nasal breathing if possible.",
      "Cool down with 5 min walk + stretches.",
    ],
  },
  {
    id: "e2",
    name: "Tempo intervals",
    sets: 6,
    reps: "3 min on / 2 off",
    weight: "Threshold",
    muscle: "Cardio",
    image: U("photo-1517438476312-10d79c077509"),
    instructions: [
      "Warm up 10 min.",
      "Hold a hard but controlled pace for 3 min.",
      "Easy jog 2 min between.",
      "Cool down 10 min.",
    ],
  },
  {
    id: "e3",
    name: "Core stability",
    sets: 3,
    reps: "45 sec",
    weight: "Bodyweight",
    muscle: "Core",
    image: U("photo-1599058917212-d750089bc07e"),
    instructions: [
      "Plank, side plank, dead bug.",
      "Rotate every 45 sec, 15 sec rest.",
      "3 rounds total.",
    ],
  },
];

export const exerciseLibrary = [
  {
    name: "Back Squat",
    tag: "Legs",
    image: U("photo-1574680096145-d05b474e2155", 200),
  },
  {
    name: "Bench Press",
    tag: "Push",
    image: U("photo-1534438327276-14e5300c3a48", 200),
  },
  {
    name: "Deadlift",
    tag: "Pull",
    image: U("photo-1517836357463-d25dfeac3438", 200),
  },
  {
    name: "Pull-up",
    tag: "Pull",
    image: U("photo-1598971639058-fab3c3109a00", 200),
  },
  {
    name: "Overhead Press",
    tag: "Push",
    image: U("photo-1581009146145-b5ef050c2e1e", 200),
  },
];

export type Meal = {
  id: string;
  time: string;
  name: string;
  kcal: number;
  tag: string;
  image: string;
};

export const meals: Meal[] = [
  {
    id: "m1",
    time: "8:00",
    name: "Protein oats",
    kcal: 480,
    tag: "Breakfast",
    image: U("photo-1517673132405-a56a62b18caf"),
  },
  {
    id: "m2",
    time: "12:30",
    name: "Chicken rice bowl",
    kcal: 720,
    tag: "Lunch",
    image: U("photo-1546069901-ba9599a7e63c"),
  },
  {
    id: "m3",
    time: "16:00",
    name: "Greek yogurt + berries",
    kcal: 280,
    tag: "Snack",
    image: U("photo-1488477181946-6428a0291777"),
  },
  {
    id: "m4",
    time: "19:30",
    name: "Salmon + sweet potato",
    kcal: 660,
    tag: "Dinner",
    image: U("photo-1467003909585-2f8a72700288"),
  },
];

// 18 weeks of streak intensity (0-4) for github-style grid
export const streakGrid: number[] = [
  0, 1, 2, 1, 0, 0, 2, 1, 3, 2, 4, 3, 0, 1, 2, 4, 3, 2, 1, 0, 2, 3, 4, 3, 2, 1,
  0, 1, 2, 3, 4, 4, 2, 1, 0, 1, 2, 3, 3, 4, 2, 0, 2, 3, 4, 3, 2, 1, 0, 1, 2, 4,
  4, 3, 2, 1, 3, 4, 4, 3, 2, 1, 2, 4, 3, 2, 1, 0, 2, 3, 4, 4, 3, 2, 1, 0, 1, 2,
  3, 4, 3, 2, 0, 1, 3, 4, 3, 2, 1, 0, 2, 3, 4, 4, 3, 2, 1, 2, 4, 4, 3, 2, 1, 3,
  4, 3, 2, 4, 3, 2, 1, 0, 1, 3, 4, 2, 1, 0, 2, 3, 4, 3, 2, 1, 2, 3,
];

export const clientsList = [
  {
    id: "c1",
    name: "Alex Rivera",
    avatar: U("photo-1599566150163-29194dcaad36", 200),
    status: "Active",
    goal: "Recomp",
    adh: 92,
    last: "Today",
    color: "mint",
  },
  {
    id: "c2",
    name: "Mia Chen",
    avatar: U("photo-1544005313-94ddf0286df2", 200),
    status: "Active",
    goal: "Wellness",
    adh: 68,
    last: "2d",
    color: "lilac",
  },
  {
    id: "c3",
    name: "Daniel Park",
    avatar: U("photo-1500648767791-00dcc994a43e", 200),
    status: "Active",
    goal: "Endurance",
    adh: 88,
    last: "Today",
    color: "sky",
  },
  {
    id: "c4",
    name: "Sofia Reyes",
    avatar: U("photo-1521146764736-56c929d59c83", 200),
    status: "Active",
    goal: "Strength",
    adh: 95,
    last: "Yesterday",
    color: "peach",
  },
  {
    id: "c5",
    name: "Sarah Holt",
    avatar: U("photo-1438761681033-6461ffad8d80", 200),
    status: "Paused",
    goal: "Recomp",
    adh: 42,
    last: "4d",
    color: "sun",
  },
  {
    id: "c6",
    name: "James Lee",
    avatar: U("photo-1507003211169-0a1dd7228f2d", 200),
    status: "New",
    goal: "Onboarding",
    adh: 0,
    last: "—",
    color: "mint",
  },
] as const;

export const trainingPlans = [
  {
    id: "tp1",
    name: "Quad-focused strength",
    weeks: 12,
    days: 5,
    level: "Intermediate",
    assigned: 4,
    cover: U("photo-1581009146145-b5ef050c2e1e"),
  },
  {
    id: "tp2",
    name: "Upper / Lower split",
    weeks: 8,
    days: 4,
    level: "Beginner",
    assigned: 7,
    cover: U("photo-1534438327276-14e5300c3a48"),
  },
  {
    id: "tp3",
    name: "Hybrid endurance",
    weeks: 10,
    days: 6,
    level: "Advanced",
    assigned: 2,
    cover: U("photo-1517649763962-0c623066013b"),
  },
  {
    id: "tp4",
    name: "Glute hypertrophy",
    weeks: 12,
    days: 4,
    level: "Intermediate",
    assigned: 5,
    cover: U("photo-1571902943202-507ec2618e8f"),
  },
];

export const nutritionPlans = [
  {
    id: "np1",
    name: "2,400 kcal recomp",
    kcal: 2400,
    protein: 175,
    assigned: 6,
    cover: U("photo-1546069901-ba9599a7e63c"),
  },
  {
    id: "np2",
    name: "Lean cut",
    kcal: 1900,
    protein: 180,
    assigned: 3,
    cover: U("photo-1490645935967-10de6ba17061"),
  },
  {
    id: "np3",
    name: "Endurance fueling",
    kcal: 2800,
    protein: 150,
    assigned: 2,
    cover: U("photo-1467003909585-2f8a72700288"),
  },
  {
    id: "np4",
    name: "Vegetarian high-protein",
    kcal: 2200,
    protein: 160,
    assigned: 4,
    cover: U("photo-1512621776951-a57141f2eefd"),
  },
];

export type Brand = "mint" | "lilac" | "sky" | "peach" | "sun";

export type InboxThread = {
  id: string;
  name: string;
  emoji: string;
  color: Brand;
  last: string;
  time: string;
  unread: number;
  /** true when the last message in the thread was sent by the coach. */
  mine?: boolean;
};

export const inboxThreads: InboxThread[] = [
  { id: "c1", name: "Alex Rivera", emoji: "🏃", color: "mint", last: "Yes please. Set 3 will do.", time: "9:21", unread: 0, mine: true },
  { id: "c2", name: "Mia Chen", emoji: "🧘", color: "lilac", last: "Felt tough today, knee a bit sore", time: "8:40", unread: 2 },
  { id: "c3", name: "Daniel Park", emoji: "🚴", color: "sky", last: "Just finished the 5k 🔥", time: "7:55", unread: 1 },
  { id: "c4", name: "Sofia Reyes", emoji: "🏋️", color: "peach", last: "PR locked in 💪", time: "Yest", unread: 0, mine: true },
  { id: "c5", name: "Sarah Holt", emoji: "🤸", color: "sun", last: "Sorry, busy week. Catching up tomorrow.", time: "2d", unread: 0 },
];
