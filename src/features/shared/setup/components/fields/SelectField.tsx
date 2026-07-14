import { useState } from "react";
import { Modal } from "react-native";

import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "@/tw";
import type { Field } from "../../types";
import { FieldLabel } from "./FieldLabel";

// No native <select> in RN — a tap opens a bottom-sheet Modal listing the
// options (the sheet pattern used by ClientsScreen's ClientDetail).

export function SelectField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = typeof value === "string" ? value : "";

  const choose = (opt: string) => {
    onChange(opt);
    setOpen(false);
  };

  return (
    <FieldLabel label={field.label}>
      <Pressable
        onPress={() => setOpen(true)}
        className="h-14 flex-row items-center justify-between rounded-2xl bg-secondary px-4 active:opacity-80"
      >
        <Text
          className={cn(
            "text-[15px]",
            selected ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {selected || field.placeholder || "Select…"}
        </Text>
        <Icon name="chevron-right" size={18} color="--muted-foreground" />
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
          <Pressable className="max-h-[70%] rounded-t-3xl bg-background pt-2">
            <SafeAreaView edges={["bottom"]}>
              <View className="items-center pb-2">
                <View className="h-1.5 w-10 rounded-full bg-border" />
              </View>
              <View className="flex-row items-center justify-between px-5 pb-2 pt-1">
                <Text className="text-[17px] font-bold text-foreground">
                  {field.label}
                </Text>
                <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                  <Icon name="x" size={20} color="--muted-foreground" />
                </Pressable>
              </View>
              <ScrollView className="px-3">
                {field.options?.map((o) => {
                  const on = o === selected;
                  return (
                    <Pressable
                      key={o}
                      onPress={() => choose(o)}
                      className={cn(
                        "flex-row items-center justify-between rounded-2xl px-4 py-3.5 active:opacity-70",
                        on && "bg-secondary"
                      )}
                    >
                      <Text
                        className={cn(
                          "text-[15px]",
                          on
                            ? "font-semibold text-foreground"
                            : "text-foreground/90"
                        )}
                      >
                        {o}
                      </Text>
                      {on ? (
                        <Icon name="check" size={18} color="--primary" />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </FieldLabel>
  );
}
