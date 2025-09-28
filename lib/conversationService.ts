import { supabase, supabaseUrl } from "./supabase";
import * as ImagePicker from "expo-image-picker";

export class RateLimitError extends Error {
  public retryAfter: number;
  public rateLimitHeaders: Record<string, string>;

  constructor(
    message: string,
    retryAfter: number,
    headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    this.rateLimitHeaders = headers;
  }
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  role: "user" | "assistant";
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  artwork_image_url?: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface ChatResponse {
  message: string;
  conversationId: string;
  usage?: unknown;
}

export interface ArtworkAnalysis {
  author?: string;
  title?: string;
  dateOfCreation?: string;
  description: string;
  meaning: string;
  style?: string;
  period?: string;
  confidence?: string;
  location?: string;
}

export interface ImageMetadata {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  timestamp?: string;
  camera?: string;
  [key: string]: any;
}

export const defaultAnalyzePrompt = (location?: string) => {
  const basePrompt = `You are an expert art historian and curator.
    Analyze this artwork step-by-step, showing your thinking process, and provide detailed information in Polish using markdown format.

IMPORTANT: Start your response with a "## 🤔 Proces Analizy" section where you show your thinking step-by-step as you analyze the artwork. This should include:
- Initial observations about visual elements
- Recognition attempts and reasoning
- Comparison with known artworks or styles
- Location context consideration (if provided)
- Final identification confidence assessment

Then provide the structured analysis in the following markdown format:

## 🎨 Analiza Dzieła Sztuki

### 📋 Podstawowe Informacje
**Autor:** [Artist's full name or "Nieznany"]
**Tytuł:** [Exact title or descriptive title]
**Data powstania:** [Year or period]
**Pewność identyfikacji:** [Wysoka/Średnia/Niska] [🎯/🤔/❓]

### 🎭 Opis Wizualny
[Detailed description of what you see, composition, colors, techniques]

### 💭 Znaczenie i Kontekst
[What the artwork represents, its significance, historical context]

### 🎨 Styl i Okres
**Styl:** [Artistic style/movement]
**Okres:** [Historical/artistic period]
**Technika:** [Medium and technique used]

IDENTIFICATION PROCESS:
1. Carefully examine visual elements (composition, color palette, style, brushwork, etc.)
2. Try to identify the specific artwork, artist, and title
3. Consider the artistic movement, technique, and historical context
4. If you recognize this as a famous work, provide exact details
5. Use your knowledge of art history and major collections
6. Show your reasoning process clearly in the thinking section`;

  if (location) {
    return `${basePrompt}

### 📍 Kontekst Lokalizacji
Zdjęcie zostało wykonane w: **${location}**

W sekcji "Proces Analizy" uwzględnij analizę lokalizacji:
- Jakie muzeum, galeria lub instytucja może znajdować się w tej lokalizacji
- Jakie dzieła sztuki są znane w tej kolekcji
- Regionalny lub kulturowy kontekst lokalizacji`;
  }

  return basePrompt;
};

class ConversationService {
  // Get the current session's auth token
  private async getAuthToken(): Promise<string | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  // Extract metadata from image
  private extractImageMetadata(
    imagePickerResult: ImagePicker.ImagePickerResult,
  ): ImageMetadata | null {
    if (imagePickerResult.canceled || !imagePickerResult.assets?.[0]) {
      return null;
    }

    const asset = imagePickerResult.assets[0];
    const metadata: ImageMetadata = {};

    // Extract EXIF data if available
    if (asset.exif) {
      // GPS data
      if (asset.exif.GPS) {
        metadata.latitude = asset.exif.GPS.Latitude;
        metadata.longitude = asset.exif.GPS.Longitude;
        metadata.altitude = asset.exif.GPS.Altitude;
      }

      // Date/time
      if (asset.exif.DateTime || asset.exif.DateTimeOriginal) {
        metadata.timestamp = asset.exif.DateTime || asset.exif.DateTimeOriginal;
      }

      // Camera info
      if (asset.exif.Make && asset.exif.Model) {
        metadata.camera = `${asset.exif.Make} ${asset.exif.Model}`;
      }

      // Store all EXIF data
      metadata.exif = asset.exif;
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  }

  // Get location string from coordinates
  private async getLocationFromCoordinates(
    latitude: number,
    longitude: number,
  ): Promise<string | null> {
    try {
      // Use a reverse geocoding service (you might want to use a specific service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      );

      if (response.ok) {
        const data = await response.json();
        return data.display_name || `${latitude}, ${longitude}`;
      }
    } catch (error) {
      console.error("Error getting location:", error);
    }

    return `${latitude}, ${longitude}`;
  }

  // Build prompt with metadata information
  private async buildPromptWithMetadata(
    imagePickerResult?: ImagePicker.ImagePickerResult,
  ): Promise<string> {
    if (!imagePickerResult) {
      return defaultAnalyzePrompt();
    }

    const metadata = this.extractImageMetadata(imagePickerResult);

    if (!metadata || (!metadata.latitude && !metadata.longitude)) {
      return defaultAnalyzePrompt();
    }

    let locationString = null;
    if (metadata.latitude && metadata.longitude) {
      locationString = await this.getLocationFromCoordinates(
        metadata.latitude,
        metadata.longitude,
      );
    }

    return defaultAnalyzePrompt(locationString || undefined);
  }

  // Send a message and get AI response
  async sendMessage(
    message: string,
    conversationId?: string,
    createNew: boolean = false,
    title?: string,
    artworkImageUrl?: string,
  ): Promise<ChatResponse> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(supabaseUrl + "/functions/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        conversationId,
        createNew,
        title,
        artworkImageUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();

      if (response.status === 429) {
        const rateLimitHeaders: Record<string, string> = {};
        if (response.headers.get("X-RateLimit-Remaining")) {
          rateLimitHeaders["X-RateLimit-Remaining"] =
            response.headers.get("X-RateLimit-Remaining") || "0";
        }
        if (response.headers.get("X-RateLimit-Reset")) {
          rateLimitHeaders["X-RateLimit-Reset"] =
            response.headers.get("X-RateLimit-Reset") || "0";
        }
        if (response.headers.get("Retry-After")) {
          rateLimitHeaders["Retry-After"] =
            response.headers.get("Retry-After") || "0";
        }

        throw new RateLimitError(
          error.error || "Rate limit exceeded",
          error.retryAfter || 300, // Default to 5 minutes
          rateLimitHeaders,
        );
      }

      throw new Error(error.error || "Failed to send message");
    }

    return await response.json();
  }

  // Analyze artwork and optionally create conversation
  async analyzeArtwork(
    imageBase64: string,
    createConversation: boolean = true,
    imageUrl?: string,
    imagePickerResult?: ImagePicker.ImagePickerResult,
    enableStreaming: boolean = false,
    onStream?: (chunk: string) => void,
  ): Promise<{ analysis: ArtworkAnalysis | string; conversationId?: string }> {
    console.log("🎨 ConversationService.analyzeArtwork started", {
      enableStreaming,
      hasImageData: !!imageBase64,
      createConversation,
      hasOnStream: !!onStream,
    });

    const token = await this.getAuthToken();
    if (!token) {
      console.error("❌ User not authenticated");
      throw new Error("User not authenticated");
    }

    console.log("✅ Auth token obtained");

    const finalPrompt = await this.buildPromptWithMetadata(imagePickerResult);
    console.log("📝 Generated prompt:", finalPrompt.substring(0, 200) + "...");

    console.log("🚀 Making request to analyze-artwork endpoint", {
      url: supabaseUrl + "/functions/v1/analyze-artwork",
      enableStreaming,
    });

    const response = await fetch(
      supabaseUrl + "/functions/v1/analyze-artwork",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image: imageBase64,
          prompt: finalPrompt,
          createConversation,
          imageUrl,
          enableStreaming,
        }),
      },
    );

    console.log("📡 Response received", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (enableStreaming && onStream) {
      console.log("🌊 Processing streaming response");
      console.log(
        "🔍 Response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      // Check if streaming is supported in this environment
      const isStreamingSupported =
        typeof response.body?.getReader === "function";
      console.log("🔧 Streaming support check:", { isStreamingSupported });

      if (!isStreamingSupported) {
        console.warn(
          "⚠️ Streaming not supported in React Native, falling back to regular response",
        );
        // Fall back to regular response handling
        enableStreaming = false;
      } else {
        // Handle streaming response
        if (!response.ok) {
          console.error("❌ Streaming response not ok:", response.status);
          try {
            const error = await response.json();
            console.error("❌ Error details:", error);
          } catch (e) {
            console.error("❌ Could not parse error response:", e);
            const text = await response.text();
            console.error("❌ Error text:", text);
          }

          if (response.status === 429) {
            const rateLimitHeaders: Record<string, string> = {};
            if (response.headers.get("X-RateLimit-Remaining")) {
              rateLimitHeaders["X-RateLimit-Remaining"] =
                response.headers.get("X-RateLimit-Remaining") || "0";
            }
            if (response.headers.get("X-RateLimit-Reset")) {
              rateLimitHeaders["X-RateLimit-Reset"] =
                response.headers.get("X-RateLimit-Reset") || "0";
            }
            if (response.headers.get("Retry-After")) {
              rateLimitHeaders["Retry-After"] =
                response.headers.get("Retry-After") || "0";
            }

            throw new RateLimitError(
              error.error || "Rate limit exceeded",
              error.retryAfter || 300,
              rateLimitHeaders,
            );
          }
          throw new Error(error.error || "Failed to analyze artwork");
        }

        console.log("✅ Streaming response ok, starting to process stream");

        // Process streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let analysis = "";

        if (!reader) {
          console.error("❌ No reader available for streaming response");
          throw new Error("No reader available for streaming response");
        }

        console.log("🔄 Starting stream processing loop");
        let chunkCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          console.log(`📦 Chunk ${++chunkCount}:`, {
            done,
            valueLength: value?.length,
          });

          if (done) {
            console.log("✅ Stream completed");
            break;
          }

          const chunk = decoder.decode(value);
          console.log("📄 Raw chunk:", chunk.substring(0, 100) + "...");

          const lines = chunk.split("\n");
          console.log(`📋 Processing ${lines.length} lines`);

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                console.log("🏁 Received [DONE] marker");
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || "";
                if (content) {
                  console.log(
                    "✨ Content chunk:",
                    content.substring(0, 50) + "...",
                  );
                  analysis += content;
                  onStream(content);
                }
              } catch (e) {
                console.log(
                  "⚠️ Skipping invalid JSON line:",
                  line.substring(0, 50),
                );
              }
            }
          }
        }

        console.log("📊 Final analysis length:", analysis.length);
        return { analysis, conversationId: undefined };
      }
    }

    // Handle regular response (either not streaming or streaming not supported)
    console.log("📄 Processing regular (non-streaming) response");

    if (!response.ok) {
      console.error("❌ Regular response not ok:", response.status);
      const error = await response.json();
      console.error("❌ Error details:", error);

      if (response.status === 429) {
        const rateLimitHeaders: Record<string, string> = {};
        if (response.headers.get("X-RateLimit-Remaining")) {
          rateLimitHeaders["X-RateLimit-Remaining"] =
            response.headers.get("X-RateLimit-Remaining") || "0";
        }
        if (response.headers.get("X-RateLimit-Reset")) {
          rateLimitHeaders["X-RateLimit-Reset"] =
            response.headers.get("X-RateLimit-Reset") || "0";
        }
        if (response.headers.get("Retry-After")) {
          rateLimitHeaders["Retry-After"] =
            response.headers.get("Retry-After") || "0";
        }

        throw new RateLimitError(
          error.error || "Rate limit exceeded",
          error.retryAfter || 300,
          rateLimitHeaders,
        );
      }

      throw new Error(error.error || "Failed to analyze artwork");
    }

    const data = await response.json();
    console.log("✅ Regular response data received", {
      hasAnalysis: !!data.analysis,
      analysisLength: data.analysis?.length,
      conversationId: data.conversationId,
    });

    return {
      analysis: data.analysis,
      conversationId: data.conversationId,
    };
  }

  // Get all user conversations
  async getConversations(): Promise<Conversation[]> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(supabaseUrl + "/functions/v1/conversations", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch conversations");
    }

    const data = await response.json();
    return data.conversations || [];
  }

  // Get specific conversation with messages
  async getConversation(
    conversationId: string,
  ): Promise<{ conversation: Conversation; messages: Message[] }> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(
      supabaseUrl +
        "/functions/v1/conversations?conversationId=" +
        conversationId,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch conversation");
    }

    const data = await response.json();
    return {
      conversation: data.conversation,
      messages: data.messages || [],
    };
  }

  // Create a new conversation
  async createConversation(
    title: string,
    artworkImageUrl?: string,
  ): Promise<string> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await this.sendMessage(
      "Start conversation",
      undefined,
      true,
      title,
      artworkImageUrl,
    );

    return response.conversationId;
  }
}

export const conversationService = new ConversationService();
