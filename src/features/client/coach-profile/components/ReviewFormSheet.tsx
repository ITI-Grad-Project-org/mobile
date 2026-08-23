import { useState } from "react";
import { ActivityIndicator, Modal, Platform } from "react-native";

import type { Review } from "@/api/types";
import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, TextInput, View, useCSSVariable } from "@/tw";

import { StarRating } from "@/shared/ui/StarRating";
import { GlassButton } from "@/shared/ui/GlassButton";

export function ReviewFormSheet({
  visible,
  coachName,
  existing,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  coachName: string;
  existing: Review | null;
  onClose: () => void;
  onSubmit: (values: { rating: number; comment: string }) => Promise<void>;
}) {
  const isEdit = existing !== null;
  const placeholderColor = useCSSVariable("--muted-foreground") as string;

  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form whenever the sheet opens or targets a different review.
  const openKey = visible ? `${existing?.id ?? "new"}` : null;
  const [trackedKey, setTrackedKey] = useState<string | null>(null);
  if (openKey !== trackedKey) {
    setTrackedKey(openKey);
    setRating(existing?.rating ?? 0);
    setComment(existing?.comment ?? "");
    setBusy(false);
    setError(null);
  }

  const close = () => {
    if (busy) return;
    onClose();
  };

  const submit = async () => {
    if (busy) return;
    if (rating < 1) {
      setError("Pick a rating from 1 to 5 stars.");
      return;
    }
    if (!comment.trim()) {
      setError("Write a short comment about your experience.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ rating, comment: comment.trim() });
    } catch (e: any) {
      setError(e?.data?.message || e?.message || "Couldn't save your review. Please try again.");
      setBusy(false);
    }
  };

  const content = (
    <View className="flex-1 bg-card px-5 pb-8 pt-3">
      <View className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

      <View className="mb-5 flex-row items-start justify-between">
        <View className="min-w-0 flex-1">
          <Text className="text-[20px] font-bold text-foreground">
            {isEdit ? "Edit your review" : "Add a review"}
          </Text>
          <Text className="mt-0.5 text-[12.5px] text-muted-foreground" numberOfLines={1}>
            How is training with {coachName} going?
          </Text>
        </View>
        <GlassButton
          onPress={close}
          className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-75"
        >
          <Icon name="x" size={16} color="--muted-foreground" />
        </GlassButton>
      </View>

      <View className="mb-5 items-center gap-2 rounded-2xl bg-secondary/50 py-4">
        <Text className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          Your rating
        </Text>
        <StarRating value={rating} size={30} onChange={setRating} />
      </View>

      <View className="mb-5 gap-y-1.5">
        <Text className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
          Your review
        </Text>
        <View className="min-h-25 rounded-2xl border border-border bg-secondary/40 px-3.5 py-3">
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="What's working well? What could be better?"
            placeholderTextColor={placeholderColor}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={1000}
            className="min-h-20 bg-transparent p-0 text-[14px] text-foreground"
          />
        </View>
      </View>

      {error ? (
        <View className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
          <Text className="text-[13px] font-medium text-destructive">{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={submit}
        disabled={busy}
        className={cn(
          "flex-row items-center justify-center rounded-2xl bg-primary py-3.5 shadow-soft active:opacity-90",
          busy && "opacity-50"
        )}
      >
        {busy ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text className="text-[14.5px] font-semibold text-primary-foreground">
            {isEdit ? "Save changes" : "Post review"}
          </Text>
        )}
      </Pressable>
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}
      >
        {content}
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={close} />
        <View className="min-h-[60%] w-full overflow-hidden rounded-t-3xl bg-card shadow-pop">
          {content}
        </View>
      </View>
    </Modal>
  );
}
