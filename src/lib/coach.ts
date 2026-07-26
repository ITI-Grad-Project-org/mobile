/**
 * The coach directory endpoints return the coach either flat or nested under
 * `coach`, and field names drift between the directory list and the detail
 * payload. Everything here is a read-side normalizer — it never invents data,
 * so callers decide their own display fallbacks.
 */
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
  priceFrom?: number;
  priceTo?: number;
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
    priceFrom: c?.priceFrom ?? coach?.priceFrom,
    priceTo: c?.priceTo ?? coach?.priceTo,
  };
}
