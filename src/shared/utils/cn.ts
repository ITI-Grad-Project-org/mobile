import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names, resolving conflicts (later wins).
 * Used with the `@/tw` className wrappers.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
