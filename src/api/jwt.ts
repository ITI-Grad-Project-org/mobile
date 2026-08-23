/**
 * Read a JWT's claims WITHOUT verifying it. Diagnostics only — never a
 * security decision: the server re-verifies every token on every request.
 *
 * Hand-rolled because Hermes has no Buffer and `atob` is not guaranteed across
 * the RN/Hermes versions this app runs on.
 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64Url(part: string): string | null {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const ch of b64) {
    if (ch === '=') break;
    const value = B64.indexOf(ch);
    if (value < 0) return null;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  try {
    // Percent-decoding is the shortest correct path from bytes to UTF-8 text.
    return decodeURIComponent(
      bytes.map((b) => `%${b.toString(16).padStart(2, '0')}`).join('')
    );
  } catch {
    return null;
  }
}

export function decodeJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const json = decodeBase64Url(parts[1]);
  if (!json) return null;
  try {
    const claims = JSON.parse(json);
    return claims && typeof claims === 'object' ? claims : null;
  } catch {
    return null;
  }
}

/**
 * Claim names differ between the coach and customer token services, so read
 * every spelling either could use before concluding a token carries no tenant.
 */
const TENANT_CLAIMS = ['tenantId', 'tenant_id', 'tenant', 'tid', 'activeTenantId'];

/**
 * Which tenant this token is scoped to, `null` when it names none (a customer
 * who registered before joining any coach) and `undefined` when the token
 * cannot be read at all — a distinction callers act on differently.
 */
export function tokenTenantId(token: string): string | null | undefined {
  const claims = decodeJwtClaims(token);
  if (!claims) return undefined;
  for (const key of TENANT_CLAIMS) {
    const value = claims[key];
    if (typeof value === 'string' && value) return value;
    // Some services nest the whole tenant object rather than its id.
    if (value && typeof value === 'object') {
      const id = (value as { id?: unknown }).id;
      if (typeof id === 'string' && id) return id;
    }
  }
  return null;
}

/**
 * The claims that explain an "Invalid token type" / "Forbidden" 401: which
 * surface the token was minted for, and which tenant it is scoped to. Claim
 * names differ between the coach and customer token services, so read every
 * spelling either could use rather than reporting "unknown" for the one that
 * matters.
 */
export function describeToken(token: string | null): string {
  if (!token) return 'no token';
  const claims = decodeJwtClaims(token);
  if (!claims) return 'unreadable token';

  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = claims[key];
      if (value !== undefined && value !== null && value !== '') return String(value);
    }
    return '—';
  };

  const exp = typeof claims.exp === 'number' ? claims.exp * 1000 : null;
  return [
    `type=${pick('type', 'tokenType', 'typ', 'kind')}`,
    `persona=${pick('persona', 'accountType', 'userType')}`,
    `role=${pick('role')}`,
    `tenant=${pick('tenantId', 'tenant_id', 'tenant', 'tid')}`,
    `sub=${pick('sub', 'userId', 'id')}`,
    exp ? `exp=${exp < Date.now() ? 'EXPIRED' : new Date(exp).toISOString()}` : 'exp=—',
  ].join(' ');
}
