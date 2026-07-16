import type { KeyboardTypeOptions } from "react-native";

import { Text, TextInput, View, useCSSVariable } from "@/tw";
import type { Field } from "../../types";
import { FieldLabel } from "./FieldLabel";

// text | email | tel | number | url | textarea — the plain input family.
// Styling baseline matches the auth AuthField (h-14 rounded-2xl bg-secondary).

const KEYBOARD: Partial<Record<Field["type"], KeyboardTypeOptions>> = {
  email: "email-address",
  tel: "phone-pad",
  number: "numeric",
  url: "url",
};

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
  const str = typeof value === "string" ? value : "";
  const multiline = field.type === "textarea";

  return (
    <FieldLabel label={field.label}>
      <View className="relative">
        <TextInput
          value={str}
          onChangeText={onChange}
          placeholder={field.placeholder}
          placeholderTextColor={placeholderColor}
          keyboardType={KEYBOARD[field.type] ?? "default"}
          autoCapitalize={field.type === "email" || field.type === "url" ? "none" : "sentences"}
          multiline={multiline}
          className={
            multiline
              ? "min-h-[112px] rounded-2xl bg-secondary px-4 py-3 text-[15px] text-foreground"
              : "h-14 rounded-2xl bg-secondary px-4 py-0 text-[15px] text-foreground"
          }
          style={multiline ? { textAlignVertical: "top" } : undefined}
        />
        {field.unit ? (
          <View className="absolute right-4 top-0 bottom-0 justify-center">
            <Text className="text-[12px] font-medium text-muted-foreground">
              {field.unit}
            </Text>
          </View>
        ) : null}
      </View>
    </FieldLabel>
  );
}
