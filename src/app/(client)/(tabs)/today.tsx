import { SafeAreaView, ScrollView, Text, View } from "@/tw";
import { Tone } from "@/tw/Tone";

export default function ClientTodayScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <View className="bg-card p-5 rounded-2xl shadow-soft">
          <Text className="text-foreground font-display text-xl">Today</Text>
          <Text className="text-muted-foreground">Keep the streak alive</Text>
        </View>

        <Tone name="mint" className="rounded-3xl p-5 mt-4">
          <Text className="text-mint-ink font-display">7-day streak 🔥</Text>
        </Tone>
      </ScrollView>
    </SafeAreaView>
  );;
}

