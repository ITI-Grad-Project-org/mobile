import { cn } from "@/lib/utils";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, Text, View } from "@/tw";
import { Image } from "@/tw/image";

const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=400&q=80";

export function CoachCard({
  coach,
  requested,
  onOpen,
  onRequest,
  onCancelRequest,
}: {
  coach: any;
  requested: boolean;
  onOpen: () => void;
  onRequest: () => void;
  onCancelRequest?: () => void;
}) {
  const cObj = coach?.coach || coach;

  const firstName = cObj?.firstName || coach?.firstName;
  const lastName = cObj?.lastName || coach?.lastName;
  const coachName =
    firstName || lastName
      ? `${firstName || ""} ${lastName || ""}`.trim()
      : coach?.tenantName || coach?.businessName || coach?.name || "Coach";

  const businessName = coach?.tenantName || coach?.businessName || cObj?.businessName || "Fitness Coaching";
  const avatarUrl = cObj?.avatarUrl || coach?.avatarUrl || coach?.logoUrl || coach?.avatar;
  const coverUrl = cObj?.coverUrl || coach?.coverUrl || coach?.cover || DEFAULT_COVER;
  const location = cObj?.location || coach?.location || "Online";
  const yoe = cObj?.yearsExperience ?? coach?.yearsExperience ?? cObj?.yoe ?? coach?.yoe;
  const rawRating = cObj?.rating ?? coach?.rating;
  const rating = typeof rawRating === "number" ? rawRating : null;
  const bio = cObj?.bio || coach?.bio || "Certified coach offering personalized programs on Uply.";
  const specialties: string[] =
    (cObj?.specialties?.length ? cObj.specialties : coach?.specialties?.length ? coach.specialties : null) || [
      "Strength",
      "Fitness",
    ];
  const priceFrom = cObj?.priceFrom ?? coach?.priceFrom ?? cObj?.priceTo ?? coach?.priceTo;

  const isRequested = requested || coach?.membershipStatus === "requested";

  return (
    <View className="overflow-hidden rounded-3xl bg-card shadow-soft">
      <Pressable onPress={onOpen} className="active:opacity-90">
        <View className="h-32 w-full">
          <Image
            source={typeof coverUrl === "string" ? { uri: coverUrl } : coverUrl}
            className="h-full w-full object-cover"
          />
          {rating != null ? (
            <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-full bg-black/55 px-2 py-1">
              <Icon name="star" size={11} color="#ffffff" />
              <Text className="text-[11px] font-semibold text-white">{rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <View className="flex-row items-start gap-3 px-4 pb-3 pt-4">
          {avatarUrl ? (
            <Image
              source={typeof avatarUrl === "string" ? { uri: avatarUrl } : avatarUrl}
              className="h-16 w-16 rounded-2xl bg-secondary object-cover"
            />
          ) : (
            <View className="h-16 w-16 rounded-2xl bg-secondary items-center justify-center">
              <Icon name="person" size={28} color="--muted-foreground" />
            </View>
          )}

          <View className="min-w-0 flex-1">
            <Text className="text-[16px] font-bold text-foreground" numberOfLines={1}>
              {coachName}
            </Text>

            <Text className="text-[11.5px] font-medium text-muted-foreground" numberOfLines={1}>
              {businessName}
            </Text>

            <View className="mt-0.5 flex-row items-center gap-1">
              <Text className="text-[12px] text-muted-foreground" numberOfLines={1}>
                {location} {yoe != null ? `· ${yoe} yrs exp` : ""}
              </Text>
            </View>

            <Text className="mt-1.5 text-[12.5px] leading-snug text-foreground/75" numberOfLines={2}>
              {bio}
            </Text>

            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {specialties.slice(0, 2).map((s: string) => (
                <View key={s} className="rounded-full bg-secondary px-2 py-0.5">
                  <Text className="text-[10.5px] font-semibold text-foreground capitalize">{s}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Pressable>

      <View className="flex-row items-center justify-between gap-3 border-t border-border/10 px-4 py-3">
        <Text className="text-[12px] text-muted-foreground">
          {priceFrom != null ? (
            <>
              From <Text className="text-[14px] font-bold text-foreground">${priceFrom}</Text>/mo
            </>
          ) : (
            <Text className="text-[12.5px] font-medium text-foreground">{businessName}</Text>
          )}
        </Text>

        <Pressable
          onPress={isRequested ? onCancelRequest : onRequest}
          className={cn(
            "flex-row items-center gap-1.5 rounded-full px-4 py-2 active:opacity-90",
            isRequested ? "bg-success/15 border border-success/30" : "bg-primary shadow-soft"
          )}
        >
          {/* Icon colors must be a CSS var NAME (`--x`); `var(--x)` isn't resolved. */}
          <Icon
            name={isRequested ? "check" : "user-plus"}
            size={13}
            color={isRequested ? "--success" : "--primary-foreground"}
          />
          <Text
            className={cn(
              "text-[12.5px] font-semibold",
              isRequested ? "text-success" : "text-primary-foreground"
            )}
          >
            {isRequested ? "Requested" : "Send request"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
