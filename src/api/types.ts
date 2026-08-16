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
/** Certificate metadata as SENT (no id yet — the server assigns one). */
export interface CertificationInput {
  name: string;
  issuer?: string;
  issueDate?: string; // YYYY-MM-DD (replaced `year`)
  expiryDate?: string; // YYYY-MM-DD
  credentialUrl?: string; // public verification link
  // No `fileUrl` — the scan rides as a `certificateFiles` part on PATCH
  // /coaches/me (matched BY ARRAY INDEX), or as the `file` part on
  // POST /coaches/me/certifications.
}

export interface Certification extends CertificationInput {
  /**
   * Present on certifications READ BACK from the profile. Keep it — it is the
   * only way to remove one individually via
   * DELETE /coaches/me/certifications/{certificationId}.
   */
  id?: string;
}

/**
 * The JSON-encoded `data` part of `PATCH /coaches/me` (multipart/form-data).
 * `avatar`, `transformationPhotos` and `certificateFiles` are FILE PARTS, not
 * fields here — see UpdateCoachProfileArgs in profile.endpoints.ts.
 */
export interface CoachProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  age?: number; // 16–100
  gender?: Gender;
  location?: string;
  specialties?: Specialty[];
  yearsExperience?: number; // 0–70
  careerExperience?: string; // free text
  certifications?: Certification[];
  portfolioUrl?: string;
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
/**
 * FLAT multipart fields on `PATCH /clients/me` — no `data` wrapper, unlike
 * /coaches/me. The photo is an `avatar` file part, replacing the old
 * `avatarUrl` string.
 */
export interface ClientProfileFields {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: Gender;
  heightCm?: number;
  weightKg?: number;
  timezone?: string;
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
export interface MeasurementFields {
  measuredAt?: string; // YYYY-MM-DD (default today)
  weightKg?: number;
  bodyFatPct?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  armCm?: number;
  thighCm?: number;
}

/** A measurement as returned by the server (fields + identity + hosted photos). */
export interface Measurement extends MeasurementFields {
  id: string;
  measuredAt: string; // YYYY-MM-DD
  createdAt?: string;
  photos?: string[]; // hosted URLs on the way back out
}

export interface ListMeasurementsResponse {
  docs: Measurement[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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

// ---------------------------------------------------------------------------
// Nutrition — enums
// ---------------------------------------------------------------------------
export type ServingUnit = 'g' | 'ml' | 'piece' | 'cup' | 'tbsp' | 'scoop';
export type MealSlot =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'pre_workout'
  | 'post_workout';
export type MealOutcome = 'completed' | 'partial' | 'skipped';
/** Foods and Meals reuse the intake dietary-preference values. */
export type DietaryTag = DietaryPreference;

// ---------------------------------------------------------------------------
// Nutrition — Food library (coach, per tenant)
// All macro values are PER REFERENCE SERVING, not per 100g.
// ---------------------------------------------------------------------------
export interface CreateFoodDto {
  name: string;
  servingSize: number; // <=1000; the API applies a stricter max per unit
  servingUnit: ServingUnit;
  calories: number; // <=2000
  proteinG: number; // <=150
  carbsG: number; // <=300
  fatG: number; // <=150
  brand?: string;
  fiberG?: number; // <=75
  dietaryTags?: DietaryTag[];
  allergens?: string[]; // trimmed/lowercased/deduped server-side
}
/** `isActive: true` restores an archived Food. */
export type UpdateFoodDto = Partial<CreateFoodDto> & { isActive?: boolean };

export interface ListFoodsQuery {
  search?: string;
  servingUnit?: ServingUnit;
  dietaryTag?: DietaryTag;
  allergen?: string;
  includeInactive?: boolean; // default false; coach-only
}

// ---------------------------------------------------------------------------
// Nutrition — Meal library (coach). Totals are calculated server-side.
// ---------------------------------------------------------------------------
export interface MealItemDto {
  foodId: string;
  amount: number; // <=1500, in the Food's serving unit
}
export interface CreateMealDto {
  name: string;
  items: MealItemDto[];
  description?: string; // max 2000
  photoUrl?: string; // upload via /upload/image first
  prepNotes?: string; // max 5000
  dietaryTags?: DietaryTag[];
  allergens?: string[]; // meal-level additions on top of the Foods' own
}
/** Metadata only — the recipe is replaced via PUT .../items. */
export type UpdateMealDto = Partial<Omit<CreateMealDto, 'items'>> & {
  isActive?: boolean;
};
export interface ReplaceMealItemsDto {
  items: MealItemDto[]; // full ordered replacement, not a delta
}

export interface ListMealsQuery {
  search?: string;
  dietaryTag?: DietaryTag;
  allergen?: string;
  includeInactive?: boolean; // default false
}

// ---------------------------------------------------------------------------
// Nutrition plans (coach builder) — same lifecycle as training programs.
// ---------------------------------------------------------------------------
export interface NutritionTargets {
  targetCalories?: number; // 800–6000
  targetProteinG?: number; // 1–350
  targetCarbsG?: number; // 0–800
  targetFatG?: number; // 1–200
  targetFiberG?: number; // 0–100
  targetWaterMl?: number; // 250–6000
}
export interface CreateClientNutritionPlanDto extends NutritionTargets {
  membershipId: string; // membership, not client id
  name: string; // max 150
  durationWeeks: number; // 1–52
  startDate: string; // YYYY-MM-DD
  description?: string; // max 5000
  goal?: Goal;
}
export type UpdateClientNutritionPlanDto = Partial<
  Omit<CreateClientNutritionPlanDto, 'membershipId' | 'durationWeeks'>
>;
/** Choosing today activates the plan immediately — it can't be rescheduled again. */
export interface RescheduleClientNutritionPlanDto {
  startDate: string;
}

export interface ListNutritionPlansQuery {
  membershipId?: string;
  status?: ProgramStatus;
  goal?: Goal;
  search?: string;
  isArchived?: boolean; // default false
}

/**
 * A flexible day has no fixed prescription — the client logs freely against
 * targets. Planned meals may still be attached (hybrid); adding meals to a
 * fully flexible day returns 409.
 */
export interface UpdateNutritionPlanDayDto {
  isFlexibleDay?: boolean;
  notes?: string; // max 5000
  targetCaloriesOverride?: number;
  targetProteinGOverride?: number;
  targetCarbsGOverride?: number;
  targetFatGOverride?: number;
  targetFiberGOverride?: number;
  targetWaterMlOverride?: number;
}

/** Amount `0` omits the ingredient from the snapshot. */
export interface PlannedMealItemOverrideDto {
  mealIngredientId: string;
  amount: number; // 0–1500
}
export interface AddMealFromLibraryDto {
  mealId: string;
  slot: MealSlot;
  position?: number; // 1–10
  suggestedTime?: string; // e.g. "08:30"
  coachNotes?: string; // max 5000
  itemOverrides?: PlannedMealItemOverrideDto[];
}
/** Inline overrides key off `foodId` — the Meal has no ingredient ids yet. */
export interface InlineMealPrescriptionDto
  extends Omit<AddMealFromLibraryDto, 'mealId' | 'itemOverrides'> {
  itemOverrides?: { foodId: string; amount: number }[];
}
export interface CreateLibraryMealAndAddDto {
  meal: CreateMealDto;
  prescription: InlineMealPrescriptionDto;
}
export interface UpdatePlannedMealDto {
  slot?: MealSlot;
  position?: number;
  suggestedTime?: string;
  coachNotes?: string;
}
/** Must list every current planned Food exactly once, in the desired order. */
export interface ReplacePlannedMealItemsDto {
  items: { plannedMealFoodId: string; amount: number }[];
}

// ---------------------------------------------------------------------------
// Nutrition (client logging)
//
// Log writes have a WRITE DEADLINE as well as a finalized state. A 409 on any
// mutating log endpoint means "this day is closed for editing" — finalized,
// deadline passed, future day, or the plan was cancelled — not a validation
// error. Render the day read-only rather than retrying.
// ---------------------------------------------------------------------------
export interface UpdateNutritionDayLogDto {
  waterMlConsumed?: number; // 0–12000
  clientNotes?: string; // max 5000
}
export interface UpdateLoggedMealOutcomeDto {
  outcome: MealOutcome;
  clientNotes?: string;
}
/**
 * Two modes. Library: `foodId` + `amount`, macros derived by the API. Manual:
 * `foodName` + macro TOTALS (not per-serving). Only `mealSlot` is required in
 * both. Limits: amount <=5000 · calories <=5000 · protein/fat <=500 ·
 * carbs <=1000 · fiber <=150.
 */
export interface CreateActualFoodLogDto {
  mealSlot: MealSlot;
  foodId?: string | null; // library mode
  loggedMealId?: string | null; // link to a prescribed Meal in the same log
  foodName?: string; // manual mode, max 200
  brand?: string;
  servingSize?: number;
  servingUnit?: ServingUnit;
  amount?: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  clientNotes?: string;
}
export type UpdateActualFoodLogDto = Partial<CreateActualFoodLogDto>;

/** Clients browse their coach's Foods read-only — no `includeInactive`. */
export type ClientListFoodsQuery = Omit<ListFoodsQuery, 'includeInactive'>;

// ---------------------------------------------------------------------------
// Client activity graph — GET /client/me/activity
//
// A contributions-style heatmap spanning ALL of the client's tenants, so unlike
// everything else under /client/me it is NOT scoped to the active tenant.
// The only endpoint in the spec with a fully typed response body.
// ---------------------------------------------------------------------------

/** Pre-bucketed intensity, 0–4. Named to avoid colliding with intake's ActivityLevel. */
export type ActivityGraphLevel = 0 | 1 | 2 | 3 | 4;

export interface ActivityGraphDay {
  date: string; // YYYY-MM-DD
  activityCount: number;
  /** Bucketed server-side — map straight to swatches, don't re-derive from
   *  activityCount or the shading drifts from the server's. */
  level: ActivityGraphLevel;
}
export interface ActivityGraphPeriod {
  mode: 'rolling' | 'calendar_year';
  year: number | null; // null when mode === 'rolling' — nullable, not optional
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}
export interface ActivityGraphSummary {
  totalActivities: number;
  activeDays: number;
  /** Streaks are computed by the API — no client-side streak math needed. */
  currentStreakDays: number;
  longestStreakDays: number;
}
export interface ActivityGraphResponse {
  /** Day boundaries resolve in THIS zone, not the device's. Don't re-bucket. */
  timezone: string;
  period: ActivityGraphPeriod;
  summary: ActivityGraphSummary;
  days: ActivityGraphDay[]; // one entry per date in the period
}

export interface ActivityGraphQuery {
  year?: number; // omit for the rolling latest 365 days
}

// ---------------------------------------------------------------------------
// Analytics (coach-only, read-only)

/** Percentage out of 100 (72.7 = "72.7%", do not multiply). null = no denominator. */
export type Pct = number | null;
/** Inclusive ISO calendar date, `YYYY-MM-DD` — a date, not a timestamp. */
export type ISODate = string;

/**
 * Send neither bound for the last 30 days, or one for a 30-day window anchored
 * to it. `to` before `from` is a 400.
 */
export interface DateWindow {
  from?: ISODate;
  to?: ISODate;
}

export interface AttentionParams {
  /** Measure urgency from this date instead of today. */
  asOf?: ISODate;
  riskThresholdDays?: number; // >= 1, default 7
  endingHorizonDays?: number; // >= 1, default 14
}

export interface AnalyticsActivityParams extends DateWindow {
  /** 1–200, default 50. Outside that range is rejected, not clamped. */
  limit?: number;
}

export interface AdherenceParams extends DateWindow {
  /** Omit for the whole roster. */
  membershipId?: string;
}

/** MRR keyed by ISO 4217 code. There is no FX rate — render one line per
 *  currency and never sum them. A single-currency practice gets a one-entry
 *  map; still iterate it. */
export type CurrencyAmounts = Record<string, number>;

export interface OverviewWeekday {
  weekday: number; // 1 = Monday … 7 = Sunday — confirm the base
  volume: number;
}

export interface Overview {
  roster: { total: number; active: number; paused: number }; // confirm
  mrr: CurrencyAmounts;
  sessionAdherencePct: Pct;
  /** Derived from the window's END date, not today. Label the card from the
   *  window whenever the user has changed the range. Weeks run Mon–Sun. */
  thisWeek: {
    volume: number;
    previousVolume: number | null; // null = no prior week to compare
    changePct: Pct;
    /** Always seven rows including empty days — do not gap-fill. */
    byDay: OverviewWeekday[];
  };
  /** Badges for the /analytics/attention lists, computed at the DEFAULT
   *  thresholds. Pass custom thresholds to attention and they disagree. */
  attentionCounts: {
    atRisk: number;
    checkinsAwaitingReview: number;
    programsEndingSoon: number;
  };
}

export interface AtRiskClient {
  membershipId: string;
  clientName: string;
  daysSilent: number;
  /** Counted from the join date, not from a last activity: word these rows
   *  "hasn't started yet", not "gone quiet for 9 days". */
  neverActive: boolean;
}
export interface CheckinAwaitingReview {
  checkinId: string;
  membershipId: string;
  clientName: string;
  submittedAt: string; // timestamp
}
/** VERIFIED against a live response (2026-08-16): the field is `endsOn`, not
 *  `endDate`, and the row also carries `programName` and `daysRemaining`. */
export interface ProgramEndingSoon {
  programId: string;
  membershipId: string;
  clientName: string;
  programName: string;
  endsOn: ISODate;
  daysRemaining: number;
  /** Covers the whole programme run, not the window. */
  completionPct: Pct;
}
/** Three lists, each already sorted most-urgent-first — never re-sort. Paused
 *  memberships never appear. The action differs per list: message / review /
 *  renew, so keep them as three sections. */
export interface Attention {
  atRisk: AtRiskClient[];
  checkinsAwaitingReview: CheckinAwaitingReview[];
  programsEndingSoon: ProgramEndingSoon[];
}

/**
 * VERIFIED against a live response (2026-08-16). Note what is NOT here: there
 * is no `id` and no `summary` — a row carries only what happened and when, so
 * the feed's caption has to be built from `activityType` client-side, and its
 * React key from membershipId + occurredAt.
 */
export interface AnalyticsActivityRow {
  membershipId: string;
  clientName: string;
  /** e.g. 'workout_set_reported'. Open union — new kinds appear over time. */
  activityType: 'workout_set_reported' | (string & {});
  /** Display only — many rows share one value, so sorting by it scrambles. */
  activityDate: ISODate;
  /** Orders the feed (newest first). */
  occurredAt: string;
}

export interface RosterClientRow {
  membershipId: string;
  clientName: string;
  /** null = nothing scheduled; these rows sort LAST and are not the worst
   *  performers. Render a dash. */
  adherencePct: Pct;
}
/** Ordered worst-adherence-first: the risk list is the top, the leaderboard is
 *  the bottom reversed. One call, two sections. */
export interface Roster {
  statusMix: Record<string, number>; // confirm
  mrr: CurrencyAmounts;
  clients: RosterClientRow[];
}

/**
 * Two independent readings — show both, never average them.
 * Session completion counts days the client never opened the app against them.
 * Volume adherence compares actual reps × weight to the prescription, and is
 * meaningless without `comparableSets`: RPE / %1RM sets have no absolute target
 * and are excluded from both sides, so an all-RPE programme returns
 * `comparableSets: 0` with a null ratio meaning "not measurable this way".
 */
export interface Adherence {
  sessionAdherencePct: Pct;
  scheduledSessions: number; // confirm
  completedSessions: number; // confirm
  volumeAdherencePct: Pct;
  comparableSets: number;
}

/** Returned exactly as recorded, every field nullable, values never carried
 *  forward. A gap is a gap: no fill, no connectNulls, no last-value-forward. */
export interface ProgressMeasurement {
  date: ISODate;
  weightKg: number | null;
  bodyFatPct: number | null;
  // Further measurement fields exist and are all nullable — add them here once
  // confirmed against the analytics-service schema.
}
export interface StrengthPoint {
  date: ISODate;
  /** Epley estimate, weight × (1 + reps / 30), best set per exercise per day.
   *  Label the axis "est. 1RM". */
  estimated1rm: number;
}
export interface StrengthSeries {
  /** Grouped by the name on the logged row, not the exercise id — two
   *  similarly-named entries are legitimately two lines. */
  exerciseName: string;
  /** null when the window holds a single training day: hide the delta chip
   *  rather than showing "0%". */
  changePct: Pct;
  /** Capped at 12 reps; bodyweight and timed work are excluded, so some
   *  exercises returning nothing is by design, not "no data". */
  points: StrengthPoint[];
}
export interface Progress {
  measurements: ProgressMeasurement[];
  /** Most-trained exercise first — default an exercise picker to [0]. */
  strength: StrengthSeries[];
}

/** Whole history per template, never windowed, ordered by how widely used.
 *  The headline is `avgLastActiveWeek` against `durationWeeks` ("stops at week
 *  5 of 12") — one paired stat, not two columns. */
export interface TemplateEffectiveness {
  templateId: string;
  templateName: string;
  timesAssigned: number; // confirm — this is the sort key
  durationWeeks: number;
  /** null for a template with no completed session — excluded from the mean. */
  avgLastActiveWeek: number | null;
}

/** One row per planned week including dead ones — plots as-is, no gap-filling.
 *  The curve never rises: an uptick is a sort bug on `week`. */
export interface SurvivalPoint {
  week: number;
  survivingPct: number; // monotonically non-increasing
}
