/**
 * Alpha for a color that came out of a CSS variable.
 *
 * Class names can express `bg-lilac/35` themselves, but gradient stops are a JS
 * prop, so a translucent stop has to be built here. lightningcss compiles the
 * theme's oklch down to hex for native, so hex and rgb() are the shapes worth
 * handling; anything else is returned untouched rather than guessed at.
 */
export function withAlpha(color: string | undefined, alpha: number): string {
  if (!color) return "transparent";
  const value = color.trim();

  const hex = /^#([0-9a-f]{3,8})$/i.exec(value);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = digits
        .split("")
        .map((char) => char + char)
        .join("");
    }
    const r = parseInt(digits.slice(0, 2), 16);
    const g = parseInt(digits.slice(2, 4), 16);
    const b = parseInt(digits.slice(4, 6), 16);
    const existing = digits.length >= 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
    return `rgba(${r}, ${g}, ${b}, ${existing * alpha})`;
  }

  const fn = /rgba?\(([^)]+)\)/i.exec(value);
  if (fn) {
    const parts = fn[1].split(/[, /]+/).filter(Boolean).map(Number);
    if (parts.length >= 3) {
      const existing = parts[3] ?? 1;
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${existing * alpha})`;
    }
  }

  return value;
}
