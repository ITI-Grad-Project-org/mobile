import * as ImagePicker from "expo-image-picker";

// Thin wrappers around expo-image-picker that return local file URIs (or []).
// Permission is requested lazily on first use; a denied prompt just yields no
// selection rather than throwing.

const IMAGE_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.7,
};

async function ensurePermission(): Promise<boolean> {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return granted;
}

/** Pick a single image; resolves to its URI, or null if cancelled/denied. */
export async function pickSingleImage(): Promise<string | null> {
  if (!(await ensurePermission())) return null;
  const res = await ImagePicker.launchImageLibraryAsync(IMAGE_OPTIONS);
  if (res.canceled || res.assets.length === 0) return null;
  return res.assets[0].uri;
}

/** Pick one or more images; resolves to their URIs, or [] if cancelled/denied. */
export async function pickMultipleImages(): Promise<string[]> {
  if (!(await ensurePermission())) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    ...IMAGE_OPTIONS,
    allowsMultipleSelection: true,
  });
  if (res.canceled) return [];
  return res.assets.map((a) => a.uri);
}
