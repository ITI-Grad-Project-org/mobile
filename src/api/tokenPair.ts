/**
 * The token-pair readers are shared because `switch-tenant` is untyped on the
 * server (no OpenAPI response schema): accept the shapes it could plausibly
 * use rather than silently skipping the token swap when the payload arrives
 * nested or snake_cased.
 */
export function readTokenPair(
  res: unknown
): { accessToken: string; refreshToken: string } | null {
  // `any`: an undocumented response with no OpenAPI schema — the point of this
  // function is to probe the shapes it might have.
  const root = res as any;
  for (const bag of [root, root?.tokens, root?.data, root?.data?.tokens]) {
    const accessToken = bag?.accessToken ?? bag?.access_token;
    const refreshToken = bag?.refreshToken ?? bag?.refresh_token;
    if (typeof accessToken === 'string' && typeof refreshToken === 'string') {
      return { accessToken, refreshToken };
    }
  }
  return null;
}
