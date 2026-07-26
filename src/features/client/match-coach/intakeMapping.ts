import type { ProfileData } from "@/features/shared/setup";
import type {
  CreateClientIntakeDto,
  DietaryPreference,
  FocusArea,
  Goal,
  TrainingStyle,
} from "@/api/types";

// Reverse of the enum→label mapping the intake screen applies on submit. Used to
// pre-fill the form when editing an existing intake. Keep these tables in sync
// with the chip option lists in ClientIntakeScreen / config.ts.

const GOAL_LABEL: Record<Goal, string> = {
  fat_loss: "Lose fat",
  muscle_gain: "Build muscle",
  recomposition: "Recomp",
  endurance: "Endurance",
  general_health: "Wellness",
  yoga_mobility: "Yoga & mobility",
  strength: "Strength",
};

const FOCUS_LABEL: Record<FocusArea, string> = {
  strength: "Strength",
  yoga: "Yoga",
  cardio: "Cardio",
  weight_loss: "Weight loss",
  mobility: "Mobility",
};

const STYLE_LABEL: Record<TrainingStyle, string> = {
  strength: "Strength",
  hypertrophy: "Hypertrophy",
  cardio: "Cardio",
  hiit: "HIIT",
  mobility: "Mobility",
  yoga: "Yoga",
};

const DIET_LABEL: Partial<Record<DietaryPreference, string>> = {
  omnivore: "Omnivore",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  pescatarian: "Pescatarian",
  halal: "Halal",
  kosher: "Kosher",
  gluten_free: "Gluten-free",
};

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export type IntakeFormState = {
  days: string;
  level: string;
  focus: string[];
  goalData: ProfileData;
};

/** Turn a saved intake into the chip/field selections the intake screen uses. */
export function intakeToFormState(dto: Partial<CreateClientIntakeDto> | undefined): IntakeFormState {
  const goalData: ProfileData = {};
  // `goal` is a single-select chips field, but ChipsField stores its value as an
  // array — so pre-fill it as one so the saved choice shows selected.
  if (dto?.goal) goalData.goal = [GOAL_LABEL[dto.goal] ?? ""];
  if (dto?.trainingStyles?.length) {
    goalData.trainingPrefs = dto.trainingStyles.map((s) => STYLE_LABEL[s] ?? cap(s));
  }
  if (dto?.dietaryPreferences?.length) {
    goalData.foodPrefs = dto.dietaryPreferences.map((d) => DIET_LABEL[d] ?? cap(d));
  }
  if (dto?.injuries?.length) goalData.injuries = dto.injuries.join(", ");
  if (dto?.medicalConditions?.length) goalData.chronic = dto.medicalConditions.join(", ");
  if (dto?.notes) goalData.notes = dto.notes;

  return {
    days: dto?.trainingDaysPerWeek ? String(dto.trainingDaysPerWeek) : "4",
    level: dto?.trainingExperience ? cap(dto.trainingExperience) : "Intermediate",
    focus: dto?.focusAreas?.length ? dto.focusAreas.map((f) => FOCUS_LABEL[f] ?? cap(f)) : ["Strength"],
    goalData,
  };
}
