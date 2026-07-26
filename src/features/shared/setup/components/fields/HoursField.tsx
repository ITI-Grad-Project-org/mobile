import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Modal, Platform } from "react-native";

import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, SafeAreaView, Text, View, useCSSVariable } from "@/tw";
import type { Field } from "../../types";
import { FieldLabel } from "./FieldLabel";


const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

type Slot = { days: string[]; start: string; end: string };

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatDays(days: string[]): string {
  const idx = DAYS.map((_, i) => i).filter((i) => days.includes(DAYS[i]));
  if (idx.length === 0) return "";
  if (idx.length === 7) return "Every day";
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (contiguous && idx.length >= 3) {
    return `${DAYS[idx[0]]}–${DAYS[idx[idx.length - 1]]}`;
  }
  return idx.map((i) => DAYS[i]).join(", ");
}

function serialize({ days, start, end }: Slot): string {
  if (!days.length) return "";
  return `${formatDays(days)} · ${to12h(start)} – ${to12h(end)}`;
}

function parseDays(part: string): string[] {
  if (/every\s*day|daily/i.test(part)) return [...DAYS];
  const range = part.match(/([A-Za-z]{3})\s*[–—-]\s*([A-Za-z]{3})/);
  if (range) {
    const from = DAYS.findIndex((d) => d.toLowerCase() === range[1].toLowerCase());
    const to = DAYS.findIndex((d) => d.toLowerCase() === range[2].toLowerCase());
    if (from >= 0 && to >= from) return DAYS.slice(from, to + 1);
  }
  return DAYS.filter((d) => new RegExp(`\\b${d}`, "i").test(part));
}

function parseTime(part: string | undefined, fallback: string): string {
  const m = part?.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return fallback;
  let hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  const suffix = m[3]?.toLowerCase();
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return fallback;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Best-effort read of a stored phrase; unrecognized text just yields defaults. */
function parseSlot(value: unknown): Slot {
  const raw = typeof value === "string" ? value : "";
  const [dayPart = "", timePart = ""] = raw.split("·").map((p) => p.trim());
  const [from, to] = timePart.split(/[–—-]/);
  return {
    days: parseDays(dayPart),
    start: parseTime(from, DEFAULT_START),
    end: parseTime(to, DEFAULT_END),
  };
}

function toDate(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function fromDate(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Bottom sheet wrapping the native time picker for one end of the range. */
function TimeSheet({
  title,
  value,
  onDone,
  onClose,
}: {
  title: string;
  value: string;
  onDone: (v: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Date>(() => toDate(value));
  const accent = useCSSVariable("--primary") as string;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/40">
        <Pressable className="rounded-t-3xl bg-background pt-2">
          <SafeAreaView edges={["bottom"]}>
            <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
              <Text className="text-[17px] font-bold text-foreground">{title}</Text>
              <Pressable onPress={() => onDone(fromDate(draft))} hitSlop={8}>
                <Text className="text-[15px] font-semibold text-primary">Done</Text>
              </Pressable>
            </View>
            <View className="items-center px-4 pb-2">
              <DateTimePicker
                value={draft}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                presentation="inline"
                accentColor={accent}
                onValueChange={(_, date) => setDraft(date)}
                style={{ width: "100%" }}
              />
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TimeButton({
  caption,
  time,
  onPress,
}: {
  caption: string;
  time: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="h-14 flex-1 flex-row items-center justify-between rounded-2xl bg-secondary px-4 active:opacity-80"
    >
      <View>
        <Text className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {caption}
        </Text>
        <Text className="text-[15px] text-foreground">{to12h(time)}</Text>
      </View>
      <Icon name="clock" size={16} color="--muted-foreground" />
    </Pressable>
  );
}

export function HoursField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: string) => void;
}) {
  const slot = parseSlot(value);
  const [editing, setEditing] = useState<"start" | "end" | null>(null);

  const commit = (next: Slot) => onChange(serialize(next));

  const toggleDay = (day: string) => {
    const days = slot.days.includes(day)
      ? slot.days.filter((d) => d !== day)
      : [...slot.days, day];
    commit({ ...slot, days });
  };

  const setTime = (which: "start" | "end", time: string) => {
    // Keep the range sane: moving one end past the other drags the other along.
    const next = { ...slot, [which]: time } as Slot;
    if (which === "start" && next.end <= time) next.end = time;
    if (which === "end" && time <= next.start) next.start = time;
    commit(next);
    setEditing(null);
  };

  const summary = serialize(slot);

  return (
    <FieldLabel label={field.label}>
      <View className="gap-3">
        <View className="flex-row flex-wrap gap-2">
          {DAYS.map((d) => {
            const on = slot.days.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => toggleDay(d)}
                className={cn(
                  "h-10 w-11 items-center justify-center rounded-full border active:opacity-80",
                  on ? "border-primary bg-primary" : "border-border bg-secondary"
                )}
              >
                <Text
                  className={cn(
                    "text-[12px] font-semibold",
                    on ? "text-primary-foreground" : "text-foreground/80"
                  )}
                >
                  {d}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row gap-2">
          <TimeButton
            caption="From"
            time={slot.start}
            onPress={() => setEditing("start")}
          />
          <TimeButton caption="To" time={slot.end} onPress={() => setEditing("end")} />
        </View>

        <Text className="text-[11.5px] text-muted-foreground">
          {summary
            ? `Clients will see: ${summary}`
            : field.helper ?? "Pick the days you coach, then your working hours."}
        </Text>
      </View>

      {editing ? (
        <TimeSheet
          title={editing === "start" ? "Start time" : "End time"}
          value={editing === "start" ? slot.start : slot.end}
          onDone={(v) => setTime(editing, v)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </FieldLabel>
  );
}
