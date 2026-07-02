import React from "react";
import { View, Text } from "@/tw";
import { Tone } from "@/tw/Tone";
import { useRole } from "@/lib/role";
import { Icon } from "@/shared/ui/Icon";
import { cn } from "@/lib/utils";

// GitHub-style intensity scale (light → dark) for green & orange
const palettes = {
  green: [
    "bg-[#ebedf0] dark:bg-white/[0.06]",
    "bg-[#9be9a8] dark:bg-[#0e4429]",
    "bg-[#40c463] dark:bg-[#006d32]",
    "bg-[#30a14e] dark:bg-[#26a641]",
    "bg-[#216e39] dark:bg-[#39d353]",
  ],
  orange: [
    "bg-[#f1ece6] dark:bg-white/[0.06]",
    "bg-[#ffd6a8] dark:bg-[#4a2410]",
    "bg-[#ffa657] dark:bg-[#7a3a10]",
    "bg-[#f0883e] dark:bg-[#d97706]",
    "bg-[#c2410c] dark:bg-[#fb923c]",
  ],
};

// Generate 18 weeks of pseudo-random data
const seedGrid = (): number[] => {
  const arr: number[] = [];
  for (let i = 0; i < 18 * 7; i++) {
    // simple deterministic pattern
    const v = (Math.sin(i * 1.37) + Math.cos(i * 0.7)) * 1.4 + 1.6;
    arr.push(Math.max(0, Math.min(4, Math.round(v))));
  }
  return arr;
};
const fullGrid = seedGrid();

export function StreakHero({
  todayCompleted,
  todayTotal,
}: {
  todayCompleted: number;
  todayTotal: number;
}) {
  const { accent } = useRole();
  const colors = palettes[accent];
  const todayIntensity = Math.max(
    0,
    Math.min(4, Math.round((todayCompleted / Math.max(todayTotal, 1)) * 4))
  );
  const cells = [...fullGrid.slice(0, -1), todayIntensity];
  const weeks = Math.ceil(cells.length / 7);
  const accentDot = accent === "green" ? "bg-[#30a14e]" : "bg-[#f0883e]";

  // Transform flat array into column-first weeks arrays (18 columns, 7 rows each)
  const weeksArray: number[][] = [];
  for (let w = 0; w < weeks; w++) {
    const weekCells: number[] = [];
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      weekCells.push(cells[idx] ?? 0);
    }
    weeksArray.push(weekCells);
  }

  return (
    <Tone name="ink" className="rounded-2xl p-5 shadow-ink">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-foreground/60">
            Activity streak
          </Text>
          <View className="mt-1 flex-row items-baseline gap-2">
            <Text className="text-5xl font-black text-ink-foreground">12</Text>
            <Text className="text-base font-medium text-ink-foreground/70">
              day streak
            </Text>
          </View>
          <Text className="mt-1 text-[12.5px] text-ink-foreground/70">
            Darker squares = more sessions that day
          </Text>
        </View>
        <View
          className={cn(
            "h-12 w-12 items-center justify-center rounded-2xl shadow-primary",
            accentDot
          )}
        >
          <Icon name="flame" size={24} color="#ffffff" />
        </View>
      </View>

      {/* Full-width responsive grid: columns representing weeks, rows representing days */}
      <View className="mt-4 flex-row gap-0.75 justify-between">
        {weeksArray.map((week, wIdx) => (
          <View key={wIdx} className="flex-1 flex-col gap-0.75">
            {week.map((v, dIdx) => (
              <View
                key={dIdx}
                className={cn("aspect-square rounded-[3px]", colors[v])}
              />
            ))}
          </View>
        ))}
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-[10.5px] text-ink-foreground/60">18 weeks</Text>
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[10.5px] text-ink-foreground/60">Less</Text>
          {colors.map((c, i) => (
            <View key={i} className={cn("h-2.5 w-2.5 rounded-[3px]", c)} />
          ))}
          <Text className="text-[10.5px] text-ink-foreground/60">More</Text>
        </View>
      </View>
    </Tone>
  );
}
