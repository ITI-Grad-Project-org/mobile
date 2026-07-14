import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Image } from "@/tw/image";
import type { Field } from "../../types";
import { FieldLabel } from "./FieldLabel";
import { pickSingleImage } from "./pickImage";

// Single-photo picker (avatar). Stores a local file URI string.

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

  const pick = async () => {
    const picked = await pickSingleImage();
    if (picked) onChange(picked);
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
        </View>
      ) : (
        <Pressable
          onPress={pick}
          className="h-36 w-36 items-center justify-center gap-1.5 rounded-3xl border-2 border-dashed border-border bg-secondary/60 active:opacity-80"
        >
          <Icon name="camera" size={22} color="--muted-foreground" />
          <Text className="text-[11px] font-semibold text-muted-foreground">
            Upload photo
          </Text>
        </Pressable>
      )}
    </FieldLabel>
  );
}
