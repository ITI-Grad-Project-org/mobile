import { uploadImage } from "@/api/endpoints/upload.endpoints";

type Persona = "coach" | "client";

function isRemote(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

export async function resolveImage(
  uri: unknown,
  persona: Persona
): Promise<string | undefined> {
  if (typeof uri !== "string" || !uri.trim()) return undefined;
  if (isRemote(uri)) return uri;
  const { url } = await uploadImage(uri, persona);
  return url;
}

export async function resolveImages(
  uris: unknown,
  persona: Persona
): Promise<string[]> {
  if (!Array.isArray(uris)) return [];
  const resolved = await Promise.all(uris.map((u) => resolveImage(u, persona)));
  return resolved.filter((u): u is string => Boolean(u));
}
