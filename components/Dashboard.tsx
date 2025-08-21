import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const { width } = Dimensions.get("window");

interface DashboardScreenProps {
  session: Session;
}

export default function DashboardScreen({ session }: DashboardScreenProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getUserInitials = (email: string) => {
    const parts = email.split("@")[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    setShowUserMenu(false);
    Alert.alert("Wyloguj się", "Czy na pewno chcesz się wylogować?", [
      {
        text: "Anuluj",
        style: "cancel",
      },
      {
        text: "Wyloguj się",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert("Błąd", "Nie udało się wylogować");
          }
        },
      },
    ]);
  };

  const menuItems = [
    {
      icon: "camera-outline",
      title: "Skanuj dzieło",
      subtitle: "Użyj AI do identyfikacji i nauki o sztuce",
      color: "#667eea",
    },
    {
      icon: "map-outline",
      title: "Mapa muzeum",
      subtitle: "Nawiguj przez wystawy",
      color: "#f093fb",
    },
    {
      icon: "bookmark-outline",
      title: "Moja kolekcja",
      subtitle: "Twoje zapisane dzieła i notatki",
      color: "#4ecdc4",
    },
    {
      icon: "trophy-outline",
      title: "Osiągnięcia",
      subtitle: "Śledź swoją muzealną podróż",
      color: "#fce38a",
    },
    {
      icon: "headset-outline",
      title: "Przewodniki audio",
      subtitle: "Słuchaj kuratorskich doświadczeń",
      color: "#95e1d3",
    },
    {
      icon: "calendar-outline",
      title: "Wydarzenia",
      subtitle: "Odkryj nadchodzące wystawy",
      color: "#f38ba8",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Witaj ponownie!</Text>
            <Text style={styles.userName}>
              {session.user.email?.split("@")[0]}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.avatar}
            onPress={() => setShowUserMenu(true)}
          >
            <Text style={styles.avatarText}>
              {getUserInitials(session.user.email || "")}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Szybkie akcje</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.menuItem, { backgroundColor: item.color }]}
                activeOpacity={0.8}
              >
                <Ionicons name={item.icon as any} size={32} color="#FFFFFF" />
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Ostatnia aktywność</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <Ionicons name="camera" size={24} color="#667eea" />
              <View style={styles.activityText}>
                <Text style={styles.activityTitle}>
                  Zeskanowano &quot;Gwiaździstą noc&quot;
                </Text>
                <Text style={styles.activityTime}>2 godziny temu</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <Ionicons name="bookmark" size={24} color="#4ecdc4" />
              <View style={styles.activityText}>
                <Text style={styles.activityTitle}>Zapisano do kolekcji</Text>
                <Text style={styles.activityTime}>1 dzień temu</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showUserMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUserMenu(false)}
        >
          <View style={styles.userMenu}>
            <View style={styles.userInfo}>
              <View style={styles.modalAvatar}>
                <Text style={styles.avatarText}>
                  {getUserInitials(session.user.email || "")}
                </Text>
              </View>
              <Text style={styles.userEmail}>{session.user.email}</Text>
            </View>

            <TouchableOpacity style={styles.menuOption}>
              <Ionicons name="person-outline" size={20} color="#1E293B" />
              <Text style={styles.menuOptionText}>Ustawienia profilu</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption}>
              <Ionicons name="settings-outline" size={20} color="#1E293B" />
              <Text style={styles.menuOptionText}>Ustawienia aplikacji</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuOption}>
              <Ionicons name="help-circle-outline" size={20} color="#1E293B" />
              <Text style={styles.menuOptionText}>Pomoc i wsparcie</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={[styles.menuOption, styles.signOutOption]}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={[styles.menuOptionText, styles.signOutText]}>
                Wyloguj się
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
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
    paddingHorizontal: 20,
  },
  quickActions: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  menuItem: {
    width: (width - 56) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 12,
    textAlign: "center",
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.8,
    marginTop: 4,
    textAlign: "center",
  },
  recentSection: {
    marginTop: 32,
    marginBottom: 20,
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  activityText: {
    marginLeft: 16,
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1E293B",
  },
  activityTime: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 20,
  },
  userMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    minWidth: 250,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  userInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  userEmail: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  menuOptionText: {
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },
  signOutOption: {
    marginTop: 8,
  },
  signOutText: {
    color: "#ef4444",
  },
});
