import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Modal } from "react-native";

import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { toLocalIsoDate } from "@/shared/utils/date";
import { Pressable, SafeAreaView, Text, View, useCSSVariable } from "@/tw";
import type { Field } from "../../types";
import { FieldLabel } from "./FieldLabel";

// Stores the value as an ISO "YYYY-MM-DD" string (same shape the web form used).
// Tapping opens a bottom sheet with the native @expo/ui DateTimePicker inline —
// the app's first @expo/ui Host island (className does not cross the Host).

const toISODate = toLocalIsoDate;

function parseISODate(s: unknown): Date {
  if (typeof s === "string" && s) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function formatLabel(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DateField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseISODate(value));
  const selected = typeof value === "string" ? value : "";
  const accent = useCSSVariable("--primary") as string;

  const openSheet = () => {
    setDraft(parseISODate(value));
    setOpen(true);
  };

  const done = () => {
    onChange(toISODate(draft));
    setOpen(false);
  };

  return (
    <FieldLabel label={field.label}>
      <Pressable
        onPress={openSheet}
        className="h-14 flex-row items-center justify-between rounded-2xl bg-secondary px-4 active:opacity-80"
      >
        <Text
          className={cn(
            "text-[15px]",
            selected ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {selected ? formatLabel(selected) : field.placeholder || "Select a date"}
        </Text>
        <Icon name="clock" size={18} color="--muted-foreground" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 justify-end bg-black/40"
        >
          <Pressable className="rounded-t-3xl bg-background pt-2">
            <SafeAreaView edges={["bottom"]}>
              <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
                <Text className="text-[17px] font-bold text-foreground">
                  {field.label}
                </Text>
                <Pressable onPress={done} hitSlop={8}>
                  <Text className="text-[15px] font-semibold text-primary">
                    Done
                  </Text>
                </Pressable>
              </View>
              <View className="items-center px-4 pb-2">
                <DateTimePicker
                  value={draft}
                  mode="date"
                  display="inline"
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
    </FieldLabel>
  );
}
