import { useCallback, useState } from "react";

import { UploadError, uploadImage } from "@/api/endpoints/upload.endpoints";
import { useUploadPersona } from "../../uploadContext";
import { pickMultipleImages, pickSingleImage } from "./pickImage";

function message(e: unknown): string {
  if (e instanceof UploadError) {
    if (e.status === 401 || e.status === 403) {
      return "Your session expired. Sign in again to upload photos.";
    }
    if (e.status === 413) return "That photo is too large. Try a smaller one.";
    if (e.status >= 500) return `Photo storage is down — ${e.message}`;
    return e.message;
  }
  const m = e instanceof Error ? e.message : String(e);
  return m || "Couldn't upload that photo. Tap to retry.";
}

export function useImageUpload() {
  const persona = useUploadPersona();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Pick one photo and resolve to its uploaded URL (null = cancelled/failed). */
  const pickAndUpload = useCallback(async (): Promise<string | null> => {
    const local = await pickSingleImage();
    if (!local) return null;
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadImage(local, persona);
      return url;
    } catch (e) {
      setError(message(e));
      return null;
    } finally {
      setUploading(false);
    }
  }, [persona]);

  /** Pick several photos; resolves to the URLs that uploaded successfully. */
  const pickAndUploadMany = useCallback(async (): Promise<string[]> => {
    const locals = await pickMultipleImages();
    if (!locals.length) return [];
    setError(null);
    setUploading(true);
    try {
      const results = await Promise.allSettled(
        locals.map((uri) => uploadImage(uri, persona))
      );
      const urls = results
        .filter((r): r is PromiseFulfilledResult<{ url: string; key: string }> =>
          r.status === "fulfilled"
        )
        .map((r) => r.value.url);
      const firstFailure = results.find((r) => r.status === "rejected");
      if (firstFailure?.status === "rejected") {
        const failed = results.length - urls.length;
        setError(
          `${failed} of ${results.length} photos failed. ${message(firstFailure.reason)}`
        );
      }
      return urls;
    } finally {
      setUploading(false);
    }
  }, [persona]);

  return { uploading, error, pickAndUpload, pickAndUploadMany };
}
