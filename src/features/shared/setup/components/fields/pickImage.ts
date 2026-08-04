import * as ImagePicker from "expo-image-picker";

// Thin wrappers around expo-image-picker that return LOCAL file URIs.
//
// Nothing is uploaded here. The profile and measurement endpoints take
// multipart/form-data and attach the files themselves, so the form holds local
// URIs until save. Pre-uploading and storing the returned URL would make those
// endpoints skip the file — a remote URL is a value to keep, not a file to send.

const IMAGE_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.7,
};

/**
 * `denied` is distinct from `cancelled` on purpose: a silent no-op after the
 * user taps "Upload photo" reads as a broken button.
 */
export type PickResult =
  | { status: "ok"; uris: string[] }
  | { status: "cancelled" }
  | { status: "denied" };

async function ensurePermission(): Promise<boolean> {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return granted;
}

/** Pick a single image. */
export async function pickSingleImage(): Promise<PickResult> {
  if (!(await ensurePermission())) return { status: "denied" };
  const res = await ImagePicker.launchImageLibraryAsync(IMAGE_OPTIONS);
  if (res.canceled || res.assets.length === 0) return { status: "cancelled" };
  return { status: "ok", uris: [res.assets[0].uri] };
}

/** Pick one or more images. */
export async function pickMultipleImages(): Promise<PickResult> {
  if (!(await ensurePermission())) return { status: "denied" };
  const res = await ImagePicker.launchImageLibraryAsync({
    ...IMAGE_OPTIONS,
    allowsMultipleSelection: true,
  });
  if (res.canceled || res.assets.length === 0) return { status: "cancelled" };
  return { status: "ok", uris: res.assets.map((a) => a.uri) };
}
