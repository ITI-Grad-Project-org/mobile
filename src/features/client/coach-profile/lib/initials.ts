/** First letters of the first two words, uppercased. "—" when there's nothing. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "—";
}
