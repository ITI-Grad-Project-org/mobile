import { ActivityIndicator } from "react-native";

import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import type { Field } from "../../types";
import { FieldLabel } from "./FieldLabel";
import { useImagePicker } from "./useImagePicker";

export function ImageField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: string) => void;
}) {
  const uri = typeof value === "string" ? value : "";
  const { picking, error, pickOne } = useImagePicker();

  const pick = async () => {
    if (picking) return;
    const local = await pickOne();
    if (local) onChange(local);
  };

  return (
    <FieldLabel label={field.label}>
      {uri ? (
        <View className="relative h-36 w-36 overflow-hidden rounded-3xl bg-secondary">
          <Image source={uri} className="h-full w-full" style={{ objectFit: "cover" }} />
          <Pressable
            onPress={() => onChange("")}
            hitSlop={6}
            className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-black/55 active:opacity-80"
          >
            <Icon name="x" size={14} color="#ffffff" />
          </Pressable>
          <Pressable
            onPress={pick}
            className="absolute bottom-0 left-0 right-0 items-center bg-black/55 py-1.5 active:opacity-80"
          >
            <Text className="text-[11px] font-semibold text-white">
              {picking ? "Opening…" : "Change"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={pick}
          disabled={picking}
          className="h-36 w-36 items-center justify-center gap-1.5 rounded-3xl border-2 border-dashed border-border bg-secondary/60 active:opacity-80 disabled:opacity-60"
        >
          {picking ? (
            <ActivityIndicator />
          ) : (
            <Icon name="camera" size={22} color="--muted-foreground" />
          )}
          <Text className="text-[11px] font-semibold text-muted-foreground">
            {picking ? "Opening…" : "Upload photo"}
          </Text>
        </Pressable>
      )}
      {error ? (
        <Text className="text-[11.5px] font-medium text-destructive">{error}</Text>
      ) : field.helper ? (
        <Text className="text-[11.5px] text-muted-foreground">{field.helper}</Text>
      ) : null}
    </FieldLabel>
  );
}
