import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from "../_shared/cors.ts"
import { RateLimiter, DEFAULT_RATE_LIMITS, createRateLimitHeaders } from "../_shared/rateLimiter.ts"

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'http://127.0.0.1:54321'
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Rate limiting check
    try {
      const rateLimiter = new RateLimiter()
      const rateLimitResult = await rateLimiter.checkRateLimit({
        identifier: user.id,
        maxRequests: DEFAULT_RATE_LIMITS.CHAT.maxRequests,
        windowMs: DEFAULT_RATE_LIMITS.CHAT.windowMs
      })

      const rateLimitHeaders = createRateLimitHeaders(rateLimitResult)

      if (!rateLimitResult.success) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please wait before sending more messages.',
            retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              ...rateLimitHeaders,
              'Content-Type': 'application/json' 
            } 
          }
        )
      }
    } catch (rateLimitError) {
      console.error('Rate limiting error:', rateLimitError)
      // Continue processing if rate limiting fails
    }

    const { conversationId, message, createNew, title, artworkImageUrl } = await req.json()

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    let currentConversationId = conversationId

    // Create new conversation if requested
    if (createNew || !currentConversationId) {
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: title || 'New Conversation',
          artwork_image_url: artworkImageUrl || null
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating conversation:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create conversation' }),
          { 
            status: 500, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        )
      }

      currentConversationId = newConversation.id
    }

    // Get conversation history
    const { data: messages, error: historyError } = await supabase
      .from('messages')
      .select('content, role, created_at')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true })

    if (historyError) {
      console.error('Error fetching conversation history:', historyError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch conversation history' }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Add user message to database
    const { error: userMessageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        content: message,
        role: 'user'
      })

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError)
      return new Response(
        JSON.stringify({ error: 'Failed to save user message' }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Prepare conversation history for OpenAI
    const conversationHistory: ChatMessage[] = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))

    // Add the new user message
    conversationHistory.push({
      role: 'user',
      content: message
    })

    // Call OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: conversationHistory,
        max_tokens: 500,
        temperature: 0.7
      })
    })

    const openaiResponse = await response.json()

    if (!response.ok) {
      console.error('OpenAI API Error:', openaiResponse)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get AI response', 
          details: openaiResponse.error?.message 
        }),
        { 
          status: response.status, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    const aiMessage = openaiResponse.choices?.[0]?.message?.content || 'No response available'

    // Save AI response to database
    const { error: aiMessageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        content: aiMessage,
        role: 'assistant'
      })

    if (aiMessageError) {
      console.error('Error saving AI message:', aiMessageError)
      return new Response(
        JSON.stringify({ error: 'Failed to save AI message' }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        message: aiMessage,
        conversationId: currentConversationId,
        usage: openaiResponse.usage 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})