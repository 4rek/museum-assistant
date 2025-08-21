import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import HeaderContainer from "@/components/HeaderContainer";

const { width } = Dimensions.get("window");
const cardWidth = (width - 48) / 2;

// Sample collection data
const collectionItems = [
  {
    id: 1,
    title: "Mona Lisa",
    artist: "Leonardo da Vinci",
    museum: "Musée du Louvre",
    dateAdded: "2 dni temu",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/300px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
  },
  {
    id: 2,
    title: "Gwiaździsta noc",
    artist: "Vincent van Gogh",
    museum: "Museum of Modern Art",
    dateAdded: "5 dni temu",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/300px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg",
  },
  {
    id: 3,
    title: "Krzyyk",
    artist: "Edvard Munch",
    museum: "Muzeum Narodowe w Oslo",
    dateAdded: "1 tydzień temu",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg/300px-Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg",
  },
];

export default function CollectionScreen() {
  return (
    <HeaderContainer title="Moja kolekcja">
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="images-outline" size={24} color="#667eea" />
            <Text style={styles.statNumber}>{collectionItems.length}</Text>
            <Text style={styles.statLabel}>Dzieła</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="business-outline" size={24} color="#4ecdc4" />
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Muzea</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="heart-outline" size={24} color="#f093fb" />
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Ulubione</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ostatnio dodane</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Zobacz wszystkie</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.collectionGrid}>
          {collectionItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.collectionCard}
              activeOpacity={0.8}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.artworkImage}
                  resizeMode="cover"
                />
                <View style={styles.favoriteIcon}>
                  <Ionicons name="heart-outline" size={16} color="#FFFFFF" />
                </View>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.artworkTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.artistName} numberOfLines={1}>
                  {item.artist}
                </Text>
                <Text style={styles.museumName} numberOfLines={1}>
                  {item.museum}
                </Text>
                <Text style={styles.dateAdded}>{item.dateAdded}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.emptyStateContainer}>
          <Ionicons name="add-circle-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyStateTitle}>Dodaj więcej dzieł</Text>
          <Text style={styles.emptyStateText}>
            Skanuj dzieła sztuki w muzeach, aby rozbudować swoją kolekcję
          </Text>
          <TouchableOpacity style={styles.scanButton}>
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.scanButtonText}>Skanuj dzieło</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <SafeAreaView style={styles.bottomSafeArea} />
    </HeaderContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  gradientContainer: {
    maxHeight: 150,
  },
  topSafeArea: {
    // No flex here either
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bottomSafeArea: {
    backgroundColor: "#f8fafc",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
  },
  seeAllText: {
    fontSize: 14,
    color: "#667eea",
    fontWeight: "600",
  },
  collectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 32,
  },
  collectionCard: {
    width: cardWidth,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: "relative",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  artworkImage: {
    width: "100%",
    height: 140,
  },
  favoriteIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    padding: 16,
  },
  artworkTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  artistName: {
    fontSize: 14,
    color: "#667eea",
    marginBottom: 4,
  },
  museumName: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
  },
  dateAdded: {
    fontSize: 11,
    color: "#94A3B8",
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: "#667eea",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scanButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
