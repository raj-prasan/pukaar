import { withLayoutContext } from "expo-router";

import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationEventMap,
  type MaterialTopTabNavigationOptions,
  type MaterialTopTabBarProps,
} from "expo-router/js-top-tabs";

import type {
  ParamListBase,
  TabNavigationState,
} from "expo-router/react-navigation";

import { TabBar } from "@/components/TabBar";

const { Navigator } = createMaterialTopTabNavigator();

const SwipeTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

export default function TabsLayout() {
  return (
    <SwipeTabs
      tabBar={(props: MaterialTopTabBarProps) => (
        <TabBar {...props} />
      )}
      tabBarPosition="bottom"
      screenOptions={{
        animationEnabled: true,
        swipeEnabled: true,
      }}
    >
      <SwipeTabs.Screen
        name="index"
        options={{ title: "Home" }}
      />

      <SwipeTabs.Screen
        name="second"
        options={{ title: "Incidents" }}
      />

      <SwipeTabs.Screen
        name="third"
        options={{ title: "Status" }}
      />
    </SwipeTabs>
  );
}
