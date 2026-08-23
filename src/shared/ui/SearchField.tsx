import { Icon } from "@/shared/ui/Icon";
import { Pressable, TextInput, View } from "@/tw";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useRef, useState } from "react";

// Apple Liquid Glass is iOS 26+ only — every other platform gets the card
// fallback, exactly as the coach list screens have always rendered this bar.
const LIQUID_GLASS = isLiquidGlassAvailable();

interface SearchFieldProps {
  /** Fires with the debounced text — safe to feed straight into a query arg. */
  onChange: (value: string) => void;
  placeholder?: string;
  /** Milliseconds of quiet before `onChange` fires. */
  debounceMs?: number;
}

export function SearchField({
  onChange,
  placeholder = "Search…",
  debounceMs = 250,
}: SearchFieldProps) {
  const [text, setText] = useState("");

  // Held in a ref so changing the callback identity can't restart the timer.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const timer = setTimeout(() => onChangeRef.current(text), debounceMs);
    return () => clearTimeout(timer);
  }, [text, debounceMs]);

  const clear = () => {
    setText("");
    onChangeRef.current("");
  };

  const controls = (
    <>
      <Icon name="search" size={17} color="--muted-foreground" />
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor="#7c7c85"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        className="flex-1 bg-transparent p-0 text-sm text-foreground"
      />
      {text.length > 0 && (
        <Pressable
          onPress={clear}
          accessibilityLabel="Clear search"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          className="active:opacity-70"
        >
          <Icon name="x" size={14} color="--muted-foreground" />
        </Pressable>
      )}
    </>
  );

  return LIQUID_GLASS ? (
    <GlassView
      glassEffectStyle="regular"
      isInteractive
      style={{
        height: 44,
        flexDirection: "row",
        alignItems: "center",
        columnGap: 10,
        paddingHorizontal: 14,
        borderRadius: 9999,
      }}
    >
      {controls}
    </GlassView>
  ) : (
    <View className="h-11 flex-row items-center gap-2.5 rounded-full border border-border bg-card px-3.5">
      {controls}
    </View>
  );
}
