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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderContainer from "@/components/HeaderContainer";

const { width, height } = Dimensions.get("window");

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ArtworkChatScreen() {
  const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Remove auto-analysis on mount

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const analyzeArtwork = async () => {
    if (hasAnalyzed) return;

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

    try {
      // Convert image URI to base64
      const response = await fetch(decodeURIComponent(imageUri));
      const blob = await response.blob();
      
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string)?.split(',')[1] || '';
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Call the analyze-artwork edge function
      const analysisResponse = await fetch('http://127.0.0.1:54321/functions/v1/analyze-artwork', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`,
        },
        body: JSON.stringify({
          image: base64Data,
          prompt: 'Analyze this artwork in Polish. Describe what you see, the artistic style, possible time period, and any notable features or techniques used. Be detailed and educational.'
        }),
      });

      const data = await analysisResponse.json();

      if (!analysisResponse.ok) {
        throw new Error(data.error || 'Failed to analyze artwork');
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: `🎨 **Analiza dzieła sztuki**\n\n${data.analysis}`,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev.slice(0, -1), aiResponse]);
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Analysis error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Przepraszam, wystąpił błąd podczas analizowania dzieła. Spróbuj ponownie później.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
      setIsAnalyzing(false);
      setHasAnalyzed(false); // Allow retry
    }
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");

    // Simulate AI response
    setTimeout(
      () => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: generateAIResponse(inputText.trim()),
          isUser: false,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiResponse]);
      },
      1000 + Math.random() * 2000,
    );
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

  const saveToCollection = () => {
    Alert.alert("Zapisano!", "Dzieło zostało dodane do Twojej kolekcji.", [
      { text: "OK" },
    ]);
  };

  if (!imageUri) {
    return (
      <HeaderContainer title="Analiza dzieła">
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

  const rightButton = (
    <TouchableOpacity style={styles.saveButton} onPress={saveToCollection}>
      <Ionicons name="bookmark" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );

  return (
    <HeaderContainer title="Analiza dzieła" rightButton={rightButton}>
      {/* Artwork Image */}
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

      {/* Chat Interface */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
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
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
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
    fontSize: 12,
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
    fontSize: 12,
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
