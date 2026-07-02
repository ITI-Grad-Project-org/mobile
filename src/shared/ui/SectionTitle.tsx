import React from "react";
import { View, Text } from "@/tw";

export interface SectionTitleProps {
  title: string;
  action?: React.ReactNode;
}

export function SectionTitle({ title, action }: SectionTitleProps) {
  return (
    <View className="flex-row justify-between items-center px-1 mb-2.5">
      <Text className="text-[15px] font-semibold text-foreground/80 tracking-tight">
        {title}
      </Text>
      {action}
    </View>
  );
}
