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
      locationData,
    } = await req.json();

    console.log("📋 Request parameters:", {
      hasImage: !!image,
      imageLength: image?.length,
      hasPrompt: !!prompt,
      createConversation,
      hasImageUrl: !!imageUrl,
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
    console.log("🤖 Making OpenAI API call...");

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
              "WAŻNE: Odpowiadaj WYŁĄCZNIE w języku polskim. Jesteś kompetentnym polskim historykiem sztuki. Musisz analizować dzieła sztuki w sposób systematyczny i konkretny, używając TYLKO języka polskiego. ZAWSZE rozpocznij swoją odpowiedź od podstawowych faktów w formacie: 'Przedstawione dzieło to [tytuł] autorstwa [artysta], powstałe w [rok/okres]. Obecnie znajduje się w [muzeum/kolekcja, miasto].' Jeśli znasz lokalizację dzieła, OBOWIĄZKOWO dodaj na końcu odpowiedzi linię: 'LOKALIZACJA: [dokładna nazwa muzeum lub galerii]' (np. 'LOKALIZACJA: Muzeum Luwru' lub 'LOKALIZACJA: Galeria Uffizi'). Jeśli nie jesteś pewien konkretnych danych, użyj opisów jak 'obraz w stylu [styl]' lub 'dzieło z okresu [okres]'. Po podaniu podstawowych faktów, przejdź do szczegółowej analizy: opisz co widać na obrazie, zwróć uwagę na technikę, kompozycję, kolorystykę, symbolikę i znaczenie historyczne. Używaj konkretnych polskich terminów artystycznych. NIGDY nie używaj języka angielskiego - odpowiadaj TYLKO po polsku. WAŻNE: NIE używaj formatowania markdown (bez **, *, #, -, itd.) - pisz zwykłym tekstem w akapitach.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  prompt ||
                  "Przeanalizuj to dzieło sztuki PO POLSKU. Zacznij od podania tytułu, autora, roku powstania i obecnej lokalizacji (jeśli możesz je zidentyfikować), a następnie opisz szczegółowo co przedstawia, jaką techniką zostało wykonane, jaki jest styl artystyczny i co jest szczególnie godne uwagi w tym dziele. Odpowiadaj TYLKO w języku polskim. NIE używaj formatowania markdown - pisz zwykłym tekstem.",
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
        max_tokens: 2000, // Increased for full responses
        temperature: 0.7,
      }),
    });

    // Handle response
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

    // Extract artwork metadata from AI response
    const extractArtworkInfo = (text: string) => {
      const info = {
        title: null,
        artist: null,
        location: null,
        period: null,
      };

      // Look for the pattern "Przedstawione dzieło to [title] autorstwa [artist], powstałe w [period]"
      const mainPattern = /Przedstawione dzieło to\s*["']?([^"'\n,]+?)["']?\s*autorstwa\s*([^,\n]+?),\s*powstałe\s*w\s*([^.\n]+)/i;
      const match = text.match(mainPattern);

      if (match) {
        let title = match[1]?.trim().replace(/^["']|["']$/g, ''); // Remove quotes
        let artist = match[2]?.trim();
        let period = match[3]?.trim();

        // Clean up title - remove common prefixes and fix formatting
        title = title
          .replace(/^obraz\s*/i, '')
          .replace(/^dzieło\s*/i, '')
          .replace(/^malowidło\s*/i, '')
          .trim();

        // Clean up artist name
        artist = artist
          .replace(/^przez\s*/i, '')
          .trim();

        info.title = title;
        info.artist = artist;
        info.period = period;
      }

      // First, look for structured location format
      const structuredLocationMatch = text.match(/LOKALIZACJA:\s*([^\n\r]+)/i);
      if (structuredLocationMatch && structuredLocationMatch[1]) {
        info.location = structuredLocationMatch[1].trim();
      } else {
        // Fallback to existing location patterns and clean them up
        const locationPatterns = [
          /znajduje się w\s*([^.\n]+)/i,
          /w\s*(zbiorach[^.\n]*)/i,
          /w\s*(kolekcji[^.\n]*)/i,
          /w\s*(muzeum[^.\n,]*)/i,
          /w\s*(galerii[^.\n,]*)/i,
          /w\s*([A-Z][^.\n,]*(?:muzeum|galeria|museum|gallery)[^.\n,]*)/i
        ];

        for (const pattern of locationPatterns) {
          const locationMatch = text.match(pattern);
          if (locationMatch && locationMatch[1]) {
            let location = locationMatch[1].trim();

            // Clean up and format location names
            location = cleanLocationName(location);

            if (location) {
              info.location = location;
              break;
            }
          }
        }
      }

      return info;
    };

    const cleanLocationName = (location: string): string => {
      // Remove common prefixes and clean up
      location = location
        .replace(/^zbiorach\s*/i, '')
        .replace(/^kolekcji\s*/i, '')
        .replace(/^w\s*/i, '')
        .trim();

      // Fix capitalization and common name patterns
      const replacements = [
        // Louvre variations
        { pattern: /(muzeum\s*)?luwru?(\s*w\s*paryzu)?/i, replacement: 'Muzeum Luwru' },
        { pattern: /luwrze\s*w\s*paryzu/i, replacement: 'Muzeum Luwru' },
        { pattern: /louvre(\s*museum)?(\s*in\s*paris)?/i, replacement: 'Muzeum Luwru' },

        // Polish museums and galleries
        { pattern: /narodow(ej|ym)\s*galeri(i|a)\s*w\s*oslo/i, replacement: 'Narodowa Galeria w Oslo' },
        { pattern: /muzeum\s*narodow(e|ym)\s*w\s*warszawi(e)?/i, replacement: 'Muzeum Narodowe w Warszawie' },

        // International museums
        { pattern: /(galeri(i|a)\s*)?uffizi/i, replacement: 'Galeria Uffizi' },
        { pattern: /museum\s*of\s*modern\s*art/i, replacement: 'Museum of Modern Art' },
        { pattern: /metropolitan\s*museum/i, replacement: 'Metropolitan Museum' },
        { pattern: /tate\s*modern/i, replacement: 'Tate Modern' },
        { pattern: /british\s*museum/i, replacement: 'British Museum' },
        { pattern: /(muzeum\s*)?prado/i, replacement: 'Muzeum Prado' },
        { pattern: /hermitaż/i, replacement: 'Hermitaż' },
        { pattern: /ermitaż/i, replacement: 'Hermitaż' },
        { pattern: /guggenheim/i, replacement: 'Muzeum Guggenheima' },
        { pattern: /national\s*gallery/i, replacement: 'National Gallery' },
        { pattern: /rijksmuseum/i, replacement: 'Rijksmuseum' },
        { pattern: /van\s*gogh\s*museum/i, replacement: 'Muzeum Van Gogha' },
      ];

      for (const { pattern, replacement } of replacements) {
        if (pattern.test(location)) {
          return replacement;
        }
      }

      // Capitalize first letter of each word for unknown locations
      return location
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    const artworkInfo = extractArtworkInfo(analysis);

    // Remove the LOKALIZACJA line from the displayed analysis (keep only for internal extraction)
    analysis = analysis.replace(/\n?\s*LOKALIZACJA:\s*[^\n\r]+\s*/gi, '').trim();

    let conversationId = null;

    // Create conversation if requested
    if (createConversation) {
      // Use artwork title as conversation title, fallback to generic title
      const conversationTitle = artworkInfo.title
        ? `${artworkInfo.title}${artworkInfo.artist ? ` - ${artworkInfo.artist}` : ''}`
        : "Analiza dzieła sztuki";

      const conversationData = {
        user_id: user.id,
        title: conversationTitle,
        artwork_image_url: imageUrl || null,
      };

      // Add artwork metadata
      if (artworkInfo.title) conversationData.artwork_title = artworkInfo.title;
      if (artworkInfo.artist) conversationData.artwork_artist = artworkInfo.artist;
      if (artworkInfo.period) conversationData.artwork_period = artworkInfo.period;

      // Determine location to use: artwork location first, then user location
      const locationToUse = artworkInfo.location || (locationData ? locationData.name : null);
      const addressToUse = artworkInfo.location ? null : (locationData ? locationData.address : null);

      if (locationToUse) {
        conversationData.location_name = locationToUse;
        conversationData.location_address = addressToUse;
        // Only add coordinates if using user location
        if (locationData && !artworkInfo.location) {
          conversationData.latitude = locationData.latitude || null;
          conversationData.longitude = locationData.longitude || null;
        }
      }

      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert(conversationData)
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
