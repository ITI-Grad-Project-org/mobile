import * as SecureStore from "expo-secure-store";

const DONE_KEY = "uply.hasCompletedProfile";
const DATA_KEY = "uply.profile";

const ALWAYS_SHOW_SETUP = true;

export async function markProfileComplete(
  data?: Record<string, unknown>
): Promise<void> {
  if (data) {
    try {
      await SecureStore.setItemAsync(DATA_KEY, JSON.stringify(data));
    } catch {
      // Ignore — a huge base64 image or circular value shouldn't block the flow.
    }
  }
  await SecureStore.setItemAsync(DONE_KEY, "1");
}

export async function hasCompletedProfile(): Promise<boolean> {
  if (ALWAYS_SHOW_SETUP) return false;
  return (await SecureStore.getItemAsync(DONE_KEY)) === "1";
}

export async function loadProfile<T = Record<string, unknown>>(): Promise<
  T | null
> {
  const raw = await SecureStore.getItemAsync(DATA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
