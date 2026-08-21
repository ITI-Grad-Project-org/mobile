import { Icon } from "@/shared/ui/Icon";
import { StatCell } from "@/shared/ui/StatCell";
import { Surface } from "@/shared/ui/Surface";
import { View } from "@/tw";

interface ProofStripProps {
  /** Undefined when the payload doesn't report it — renders "—", not 0. */
  clientsCoached?: number;
  yearsExperience?: number;
  /** null whenever there is nothing real to average. */
  averageRating: number | null;
  reviewCount: number;
}

/**
 * The three numbers that make the case for this coach, replacing the old
 * "0.0 (0)" star row.
 *
 * The rating slot is the whole point. An unrated coach shows a dash and
 * "NO RATINGS YET" — never 0.0, and never five hollow stars, both of which a
 * client reads as a terrible score rather than as an absent one.
 */
export function ProofStrip({
  clientsCoached,
  yearsExperience,
  averageRating,
  reviewCount,
}: ProofStripProps) {
  const rated = reviewCount > 0 && averageRating != null;

  return (
    <Surface className="flex-row px-3.5 py-3">
      <StatCell
        value={clientsCoached != null ? String(clientsCoached) : "—"}
        valueClassName={clientsCoached != null ? undefined : "text-muted-foreground"}
        label="Clients coached"
      />

      <Divider />

      <StatCell
        value={yearsExperience != null ? String(yearsExperience) : "—"}
        unit={yearsExperience != null ? "yrs" : undefined}
        valueClassName={yearsExperience != null ? undefined : "text-muted-foreground"}
        label="Experience"
      />

      <Divider />

      <StatCell
        value={rated ? averageRating.toFixed(1) : "—"}
        valueClassName={rated ? undefined : "text-muted-foreground"}
        trailing={rated ? <Icon name="star" size={12} color="--star" /> : undefined}
        label={
          rated ? `${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}` : "No ratings yet"
        }
      />
    </Surface>
  );
}

/** A hairline, not a gap — the three cells have to read as one instrument. */
function Divider() {
  return <View className="mx-3 w-px bg-border" />;
}
