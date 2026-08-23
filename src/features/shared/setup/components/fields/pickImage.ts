import * as ImagePicker from "expo-image-picker";

import { prepareImages } from "@/api/imagePrep";


const IMAGE_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.7,
  // Nothing renders EXIF, and dropping it sheds bytes along with the photo's
  // embedded GPS coordinates.
  exif: false,
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

/**
 * Pick a single image. `maxEdge` overrides the downscale cap — certificate
 * scans are read rather than glanced at, so they keep more pixels than a photo.
 */
export async function pickSingleImage(maxEdge?: number): Promise<PickResult> {
  if (!(await ensurePermission())) return { status: "denied" };
  const res = await ImagePicker.launchImageLibraryAsync(IMAGE_OPTIONS);
  if (res.canceled || res.assets.length === 0) return { status: "cancelled" };
  const [uri] = await prepareImages([res.assets[0].uri], { maxEdge });
  return { status: "ok", uris: [uri] };
}

/** Pick one or more images. */
export async function pickMultipleImages(): Promise<PickResult> {
  if (!(await ensurePermission())) return { status: "denied" };
  const res = await ImagePicker.launchImageLibraryAsync({
    ...IMAGE_OPTIONS,
    allowsMultipleSelection: true,
  });
  if (res.canceled || res.assets.length === 0) return { status: "cancelled" };
  return { status: "ok", uris: await prepareImages(res.assets.map((a) => a.uri)) };
}
