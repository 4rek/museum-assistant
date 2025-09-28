import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import HeaderContainer from "@/components/HeaderContainer";
import { conversationService, type Conversation } from "@/lib/conversationService";

const { width } = Dimensions.get("window");
const cardWidth = (width - 48) / 2;

interface LocationGroup {
  location: string;
  conversations: Conversation[];
}

export default function CollectionScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupedConversations, setGroupedConversations] = useState<LocationGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const data = await conversationService.getConversations();
      setConversations(data);

      // Group conversations by location
      const grouped = groupConversationsByLocation(data);
      setGroupedConversations(grouped);
    } catch (error) {
      console.error("Error loading conversations:", error);
      Alert.alert("Błąd", "Nie udało się załadować kolekcji");
    } finally {
      setIsLoading(false);
    }
  };

  const groupConversationsByLocation = (conversations: Conversation[]): LocationGroup[] => {
    const groups: { [key: string]: Conversation[] } = {};

    conversations.forEach((conversation) => {
      // Prioritize artwork location over user location
      let locationKey = "Nieznana lokalizacja";

      if (conversation.location_name) {
        locationKey = conversation.location_name;
      } else if (conversation.location_address) {
        // Extract meaningful part from address (remove house numbers, etc.)
        const addressParts = conversation.location_address.split(',');
        locationKey = addressParts.length > 1 ? addressParts[addressParts.length - 2].trim() : conversation.location_address;
      }

      if (!groups[locationKey]) {
        groups[locationKey] = [];
      }
      groups[locationKey].push(conversation);
    });

    // Sort groups by number of conversations (descending)
    return Object.entries(groups)
      .map(([location, conversations]) => ({
        location,
        conversations: conversations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      }))
      .sort((a, b) => b.conversations.length - a.conversations.length);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Dzisiaj";
    if (diffDays === 2) return "Wczoraj";
    if (diffDays <= 7) return `${diffDays} dni temu`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} tyg. temu`;
    return `${Math.ceil(diffDays / 30)} mies. temu`;
  };

  const handleConversationPress = (conversation: Conversation) => {
    router.push({
      pathname: "/artwork-chat",
      params: {
        conversationId: conversation.id,
        imageUri: conversation.artwork_image_url ? encodeURIComponent(conversation.artwork_image_url) : undefined,
      },
    });
  };

  const handleScanPress = () => {
    router.push("/scan-artwork");
  };

  const toggleSection = (location: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [location]: !prev[location]
    }));
  };

  const isSectionCollapsed = (location: string) => {
    // Default to collapsed (true) if not explicitly set to expanded (false)
    return collapsedSections[location] !== false;
  };
  if (isLoading) {
    return (
      <HeaderContainer title="Moja kolekcja" onBackPress={() => router.push("/")} showHomeButton={true}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Ładowanie kolekcji...</Text>
        </View>
      </HeaderContainer>
    );
  }

  return (
    <HeaderContainer title="Moja kolekcja" onBackPress={() => router.push("/")} showHomeButton={true}>
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="images-outline" size={24} color="#667eea" />
            <Text style={styles.statNumber}>{conversations.length}</Text>
            <Text style={styles.statLabel}>Dzieła</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="location-outline" size={24} color="#4ecdc4" />
            <Text style={styles.statNumber}>{groupedConversations.length}</Text>
            <Text style={styles.statLabel}>Lokalizacje</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color="#f093fb" />
            <Text style={styles.statNumber}>
              {conversations.filter(c => new Date(c.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
            </Text>
            <Text style={styles.statLabel}>Ten tydzień</Text>
          </View>
        </View>

        {groupedConversations.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="images-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyStateTitle}>Twoja kolekcja jest pusta</Text>
            <Text style={styles.emptyStateText}>
              Zeskanuj pierwsze dzieło sztuki, aby rozpocząć swoją kolekcję
            </Text>
            <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.scanButtonText}>Skanuj dzieło</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {groupedConversations.map((group, groupIndex) => (
              <View key={groupIndex} style={styles.locationGroup}>
                <TouchableOpacity
                  style={styles.locationHeader}
                  onPress={() => toggleSection(group.location)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location" size={20} color="#667eea" />
                  <Text style={styles.locationTitle}>{group.location}</Text>
                  <Text style={styles.locationCount}>({group.conversations.length})</Text>
                  <Ionicons
                    name={isSectionCollapsed(group.location) ? "chevron-down" : "chevron-up"}
                    size={20}
                    color="#667eea"
                  />
                </TouchableOpacity>

                {!isSectionCollapsed(group.location) && (
                  <View style={styles.collectionGrid}>
                    {group.conversations.map((conversation) => (
                    <TouchableOpacity
                      key={conversation.id}
                      style={styles.collectionCard}
                      onPress={() => handleConversationPress(conversation)}
                      activeOpacity={0.8}
                    >
                      {conversation.artwork_image_url ? (
                        <View style={styles.imageContainer}>
                          <Image
                            source={{ uri: conversation.artwork_image_url }}
                            style={styles.artworkImage}
                            resizeMode="cover"
                          />
                        </View>
                      ) : (
                        <View style={[styles.imageContainer, styles.placeholderImage]}>
                          <Ionicons name="image-outline" size={32} color="#94A3B8" />
                        </View>
                      )}

                      <View style={styles.cardContent}>
                        <Text style={styles.artworkTitle} numberOfLines={2}>
                          {conversation.artwork_title ||
                           (conversation.title !== "Analiza dzieła sztuki" ? conversation.title : "Dzieło bez tytułu")}
                        </Text>
                        {conversation.artwork_artist && (
                          <Text style={styles.artistName} numberOfLines={1}>
                            {conversation.artwork_artist}
                          </Text>
                        )}
                        {conversation.artwork_period && (
                          <Text style={styles.periodText} numberOfLines={1}>
                            {conversation.artwork_period}
                          </Text>
                        )}
                        <Text style={styles.museumName} numberOfLines={1}>
                          {group.location}
                        </Text>
                        <Text style={styles.dateAdded}>
                          {formatDate(conversation.created_at)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}

            <View style={styles.addMoreContainer}>
              <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
                <Text style={styles.scanButtonText}>Skanuj więcej dzieł</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
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
  periodText: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 16,
  },
  locationGroup: {
    marginBottom: 32,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginLeft: 8,
    flex: 1,
  },
  locationCount: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  placeholderImage: {
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  addMoreContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
});
