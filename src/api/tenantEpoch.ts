/**
 * Monotonic counter bumped the moment a tenant switch swaps the access token.
 *
 * Every request captures the epoch it started under. `resetApiState()` clears
 * the cache, but it does NOT abort requests already in flight — those resolve
 * afterwards and RTK Query happily writes them back into the freshly cleared
 * cache, which is how a newly mounted screen ends up rendering the PREVIOUS
 * tenant's data. Comparing the epoch on the way out lets the base query drop
 * any response that was fetched under the old token.
 */
let epoch = 0;

export const currentTenantEpoch = () => epoch;

export const bumpTenantEpoch = () => {
  epoch += 1;
  return epoch;
};
