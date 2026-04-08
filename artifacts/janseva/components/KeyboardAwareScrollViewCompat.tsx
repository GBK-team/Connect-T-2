import { Platform, ScrollView, ScrollViewProps } from "react-native";
import React from "react";

let NativeKeyboardAwareScrollView: React.ComponentType<any> | null = null;
if (Platform.OS !== "web") {
  try {
    NativeKeyboardAwareScrollView = require("react-native-keyboard-controller").KeyboardAwareScrollView;
  } catch {}
}

type Props = ScrollViewProps & {
  children?: React.ReactNode;
  bottomOffset?: number;
};

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  if (Platform.OS === "web" || !NativeKeyboardAwareScrollView) {
    return (
      <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
        {children}
      </ScrollView>
    );
  }
  const KASV = NativeKeyboardAwareScrollView;
  return (
    <KASV
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    >
      {children}
    </KASV>
  );
}
