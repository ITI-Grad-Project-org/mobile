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
  /**
   * ISO code from the coach's tenant (e.g. "EGP"). Undefined means the payload
   * didn't say — render the bare number rather than assuming a symbol.
   */
  currency?: string;
  /** How many clients this coach has trained. Undefined when not reported. */
  clientsCoached?: number;
  /** Public aggregate as the coach payload reports it, if at all. */
  rating?: number;
  reviewCount?: number;
}

/** One before/after photo, with the caption the payload may carry alongside. */
export interface TransformationPhoto {
  url: string;
  /** e.g. "12 weeks". Only present when the payload carries one. */
  caption?: string;
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

/**
 * Same tolerant read as resolveTransformationPhotos, but keeps the caption when
 * the payload wraps a photo in an object. Photos sent as bare URL strings —
 * which is what `GET /coaches/me` does — simply have no caption, and the rail
 * renders no duration chip for them rather than inventing one.
 */
export function resolveTransformations(coach: any): TransformationPhoto[] {
  const c = coach?.coach || coach;
  const raw = c?.transformationPhotos ?? coach?.transformationPhotos ?? [];
  if (!Array.isArray(raw)) return [];

  return raw
    .map((p: any): TransformationPhoto | null => {
      if (typeof p === "string") return p ? { url: p } : null;
      const url = p?.url || p?.fileUrl || p?.photoUrl;
      if (typeof url !== "string" || !url) return null;
      const caption = p?.caption ?? p?.duration ?? p?.label ?? p?.title;
      const weeks = p?.durationWeeks ?? p?.weeks;
      return {
        url,
        caption:
          typeof caption === "string" && caption
            ? caption
            : typeof weeks === "number"
              ? `${weeks} wk`
              : undefined,
      };
    })
    .filter((p): p is TransformationPhoto => p !== null);
}

/** First finite number among the candidate keys; undefined when none reported. */
function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const n = typeof value === "string" ? Number(value) : value;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return undefined;
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
    // The tenant owns the currency (CreateTenantDto.currency), but the coach
    // payloads have been seen carrying it flattened too.
    currency:
      c?.currency || coach?.currency || coach?.tenant?.currency || coach?.tenantCurrency,
    clientsCoached: firstNumber(
      c?.clientsCoached,
      coach?.clientsCoached,
      c?.clientCount,
      coach?.clientCount,
      c?.clientsCount,
      coach?.clientsCount,
      c?.totalClients,
      coach?.totalClients,
      c?.activeClients,
      coach?.activeClients,
      coach?.stats?.clients
    ),
    rating: firstNumber(c?.rating, coach?.rating, coach?.averageRating, c?.averageRating),
    reviewCount: firstNumber(
      c?.reviewCount,
      coach?.reviewCount,
      coach?.totalReviews,
      c?.totalReviews,
      coach?.reviewsCount
    ),
  };
}
