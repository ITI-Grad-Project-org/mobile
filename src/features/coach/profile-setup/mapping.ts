import type { ProfileData, Certificate } from "@/features/shared/setup";
import type { UpdateCoachProfileArgs } from "@/api/endpoints/profile.endpoints";
import type {
  Certification,
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

function uriList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((u): u is string => typeof u === "string" && Boolean(u.trim())) : [];
}

/**
 * Build the multipart payload for PATCH /coaches/me. Images are no longer
 * pre-uploaded to /upload/* — the endpoint takes the files directly, so this
 * just splits ProfileData into the JSON `data` part and the file URIs.
 */
export async function coachDataToDto(data: ProfileData): Promise<UpdateCoachProfileArgs> {
  const genderLabel = firstChip(data.gender);
  const offlineLabel = firstChip(data.offline);

  const specialties = Array.isArray(data.specialization)
    ? (data.specialization as string[])
        .map((l) => SPECIALTY_TO_ENUM[l])
        .filter((s): s is Specialty => Boolean(s))
    : undefined;

  const rawCerts = Array.isArray(data.certificates)
    ? (data.certificates as Certificate[])
    : [];
  const certifications: Certification[] = [];
  // Index-aligned with `certifications` — the i-th file fills the i-th entry.
  const certificateUris: (string | undefined)[] = [];
  for (const c of rawCerts) {
    const name = str(c.name);
    const image = str(c.image);
    if (!name && !image) continue; // skip empty rows
    certifications.push({
      name: name ?? "",
      ...(c.issued ? { issueDate: c.issued } : {}),
      ...(c.expires ? { expiryDate: c.expires } : {}),
    });
    certificateUris.push(image);
  }

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
    certifications: certifications.length ? certifications : undefined,
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

  return {
    data: dto,
    avatarUri: str(data.avatar),
    transformationUris: uriList(data.transformations),
    certificateUris,
  };
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
    certificates: Array.isArray(profile.certifications)
      ? profile.certifications.map((c: any): Certificate => ({
          id: makeId(),
          image: c.fileUrl ?? "",
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
