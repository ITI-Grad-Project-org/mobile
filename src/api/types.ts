// ---------------------------------------------------------------------------
// App-domain membership types (used by the store, not part of the API DTOs).
// A user has 0..N tenant memberships, a different role per tenant.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Enums — kept in sync with the API's Enum Reference.
// ---------------------------------------------------------------------------
export type Specialty =
  | 'strength'
  | 'hypertrophy'
  | 'endurance'
  | 'weight_loss'
  | 'mobility'
  | 'rehab'
  | 'postpartum'
  | 'yoga'
  | 'nutrition'
  | 'powerlifting'
  | 'crossfit'
  | 'calisthenics'
  | 'general_fitness';

export type Goal =
  | 'fat_loss'
  | 'muscle_gain'
  | 'recomposition'
  | 'strength'
  | 'endurance'
  | 'general_health'
  | 'yoga_mobility';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'athlete';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
/** trainingExperience shares the difficulty scale. */
export type TrainingExperience = Difficulty;

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
  | 'omnivore'
  | 'halal'
  | 'kosher'
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'gluten_free'
  | 'keto'
  | 'low_carb'
  | 'intermittent_fasting';

export type FocusArea = 'strength' | 'yoga' | 'cardio' | 'weight_loss' | 'mobility';

export type TrainingStyle =
  | 'strength'
  | 'hypertrophy'
  | 'cardio'
  | 'hiit'
  | 'mobility'
  | 'yoga';

export type Gender = 'male' | 'female' | 'other';

export type OfflineAvailability = 'yes' | 'no' | 'hybrid';

export type ExerciseCategory = 'strength' | 'cardio' | 'mobility' | 'plyometric' | 'core';

export type Muscle =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'full_body';

export type SetType = 'working' | 'warmup' | 'drop_set' | 'amrap' | 'to_failure';
export type IntensityType = 'rpe' | 'rir' | 'percent_1rm';
export type SetOutcome = 'completed' | 'partial' | 'skipped';
export type ProgramStatus = 'draft' | 'published' | 'cancelled';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface RegisterCoachDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string; // min 6
  confirmPassword: string;
  businessName: string; // becomes the coach's tenant
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

// Password reset — 3-step OTP flow
export interface ForgotPasswordDto {
  email: string;
}
export interface VerifyResetOtpDto {
  email: string;
  otp: string; // 6-digit code from the email
}
export interface VerifyResetOtpResponse {
  resetToken: string; // single-use
}
export interface ResetPasswordDto {
  resetToken: string; // single-use ticket from /verify-reset-otp (was `token`)
  newPassword: string; // min 8
}

// ---------------------------------------------------------------------------
// Coach
// ---------------------------------------------------------------------------
export interface Certification {
  name: string;
  issuer?: string;
  issueDate?: string; // YYYY-MM-DD (replaced `year`)
  expiryDate?: string; // YYYY-MM-DD
  fileUrl?: string; // scanned certificate
  credentialUrl?: string; // public verification link
}

export interface UpdateCoachDto {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  phone?: string;
  age?: number; // 16–100
  gender?: Gender;
  location?: string;
  specialties?: Specialty[];
  yearsExperience?: number; // 0–70
  careerExperience?: string; // free text
  certifications?: Certification[];
  portfolioUrl?: string;
  transformationPhotos?: string[];
  featuredReviews?: string;
  bio?: string;
  offlineAvailability?: OfflineAvailability;
  availabilityHours?: string;
  priceFrom?: number;
  priceTo?: number;
}

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------
export interface CreateTenantDto {
  name: string;
  slug: string;
  logoUrl?: string;
  timezone?: string;
  currency?: string;
}

// ---------------------------------------------------------------------------
// Client profile
// ---------------------------------------------------------------------------
export interface UpdateClientDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: Gender;
  heightCm?: number;
  weightKg?: number;
  avatarUrl?: string;
}

// ---------------------------------------------------------------------------
// Client intake — only `goal` + `trainingExperience` are required now.
// ---------------------------------------------------------------------------
export interface CreateClientIntakeDto {
  goal: Goal;
  trainingExperience: TrainingExperience;
  activityLevel?: ActivityLevel;
  trainingDaysPerWeek?: number; // 0–7
  focusAreas?: FocusArea[];
  trainingStyles?: TrainingStyle[];
  availableEquipment?: Equipment[];
  dietaryPreferences?: DietaryPreference[];
  allergies?: string[];
  medicalConditions?: string[];
  injuries?: string[];
  notes?: string;
}
export type UpdateClientIntakeDto = Partial<CreateClientIntakeDto>;

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------
export interface CreateMeasurementDto {
  measuredAt?: string; // YYYY-MM-DD (default today)
  weightKg?: number;
  bodyFatPct?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  armCm?: number;
  thighCm?: number;
  photos?: string[];
}
export type UpdateMeasurementDto = Partial<CreateMeasurementDto>;

/** A measurement as returned by the server (create DTO fields + identity). */
export interface Measurement extends CreateMeasurementDto {
  id: string;
  measuredAt: string; // YYYY-MM-DD
  createdAt?: string;
}

/** Paginated envelope for GET /client/me/measurements. */
export interface ListMeasurementsResponse {
  data: Measurement[];
  page: number;
  limit: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Invitations & Onboarding
// ---------------------------------------------------------------------------
export interface CreateInvitationDto {
  email: string;
  name?: string; // personalises the email
}
export interface ValidateOnboardingDto {
  code: string; // 6-digit code from invite or approval email
}
export interface ConfirmOnboardingDto {
  code: string; // 6-digit code
  intake?: CreateClientIntakeDto; // optionally submit intake in the same call
}

// ---------------------------------------------------------------------------
// Join requests
// ---------------------------------------------------------------------------
export interface CreateJoinRequestDto {
  tenantId: string; // tenant of the coach chosen in the directory
  message?: string; // short note the coach reads when deciding
}

// ---------------------------------------------------------------------------
// Coach directory
// ---------------------------------------------------------------------------
export interface DirectoryQuery {
  search?: string;
  specialty?: Specialty;
  page?: number; // default 1
  limit?: number; // default 20, max 50
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export interface CreateReviewDto {
  rating: number; // 1-5
  comment: string;
}
export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}
// Response shape. The backend doesn't document it, so every field beyond
// rating/comment is optional and callers must render defensively.
export interface Review {
  id?: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
  clientName?: string;
  clientAvatarUrl?: string;
  client?: { firstName?: string; lastName?: string; avatarUrl?: string };
}
export interface ReviewSummary {
  averageRating?: number;
  totalReviews?: number;
  // seen in some payloads as `average` / `count`
  average?: number;
  count?: number;
}

// ---------------------------------------------------------------------------
// Exercise library
// ---------------------------------------------------------------------------
export interface CreateExerciseDto {
  name: string;
  category: ExerciseCategory;
  primaryMuscle: Muscle;
  instructionSteps: string[];
  secondaryMuscles?: Muscle[];
  equipment?: Equipment[];
  demoVideoUrl?: string;
  demoGifUrl?: string;
  thumbnailUrl?: string;
}
export type UpdateExerciseDto = Partial<CreateExerciseDto>;

export interface ListExercisesQuery {
  category?: ExerciseCategory;
  primaryMuscle?: Muscle;
  search?: string;
  includeInactive?: boolean; // default false
}

// ---------------------------------------------------------------------------
// Training programs (coach builder)
// ---------------------------------------------------------------------------
export interface CreateClientProgramDto {
  membershipId: string; // membership, not client id
  name: string; // max 150
  durationWeeks: number; // 1–52
  startDate: string; // YYYY-MM-DD
  description?: string;
  goal?: Goal;
  difficulty?: Difficulty;
}
export interface UpdateClientProgramDto {
  name?: string;
  description?: string;
  goal?: Goal;
  difficulty?: Difficulty;
  startDate?: string; // drafts only
}
export interface RescheduleClientProgramDto {
  startDate: string;
}

export interface ListProgramsQuery {
  membershipId?: string;
  status?: ProgramStatus;
  goal?: Goal;
  difficulty?: Difficulty;
  search?: string;
  isArchived?: boolean; // default false
}

export interface UpdateProgramDayDto {
  name?: string; // max 150
  notes?: string;
  isRestDay?: boolean;
}

export interface PrescribedSetDto {
  setType?: SetType; // default `working`
  repsMin?: number;
  repsMax?: number;
  durationSeconds?: number;
  weightKg?: number;
  intensityType?: IntensityType;
  intensityValue?: number;
}

export interface PrescribeExerciseDto {
  exerciseId: string; // from the tenant library
  sets: PrescribedSetDto[];
  position?: number; // default: append to end of day
  supersetGroup?: number;
  restSeconds?: number; // default 90
  tempo?: string; // e.g. "3-1-1-0"
  coachNotes?: string;
}
export type InlineExercisePrescriptionDto = Omit<PrescribeExerciseDto, 'exerciseId'>;
export interface CreateAndPrescribeExerciseDto {
  exercise: CreateExerciseDto;
  prescription: InlineExercisePrescriptionDto;
}
export interface UpdatePlannedExerciseDto {
  position?: number; // >= 1
  supersetGroup?: number; // >= 1
  restSeconds?: number; // >= 0
  tempo?: string;
  coachNotes?: string;
}
export interface ReplacePlannedSetsDto {
  sets: PrescribedSetDto[]; // full replacement — send every set to keep
}

// ---------------------------------------------------------------------------
// Training (client execution / logging)
// ---------------------------------------------------------------------------
export interface UpdatePrescribedLoggedSetDto {
  outcome: SetOutcome;
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  rpe?: number; // 1–10
}
export interface CreateExtraLoggedSetDto {
  loggedExerciseId: string;
  outcome: 'completed' | 'partial'; // no `skipped`
  reps?: number;
  weightKg?: number;
  durationSeconds?: number;
  rpe?: number;
}
export interface CompleteWorkoutDto {
  durationMinutes?: number; // 1–32767
  clientNotes?: string; // max 5000
  overallRpe?: number; // 1–10
}

export interface CalendarQuery {
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
}
