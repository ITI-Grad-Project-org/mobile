import type { ProfileData } from "@/features/shared/setup";
import type { UpdateClientProfileArgs } from "@/api/endpoints/profile.endpoints";
import type { Gender } from "@/api/types";

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

function num(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function firstChip(v: unknown): string | undefined {
  return Array.isArray(v) && v.length ? String(v[0]) : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

/**
 * Build the multipart payload for PATCH /clients/me — FLAT fields plus an
 * `avatar` file part. The avatar is no longer pre-uploaded to /upload/image;
 * the endpoint takes the file itself.
 */
export async function clientDataToDto(data: ProfileData): Promise<UpdateClientProfileArgs> {
  const genderLabel = firstChip(data.gender);

  const dto: UpdateClientProfileArgs = {
    firstName: str(data.fname),
    lastName: str(data.lname),
    phone: str(data.phone),
    dateOfBirth: str(data.birthdate),
    gender: genderLabel ? GENDER_TO_ENUM[genderLabel] : undefined,
    heightCm: num(data.height),
    weightKg: num(data.weight),
    avatarUri: str(data.avatar),
  };

  (Object.keys(dto) as (keyof UpdateClientProfileArgs)[]).forEach((k) => {
    if (dto[k] === undefined) delete dto[k];
  });

  return dto;
}

/** Reverse mapping — hydrate the SignupFlow from an existing client profile. */
export function clientProfileToData(profile: any): ProfileData {
  if (!profile) return {};
  return {
    fname: profile.firstName ?? "",
    lname: profile.lastName ?? "",
    email: profile.email ?? "",
    avatar: profile.avatarUrl ?? profile.avatar ?? "",
    phone: profile.phone ?? "",
    birthdate: profile.dateOfBirth ?? "",
    gender: profile.gender ? [GENDER_TO_LABEL[profile.gender] ?? ""] : [],
    weight: profile.weightKg != null ? String(profile.weightKg) : "",
    height: profile.heightCm != null ? String(profile.heightCm) : "",
  };
}
