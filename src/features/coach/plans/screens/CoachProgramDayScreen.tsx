import {
  useGetProgramDayLogQuery,
  useGetProgramQuery,
} from "@/api/endpoints/programs.endpoints";
import { isDayCompleted } from "@/lib/logState";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { Card } from "@/shared/ui/Card";
import { Icon } from "@/shared/ui/Icon";
import { PlanDetailHeader } from "@/shared/ui/PlanDetailHeader";
import { SectionHeader } from "@/shared/ui/SectionHeader";
import { ScrollView, Text, View } from "@/tw";
import { useMemo } from "react";
import { NotLoggedYet, PlanLoading, PlanNotFound } from "../components/PlanStates";
import { exercisesOf, findDayById, formatDayDate, setsOf } from "../lib/coachPlanDays";
import { humanize, normalizePlan } from "../lib/normalizePlan";

interface CoachProgramDayScreenProps {
  programId: string;
  programDayId: string;
}

/**
 * One prescribed training day, plus whatever came back from the client.
 *
 * The prescription is read out of the parent program's cached payload — this
 * screen re-subscribes to the same query rather than asking for the day again —
 * so opening a day is instant. Only the log is a fresh request.
 */
export function CoachProgramDayScreen({ programId, programDayId }: CoachProgramDayScreenProps) {
  const { tenantId } = useActiveTenant();

  const { data, isLoading, isError } = useGetProgramQuery(
    { tenantId: tenantId ?? "", programId },
    { skip: !tenantId || !programId }
  );

  const log = useGetProgramDayLogQuery(
    { tenantId: tenantId ?? "", programId, programDayId },
    { skip: !tenantId || !programId || !programDayId }
  );

  const plan = useMemo(() => normalizePlan(data, "training"), [data]);
  const day = useMemo(() => findDayById(data, programDayId), [data, programDayId]);
  const exercises = useMemo(() => exercisesOf(day), [day]);

  if (isLoading) return <PlanLoading label="Loading day…" />;

  if (isError || !day) {
    return (
      <PlanNotFound
        title="Day not found"
        hint="This training day is no longer part of the program."
      />
    );
  }

  const dayNumber = Number(day?.dayNumber ?? day?.position ?? 0);
  const title = day?.name || day?.title || (dayNumber ? `Day ${dayNumber}` : "Training day");
  const date = formatDayDate(day?.scheduledDate ?? day?.date ?? null);
  const isRest = Boolean(day?.isRestDay || day?.isRest || day?.type === "rest");

  const tags = [date, plan?.client?.name ?? null, isRest ? "rest day" : null].filter(
    Boolean
  ) as string[];

  // The log payload is undocumented: read one completion flag off it, and treat
  // anything else missing as "nothing came back".
  const logged = isDayCompleted(log.data) || isDayCompleted(day);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-20"
      showsVerticalScrollIndicator={false}
    >
      <PlanDetailHeader
        eyebrow={plan?.name ?? "Training program"}
        tone="lilac"
        title={title}
        subtitle={day?.notes || day?.coachNotes || null}
        tags={tags}
      />

      <View className="gap-y-4 p-4">
        {isRest || exercises.length === 0 ? (
          <Card glass className="items-center py-8">
            <Icon name={isRest ? "moon" : "clipboard-list"} size={26} color="--muted-foreground" />
            <Text className="mt-2 text-[14px] font-semibold text-foreground">
              {isRest ? "Rest day" : "Nothing prescribed"}
            </Text>
            <Text className="mt-1 text-[12px] text-muted-foreground">
              {isRest
                ? "No training is scheduled for this day."
                : "Add exercises to this day on the dashboard."}
            </Text>
          </Card>
        ) : (
          <View className="gap-y-2.5">
            <SectionHeader
              label="Prescribed"
              hint={`${exercises.length} ${exercises.length === 1 ? "exercise" : "exercises"}`}
            />
            {exercises.map((exercise: any, index: number) => (
              <ExerciseCard key={String(exercise?.id ?? index)} exercise={exercise} />
            ))}
          </View>
        )}

        <View className="gap-y-2.5">
          <SectionHeader label="What the client did" hint={logged ? "logged" : null} />
          {log.isLoading ? (
            <View className="items-center py-6">
              <Text className="text-[12px] text-muted-foreground">Loading log…</Text>
            </View>
          ) : log.isError || !log.data ? (
            <NotLoggedYet noun="workout" />
          ) : (
            <WorkoutLogCard log={log.data} logged={logged} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function ExerciseCard({ exercise }: { exercise: any }) {
  const name =
    exercise?.exercise?.name || exercise?.name || exercise?.exerciseName || "Exercise";
  const chips = [
    humanize(exercise?.exercise?.primaryMuscle ?? exercise?.primaryMuscle),
    humanize(exercise?.exercise?.equipment ?? exercise?.equipment),
  ].filter(Boolean) as string[];
  const sets = setsOf(exercise);
  const notes = exercise?.coachNotes || exercise?.notes || null;

  return (
    <Card glass className="p-4">
      <Text className="text-[14.5px] font-semibold text-foreground">{name}</Text>

      {chips.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {chips.map((chip) => (
            <View key={chip} className="rounded-full bg-secondary px-2.5 py-0.5">
              <Text className="text-[10.5px] font-medium capitalize text-muted-foreground">
                {chip}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {sets.length > 0 ? (
        <View className="mt-3 gap-y-1.5">
          {sets.map((set: any, index: number) => (
            <View
              key={String(set?.id ?? index)}
              className="flex-row items-center gap-x-3 rounded-xl bg-secondary/50 px-3 py-2"
            >
              <Text className="w-10 shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Set {set?.setNumber ?? index + 1}
              </Text>
              <Text
                className="flex-1 text-[13px] text-foreground"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {describeSet(set)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="mt-2 text-[12px] text-muted-foreground">No sets prescribed.</Text>
      )}

      {notes ? (
        <Text className="mt-3 text-[12px] leading-5 text-muted-foreground">{notes}</Text>
      ) : null}
    </Card>
  );
}

/** "10 reps · 60 kg · RPE 8 · 90s rest" from whichever fields the set carries. */
function describeSet(set: any): string {
  const parts = [
    set?.reps != null ? `${set.reps} reps` : null,
    set?.weightKg != null ? `${set.weightKg} kg` : set?.weight != null ? `${set.weight} kg` : null,
    set?.durationSeconds != null ? `${set.durationSeconds}s` : null,
    set?.distanceM != null ? `${set.distanceM} m` : null,
    set?.rpe != null ? `RPE ${set.rpe}` : null,
    set?.tempo ? `tempo ${set.tempo}` : null,
    set?.restSeconds != null ? `${set.restSeconds}s rest` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "As prescribed";
}

function WorkoutLogCard({ log, logged }: { log: any; logged: boolean }) {
  const duration = log?.durationMinutes ?? log?.workoutLog?.durationMinutes ?? null;
  const notes = log?.notes ?? log?.workoutLog?.notes ?? null;
  const loggedExercises = Array.isArray(log?.exercises)
    ? log.exercises
    : Array.isArray(log?.loggedExercises)
      ? log.loggedExercises
      : [];

  if (!logged && loggedExercises.length === 0 && duration == null && !notes) {
    return <NotLoggedYet noun="workout" />;
  }

  return (
    <Card glass className="p-4 gap-y-2">
      <View className="flex-row items-center gap-x-2">
        <Icon name={logged ? "check" : "clock"} size={15} color={logged ? "--mint-ink" : "--muted-foreground"} />
        <Text className="text-[13.5px] font-semibold text-foreground">
          {logged ? "Workout completed" : "Partially logged"}
        </Text>
      </View>

      {duration != null ? (
        <Text className="text-[12.5px] text-muted-foreground">{duration} minutes</Text>
      ) : null}

      {loggedExercises.length > 0 ? (
        <View className="mt-1 gap-y-1">
          {loggedExercises.map((entry: any, index: number) => (
            <Text key={String(entry?.id ?? index)} className="text-[12.5px] text-muted-foreground">
              {entry?.exercise?.name || entry?.name || "Exercise"} —{" "}
              {Array.isArray(entry?.sets) ? `${entry.sets.length} sets logged` : "logged"}
            </Text>
          ))}
        </View>
      ) : null}

      {notes ? (
        <Text className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{notes}</Text>
      ) : null}
    </Card>
  );
}
