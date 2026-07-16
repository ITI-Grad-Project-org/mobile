export type Role = 'owner' | 'client';
export type MembershipStatus = 'invited' | 'active' | 'paused' | 'removed';

export interface Membership {
  tenantId: string;
  tenantName: string;
  role: Role;
  status: MembershipStatus;
  brand?: {
    logoUrl?: string;
    primaryColor?: string;
  };
}

export type Specialty =
  | 'strength'
  | 'hypertrophy'
  | 'weight_loss'
  | 'powerlifting'
  | 'crossfit'
  | 'calisthenics'
  | 'nutrition'
  | 'rehab'
  | 'general_fitness';

export interface Certification {
  name: string;
  issuer?: string;
  year?: number;
  credentialUrl?: string;
}

export interface RegisterCoachDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string; // min 6
  confirmPassword: string;
  businessName: string;
  phone?: string;
  bio?: string;
  specialties?: Specialty[];
  yearsExperience?: number;
  certifications?: Certification[];
  timezone?: string; // e.g. "Africa/Cairo"
  currency?: string; // e.g. "EGP"
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateClientDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string; // min 6
  confirmPassword: string;
  phone?: string;
}

export interface GoogleAuthDto {
  idToken: string;
}

export interface SwitchTenantDto {
  tenantId: string;
}

export interface UpdateCoachDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  specialties?: Specialty[];
  yearsExperience?: number;
  certifications?: Certification[];
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  logoUrl?: string;
  timezone?: string;
  currency?: string;
}

export interface UpdateClientDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: 'male' | 'female';
  heightCm?: number;
}

export type Goal =
  | 'fat_loss'
  | 'muscle_gain'
  | 'recomposition'
  | 'strength'
  | 'endurance'
  | 'general_health';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'athlete';

export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';

export type Equipment =
  | 'none'
  | 'dumbbells'
  | 'barbell'
  | 'kettlebell'
  | 'resistance_bands'
  | 'machines'
  | 'full_gym';

export type DietaryPreference =
  | 'none'
  | 'halal'
  | 'vegetarian'
  | 'vegan'
  | 'keto'
  | 'low_carb'
  | 'intermittent_fasting';

export interface CreateClientIntakeDto {
  goal: Goal;
  activityLevel: ActivityLevel;
  trainingExperience: TrainingExperience;
  availableEquipment: Equipment[];
  dietaryPreferences: DietaryPreference[];
  trainingDaysPerWeek?: number; // 0–7
  allergies?: string[];
  medicalConditions?: string[];
  injuries?: string[];
  notes?: string;
}

export interface CreateMeasurementDto {
  measuredAt?: string; // YYYY-MM-DD
  weightKg?: number;
  bodyFatPct?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  armCm?: number;
  thighCm?: number;
  photos?: string[];
}

export interface CreateInvitationDto {
  email: string;
  name?: string;
}

export interface CreateReviewDto {
  rating: number; // 1-5
  comment: string;
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}
