import { useUser } from "@clerk/expo";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EmergencyActions from "@/components/home/EmergencyActions";
import HomeHeader from "@/components/home/HomeHeader";
import HomeStats from "@/components/home/HomeStats";
import NearbyResources from "@/components/home/NearbyResources";
import ScenarioGuides from "@/components/home/ScenarioGuides";
import { theme } from "@/constants/theme";

export default function HomeScreen() {
  const { user } = useUser();
  const firstName = user?.firstName?.toUpperCase() ?? "THERE";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader firstName={firstName} />
        <HomeStats />
        <ScenarioGuides />
        <EmergencyActions />
        <NearbyResources />
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingTop: 12,
    paddingBottom: 100,
  },
  bottomSpace: {
    height: 16,
  },
});
