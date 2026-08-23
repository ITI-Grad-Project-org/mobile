export function fullName(...parts: (string | null | undefined)[]): string {
  return parts
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

/** second usable name part — for greetings ("Hey Alex"). */
export function secondNameOf(...parts: (string | null | undefined)[]): string {
  return fullName(...parts).split(" ")[1] ?? "";
}
