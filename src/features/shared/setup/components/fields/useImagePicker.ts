import { useCallback, useState } from "react";

import { pickMultipleImages, pickSingleImage, type PickResult } from "./pickImage";

const DENIED =
  "Photo access is off. Enable it for Uply in Settings to add photos.";

/**
 * Pick images for a setup form. Selection only — no network.
 *
 * The profile and measurement endpoints are multipart and take the files
 * directly, so the form keeps local URIs and the save does the uploading.
 * (This hook used to POST to /upload/image and store the returned URL, which
 * silently broke saving: the endpoints skip remote URLs, so no file was ever
 * attached.)
 */
export function useImagePicker() {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (pick: () => Promise<PickResult>): Promise<string[]> => {
    if (picking) return [];
    setError(null);
    setPicking(true);
    try {
      const res = await pick();
      if (res.status === "denied") {
        setError(DENIED);
        return [];
      }
      return res.status === "ok" ? res.uris : [];
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open your photo library.");
      return [];
    } finally {
      setPicking(false);
    }
  }, [picking]);

  /** Pick one photo; resolves to its local URI, or null if cancelled/denied. */
  const pickOne = useCallback(async (): Promise<string | null> => {
    const uris = await run(pickSingleImage);
    return uris[0] ?? null;
  }, [run]);

  /** Pick several photos; resolves to their local URIs. */
  const pickMany = useCallback(async (): Promise<string[]> => run(pickMultipleImages), [run]);

  return { picking, error, pickOne, pickMany };
}
