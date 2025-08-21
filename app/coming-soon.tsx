import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

export default function ComingSoonScreen() {
  const { feature } = useLocalSearchParams<{ feature: string }>();

  const getFeatureInfo = () => {
    switch (feature) {
      case "achievements":
        return {
          title: "Osiągnięcia",
          subtitle: "Śledź swoją muzealną podróż",
          icon: "trophy-outline" as const,
          description:
            "Odkryj swoje postępy w eksploracji sztuki i kultury. Zdobywaj odznaki za odwiedzane muzea, zeskanowane dzieła i ukończone wyzwania.",
          color: "#fce38a",
        };
      case "events":
        return {
          title: "Wydarzenia",
          subtitle: "Odkryj nadchodzące wystawy",
          icon: "calendar-outline" as const,
          description:
            "Bądź na bieżąco z najnowszymi wystawami, warsztatami i wydarzeniami kulturalnymi w Twojej okolicy i na całym świecie.",
          color: "#f38ba8",
        };
      default:
        return {
          title: "Funkcja",
          subtitle: "Nowa funkcjonalność",
          icon: "star-outline" as const,
          description: "Ta funkcja jest obecnie w przygotowaniu.",
          color: "#667eea",
        };
    }
  };

  const featureInfo = getFeatureInfo();

  return (
    <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.mainContent}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: featureInfo.color },
              ]}
            >
              <Ionicons name={featureInfo.icon} size={64} color="#FFFFFF" />
            </View>

            <Text style={styles.title}>{featureInfo.title}</Text>
            <Text style={styles.subtitle}>{featureInfo.subtitle}</Text>

            <View style={styles.comingSoonContainer}>
              <Text style={styles.comingSoonText}>Wkrótce dostępne!</Text>
              <Text style={styles.description}>{featureInfo.description}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => router.back()}
          >
            <Text style={styles.returnButtonText}>Powrót do głównej</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 20,
    padding: 8,
  },
  mainContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#FFFFFF",
    opacity: 0.9,
    textAlign: "center",
    marginBottom: 40,
  },
  comingSoonContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  comingSoonText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#FFFFFF",
    opacity: 0.8,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  notificationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  notificationText: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    flex: 1,
  },
  returnButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  returnButtonText: {
    color: "#667eea",
    fontSize: 18,
    fontWeight: "600",
  },
});
