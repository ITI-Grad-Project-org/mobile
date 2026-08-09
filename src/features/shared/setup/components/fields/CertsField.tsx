import { ActivityIndicator } from "react-native";

import { DOCUMENT_MAX_EDGE } from "@/api/imagePrep";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, TextInput, View, useCSSVariable } from "@/tw";
import { Image } from "@/tw/image";
import type { Certificate, Field } from "../../types";
import { DateField } from "./DateField";
import { FieldLabel } from "./FieldLabel";
import { useImagePicker } from "./useImagePicker";

const ISSUED_FIELD: Field = { key: "issued", label: "Issued", type: "date", placeholder: "Date" };
const EXPIRES_FIELD: Field = { key: "expires", label: "Expires", type: "date", placeholder: "Date" };

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function CertsField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: Certificate[]) => void;
}) {
  const arr: Certificate[] = Array.isArray(value) ? (value as Certificate[]) : [];
  const placeholderColor = useCSSVariable("--muted-foreground") as string;
  const { picking, error, pickOne } = useImagePicker();

  const add = async () => {
    if (picking) return;
    // Certificates get a higher pixel cap than photos — the point is to read
    // the credential, not to glance at it.
    const image = await pickOne(DOCUMENT_MAX_EDGE);
    if (!image) return;
    onChange([...arr, { id: makeId(), image, name: "", issued: "", expires: "" }]);
  };

  const patch = (id: string, p: Partial<Certificate>) =>
    onChange(arr.map((c) => (c.id === id ? { ...c, ...p } : c)));

  const remove = (id: string) => onChange(arr.filter((c) => c.id !== id));

  return (
    <FieldLabel label={field.label}>
      <View className="gap-3">
        {arr.map((c) => (
          <View key={c.id} className="rounded-2xl border border-border bg-secondary/40 p-3">
            <View className="flex-row gap-3">
              <Image
                source={c.image}
                className="h-20 w-20 rounded-xl bg-secondary"
                style={{ objectFit: "cover" }}
              />
              <View className="flex-1 gap-2">
                <TextInput
                  value={c.name}
                  onChangeText={(t) => patch(c.id, { name: t })}
                  placeholder="Certificate name (e.g. NSCA-CSCS)"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  maxLength={80}
                  className="rounded-xl bg-card px-3 py-2.5 text-[13px] text-foreground"
                />
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <DateField
                      field={ISSUED_FIELD}
                      value={c.issued}
                      onChange={(v) => patch(c.id, { issued: v })}
                    />
                  </View>
                  <View className="flex-1">
                    <DateField
                      field={EXPIRES_FIELD}
                      value={c.expires}
                      onChange={(v) => patch(c.id, { expires: v })}
                    />
                  </View>
                </View>
              </View>
              <Pressable
                onPress={() => remove(c.id)}
                hitSlop={6}
                className="h-7 w-7 items-center justify-center self-start rounded-full bg-card active:opacity-70"
              >
                <Icon name="x" size={14} color="--muted-foreground" />
              </Pressable>
            </View>
          </View>
        ))}

        <Pressable
          onPress={add}
          disabled={picking}
          className="flex-row items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/40 py-4 active:opacity-80 disabled:opacity-60"
        >
          {picking ? (
            <ActivityIndicator />
          ) : (
            <Icon name="trophy" size={16} color="--muted-foreground" />
          )}
          <Text className="text-[13px] font-semibold text-muted-foreground">
            {picking ? "Opening…" : "Add certificate"}
          </Text>
        </Pressable>

        {error ? (
          <Text className="text-[11.5px] font-medium text-destructive">{error}</Text>
        ) : null}
      </View>
    </FieldLabel>
  );
}
