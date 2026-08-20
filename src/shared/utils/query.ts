import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

/**
 * The slice of an RTK Query result these helpers read. Deliberately structural
 * so any `useXQuery()` result can be passed without naming its data type.
 */
export interface QueryStatus {
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isUninitialized: boolean;
  error?: unknown;
}

/**
 * Is this read still owed an answer?
 *
 * `isUninitialized` matters as much as `isLoading` for a chained query — one
 * whose argument comes out of another query, and is therefore skipped until that
 * argument exists. RTK Query only flips a just-un-skipped query to `isLoading`
 * in an effect AFTER the render that un-skipped it, so reading `isLoading` alone
 * calls the screen ready for a frame with the dependent data still missing.
 * That frame is what makes a section pop in a beat after the rest.
 *
 * `expected` is the caller's answer to "should this query run at all?" — pass
 * the same condition the `skip` option is built from, inverted.
 */
export function isPending(query: QueryStatus, expected = true): boolean {
  if (!expected) return false;
  return query.isLoading || query.isUninitialized;
}

/**
 * A failure worth replacing the screen for.
 *
 * 400 ("Client has no active tenant selected") and 404 ("Active client
 * membership not found") are the shapes every /client/me/* route takes for a
 * client who hasn't joined a coach yet — a state, not a fault. Rendering those
 * as "couldn't load" tells a fresh sign-up something broke when nothing did;
 * they should fall through to the empty states instead. See ProgressScreen,
 * which draws the same line by hand.
 *
 * Note this is a CLIENT-side rule. On the coach side a 404 means the tenant
 * scoping is wrong and must stay visible — see useCoachHomeAnalytics.
 */
export function isHardError(query: QueryStatus): boolean {
  if (!query.isError) return false;
  const status = (query.error as FetchBaseQueryError | undefined)?.status;
  return status !== 400 && status !== 404;
}
