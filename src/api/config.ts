export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://api.20.54.71.51.nip.io';

// Web dashboard, where plan authoring lives — the app can read plans but not
// build them. Empty means "not configured": every link to it stays hidden.
export const DASHBOARD_URL = process.env.EXPO_PUBLIC_DASHBOARD_URL || '';
