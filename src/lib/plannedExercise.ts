export interface PlannedExerciseInfo {
  /** Library exercise id — not the planned-exercise (prescription) id. */
  exerciseId?: string;
  name: string;
  muscle: string;
  /** Still image for the card/hero. May be empty. */
  image: string;
  instructions: string[];
  gifUrl: string;
  videoUrl: string;
  coachNotes: string;
  equipment: string[];
}

function firstString(...values: any[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return "";
}

export function plannedExerciseInfo(item: any, index = 0): PlannedExerciseInfo {
  const source = item?.exercise ?? item;
  const equipment = source?.equipment ?? item?.equipment;

  return {
    exerciseId: item?.exerciseId || source?.id || undefined,
    name: firstString(
      item?.exerciseName,
      source?.name,
      item?.name,
      `Exercise ${index + 1}`
    ),
    muscle: firstString(source?.primaryMuscle, item?.primaryMuscle, item?.muscle, "Full Body"),
    image: firstString(source?.thumbnailUrl, item?.thumbnailUrl, item?.image),
    instructions:
      source?.instructionSteps ?? item?.instructionSteps ?? item?.instructions ?? [],
    gifUrl: firstString(source?.demoGifUrl, item?.demoGifUrl, item?.gifUrl),
    videoUrl: firstString(source?.demoVideoUrl, item?.demoVideoUrl, item?.videoUrl),
    // The exercise-level note from the coach; a day-level note is separate.
    coachNotes: firstString(item?.coachNotes, source?.coachNotes),
    equipment: Array.isArray(equipment) ? equipment.filter(Boolean) : [],
  };
}
