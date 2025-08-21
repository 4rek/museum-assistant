import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function WelcomeScreen() {
  const handleLogin = () => {
    router.push("/auth?mode=login");
  };

  const handleRegister = () => {
    router.push("/auth?mode=register");
  };

  return (
    <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Asystent Muzealny</Text>
            <Text style={styles.subtitle}>
              Odkryj sztukę, historię i kulturę ze swoim osobistym przewodnikiem
              AI
            </Text>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Zaloguj się</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleRegister}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Utwórz konto</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Przeżyj muzea jak nigdy dotąd dzięki analizie opartej na AI
            </Text>
          </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
    opacity: 0.9,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  buttonsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButton: {
    backgroundColor: "#FFFFFF",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  primaryButtonText: {
    color: "#667eea",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    opacity: 0.8,
    lineHeight: 20,
  },
});
