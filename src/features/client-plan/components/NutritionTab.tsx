import { meals } from "@/lib/data";
import { Card } from "@/shared/ui/Card";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { Text, View } from "@/tw";
import { Image } from "@/tw/image";

const MACROS = [
  { label: "Protein", value: "175g" },
  { label: "Carbs", value: "260g" },
  { label: "Fat", value: "70g" },
];

export function NutritionTab() {
  return (
    <View className="gap-y-4">
      {/* Daily target */}
      <Card tone="mint" raised>
        <Text className="text-[11px] font-semibold uppercase tracking-wider text-mint-ink opacity-70">
          Daily target
        </Text>
        <View className="mt-1 flex-row items-baseline gap-2">
          <Text className="text-3xl font-black text-mint-ink">2,400</Text>
          <Text className="text-[13px] text-mint-ink opacity-80">kcal</Text>
        </View>
        <View className="mt-3 flex-row gap-2">
          {MACROS.map((m) => (
            <View key={m.label} className="flex-1">
              <Text className="text-[12px] font-medium text-mint-ink opacity-90">
                {m.label} {m.value}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle title="Today's meals" />
      {meals.map((m) => (
        <Card key={m.id} interactive className="flex-row items-center gap-3 px-3 py-4" raised>
          <Image source={m.image} className="h-14 w-14 shrink-0 rounded-2xl" />
          <View className="min-w-0 flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {m.tag} · {m.time}
            </Text>
            <Text
              numberOfLines={1}
              className="text-[15px] font-semibold text-foreground"
            >
              {m.name}
            </Text>
          </View>
          <View className="shrink-0 items-end">
            <Text className="text-[15px] font-bold text-foreground">
              {m.kcal}
            </Text>
            <Text className="text-[11px] text-muted-foreground">kcal</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}
