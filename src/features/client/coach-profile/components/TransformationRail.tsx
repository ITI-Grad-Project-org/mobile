import { useState } from "react";

import type { TransformationPhoto } from "@/lib/coach";
import { Pressable, Text, View } from "@/tw";
import { Image } from "@/tw/image";

import { PhotoViewer } from "./PhotoViewer";
import { SectionLabel } from "./SectionLabel";

/**
 * Two photos and a door to the rest.
 *
 * Zero photos renders nothing at all — the caller omits the section. A
 * placeholder tile here would advertise an absence, which is the opposite of
 * what this section is for.
 */
export function TransformationRail({ photos }: { photos: TransformationPhoto[] }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const shown = photos.slice(0, 2);
  const hasMore = photos.length > shown.length;
  const urls = photos.map((photo) => photo.url);

  return (
    <View className="gap-2.5">
      <View className="flex-row items-center justify-between">
        <SectionLabel>Transformations</SectionLabel>
        <Text className="text-xs text-muted-foreground">
          {photos.length} photo{photos.length === 1 ? "" : "s"}
        </Text>
      </View>

      <View className="flex-row gap-2.25">
        {shown.map((photo, index) => (
          <Pressable
            key={photo.url}
            onPress={() => setViewerIndex(index)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Transformation photo ${index + 1} of ${photos.length}`}
            className="h-[132px] flex-1 overflow-hidden rounded-2xl bg-secondary active:opacity-85"
          >
            <Image source={{ uri: photo.url }} className="h-full w-full object-cover" />
            {/* Only when the payload actually carried a caption. Nothing here
                invents a duration for a photo that came as a bare URL. */}
            {photo.caption ? (
              <View className="absolute bottom-2 left-2 rounded-[11px] bg-background/70 px-2.5 py-1">
                <Text className="text-[10.5px] font-semibold text-foreground">
                  {photo.caption}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ))}

        {hasMore ? (
          <Pressable
            onPress={() => setViewerIndex(0)}
            accessibilityRole="button"
            accessibilityLabel={`See all ${photos.length} transformation photos`}
            className="h-[132px] w-[52px] items-center justify-center rounded-2xl border border-dashed border-border active:opacity-70"
          >
            <Text className="text-center text-[10.5px] font-semibold leading-[1.3] text-muted-foreground">
              See{"\n"}all
            </Text>
          </Pressable>
        ) : null}
      </View>

      {viewerIndex != null ? (
        <PhotoViewer
          key={viewerIndex}
          photos={urls}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </View>
  );
}
