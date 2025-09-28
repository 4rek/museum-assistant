import React, { ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Session } from "@supabase/supabase-js";

interface DashboardHeaderProps {
  session: Session;
  onAvatarPress: () => void;
  children: ReactNode;
}

export default function DashboardHeader({
  session,
  onAvatarPress,
  children,
}: DashboardHeaderProps) {
  const getUserInitials = (email: string) => {
    const parts = email.split("@")[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const capitalize = (val: string) => {
    return val.charAt(0).toUpperCase() + String(val).slice(1);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        style={styles.gradientHeader}
      >
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.greeting}>Witaj ponownie!</Text>
                <Text style={styles.userName}>
                  {capitalize(session.user.email?.split("@")[0])}
                </Text>
              </View>

              <TouchableOpacity style={styles.avatar} onPress={onAvatarPress}>
                <Text style={styles.avatarText}>
                  {getUserInitials(session.user.email || "")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  gradientHeader: {
    // Auto height based on content
  },
  safeArea: {
    // Auto height
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 16,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
});
