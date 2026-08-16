import { cn } from "@/lib/utils";
import { Surface } from "@/shared/ui/Surface";
import { Text } from "@/tw";
import type { ReactNode } from "react";

import { DASH } from "../lib/format";
import { Sparkline } from "./Sparkline";

interface StatTileProps {
  /**
   * Pre-formatted. null renders a dash — never coerce a null Pct to 0.
   * Omit entirely when `children` supplies the body instead.
   */
  value?: string | null;
  label: string;
  tone?: "default" | "success";
  /** Omit for no sparkline. Ignored when value is null. */
  sparkline?: number[];
  className?: string;
  /** Replaces the single value line — used by the per-currency MRR body. */
  children?: ReactNode;
}

/**
 * One of the three tiles above the roster strip.
 *
 * Not StatCell: that one is 16px/10.5px and lives inside plan cards. This is
 * 19px/9.5px with a sparkline layer behind the text, so it's a sibling rather
 * than a variant — bending StatCell into both would break the Plans screens.
 */
export function StatTile({
  value,
  label,
  tone = "default",
  sparkline,
  className,
  children,
}: StatTileProps) {
  // A null value means there was no denominator, so there is no trend to draw
  // either — a flat line at zero would read as "0% adherent".
  const showSparkline = value !== null && sparkline && sparkline.length > 0;

  return (
    <Surface
      radius="md"
      glass
      className={cn("relative flex-1 items-start gap-[5px] overflow-hidden px-3 py-[11px]", className)}
    >
      {showSparkline ? (
        <Sparkline data={sparkline} className="absolute inset-x-0 bottom-0 h-[26px] opacity-50" />
      ) : null}

      {children ?? (
        <Text
          className={cn(
            "relative text-[19px] font-bold leading-none tracking-[-0.02em]",
            value === null
              ? "text-muted-foreground"
              : tone === "success"
                ? "text-success"
                : "text-foreground"
          )}
        >
          {value ?? DASH}
        </Text>
      )}

      <Text className="relative text-[9.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </Text>
    </Surface>
  );
}
StatTile.displayName = "StatTile";
