import React, { useState } from "react";
import { RefreshControl, ScrollView as NativeScrollView, ScrollViewProps } from "react-native";

type AppScrollViewProps = ScrollViewProps & {
  onAppRefresh?: () => void | Promise<void>;
  refreshColor?: string;
};

export function AppScrollView({ onAppRefresh, refreshColor = "#EA580C", refreshControl, ...props }: AppScrollViewProps) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (onAppRefresh) await onAppRefresh();
      else await new Promise((resolve) => setTimeout(resolve, 250));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <NativeScrollView
      {...props}
      alwaysBounceVertical={props.alwaysBounceVertical ?? !props.horizontal}
      refreshControl={props.horizontal ? refreshControl : refreshControl || <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[refreshColor]} tintColor={refreshColor} />}
    />
  );
}
