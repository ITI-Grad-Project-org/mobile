/**
 * Which training program is the client actually on *today*?
 *
 * `GET /client/me/training/programs` returns every program the client has —
 * finished, running and already-scheduled — in no guaranteed order. Taking
 * `programs[0]` means the moment a coach schedules the next block, the client
 * can be shown a program that has not started yet while the current one is
 * still running. The pick has to be made from the schedule, not the position.
 */

type Raw = any;

/** Local YYYY-MM-DD — the schedule is in the client's own calendar days. */
export function localIsoToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function isoOf(value: unknown): string | null {
  return typeof value === "string" && value ? value.split("T")[0] : null;
}

/** Date-only compare, so no timezone shift can move a boundary day. */
function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86_400_000);
}

function addDays(iso: string, count: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + count));
  return date.toISOString().slice(0, 10);
}

function startIso(program: Raw): string | null {
  return isoOf(program?.startDate ?? program?.startsAt ?? program?.scheduledStartDate);
}

/**
 * The last day the program covers, inclusive. Falls back to
 * start + durationWeeks — a program without either can only be dated by its start.
 */
function endIso(program: Raw): string | null {
  const explicit = isoOf(program?.endDate ?? program?.endsAt ?? program?.scheduledEndDate);
  if (explicit) return explicit;

  const start = startIso(program);
  const weeks = program?.durationWeeks;
  if (start && typeof weeks === "number" && weeks > 0) return addDays(start, weeks * 7 - 1);
  return null;
}

/** Programs a client should never be shown as their plan. */
function isEligible(program: Raw): boolean {
  if (!program?.id) return false;
  if (program?.isArchived) return false;
  const status = typeof program?.status === "string" ? program.status.toLowerCase() : null;
  return status !== "cancelled" && status !== "draft";
}

type Phase = "active" | "scheduled" | "ended" | "unknown";

/**
 * Where today sits relative to the program. Dates win over the server's
 * `schedulePhase` because the phase is computed server-side and can lag a day
 * around a rollover; the phase is only the fallback when there are no dates.
 */
export function programPhase(program: Raw, todayIso = localIsoToday()): Phase {
  const start = startIso(program);
  const end = endIso(program);

  if (start) {
    if (daysBetween(todayIso, start) > 0) return "scheduled";
    if (end && daysBetween(end, todayIso) > 0) return "ended";
    return "active";
  }

  const declared =
    typeof program?.schedulePhase === "string" ? program.schedulePhase.toLowerCase() : null;
  if (declared === "active" || declared === "scheduled" || declared === "ended") return declared;
  return "unknown";
}

/**
 * The program to render as "my plan".
 *
 * Preference order: the one running today, then whatever `/programs/current`
 * says, then the next one due to start, then the most recently finished — so a
 * client between blocks still sees something rather than an empty plan tab.
 */
export function selectActiveProgram(
  programs: Raw[] | undefined,
  currentProgram?: Raw,
  todayIso = localIsoToday()
): Raw | undefined {
  const candidates = (Array.isArray(programs) ? programs : []).filter(isEligible);

  // `/programs/current` may return a program the list omitted, so it competes
  // as a candidate too rather than only acting as a fallback.
  if (currentProgram?.id && !candidates.some((p) => p.id === currentProgram.id)) {
    if (isEligible(currentProgram)) candidates.push(currentProgram);
  }

  if (candidates.length === 0) return isEligible(currentProgram) ? currentProgram : undefined;

  const phased = candidates.map((program) => ({
    program,
    phase: programPhase(program, todayIso),
    start: startIso(program),
    end: endIso(program),
  }));

  // Running today — the latest-starting one wins if a coach overlapped two.
  const running = phased.filter((p) => p.phase === "active" || p.phase === "unknown");
  if (running.length > 0) {
    return running.sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""))[
      running.length - 1
    ].program;
  }

  if (currentProgram?.id && isEligible(currentProgram)) return currentProgram;

  // Nothing running: the next block that starts, else the one that just ended.
  const upcoming = phased
    .filter((p) => p.phase === "scheduled")
    .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
  if (upcoming.length > 0) return upcoming[0].program;

  const ended = phased
    .filter((p) => p.phase === "ended")
    .sort((a, b) => (a.end ?? a.start ?? "").localeCompare(b.end ?? b.start ?? ""));
  if (ended.length > 0) return ended[ended.length - 1].program;

  return candidates[0];
}
