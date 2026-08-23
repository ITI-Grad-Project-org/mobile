import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { isLocalFileUri } from './formData';

/** Long-edge cap for photos (avatar, transformations). */
export const PHOTO_MAX_EDGE = 1600;
/** Certificates are read, not glanced at — keep more pixels so text stays legible. */
export const DOCUMENT_MAX_EDGE = 2200;

const DEFAULT_QUALITY = 0.7;

export interface PrepareImageOptions {
  maxEdge?: number;
  quality?: number;
}

const cache = new Map<string, string>();

function keyFor(uri: string, maxEdge: number, quality: number): string {
  return `${uri}|${maxEdge}|${quality}`;
}

/** PDFs (and anything non-image) must pass through untouched. */
function isImageUri(uri: string): boolean {
  return !/\.(pdf|docx?)(?:\?.*)?$/i.test(uri);
}

export async function prepareImage(
  uri: string,
  { maxEdge = PHOTO_MAX_EDGE, quality = DEFAULT_QUALITY }: PrepareImageOptions = {}
): Promise<string> {
  if (!isLocalFileUri(uri) || !isImageUri(uri)) return uri;

  const key = keyFor(uri, maxEdge, quality);
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    // Render once with no actions purely to read the real dimensions — resizing
    // blind would UPSCALE an already-small image and make the file bigger.
    const source = await ImageManipulator.manipulate(uri).renderAsync();
    const longEdge = Math.max(source.width, source.height);

    // Already small enough: return it untouched. Re-encoding here would be a
    // SECOND lossy JPEG pass over a file the picker already compressed, for no
    // size win.
    if (longEdge <= maxEdge) {
      cache.set(key, uri);
      return uri;
    }

    // Constrain the LONG edge, whichever way the photo is oriented; passing a
    // single dimension lets the native side keep the aspect ratio.
    const result = await ImageManipulator.manipulate(uri)
      .resize(source.width >= source.height ? { width: maxEdge } : { height: maxEdge })
      .renderAsync()
      .then((image) => image.saveAsync({ compress: quality, format: SaveFormat.JPEG }));

    cache.set(key, result.uri);
    return result.uri;
  } catch {
    return uri;
  }
}

/** Prepare several images in parallel, preserving order. */
export function prepareImages(
  uris: readonly string[],
  options?: PrepareImageOptions
): Promise<string[]> {
  return Promise.all(uris.map((uri) => prepareImage(uri, options)));
}
