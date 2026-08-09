export interface CoachFields {
  firstName?: string;
  lastName?: string;
  /** Full name if the API gave one, else undefined. */
  name?: string;
  businessName?: string;
  avatarUrl?: string;
  coverUrl?: string;
  location?: string;
  yearsExperience?: number;
  careerExperience?: string;
  bio?: string;
  specialties: string[];
  /** Before/after photo URLs. Empty when the payload carries none. */
  transformationPhotos: string[];
  priceFrom?: number;
  priceTo?: number;
}

/**
 * Transformation photos are plain URL strings on `GET /coaches/me`, but the
 * public payloads have been seen wrapping them in an object. Accept both, and
 * drop anything that isn't a usable URL.
 */
export function resolveTransformationPhotos(coach: any): string[] {
  const c = coach?.coach || coach;
  const raw = c?.transformationPhotos ?? coach?.transformationPhotos ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p: any) => (typeof p === "string" ? p : p?.url || p?.fileUrl || p?.photoUrl))
    .filter((url: unknown): url is string => typeof url === "string" && url.length > 0);
}

export function resolveCoachFields(coach: any): CoachFields {
  const c = coach?.coach || coach;

  const firstName = c?.firstName || coach?.firstName;
  const lastName = c?.lastName || coach?.lastName;
  const fullName = `${firstName || ""} ${lastName || ""}`.trim();

  const specialties: string[] = c?.specialties?.length
    ? c.specialties
    : coach?.specialties?.length
      ? coach.specialties
      : [];

  return {
    firstName,
    lastName,
    name: fullName || undefined,
    businessName: coach?.tenantName || coach?.businessName || c?.businessName,
    avatarUrl: c?.avatarUrl || coach?.avatarUrl || coach?.logoUrl || coach?.avatar,
    coverUrl: c?.coverUrl || coach?.coverUrl || coach?.cover,
    location: c?.location || coach?.location,
    yearsExperience: c?.yearsExperience ?? coach?.yearsExperience ?? c?.yoe ?? coach?.yoe,
    careerExperience: c?.careerExperience || coach?.careerExperience,
    bio: c?.bio || coach?.bio,
    specialties,
    transformationPhotos: resolveTransformationPhotos(coach),
    priceFrom: c?.priceFrom ?? coach?.priceFrom,
    priceTo: c?.priceTo ?? coach?.priceTo,
  };
}
