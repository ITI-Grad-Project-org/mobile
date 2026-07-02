import { cn } from "@/lib/utils";
import { Pressable, Text, View, type ViewProps } from "@/tw";
import { Tone, type ToneName } from "@/tw/Tone";
import React from "react";

export interface CardProps extends ViewProps {
  tone?: ToneName;
  interactive?: boolean;
  onPress?: () => void;
}

export const Card = ({
  className,
  tone,
  interactive,
  onPress,
  children,
  ...props
}: CardProps) => {
  const baseCard = "rounded-[28px] p-5 overflow-hidden shadow-soft";
  const surface = tone ? "" : "border border-border/60 bg-card";
  const cardClass = cn(baseCard, surface, className);

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
          <Tone name={tone} className={cn(baseCard, "flex-1")}>
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
        {children}
      </Pressable>
    );
  }

  if (tone) {
    return (
      <Tone name={tone} className={cardClass} {...props}>
        {children}
      </Tone>
    );
  }

  return (
    <View className={cardClass} {...props}>
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
