import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  RateLimiter,
  DEFAULT_RATE_LIMITS,
  createRateLimitHeaders,
} from "../_shared/rateLimiter.ts";

serve(async (req) => {
  console.log("🚀 Edge function called:", req.method, req.url);

  if (req.method === "OPTIONS") {
    console.log("✅ Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Initialize Supabase client
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") ?? "http://127.0.0.1:54321";
    const supabaseServiceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user from auth header
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // Rate limiting check
    try {
      const rateLimiter = new RateLimiter();
      const rateLimitResult = await rateLimiter.checkRateLimit({
        identifier: user.id,
        maxRequests: DEFAULT_RATE_LIMITS.ANALYSIS.maxRequests,
        windowMs: DEFAULT_RATE_LIMITS.ANALYSIS.windowMs,
      });

      const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

      if (!rateLimitResult.success) {
        return new Response(
          JSON.stringify({
            error:
              "Rate limit exceeded. Please wait before analyzing more artwork.",
            retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              ...rateLimitHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
    } catch (rateLimitError) {
      console.error("Rate limiting error:", rateLimitError);
      // Continue processing if rate limiting fails
    }

    console.log("📝 Parsing request body...");
    const {
      image,
      createConversation = false,
      prompt,
      imageUrl,
      enableStreaming = false,
    } = await req.json();

    console.log("📋 Request parameters:", {
      hasImage: !!image,
      imageLength: image?.length,
      hasPrompt: !!prompt,
      promptLength: prompt?.length,
      createConversation,
      hasImageUrl: !!imageUrl,
      enableStreaming,
    });

    console.log(
      "📝 Using prompt:",
      prompt ? "Custom prompt provided" : "Using default prompt",
    );

    if (!image) {
      console.error("❌ No image provided in request");
      return new Response(JSON.stringify({ error: "Image is required" }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      console.error("❌ OpenAI API key not configured");
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    console.log("✅ OpenAI API key found");
    console.log("🤖 Making OpenAI API call...", { enableStreaming });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a world-renowned art historian and expert curator with extensive knowledge of artworks in major museums, galleries, and private collections worldwide. You can identify specific artworks based on visual analysis and contextual clues. Always show your thinking process step-by-step.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  prompt ||
                  "Analyze this artwork step-by-step, showing your thinking process. Describe what you see, the artistic style, possible time period, and any notable features or techniques used.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 3000, // Increased for detailed thinking process
        temperature: 0.3,
        stream: enableStreaming,
      }),
    });

    console.log("📡 OpenAI response received:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (enableStreaming) {
      console.log("🌊 Processing streaming response from OpenAI");

      // Handle streaming response
      if (!response.ok) {
        console.error("❌ OpenAI streaming response not ok:", response.status);
        const errorData = await response.json();
        console.error("OpenAI API Error:", errorData);
        return new Response(
          JSON.stringify({
            error: "Failed to analyze artwork",
            details: errorData.error?.message,
          }),
          {
            status: response.status,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      console.log("✅ Returning streaming response directly to client");

      // Return streaming response directly
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // Handle regular response
      const openaiResponse = await response.json();

      if (!response.ok) {
        console.error("OpenAI API Error:", openaiResponse);
        return new Response(
          JSON.stringify({
            error: "Failed to analyze artwork",
            details: openaiResponse.error?.message,
          }),
          {
            status: response.status,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      let analysis =
        openaiResponse.choices?.[0]?.message?.content ||
        "No analysis available";

      let conversationId = null;

      // Create conversation if requested
      if (createConversation) {
        const { data: newConversation, error: createError } = await supabase
          .from("conversations")
          .insert({
            user_id: user.id,
            title: "Artwork Analysis",
            artwork_image_url: imageUrl || null,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating conversation:", createError);
        } else {
          conversationId = newConversation.id;

          // Add the analysis as the first assistant message
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            content: analysis,
            role: "assistant",
          });
        }
      }

      return new Response(
        JSON.stringify({
          analysis,
          conversationId,
          usage: openaiResponse.usage,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
