import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  Keyboard,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderContainer from "@/components/HeaderContainer";
import {
  conversationService,
  type Message as ConversationMessage,
  RateLimitError,
} from "@/lib/conversationService";

const { width, height } = Dimensions.get("window");

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ArtworkChatScreen() {
  const { imageUri, conversationId, hasMetadata } = useLocalSearchParams<{
    imageUri?: string;
    conversationId?: string;
    hasMetadata?: string;
  }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(conversationId || null);
  const [isImageVisible, setIsImageVisible] = useState(true);
  const [locationData, setLocationData] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
    name?: string;
  } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Remove auto-analysis on mount

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    // Handle keyboard events
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      // Scroll to bottom when keyboard appears
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      // Optional: handle keyboard hide if needed
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    // Load existing conversation if conversationId is provided
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    // Get current location when component mounts
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const addressString = address[0] ?
        `${address[0].street || ''} ${address[0].streetNumber || ''}, ${address[0].city || ''}, ${address[0].country || ''}`.trim() :
        'Nieznana lokalizacja';

      setLocationData({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: addressString,
        name: address[0]?.name || address[0]?.street || 'Aktualna lokalizacja'
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };


  const loadConversation = async (convId: string) => {
    try {
      const { conversation, messages: convMessages } =
        await conversationService.getConversation(convId);

      const formattedMessages: Message[] = convMessages.map((msg) => ({
        id: msg.id,
        text: msg.content,
        isUser: msg.role === "user",
        timestamp: new Date(msg.created_at),
      }));

      setMessages(formattedMessages);
      setHasAnalyzed(true); // Assume conversation already has analysis
    } catch (error) {
      console.error("Error loading conversation:", error);
      Alert.alert("Error", "Failed to load conversation");
    }
  };

  const analyzeArtwork = async () => {
    console.log("🎨 Starting artwork analysis", { hasAnalyzed, imageUri });

    if (hasAnalyzed || !imageUri) {
      console.log("❌ Analysis skipped", {
        hasAnalyzed,
        hasImageUri: !!imageUri,
      });
      return;
    }

    setIsAnalyzing(true);
    setHasAnalyzed(true);

    // Add initial analysis message
    const analysisMessage: Message = {
      id: Date.now().toString(),
      text: "Analizuję dzieło sztuki... To może potrwać chwilę.",
      isUser: false,
      timestamp: new Date(),
    };

    setMessages([analysisMessage]);
    console.log("📝 Initial analysis message added");

    try {
      console.log("🖼️ Converting image to base64...");

      // Convert image URI to base64
      const response = await fetch(decodeURIComponent(imageUri));
      console.log("📥 Image fetch response:", response.status);

      const blob = await response.blob();
      console.log("🗂️ Blob created:", { size: blob.size, type: blob.type });

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string)?.split(",")[1] || "";
          console.log("✅ Base64 conversion complete:", {
            length: base64.length,
          });
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Get metadata if available
      const imagePickerResult =
        hasMetadata === "true"
          ? (global as any).lastImagePickerResult
          : undefined;

      console.log("🌍 Metadata check:", {
        hasMetadata,
        hasImagePickerResult: !!imagePickerResult,
      });

      console.log("🚀 Calling conversationService.analyzeArtwork...");
      const { analysis, conversationId: newConversationId } =
        await conversationService.analyzeArtwork(
          base64Data,
          true, // Create conversation
          decodeURIComponent(imageUri), // Image URL
          locationData, // Location data
        );

      console.log("🏁 Analysis completed", {
        hasAnalysis: !!analysis,
        analysisLength: typeof analysis === "string" ? analysis.length : 0,
        newConversationId,
      });


      if (newConversationId) {
        setCurrentConversationId(newConversationId);
      }

      // Analysis is now in markdown format from the AI
      const analysisText =
        typeof analysis === "string" ? analysis : analysis.toString();

      console.log("📄 Final analysis text:", {
        length: analysisText.length,
        preview: analysisText.substring(0, 100) + "...",
      });

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: analysisText,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev.slice(0, -1), aiResponse]);
      setIsAnalyzing(false);
      console.log("✅ Analysis process completed successfully");
    } catch (error) {
      console.error("❌ Analysis error:", error);
      console.error("❌ Error stack:", error.stack);

      let errorText =
        "Przepraszam, wystąpił błąd podczas analizowania dzieła. Spróbuj ponownie później.";

      if (error instanceof RateLimitError) {
        const waitMinutes = Math.ceil(error.retryAfter / 60);
        errorText = `Osiągnięto limit zapytań. Spróbuj ponownie za ${waitMinutes} minut. Limit to 10 interakcji w ciągu 5 minut.`;

        Alert.alert(
          "Limit zapytań",
          `Osiągnięto limit 10 interakcji w ciągu 5 minut. Spróbuj ponownie za ${waitMinutes} minut.`,
          [{ text: "OK" }],
        );
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
      setIsAnalyzing(false);
      setHasAnalyzed(false); // Allow retry
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");

    // Add typing indicator
    const typingMessage: Message = {
      id: "typing",
      text: "...",
      isUser: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, typingMessage]);

    try {
      let conversationIdToUse = currentConversationId;

      const response = await conversationService.sendMessage(
        messageText,
        conversationIdToUse,
        !conversationIdToUse, // createNew if no conversation exists
        conversationIdToUse ? undefined : "Rozmowa o dziele sztuki", // title only for new conversations
        conversationIdToUse ? undefined : (imageUri ? decodeURIComponent(imageUri) : undefined), // artworkImageUrl only for new conversations
      );

      // Update conversation ID if this was a new conversation
      if (!conversationIdToUse && response.conversationId) {
        setCurrentConversationId(response.conversationId);
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: response.message,
        isUser: false,
        timestamp: new Date(),
      };

      // Remove typing indicator and add real response
      setMessages((prev) => [...prev.slice(0, -1), aiResponse]);
    } catch (error) {
      console.error("Send message error:", error);

      let errorText =
        "Przepraszam, wystąpił błąd podczas wysyłania wiadomości. Spróbuj ponownie.";

      if (error instanceof RateLimitError) {
        const waitMinutes = Math.ceil(error.retryAfter / 60);
        errorText = `Osiągnięto limit zapytań. Spróbuj ponownie za ${waitMinutes} minut. Limit to 10 interakcji w ciągu 5 minut.`;

        Alert.alert(
          "Limit zapytań",
          `Osiągnięto limit 10 interakcji w ciągu 5 minut. Spróbuj ponownie za ${waitMinutes} minut.`,
          [{ text: "OK" }],
        );
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        isUser: false,
        timestamp: new Date(),
      };

      // Remove typing indicator and add error message
      setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
    }
  };

  const generateAIResponse = (userMessage: string): string => {
    const responses = [
      "Świetne pytanie! To dzieło rzeczywiście ma ciekawą historię. Artysta prawdopodobnie inspirował się...",
      "Widzę, że interesuje Cię technika wykonania. Ten styl charakteryzuje się...",
      "To bardzo interesujące spojrzenie! Mogę dodać, że podobne motywy znajdziemy również w...",
      "Dokładnie! Ten element kompozycji jest kluczowy dla zrozumienia przesłania dzieła...",
      "Fantastyczna obserwacja! Kolorystyka w tym dziele rzeczywiście ma głębokie znaczenie symboliczne...",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const retakePhoto = () => {
    Alert.alert(
      "Zrób nowe zdjęcie",
      "Czy chcesz zrobić nowe zdjęcie dzieła sztuki?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Tak",
          onPress: () => router.replace("/scan-artwork"),
        },
      ],
    );
  };


  if (!imageUri) {
    return (
      <HeaderContainer title="Analiza dzieła" showHomeButton={true}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Brak zdjęcia do analizy</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.replace("/scan-artwork")}
          >
            <Text style={styles.errorButtonText}>Zrób zdjęcie</Text>
          </TouchableOpacity>
        </View>
      </HeaderContainer>
    );
  }


  return (
    <HeaderContainer title="Analiza dzieła" onBackPress={() => router.push("/collection")} showHomeButton={true}>
      {/* Artwork Image Panel */}
      <View style={styles.imagePanel}>
        <TouchableOpacity
          style={styles.imagePanelHeader}
          onPress={() => setIsImageVisible(!isImageVisible)}
          activeOpacity={0.7}
        >
          <Text style={styles.imagePanelHeaderText}>Analizowane dzieło</Text>
          <Ionicons
            name={isImageVisible ? "chevron-up" : "chevron-down"}
            size={20}
            color="#667eea"
          />
        </TouchableOpacity>

        {isImageVisible && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: decodeURIComponent(imageUri) }}
              style={styles.artworkImage}
            />
            <View style={styles.imageActions}>
              <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
                <Ionicons name="camera" size={14} color="#667eea" />
                <Text style={styles.retakeText}>Zrób ponownie</Text>
              </TouchableOpacity>
              {!hasAnalyzed && (
                <TouchableOpacity
                  style={styles.analyzeButton}
                  onPress={analyzeArtwork}
                >
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                  <Text style={styles.analyzeText}>Analizuj dzieło</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Chat Interface */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.isUser ? styles.userMessage : styles.aiMessage,
              ]}
            >
              {!message.isUser && (
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={16} color="#667eea" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  message.isUser ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.isUser ? styles.userText : styles.aiText,
                  ]}
                >
                  {message.text}
                </Text>
              </View>
            </View>
          ))}

          {isAnalyzing && (
            <View style={[styles.messageContainer, styles.aiMessage]}>
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={16} color="#667eea" />
              </View>
              <View style={styles.typingIndicator}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </View>
          )}
        </ScrollView>

        <SafeAreaView style={styles.inputSafeArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Zapytaj o dzieło sztuki..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              onFocus={() => {
                // Scroll to bottom when input is focused
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim()}
            >
              <Ionicons
                name="send"
                size={18}
                color={inputText.trim() ? "#FFFFFF" : "#94A3B8"}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </HeaderContainer>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    maxHeight: 150,
  },
  topSafeArea: {
    // Auto height
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  imagePanel: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  imagePanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  imagePanelHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  imageContainer: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
  },
  artworkImage: {
    width: width * 0.5,
    height: width * 0.5 * 0.75, // 4:3 aspect ratio
    borderRadius: 12,
    marginBottom: 12,
  },
  imageActions: {
    flexDirection: "row",
    gap: 12,
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    borderRadius: 16,
    gap: 4,
  },
  retakeText: {
    fontSize: 14,
    color: "#667eea",
    fontWeight: "600",
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#667eea",
    borderRadius: 16,
    gap: 4,
  },
  analyzeText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: "flex-end",
  },
  aiMessage: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#667eea",
    borderBottomRightRadius: 8,
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#FFFFFF",
  },
  aiText: {
    color: "#1E293B",
  },
  typingIndicator: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#94A3B8",
  },
  inputSafeArea: {
    backgroundColor: "#FFFFFF",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: "#F8FAFC",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#E2E8F0",
  },
  // Error styles
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: "#667eea",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  errorButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
