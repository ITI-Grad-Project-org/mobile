import { useState } from "react";
import { Modal, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassButton } from "@/shared/ui/GlassButton";
import { Icon } from "@/shared/ui/Icon";
import { ScrollView, Text, View } from "@/tw";
import { Image } from "@/tw/image";

/**
 * Full-screen pager for the transformation photos. Mount it keyed on the
 * tapped index so the pager starts there — `contentOffset` only applies on
 * first layout.
 */
export function PhotoViewer({
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
            className="h-11 w-11 items-center justify-center rounded-full bg-white/15 active:opacity-70"
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
