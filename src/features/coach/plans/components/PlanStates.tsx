import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Text, View } from "@/tw";
import { router } from "expo-router";
import { ActivityIndicator } from "react-native";

/** Shared loading/not-found states for the pushed coach plan screens. */

export function PlanLoading({ label }: { label: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-background p-6">
      <ActivityIndicator size="large" color="--primary" />
      <Text className="mt-4 text-[13px] text-muted-foreground">{label}</Text>
    </View>
  );
}

export function PlanNotFound({ title, hint }: { title: string; hint: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-background p-6">
      <Icon name="alert-triangle" size={28} color="--destructive" />
      <Text className="mt-3 text-[15px] font-bold text-foreground">{title}</Text>
      <Text className="mt-1 text-center text-[12px] text-muted-foreground">{hint}</Text>
      <GlassButton
        onPress={() => router.back()}
        accessibilityLabel="Go back"
        className="mt-4 rounded-full px-4 py-2.5"
      >
        <Text className="text-[13px] font-semibold text-foreground">Go Back</Text>
      </GlassButton>
    </View>
  );
}

/** The day screens' "the client hasn't logged this yet" placeholder. */
export function NotLoggedYet({ noun }: { noun: string }) {
  return (
    <View className="items-center rounded-2xl border border-border bg-secondary/40 px-4 py-6">
      <Icon name="clock" size={20} color="--muted-foreground" />
      <Text className="mt-2 text-[13px] font-semibold text-foreground">Not logged yet</Text>
      <Text className="mt-1 text-center text-[12px] text-muted-foreground">
        Nothing has come back from this {noun} yet.
      </Text>
    </View>
  );
}
