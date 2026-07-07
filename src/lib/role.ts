import { useRole as useSharedRole } from "@/shared/hooks/useRole";

export function useRole() {
  const role = useSharedRole() || "client";
  return {
    role,
    accent: "green" as "green" | "orange",
    clientProfile: {
      fname: "Alex",
      lname: "Rivera",
      email: "alex.rivera@example.com",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=200&q=80",
    },
    coachProfile: {
      fname: "Marco",
      lname: "Rossi",
      email: "marco@uply.app",
      avatar: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=200&q=80",
      certificates: [] as {
        id: string;
        name: string;
        image: string;
        issued?: string;
        expires?: string;
      }[],
    },
  };
}

export function useActiveCoach() {
  return {
    name: "Coach Mike",
    planType: "strength" as "strength" | "yoga" | "endurance" | "weightloss",
    specialty: "Strength & conditioning",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  };
}
