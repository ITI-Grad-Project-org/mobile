import { useEffect, useState } from "react";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Pressable, SafeAreaView, Text, View } from "@/tw";
import { Tone, type ToneName } from "@/tw/Tone";
import { Icon, type IconName } from "@/shared/ui/Icon";

const AnimatedView = Reanimated.createAnimatedComponent(View);

/** A progress dot that grows and brightens as it becomes active. */
function ProgressDot({ active }: { active: boolean }) {
  const p = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    p.value = withTiming(active ? 1 : 0, { duration: 300 });
  }, [active, p]);

  const style = useAnimatedStyle(() => ({
    width: 6 + p.value * 26,
    opacity: 0.28 + p.value * 0.72,
  }));

  return (
    <AnimatedView style={style} className="h-1.5 rounded-full bg-foreground" />
  );
}

type Slide = {
  icon: IconName;
  title: string;
  body: string;
  tone: ToneName;
  iconColor: string;
};

const SLIDES: Slide[] = [
  {
    icon: "dumbbell",
    title: "Train with intention",
    body: "Daily workouts built around your goals — with form videos, sets, RPE and progress tracking.",
    tone: "mint",
    iconColor: "--mint-ink",
  },
  {
    icon: "apple",
    title: "Eat with confidence",
    body: "A nutrition plan you'll actually follow. Track calories, hydration, and meals in one tap.",
    tone: "peach",
    iconColor: "--peach-ink",
  },
  {
    icon: "trending-up",
    title: "See real progress",
    body: "GitHub-style streaks, body metrics and weekly check-ins keep momentum honest.",
    tone: "sky",
    iconColor: "--sky-ink",
  },
];

export function OnboardingScreen({
  onFinish,
  onSkip,
}: {
  onFinish: () => void;
  onSkip: () => void;
}) {
  const [slide, setSlide] = useState(0);
  const s = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-4">
        <View className="flex-row gap-1.5">
          {SLIDES.map((_, i) => (
            <ProgressDot key={i} active={i === slide} />
          ))}
        </View>
        <Pressable onPress={onSkip} hitSlop={12}>
          <Text className="text-[12.5px] font-medium text-muted-foreground">
            Skip
          </Text>
        </Pressable>
      </View>

      <View
        key={slide}
        className="animate-fade-up flex-1 items-center justify-center px-7 pb-6"
      >
        <Tone
          name={s.tone}
          className="h-28 w-28 items-center justify-center rounded-4xl shadow-pop"
          glass
        >
          <Icon name={s.icon} size={48} color={s.iconColor} />
        </Tone>
        <Text className="mt-7 text-center text-[26px] font-bold leading-tight text-foreground">
          {s.title}
        </Text>
        <Text className="mt-3 max-w-sm text-center text-[14px] leading-relaxed text-muted-foreground">
          {s.body}
        </Text>
      </View>

      <View className="px-5 pb-4">
        <Pressable
          onPress={() => (isLast ? onFinish() : setSlide((i) => i + 1))}
          className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-soft active:opacity-90"
        >
          <Text className="text-[15px] font-semibold text-primary-foreground">
            {isLast ? "Let's set up your profile" : "Next"}
          </Text>
          <Icon name="chevron-right" size={18} color="--primary-foreground" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
