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
  location_name?: string;
  location_address?: string;
  latitude?: number;
  longitude?: number;
  artwork_title?: string;
  artwork_artist?: string;
  artwork_period?: string;
  artwork_style?: string;
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


// Simple prompt for MVP
const SIMPLE_ANALYZE_PROMPT = "What do you see in this artwork? Share your thoughts conversationally - what catches your eye first, what style do you think it is, and what makes it interesting or significant? Keep it friendly and engaging.";

class ConversationService {
  // Get the current session's auth token
  private async getAuthToken(): Promise<string | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
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

  // Analyze artwork - simplified for MVP
  async analyzeArtwork(
    imageBase64: string,
    createConversation: boolean = true,
    imageUrl?: string,
    locationData?: {
      latitude: number;
      longitude: number;
      address?: string;
      name?: string;
    },
  ): Promise<{ analysis: string; conversationId?: string }> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error("User not authenticated");
    }

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
          prompt: SIMPLE_ANALYZE_PROMPT,
          createConversation,
          imageUrl,
          locationData,
        }),
      },
    );

    // Handle response

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
          error.retryAfter || 300,
          rateLimitHeaders,
        );
      }

      throw new Error(error.error || "Failed to analyze artwork");
    }

    const data = await response.json();
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

  // Create a new conversation by sending a message with createNew=true
  async createConversation(
    title: string,
    artworkImageUrl?: string,
  ): Promise<string> {
    const response = await this.sendMessage(
      "Rozpoczynam rozmowę o dziele sztuki.",
      undefined,
      true, // createNew = true
      title,
      artworkImageUrl,
    );

    return response.conversationId;
  }
}

export const conversationService = new ConversationService();
