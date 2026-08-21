/**
 * Prices come from the coach's tenant, which carries its own currency code
 * (CreateTenantDto.currency, e.g. "EGP"). Nothing here converts, and nothing
 * here falls back to "$" — a coach priced in EGP shown with a dollar sign is a
 * worse error than a number with no symbol at all.
 */
export function formatPrice(amount: number, currency?: string): string {
  if (!currency) return formatPlain(amount);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      // Coaching plans are whole-unit prices; "1,200" reads better than
      // "1,200.00" at 17px next to a "/ mo".
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Hermes without full ICU, or a currency code Intl doesn't know. The code
    // itself is still honest labelling.
    return `${currency} ${formatPlain(amount)}`;
  }
}

function formatPlain(amount: number): string {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(amount);
  } catch {
    return String(Math.round(amount));
  }
}

/** "From X" or "X – Y" for the packages sheet, in the coach's own currency. */
export function formatPriceRange(
  from: number | undefined,
  to: number | undefined,
  currency?: string
): string | null {
  if (from == null && to == null) return null;
  if (from != null && to != null && from !== to) {
    return `${formatPrice(from, currency)} – ${formatPrice(to, currency)}`;
  }
  return formatPrice((from ?? to) as number, currency);
}
