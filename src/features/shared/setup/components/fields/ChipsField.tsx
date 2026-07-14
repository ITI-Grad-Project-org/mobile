import { cn } from "@/lib/utils";
import { Pressable, Text, View } from "@/tw";
import type { Field } from "../../types";
import { FieldLabel } from "./FieldLabel";

// Multi- (or single-, when field.multi === false) select pill row.
// Pill styling matches the category chips in ClientsScreen.

export function ChipsField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: string[]) => void;
}) {
  const arr: string[] = Array.isArray(value) ? (value as string[]) : [];

  const toggle = (opt: string) => {
    if (field.multi === false) {
      onChange([opt]);
      return;
    }
    onChange(arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]);
  };

  return (
    <FieldLabel label={field.label}>
      <View className="flex-row flex-wrap gap-2">
        {field.options?.map((o) => {
          const on = arr.includes(o);
          return (
            <Pressable
              key={o}
              onPress={() => toggle(o)}
              className={cn(
                "rounded-full border px-4 py-2 active:opacity-80",
                on
                  ? "border-primary bg-primary"
                  : "border-border bg-secondary"
              )}
            >
              <Text
                className={cn(
                  "text-[12.5px] font-semibold",
                  on ? "text-primary-foreground" : "text-foreground/80"
                )}
              >
                {o}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </FieldLabel>
  );
}
