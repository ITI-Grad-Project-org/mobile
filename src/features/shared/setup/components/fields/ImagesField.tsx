import { ActivityIndicator } from "react-native";

import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import type { Field } from "../../types";
import { FieldLabel } from "./FieldLabel";
import { useImagePicker } from "./useImagePicker";

export function ImagesField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: string[]) => void;
}) {
  const arr: string[] = Array.isArray(value) ? (value as string[]) : [];
  const { picking, error, pickMany } = useImagePicker();

  const add = async () => {
    if (picking) return;
    const locals = await pickMany();
    if (locals.length) onChange([...arr, ...locals]);
  };

  const removeAt = (i: number) => onChange(arr.filter((_, j) => j !== i));

  return (
    <FieldLabel label={field.label}>
      <View className="flex-row flex-wrap gap-2">
        {arr.map((u, i) => (
          <View
            key={`${u}-${i}`}
            className="relative h-24 w-24 overflow-hidden rounded-2xl bg-secondary"
          >
            <Image source={u} className="h-full w-full" style={{ objectFit: "cover" }} />
            <Pressable
              onPress={() => removeAt(i)}
              hitSlop={6}
              className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-black/55 active:opacity-80"
            >
              <Icon name="x" size={12} color="#ffffff" />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={add}
          disabled={picking}
          className="h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/60 active:opacity-80 disabled:opacity-60"
        >
          {picking ? (
            <ActivityIndicator />
          ) : (
            <Icon name="plus" size={22} color="--muted-foreground" />
          )}
        </Pressable>
      </View>
      {error ? (
        <Text className="text-[11.5px] font-medium text-destructive">{error}</Text>
      ) : field.helper ? (
        <Text className="text-[11.5px] text-muted-foreground">{field.helper}</Text>
      ) : null}
    </FieldLabel>
  );
}
