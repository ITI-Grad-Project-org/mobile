import { ReviewsScreen } from "@/features/coach/reviews";
import { View } from "@/tw";

export default function CoachReviewsRoute() {
  return (
    <View className="flex-1 bg-background">
      <ReviewsScreen />
    </View>
  );
}
