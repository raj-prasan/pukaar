import { PlatformPressable } from "expo-router/react-navigation";
import { Ionicons } from "@expo/vector-icons";

import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useEffect } from "react";
import { StyleSheet } from "react-native";

type TabBarButtonProps = {
  route: {
    key: string;
  };

  isFocused: boolean;
  color: string;
  iconColor: string;
  label: string;

  iconName: React.ComponentProps<typeof Ionicons>["name"];

  href: string;
  accessibilityLabel?: string;
  testID?: string;

  onPress: () => void;
  onLongPress: () => void;
};

export default function TabBarButton({
  route,
  isFocused,
  color,
  iconColor,
  label,
  iconName,
  href,
  accessibilityLabel,
  testID,
  onPress,
  onLongPress,
}: TabBarButtonProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, {
      duration: 350,
    });
  }, [isFocused, progress]);

  /*
   * Icon:
   *
   * Inactive:
   *   normal size
   *   centered within the icon/label group
   *
   * Active:
   *   larger
   *   moves down into the center of the pill because the faded label
   *   still reserves space in the centered group.
   */
  const animatedIconStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [1, 1.5]);

    /*
     * The label remains in the layout while fading out, so the icon
     * needs a focused-state offset to stay centered in the pill.
     */
    const translateY = interpolate(progress.value, [0, 1], [0, 10]);

    return {
      transform: [
        {
          translateY,
        },
        {
          scale,
        },
      ],
    };
  });

  /*
   * Label fades out as the icon becomes active.
   */
  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 0.7, 1], [1, 0.2, 0]),
    };
  });

  return (
    <PlatformPressable
      key={route.key}
      href={href}
      android_ripple={{
        color: "transparent",
      }}
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.button}
    >
      {/*
       * This group is ALWAYS vertically centered.
       *
       * The label is part of the inactive layout,
       * but the whole group remains centered.
       */}
      <ViewWrapper>
        <Animated.View style={[styles.icon, animatedIconStyle]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </Animated.View>

        <Animated.Text
          numberOfLines={1}
          style={[styles.label, { color }, animatedLabelStyle]}
        >
          {label}
        </Animated.Text>
      </ViewWrapper>
    </PlatformPressable>
  );
}

/*
 * A normal View wrapper keeps icon + label as a single
 * centered group.
 */
function ViewWrapper({ children }: { children: React.ReactNode }) {
  return <Animated.View style={styles.content}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  button: {
    flex: 1,

    height: "100%",

    alignItems: "center",
    justifyContent: "center",
  },

  /*
   * The entire icon + label group is centered.
   *
   * 24px icon
   * 4px gap
   * 16px label
   *
   * Total = 44px
   *
   * Inside a 72px bar:
   *
   * (72 - 44) / 2 = 14px top/bottom
   */
  content: {
    alignItems: "center",
    justifyContent: "center",

    gap: 4,
  },

  icon: {
    height: 24,
    width: 24,

    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontSize: 12,
    lineHeight: 16,

    textAlign: "center",
  },
});
