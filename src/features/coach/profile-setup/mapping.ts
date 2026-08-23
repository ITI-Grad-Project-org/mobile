import type { ProfileData, Certificate } from "@/features/shared/setup";
import type {
  CoachProfileData,
  Gender,
  OfflineAvailability,
  Specialty,
} from "@/api/types";

const GENDER_TO_ENUM: Record<string, Gender> = {
  Female: "female",
  Male: "male",
  Other: "other",
};
const GENDER_TO_LABEL: Record<string, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
};

const OFFLINE_TO_ENUM: Record<string, OfflineAvailability> = {
  Yes: "yes",
  No: "no",
  Hybrid: "hybrid",
};
const OFFLINE_TO_LABEL: Record<string, string> = {
  yes: "Yes",
  no: "No",
  hybrid: "Hybrid",
};

const SPECIALTY_TO_ENUM: Record<string, Specialty> = {
  Strength: "strength",
  Hypertrophy: "hypertrophy",
  Endurance: "endurance",
  "Weight loss": "weight_loss",
  Mobility: "mobility",
  Rehab: "rehab",
  Postpartum: "postpartum",
  Yoga: "yoga",
  Nutrition: "nutrition",
};
const SPECIALTY_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIALTY_TO_ENUM).map(([label, value]) => [value, label])
);

/** Coerce a text-field string to a number, or undefined when blank/NaN. */
function num(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** First element of a single-select chips value (`string[]`). */
function firstChip(v: unknown): string | undefined {
  return Array.isArray(v) && v.length ? String(v[0]) : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function uriList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((u): u is string => typeof u === "string" && Boolean(u.trim())) : [];
}

/** The certificate rows the form is holding, empty ones dropped. */
export function coachDataToCertificates(data: ProfileData): Certificate[] {
  const rows = Array.isArray(data.certificates)
    ? (data.certificates as Certificate[])
    : [];
  return rows.filter((c) => str(c.name) || str(c.image));
}

/**
 * The JSON `data` part of PATCH /coaches/me — TEXT FIELDS ONLY.
 *
 * `certifications` is deliberately absent: certificates are now managed one at
 * a time through /coaches/me/certifications, and sending the array here would
 * replace the server's list (dropping the ids granular deletion depends on).
 * Avatar and transformation photos likewise have their own endpoints, so this
 * request carries no files at all and stays small and fast.
 */
export function coachDataToProfileFields(data: ProfileData): CoachProfileData {
  const genderLabel = firstChip(data.gender);
  const offlineLabel = firstChip(data.offline);

  const specialties = Array.isArray(data.specialization)
    ? (data.specialization as string[])
        .map((l) => SPECIALTY_TO_ENUM[l])
        .filter((s): s is Specialty => Boolean(s))
    : undefined;

  const dto: CoachProfileData = {
    firstName: str(data.fname),
    lastName: str(data.lname),
    phone: str(data.phone),
    age: num(data.age),
    gender: genderLabel ? GENDER_TO_ENUM[genderLabel] : undefined,
    location: str(data.location),
    specialties: specialties && specialties.length ? specialties : undefined,
    yearsExperience: num(data.yoe),
    careerExperience: str(data.experience),
    portfolioUrl: str(data.portfolio),
    featuredReviews: str(data.reviews),
    bio: str(data.bio),
    offlineAvailability: offlineLabel ? OFFLINE_TO_ENUM[offlineLabel] : undefined,
    availabilityHours: str(data.hours),
    priceFrom: num(data.priceMin),
    priceTo: num(data.priceMax),
  };

  // Drop undefined / empty-array keys so we only PATCH what was actually set.
  (Object.keys(dto) as (keyof CoachProfileData)[]).forEach((k) => {
    const val = dto[k];
    if (val === undefined || (Array.isArray(val) && val.length === 0)) {
      delete dto[k];
    }
  });

  return dto;
}

/** Reverse mapping — hydrate the SignupFlow from an existing coach profile. */
export function coachProfileToData(profile: any): ProfileData {
  if (!profile) return {};
  return {
    fname: profile.firstName ?? "",
    lname: profile.lastName ?? "",
    email: profile.email ?? "",
    avatar: profile.avatarUrl ?? profile.avatar ?? "",
    phone: profile.phone ?? "",
    age: profile.age != null ? String(profile.age) : "",
    gender: profile.gender ? [GENDER_TO_LABEL[profile.gender] ?? ""] : [],
    location: profile.location ?? "",
    specialization: Array.isArray(profile.specialties)
      ? profile.specialties.map((s: string) => SPECIALTY_TO_LABEL[s] ?? s)
      : [],
    yoe: profile.yearsExperience != null ? String(profile.yearsExperience) : "",
    experience: profile.careerExperience ?? "",
    // Keep the SERVER's id when there is one: it's what
    // DELETE /coaches/me/certifications/{id} needs, and the only way the save
    // can tell an existing certificate from a newly added row.
    certificates: Array.isArray(profile.certifications)
      ? profile.certifications.map((c: any): Certificate => ({
          id: c.id ?? c.certificationId ?? makeId(),
          image: c.fileUrl ?? c.url ?? "",
          name: c.name ?? "",
          issued: c.issueDate ?? "",
          expires: c.expiryDate ?? "",
        }))
      : [],
    portfolio: profile.portfolioUrl ?? "",
    transformations: Array.isArray(profile.transformationPhotos)
      ? profile.transformationPhotos
      : [],
    reviews: profile.featuredReviews ?? "",
    bio: profile.bio ?? "",
    offline: profile.offlineAvailability
      ? [OFFLINE_TO_LABEL[profile.offlineAvailability] ?? ""]
      : [],
    hours: profile.availabilityHours ?? "",
    priceMin: profile.priceFrom != null ? String(profile.priceFrom) : "",
    priceMax: profile.priceTo != null ? String(profile.priceTo) : "",
  };
}
