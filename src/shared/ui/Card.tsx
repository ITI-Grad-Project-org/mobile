import { cn } from "@/lib/utils";
import { Pressable, Text, View, type ViewProps } from "@/tw";
import { GlassSheen, Tone, type ToneName } from "@/tw/Tone";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet } from "react-native";

export interface CardProps extends ViewProps {
  tone?: ToneName;
  interactive?: boolean;
  raised?: boolean;
  glass?: boolean;
  onPress?: () => void;
}

const RaisedOverlay = () => (
  <LinearGradient
    colors={["rgba(255,255,255,0.08)", "rgba(0,0,0,0.16)"]}
    start={{ x: 0.5, y: 0 }}
    end={{ x: 0.5, y: 1 }}
    style={StyleSheet.absoluteFill}
    pointerEvents="none"
  />
);

const GlassSurface = ({
  className,
  tone,
  children,
  ...props
}: ViewProps & { tone?: ToneName }) => {
  if (tone) {
    return (
      <Tone name={tone} glass className={cn("rounded-xl p-5", className)} {...props}>
        {children}
      </Tone>
    );
  }
  return (
    <View
      className={cn(
        "rounded-xl overflow-hidden border border-white/30 bg-card/60 shadow-pop p-5",
        className
      )}
      {...props}
    >
      <GlassSheen />
      {children}
    </View>
  );
};

export const Card = ({
  className,
  tone,
  interactive,
  raised,
  glass,
  onPress,
  children,
  ...props
}: CardProps) => {
  const showRaised = raised && !tone && !glass;
  const baseCard = "rounded-xl p-5 overflow-hidden shadow-soft";
  const surface = tone
    ? ""
    : "border border-border bg-card text-card-foreground";
  const cardClass = cn(baseCard, surface, className);

  if (glass) {
    if (interactive) {
      // Render children DIRECTLY in the Pressable so the caller's className
      // (layout like flex-row / padding) lands on the element that holds them.
      // The glass fills sit behind as absolute-fill siblings — same approach as
      // RaisedOverlay on the plain card.
      return (
        <Pressable
          onPress={onPress}
          className={cn(
            "overflow-hidden rounded-xl border border-white/30 shadow-pop p-5",
            !tone && "bg-card/60",
            "active:opacity-90 active:scale-[0.99] transition-all duration-100",
            className
          )}
          {...props}
        >
          {tone ? (
            <Tone
              name={tone}
              className="opacity-80"
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          ) : null}
          <GlassSheen />
          {children}
        </Pressable>
      );
    }
    return (
      <GlassSurface tone={tone} className={className} {...props}>
        {children}
      </GlassSurface>
    );
  }

  if (interactive) {
    if (tone) {
      return (
        <Pressable
          onPress={onPress}
          className={cn(
            "active:opacity-90 active:scale-[0.99] transition-all duration-100",
            className
          )}
          {...props}
        >
          <Tone name={tone} raised={raised} className={cn(baseCard, "flex-1")}>
            {children}
          </Tone>
        </Pressable>
      );
    }
    return (
      <Pressable
        onPress={onPress}
        className={cn(
          "active:opacity-90 active:scale-[0.99] transition-all duration-100",
          cardClass
        )}
        {...props}
      >
        {showRaised && <RaisedOverlay />}
        {children}
      </Pressable>
    );
  }

  if (tone) {
    return (
      <Tone name={tone} raised={raised} className={cardClass} {...props}>
        {children}
      </Tone>
    );
  }

  return (
    <View className={cardClass} {...props}>
      {showRaised && <RaisedOverlay />}
      {children}
    </View>
  );
};
Card.displayName = "Card";

export const CardHeader = ({ className, ...props }: ViewProps) => (
  <View className={cn("flex-col gap-1.5 p-5", className)} {...props} />
);
CardHeader.displayName = "CardHeader";

export const CardTitle = ({
  className,
  ...props
}: React.ComponentProps<typeof Text>) => (
  <Text
    className={cn(
      "font-semibold leading-none tracking-tight text-lg text-foreground",
      className
    )}
    {...props}
  />
);
CardTitle.displayName = "CardTitle";

export const CardDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof Text>) => (
  <Text className={cn("text-sm text-muted-foreground", className)} {...props} />
);
CardDescription.displayName = "CardDescription";

export const CardContent = ({ className, ...props }: ViewProps) => (
  <View className={cn("p-5 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

export const CardFooter = ({ className, ...props }: ViewProps) => (
  <View
    className={cn("flex-row items-center p-5 pt-0", className)}
    {...props}
  />
);
CardFooter.displayName = "CardFooter";
