import { Ionicons } from "@expo/vector-icons";

import type { MaterialTopTabBarProps } from "expo-router/js-top-tabs";

import { useLinkBuilder } from "expo-router/react-navigation";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Animated as RNAnimated,
  type LayoutChangeEvent,
  StyleSheet,
  View,
} from "react-native";

import { useState } from "react";

import { theme } from "@/constants/theme";

import TabBarButton from "./TabBarButton";

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const BAR_HEIGHT = 72;

const BAR_HORIZONTAL_MARGIN = 40;
const BAR_HORIZONTAL_PADDING = 4;
/*
 * How much smaller the active pill is than one tab.
 *
 * Lower value  = wider pill
 * Higher value = narrower pill
 */
const INDICATOR_HORIZONTAL_PADDING = 24;

/*
 * Height of the active pill.
 *
 * 52px inside a 72px bar gives:
 *
 * (72 - 52) / 2 = 10px
 *
 * top and bottom.
 */
const INDICATOR_HEIGHT = 52;

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

const ICONS_BY_ROUTE = {
  index: {
    active: "home",
    inactive: "home-outline",
  },

  second: {
    active: "warning",
    inactive: "warning-outline",
  },

  third: {
    active: "time",
    inactive: "time-outline",
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function TabBar({
  state,
  descriptors,
  navigation,
  position,
}: MaterialTopTabBarProps) {
  const { buildHref } = useLinkBuilder();

  const insets = useSafeAreaInsets();

  const [barWidth, setBarWidth] = useState(0);

  /* ---------------------------------------------------------------------- */
  /* Dimensions                                                             */
  /* ---------------------------------------------------------------------- */

  const onLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  /*
   * The bar has horizontal padding on both sides.
   *
   * Example:
   *
   * barWidth = 300
   * padding = 8
   *
   * usable width = 284
   */
  const contentWidth = Math.max(
    barWidth - BAR_HORIZONTAL_PADDING * 2,
    0,
  );

  const tabCount = state.routes.length;

  const buttonWidth =
    tabCount > 0
      ? contentWidth / tabCount
      : 0;

  /*
   * Make the pill narrower than the tab.
   */
  const indicatorWidth = Math.max(
    buttonWidth - INDICATOR_HORIZONTAL_PADDING,
    0,
  );

  /*
   * Center the pill inside each tab.
   */
  const indicatorInset =
    (buttonWidth - indicatorWidth) / 2;

  /*
   * Material Top Tabs gives us `position`.
   *
   * position:
   *
   * 0     = first tab
   * 1     = second tab
   * 2     = third tab
   *
   * It is also fractional while swiping:
   *
   * 0.5   = halfway between first and second
   *
   * The bar's horizontal padding must be included because
   * the indicator is positioned relative to the entire bar.
   */
  const translateX = RNAnimated.add(
    RNAnimated.multiply(
      position,
      buttonWidth,
    ),
    BAR_HORIZONTAL_PADDING +
      indicatorInset,
  );

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.bar,
        {
          bottom:
            Math.max(insets.bottom, 12) - 4,
        },
      ]}
    >
      {/* ---------------------------------------------------------------- */}
      {/* Active indicator                                                 */}
      {/* ---------------------------------------------------------------- */}

      <RNAnimated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          {
            width: indicatorWidth,
            height: INDICATOR_HEIGHT,

            /*
             * Vertically center the pill.
             *
             * (72 - 52) / 2 = 10
             */
            top:
              (BAR_HEIGHT - INDICATOR_HEIGHT) /
              2 -
              theme.borderWidth,

            transform: [
              {
                translateX,
              },
            ],
          },
        ]}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Tab buttons                                                       */}
      {/* ---------------------------------------------------------------- */}

      {state.routes.map((route: (typeof state.routes)[number], index: number) => {
        const { options } =
          descriptors[route.key];

        const label =
          options.tabBarLabel ??
          options.title ??
          route.name;

        const isFocused =
          state.index === index;

        const iconPair =
          ICONS_BY_ROUTE[
            route.name as keyof typeof ICONS_BY_ROUTE
          ] ?? {
            active: "ellipse",
            inactive: "ellipse-outline",
          };

        const iconName = isFocused
          ? iconPair.active
          : iconPair.inactive;

        /* -------------------------------------------------------------- */
        /* Press                                                           */
        /* -------------------------------------------------------------- */

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (
            !isFocused &&
            !event.defaultPrevented
          ) {
            navigation.navigate(
              route.name,
              route.params,
            );
          }
        };

        /* -------------------------------------------------------------- */
        /* Long press                                                      */
        /* -------------------------------------------------------------- */

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        /* -------------------------------------------------------------- */
        /* Button                                                          */
        /* -------------------------------------------------------------- */

        return (
          <TabBarButton
            key={route.key}
            route={route}
            isFocused={isFocused}
            color={
              isFocused
                ? theme.colors.foreground
                : theme.colors.mutedForeground
            }
            iconColor={
              isFocused
                ? theme.colors.primaryForeground
                : theme.colors.mutedForeground
            }
            label={String(label)}
            iconName={
              iconName as React.ComponentProps<
                typeof Ionicons
              >["name"]
            }
            href={
              buildHref(
                route.name,
                route.params,
              ) ?? ""
            }
            accessibilityLabel={
              options.tabBarAccessibilityLabel
            }
            testID={
              options.tabBarButtonTestID
            }
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}

    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  bar: {
    position: "absolute",

    left: BAR_HORIZONTAL_MARGIN,
    right: BAR_HORIZONTAL_MARGIN,

    height: BAR_HEIGHT,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal:
      BAR_HORIZONTAL_PADDING,

    borderRadius: theme.radius.pill,

    backgroundColor: theme.colors.card,

    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth,

    overflow: "hidden",
  },

  indicator: {
    position: "absolute",

    borderRadius:
      INDICATOR_HEIGHT / 2,

    backgroundColor: theme.colors.primary,
  },
});
