import * as SecureStore from "expo-secure-store";

const PREFIX = "uply.hasOnboarded";

const ALWAYS_SHOW_ONBOARDING = false;

function formatKey(emailOrId?: string): string {
  if (!emailOrId) return PREFIX;
  const sanitized = emailOrId.toLowerCase().trim().replace(/[^a-zA-Z0-9_.-]/g, "_");
  return `${PREFIX}.${sanitized}`;
}

export async function markOnboarded(emailOrId?: string): Promise<void> {
  let target = emailOrId;
  if (!target) {
    target = (await SecureStore.getItemAsync("userEmail")) || undefined;
  }
  if (target) {
    await SecureStore.setItemAsync(formatKey(target), "1");
  }
  // Also set base key as fallback
  await SecureStore.setItemAsync(PREFIX, "1");
}

export async function resetOnboarded(emailOrId?: string): Promise<void> {
  let target = emailOrId;
  if (!target) {
    target = (await SecureStore.getItemAsync("userEmail")) || undefined;
  }
  if (target) {
    await SecureStore.deleteItemAsync(formatKey(target));
  }
}

export async function hasOnboarded(emailOrId?: string): Promise<boolean> {
  if (ALWAYS_SHOW_ONBOARDING) return false;
  let target = emailOrId;
  if (!target) {
    target = (await SecureStore.getItemAsync("userEmail")) || undefined;
  }
  if (target) {
    const val = await SecureStore.getItemAsync(formatKey(target));
    return val === "1";
  }
  return false;
}
