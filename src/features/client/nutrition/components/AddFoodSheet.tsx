import { useBrowseCoachFoodsQuery } from "@/api/endpoints/nutrition.endpoints";
import type {
  CreateActualFoodLogDto,
  MealSlot,
  ServingUnit,
  UpdateActualFoodLogDto,
} from "@/api/types";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/shared/hooks/useActiveTenant";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Segmented } from "@/shared/ui/Segmented";
import { Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform } from "react-native";
import { MANUAL_LIMITS, SLOT_LABEL, unwrapList, type LoggedFood } from "../data";

const isIOS = Platform.OS === "ios";

type Mode = "library" | "manual";

const MODE_OPTIONS = [
  { value: "library", label: "Coach's library" },
  { value: "manual", label: "Manual entry" },
] as const;

/** The manual macro fields, in form order, with their DTO keys and limits. */
const MANUAL_FIELDS = [
  { key: "calories", label: "Calories", unit: "kcal", max: MANUAL_LIMITS.calories },
  { key: "proteinG", label: "Protein", unit: "g", max: MANUAL_LIMITS.proteinG },
  { key: "carbsG", label: "Carbs", unit: "g", max: MANUAL_LIMITS.carbsG },
  { key: "fatG", label: "Fat", unit: "g", max: MANUAL_LIMITS.fatG },
  { key: "fiberG", label: "Fiber", unit: "g", max: MANUAL_LIMITS.fiberG },
] as const;

type ManualKey = (typeof MANUAL_FIELDS)[number]["key"];

interface CoachFood {
  id: string;
  name: string;
  brand: string | null;
  servingSize: number;
  servingUnit: ServingUnit;
  calories: number;
}

// The Foods list is typed `any` — see the note at the top of ../data.ts.
function normalizeCoachFood(raw: any, index: number): CoachFood {
  return {
    id: String(raw?.id ?? `food-${index}`),
    name: String(raw?.name ?? "Food"),
    brand: typeof raw?.brand === "string" && raw.brand ? raw.brand : null,
    servingSize: Number(raw?.servingSize) || 1,
    servingUnit: (raw?.servingUnit as ServingUnit) ?? "g",
    calories: Number(raw?.calories) || 0,
  };
}

/**
 * Adds a food to a nutrition log, or edits one that's already there.
 *
 * Two add modes, matching CreateActualFoodLogDto: library (`foodId` + `amount`,
 * macros derived server-side) and manual (`foodName` + macro TOTALS). Editing a
 * library-backed entry only offers the amount, because its macros aren't ours to
 * set; editing a manual entry reopens the full form.
 *
 * The caller mounts this only while the sheet is open, so the form starts from
 * `editing` on every open and needs no reset effect.
 */
export function AddFoodSheet({
  mealSlot,
  editing,
  isSaving,
  error,
  onClose,
  onAdd,
  onUpdate,
}: {
  mealSlot: MealSlot;
  editing?: LoggedFood | null;
  isSaving?: boolean;
  error?: string | null;
  onClose: () => void;
  onAdd: (body: CreateActualFoodLogDto) => void;
  onUpdate: (foodLogId: string, body: UpdateActualFoodLogDto) => void;
}) {
  const { tenantId } = useActiveTenant();
  const isEditing = Boolean(editing);

  const [mode, setMode] = useState<Mode>(
    editing && !editing.foodId ? "manual" : "library"
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<CoachFood | null>(null);
  const [amount, setAmount] = useState(
    editing?.amount !== undefined && editing?.amount !== null ? String(editing.amount) : ""
  );
  const [foodName, setFoodName] = useState(editing?.name ?? "");
  const [manual, setManual] = useState<Record<ManualKey, string>>(() => {
    const round = (value: number) => (value ? String(Math.round(value)) : "");
    return {
      calories: round(editing?.macros.calories ?? 0),
      proteinG: round(editing?.macros.proteinG ?? 0),
      carbsG: round(editing?.macros.carbsG ?? 0),
      fatG: round(editing?.macros.fatG ?? 0),
      fiberG: round(editing?.macros.fiberG ?? 0),
    };
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Debounce so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isFetching, isError, refetch } = useBrowseCoachFoodsQuery(
    { tenantId: tenantId ?? "", search: debouncedSearch || undefined },
    { skip: !tenantId || mode !== "library" || isEditing }
  );

  const foods: CoachFood[] = useMemo(
    () => unwrapList(data).map(normalizeCoachFood),
    [data]
  );

  const submit = () => {
    setValidationError(null);

    if (mode === "library") {
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setValidationError("Enter how much you had.");
        return;
      }
      if (parsedAmount > MANUAL_LIMITS.amount) {
        setValidationError(`Amount can't be more than ${MANUAL_LIMITS.amount}.`);
        return;
      }

      if (isEditing && editing) {
        onUpdate(editing.id, { amount: parsedAmount });
        return;
      }
      if (!selectedFood) {
        setValidationError("Pick a food first.");
        return;
      }
      onAdd({ mealSlot, foodId: selectedFood.id, amount: parsedAmount });
      return;
    }

    const name = foodName.trim();
    if (!name) {
      setValidationError("Give the food a name.");
      return;
    }

    const macros: Partial<Record<ManualKey, number>> = {};
    for (const field of MANUAL_FIELDS) {
      const raw = manual[field.key].trim();
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        setValidationError(`${field.label} must be a number.`);
        return;
      }
      if (value > field.max) {
        setValidationError(`${field.label} can't be more than ${field.max} ${field.unit}.`);
        return;
      }
      macros[field.key] = value;
    }

    if (macros.calories === undefined) {
      setValidationError("Enter at least the calories.");
      return;
    }

    if (isEditing && editing) {
      onUpdate(editing.id, { foodName: name, ...macros });
      return;
    }
    onAdd({ mealSlot, foodName: name, ...macros });
  };

  const canSubmit = mode === "library" ? isEditing || Boolean(selectedFood) : true;
  const shownError = validationError ?? error ?? null;

  const content = (
    <View className="flex-1 overflow-hidden bg-card">
      {/* Header */}
      <View
        className={cn(
          "flex-row items-center gap-3 border-b border-border/60 px-4 pb-3",
          isIOS ? "pt-4" : "pt-11"
        )}
      >
        <View className="min-w-0 flex-1">
          <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {SLOT_LABEL[mealSlot]}
          </Text>
          <Text className="text-[18px] font-bold text-foreground">
            {isEditing ? "Edit food" : "Add food"}
          </Text>
        </View>
        <GlassButton
          onPress={onClose}
          className="h-9 w-9 rounded-full"
          accessibilityLabel="Close"
        >
          <Icon name="x" size={15} color="--foreground" />
        </GlassButton>
      </View>

      {/* Mode toggle — an existing entry can't switch how it was created. */}
      {!isEditing ? (
        <View className="px-4 pt-3">
          <Segmented options={MODE_OPTIONS} value={mode} onChange={setMode} />
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-3 pb-6 gap-y-3"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mode === "library" ? (
          isEditing ? (
            <View className="gap-2">
              <Text className="text-[15px] font-semibold text-foreground">
                {editing?.name}
              </Text>
              <Field
                label={`Amount${editing?.servingUnit ? ` (${editing.servingUnit})` : ""}`}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
              />
            </View>
          ) : (
            <>
              {/* Search */}
              <View className="flex-row items-center gap-2 rounded-sm border border-border bg-secondary px-3">
                <Icon name="search" size={14} color="--muted-foreground" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search your coach's foods"
                  autoCorrect={false}
                  className="h-11 flex-1 text-[14px] text-foreground"
                />
              </View>

              {selectedFood ? (
                <View className="gap-2 rounded-sm border border-primary/40 bg-primary/10 p-3">
                  <View className="flex-row items-center gap-2">
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="text-[14px] font-semibold text-foreground">
                        {selectedFood.name}
                      </Text>
                      <Text className="text-[11.5px] text-muted-foreground">
                        {selectedFood.calories} kcal per {selectedFood.servingSize}{" "}
                        {selectedFood.servingUnit}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setSelectedFood(null)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Pick a different food"
                      className="active:opacity-60"
                    >
                      <Icon name="x" size={14} color="--muted-foreground" />
                    </Pressable>
                  </View>
                  <Field
                    label={`Amount (${selectedFood.servingUnit})`}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder={String(selectedFood.servingSize)}
                  />
                </View>
              ) : isFetching ? (
                <View className="items-center py-10">
                  <ActivityIndicator color="--primary" />
                </View>
              ) : isError ? (
                <Pressable
                  onPress={() => refetch()}
                  accessibilityRole="button"
                  className="items-center gap-2 rounded-sm border border-border py-8 active:opacity-70"
                >
                  <Icon name="alert-triangle" size={20} color="--muted-foreground" />
                  <Text className="text-[13px] text-muted-foreground">
                    Couldn&apos;t load the food library. Tap to retry.
                  </Text>
                </Pressable>
              ) : foods.length === 0 ? (
                <View className="items-center gap-2 py-8">
                  <Icon name="apple" size={22} color="--muted-foreground" />
                  <Text className="px-6 text-center text-[13px] text-muted-foreground">
                    {debouncedSearch
                      ? `Nothing matching “${debouncedSearch}”.`
                      : "Your coach hasn't added any foods yet. Use manual entry instead."}
                  </Text>
                </View>
              ) : (
                foods.map((food) => (
                  <Pressable
                    key={food.id}
                    onPress={() => {
                      setSelectedFood(food);
                      setAmount(String(food.servingSize));
                      setValidationError(null);
                    }}
                    accessibilityRole="button"
                    className="flex-row items-center gap-3 rounded-sm border border-border bg-secondary/40 px-3 py-2.5 active:opacity-70"
                  >
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="text-[14px] font-semibold text-foreground">
                        {food.name}
                      </Text>
                      <Text numberOfLines={1} className="text-[11.5px] text-muted-foreground">
                        {food.brand ? `${food.brand} · ` : ""}
                        {food.calories} kcal per {food.servingSize} {food.servingUnit}
                      </Text>
                    </View>
                    <Icon name="plus" size={14} color="--primary" />
                  </Pressable>
                ))
              )}
            </>
          )
        ) : (
          <>
            <Field
              label="Food name"
              value={foodName}
              onChangeText={setFoodName}
              placeholder="e.g. Homemade lentil soup"
              keyboardType="default"
            />
            <Text className="text-[11.5px] leading-relaxed text-muted-foreground">
              Enter the totals for what you actually ate — not the per-serving values.
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {MANUAL_FIELDS.map((field) => (
                <View key={field.key} className="min-w-[45%] flex-1">
                  <Field
                    label={`${field.label} (${field.unit})`}
                    value={manual[field.key]}
                    onChangeText={(text) =>
                      setManual((prev) => ({ ...prev, [field.key]: text }))
                    }
                    placeholder="0"
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {shownError ? (
          <View className="flex-row items-center gap-2 rounded-sm bg-destructive/10 px-3 py-2">
            <Icon name="alert-triangle" size={13} color="--destructive" />
            <Text className="flex-1 text-[12px] text-destructive">{shownError}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer */}
      <View className="border-t border-border/60 bg-card px-4 pb-8 pt-3">
        <Pressable
          onPress={submit}
          disabled={isSaving || !canSubmit}
          accessibilityRole="button"
          className={cn(
            "h-14 items-center justify-center rounded-sm bg-primary active:opacity-90",
            (isSaving || !canSubmit) && "opacity-50"
          )}
        >
          <Text className="text-[15px] font-bold text-primary-foreground">
            {isSaving ? "Saving…" : isEditing ? "Save changes" : "Add to log"}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const body = isIOS ? (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  // iOS: native page sheet. Android: transparent modal over a tap-to-dismiss scrim.
  if (isIOS) {
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        {body}
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <View className="min-h-[90%] overflow-hidden shadow-pop">{body}</View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "decimal-pad",
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "decimal-pad" | "default";
}) {
  return (
    <View className="gap-1">
      <Text className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCorrect={false}
        className="h-11 rounded-sm border border-border bg-secondary px-3 text-[14px] text-foreground"
      />
    </View>
  );
}
