import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import { TextInput, View, useCSSVariable } from "@/tw";

type FeatherName = ComponentProps<typeof Feather>["name"];

export type AuthFieldProps = {
  icon?: FeatherName;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words";
  autoComplete?: "email" | "name" | "off";
  textContentType?: "emailAddress" | "givenName" | "familyName" | "none";
};

export function AuthField({
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "none",
  autoComplete = "off",
  textContentType = "none",
}: AuthFieldProps) {
  const iconColor = useCSSVariable("--muted-foreground");

  return (
    <View className="relative">
      {icon ? (
        <View className="absolute left-4 top-0 bottom-0 z-10 justify-center">
          <Feather name={icon} size={20} color={iconColor} />
        </View>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={iconColor}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        textContentType={textContentType}
        className={`h-14 rounded-2xl bg-secondary py-0 pr-3 text-[15px] text-foreground ${
          icon ? "pl-11" : "pl-4"
        }`}
      />
    </View>
  );
}
