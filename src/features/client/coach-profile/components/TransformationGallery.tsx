import { useState } from "react";
import { Modal, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "@/shared/ui/Card";
import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { Pressable, ScrollView, Text, View } from "@/tw";
import { Image } from "@/tw/image";

export function TransformationGallery({ photos }: { photos: string[] }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <Card glass className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-[15px] font-bold text-foreground">
            Client transformations
          </Text>
          <Text className="text-[12px] text-muted-foreground">
            {photos.length} photo{photos.length === 1 ? "" : "s"}
          </Text>
        </View>

        {/* Negative margin so the strip bleeds to the card edge while the
            header above keeps the card's padding. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-5"
          contentContainerClassName="gap-x-2.5 px-5"
        >
          {photos.map((uri, i) => (
            <Pressable
              key={uri}
              onPress={() => setViewerIndex(i)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Transformation photo ${i + 1} of ${photos.length}`}
              className="h-52 w-40 overflow-hidden rounded-2xl bg-secondary active:opacity-85"
            >
              <Image source={{ uri }} className="h-full w-full object-cover" />
            </Pressable>
          ))}
        </ScrollView>
      </Card>

      {/* Mounted only while open, and keyed on the tapped photo, so the pager
          starts on it — `contentOffset` only applies on first layout. */}
      {viewerIndex != null ? (
        <PhotoViewer
          key={viewerIndex}
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </>
  );
}

function PhotoViewer({
  photos,
  initialIndex,
  onClose,
}: {
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(initialIndex);
  // The hook, not `SafeAreaView`: a Modal is its own native view hierarchy, so
  // the auto-measuring component reads zero insets inside one. The hook still
  // works — it reads the provider through the React tree.
  const insets = useSafeAreaInsets();

  // The pager keeps the full window width so paging stays aligned with the
  // screen; only the photo inside each page is inset.
  const sidePadding = Math.max(insets.left, insets.right, 12);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      // Android: draw under the status bar so `insets.top` is the real notch
      // offset rather than double padding below an opaque bar.
      statusBarTranslucent
    >
      <View className="flex-1 bg-black">
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * width, y: 0 }}
          onMomentumScrollEnd={(e) =>
            setPage(Math.round(e.nativeEvent.contentOffset.x / width))
          }
        >
          {photos.map((uri) => (
            <View
              key={uri}
              style={{
                width,
                // Clear of the notch/home indicator, and of the controls above.
                paddingTop: insets.top + 56,
                paddingBottom: insets.bottom + 16,
                paddingHorizontal: sidePadding,
              }}
              className="flex-1 justify-center"
            >
              <Image source={{ uri }} className="h-full w-full object-contain" />
            </View>
          ))}
        </ScrollView>

        <View
          className="absolute inset-x-0 top-0 flex-row items-center justify-between"
          style={{
            paddingTop: insets.top + 8,
            paddingBottom: 8,
            paddingLeft: sidePadding,
            paddingRight: sidePadding,
          }}
        >
          <GlassButton
            onPress={onClose}
            accessibilityLabel="Close photo"
            className="h-10 w-10 items-center justify-center rounded-full bg-white/15 active:opacity-70"
          >
            <Icon name="x" size={20} color="#ffffff" />
          </GlassButton>
          {photos.length > 1 ? (
            <View className="rounded-full bg-white/15 px-3 py-1">
              <Text className="text-[12.5px] font-semibold text-white">
                {page + 1} / {photos.length}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
