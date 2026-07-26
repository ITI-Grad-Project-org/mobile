import * as SecureStore from "expo-secure-store";

// Persists whether the client has seen the onboarding walkthrough. Non-sensitive,
// but we use SecureStore (already a dependency) to avoid adding AsyncStorage.
const KEY = "uply.hasOnboarded";

// TEMP (dev only): set to true to always re-show onboarding, ignoring the saved
// flag. Remove / set back to false before shipping.
const ALWAYS_SHOW_ONBOARDING = false;

export async function markOnboarded(): Promise<void> {
  await SecureStore.setItemAsync(KEY, "1");
}

export async function resetOnboarded(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

export async function hasOnboarded(): Promise<boolean> {
  if (ALWAYS_SHOW_ONBOARDING) return false;
  return (await SecureStore.getItemAsync(KEY)) === "1";
}
