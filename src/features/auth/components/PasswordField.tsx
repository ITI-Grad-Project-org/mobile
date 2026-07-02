import { useState } from "react";
import { Feather } from "@expo/vector-icons";

import { Pressable, TextInput, View, useCSSVariable } from "@/tw";

export type PasswordFieldProps = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
};

export function PasswordField({
  value,
  onChangeText,
  placeholder = "Password",
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const iconColor = useCSSVariable("--muted-foreground");

  return (
    <View className="relative">
      <View className="absolute left-3.5 top-0 bottom-0 z-10 justify-center">
        <Feather name="lock" size={18} color={iconColor} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={iconColor}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        className="rounded-2xl bg-secondary py-3.5 pl-10 pr-12 text-[14px] text-foreground"
      />
      <Pressable
        onPress={() => setShow((v) => !v)}
        hitSlop={8}
        className="absolute right-3 top-0 bottom-0 z-10 justify-center"
      >
        <Feather name={show ? "eye-off" : "eye"} size={18} color={iconColor} />
      </Pressable>
    </View>
  );
}
