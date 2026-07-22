import { Modal } from "react-native";
import { cn } from "@/lib/utils";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, View, useCSSVariable } from "@/tw";
import { Image } from "@/tw/image";
import { Tone } from "@/tw/Tone";

const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=400&q=80";

export function CoachSheet({
  coach,
  requested,
  onClose,
  onRequest,
  onCancelRequest,
}: {
  coach: any;
  requested: boolean;
  onClose: () => void;
  onRequest: () => void;
  onCancelRequest?: () => void;
}) {
  const foreground = useCSSVariable("--foreground") as string;
  const lilacInk = useCSSVariable("--lilac-ink") as string;

  const cObj = coach?.coach || coach;

  const firstName = cObj?.firstName || coach?.firstName;
  const lastName = cObj?.lastName || coach?.lastName;
  const coachName =
    firstName || lastName
      ? `${firstName || ""} ${lastName || ""}`.trim()
      : coach?.tenantName || coach?.businessName || coach?.name || "Coach Profile";

  const businessName = coach?.tenantName || coach?.businessName || cObj?.businessName || "Fitness Coaching";
  const avatarUrl = cObj?.avatarUrl || coach?.avatarUrl || coach?.logoUrl || coach?.avatar;
  const coverUrl = cObj?.coverUrl || coach?.coverUrl || coach?.cover || DEFAULT_COVER;
  const location = cObj?.location || coach?.location || "Online";
  const yoe = cObj?.yearsExperience ?? coach?.yearsExperience ?? cObj?.yoe ?? coach?.yoe;
  const rating = cObj?.rating ?? coach?.rating ?? 4.9;
  const reviews = cObj?.reviews ?? coach?.reviews ?? 24;
  const bio = cObj?.bio || coach?.bio || "Certified coach offering personalized training programs.";
  const specialties: string[] =
    (cObj?.specialties?.length ? cObj.specialties : coach?.specialties?.length ? coach.specialties : null) || [
      "Strength",
      "Fitness",
    ];
  const priceFrom = cObj?.priceFrom ?? coach?.priceFrom ?? cObj?.priceTo ?? coach?.priceTo;

  const isRequested = requested || coach?.membershipStatus === "requested";

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/55">
        <View className="max-h-[92%] overflow-hidden rounded-t-3xl bg-card">
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="h-40 w-full">
              <Image
                source={typeof coverUrl === "string" ? { uri: coverUrl } : coverUrl}
                className="h-full w-full object-cover"
              />
              <View className="absolute right-4 top-4">
                <GlassButton
                  onPress={onClose}
                  accessibilityLabel="Close"
                  className="h-9 w-9 rounded-full"
                >
                  <Icon name="x" size={16} color={foreground} />
                </GlassButton>
              </View>
            </View>

            <View className="px-5 pb-5">
              <View className="-mt-10 self-start rounded-3xl bg-card p-1.5 shadow-pop">
                {avatarUrl ? (
                  <Image
                    source={typeof avatarUrl === "string" ? { uri: avatarUrl } : avatarUrl}
                    className="h-20 w-20 rounded-3xl bg-secondary object-cover"
                  />
                ) : (
                  <View className="h-20 w-20 rounded-3xl bg-secondary items-center justify-center">
                    <Icon name="person" size={32} color="--muted-foreground" />
                  </View>
                )}
              </View>

              <View className="mt-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-[22px] font-bold text-foreground">{coachName}</Text>
                  <Text className="text-[13px] font-semibold text-primary">{businessName}</Text>
                </View>
                <View className="flex-row items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
                  <Icon name="sparkles" size={11} color="--primary" />
                  <Text className="text-[11px] font-semibold text-foreground">{rating}</Text>
                  <Text className="text-[11px] text-muted-foreground">· {reviews}</Text>
                </View>
              </View>

              <View className="mt-2 flex-row items-center gap-1">
                <Text className="text-[12.5px] text-muted-foreground">
                  {location} {yoe != null ? `· ${yoe} yrs experience` : ""}
                </Text>
              </View>

              <Text className="mt-4 text-[14px] leading-relaxed text-foreground/85">{bio}</Text>

              <Text className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Specialties
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-1.5">
                {specialties.map((s: string) => (
                  <View key={s} className="flex-row items-center gap-1 rounded-full bg-secondary px-3 py-1">
                    <Text className="text-[12px] font-semibold text-foreground capitalize">{s}</Text>
                  </View>
                ))}
              </View>

              {cObj?.careerExperience ? (
                <View className="mt-4">
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Background
                  </Text>
                  <Text className="mt-1 text-[13px] text-foreground/80">{cObj.careerExperience}</Text>
                </View>
              ) : null}

              <Tone name="lilac" className="mt-5 rounded-2xl p-4">
                <View className="flex-row items-center gap-2">
                  <Icon name="sparkles" size={13} color={lilacInk} />
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lilac-ink opacity-80">
                    Pricing & Services
                  </Text>
                </View>
                <Text className="mt-1 text-[13.5px] font-medium text-lilac-ink">
                  {priceFrom != null
                    ? `Programs starting from $${priceFrom}/month. Includes personalized plan & direct chat access.`
                    : "Offers custom 1-on-1 coaching plans, workouts, and messaging."}
                </Text>
              </Tone>

              <Pressable
                onPress={isRequested ? onCancelRequest : onRequest}
                className={cn(
                  "mt-6 h-14 flex-row items-center justify-center gap-2 rounded-2xl py-3.5 shadow-soft active:opacity-90",
                  isRequested ? "bg-success/20 border border-success/40" : "bg-primary"
                )}
              >
                <Icon
                  name={isRequested ? "check" : "send"}
                  size={16}
                  color={isRequested ? "var(--success)" : "var(--primary-foreground)"}
                />
                <Text
                  className={cn(
                    "text-[15px] font-semibold",
                    isRequested ? "text-success" : "text-primary-foreground"
                  )}
                >
                  {isRequested ? "Requested (Tap to Cancel)" : "Send Join Request"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
