import { useId, useState } from "react";
import type { KeyboardTypeOptions, TextInputProps } from "react-native";
import { InputAccessoryView, Keyboard, Platform } from "react-native";

import { cn } from "@/lib/utils";
import { Pressable, Text, TextInput, View, useCSSVariable } from "@/tw";
import type { Field } from "../../types";
import { FieldLabel } from "./FieldLabel";

const KEYBOARD: Partial<Record<Field["type"], KeyboardTypeOptions>> = {
  email: "email-address",
  tel: "phone-pad",
  number: "number-pad",
  url: "url",
};

/** Keep digits (and at most one decimal point, when the field allows one). */
function sanitizeNumber(text: string, decimal: boolean): string {
  const cleaned = text.replace(/,/g, ".").replace(/[^\d.]/g, "");
  if (!decimal) return cleaned.replace(/\./g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}

/** Keep digits, plus a single leading `+` for the country code. */
function sanitizePhone(text: string): string {
  const hasPlus = text.trimStart().startsWith("+");
  const digits = text.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/** On blur: "00201000354540" -> "+201000354540" (the API wants E.164). */
function normalizePhone(value: string): string {
  return value.startsWith("00") ? `+${value.slice(2)}` : value;
}

export function TextField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: string) => void;
}) {
  const placeholderColor = useCSSVariable("--muted-foreground") as string;
  const [focused, setFocused] = useState(false);
  const str = typeof value === "string" ? value : "";
  const multiline = field.type === "textarea";
  const isNumber = field.type === "number";
  const isTel = field.type === "tel";

  // Numeric and phone keypads have no return key, and on a textarea return
  // inserts a newline — so those keyboards need an accessory bar to dismiss.
  // Everything else keeps the native "done" return key.
  // useId() emits punctuation (`:r0:` / `«r0»`); keep the nativeID plain.
  const accessoryId = `acc-${useId().replace(/\W/g, "")}`;
  const needsAccessory =
    Platform.OS === "ios" && (isNumber || isTel || multiline);

  const handleChange = (text: string) => {
    if (isNumber) return onChange(sanitizeNumber(text, field.decimal ?? false));
    if (isTel) return onChange(sanitizePhone(text));
    onChange(text);
  };

  // Blur is where we tidy up: clamp out-of-range numbers, drop a dangling
  // decimal point, and turn an international 00-prefix into a `+`.
  const handleBlur = () => {
    setFocused(false);
    if (isTel && str) {
      const normalized = normalizePhone(str);
      if (normalized !== str) onChange(normalized);
      return;
    }
    if (!isNumber || !str) return;
    const n = Number(str);
    if (!Number.isFinite(n)) return onChange("");
    const clamped = Math.min(field.max ?? n, Math.max(field.min ?? n, n));
    const next = String(clamped);
    if (next !== str) onChange(next);
  };

  const extra: TextInputProps = isNumber
    ? { keyboardType: field.decimal ? "decimal-pad" : "number-pad", inputMode: field.decimal ? "decimal" : "numeric" }
    : isTel
      ? { autoComplete: "tel", textContentType: "telephoneNumber" }
      : field.type === "email"
        ? { autoComplete: "email", textContentType: "emailAddress" }
        : {};

  return (
    <FieldLabel label={field.label}>
      <View className="relative">
        <TextInput
          value={str}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder={field.placeholder}
          placeholderTextColor={placeholderColor}
          keyboardType={KEYBOARD[field.type] ?? "default"}
          autoCapitalize={
            field.type === "email" || field.type === "url" || isTel
              ? "none"
              : "sentences"
          }
          autoCorrect={!(isNumber || isTel || field.type === "email" || field.type === "url")}
          maxLength={field.maxLength ?? (isTel ? 17 : undefined)}
          multiline={multiline}
          submitBehavior={multiline ? "newline" : "blurAndSubmit"}
          returnKeyType={multiline ? "default" : "done"}
          inputAccessoryViewID={needsAccessory ? accessoryId : undefined}
          selectTextOnFocus={isNumber}
          className={cn(
            "rounded-2xl border bg-secondary text-[15px] text-foreground p-2",
            multiline ? "min-h-28 px-4 py-3" : "h-14 px-4 py-0",
            field.unit && !multiline && "pr-12",
            focused ? "border-primary/40" : "border-transparent"
          )}
          style={multiline ? { textAlignVertical: "top" } : undefined}
          {...extra}
        />
        {field.unit ? (
          <View className="absolute bottom-0 right-4 top-0 justify-center">
            <Text className="text-[12px] font-medium text-muted-foreground">
              {field.unit}
            </Text>
          </View>
        ) : null}
      </View>
      {field.helper ? (
        <Text className="text-[11.5px] text-muted-foreground">{field.helper}</Text>
      ) : null}
      {needsAccessory ? (
        <InputAccessoryView nativeID={accessoryId}>
          <View className="flex-row justify-end border-t border-border bg-secondary px-4 py-2">
            <Pressable
              onPress={() => Keyboard.dismiss()}
              hitSlop={8}
              className="self-end rounded-full bg-primary px-5 py-2 shadow-soft active:opacity-85"
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text className="text-[14px] font-semibold text-primary-foreground">
                Done
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </FieldLabel>
  );
}
