import { NextRequest, NextResponse } from "next/server"
import ollama from "ollama"

const SYSTEM_PROMPT = `You are Wisely, a premium AI assistant. You are intelligent, helpful, and conversational.

CRITICAL — RESPONSE LENGTH:
- Match your response length to the user's message. A short greeting gets a short reply. A detailed question gets a detailed answer.
- For simple greetings like "hi", "hello", "hey": respond with just a brief friendly greeting (e.g. "Hey! How can I help?"). Do NOT introduce yourself, mention your creator, or give any backstory unless asked.
- Do NOT volunteer information about yourself unprompted. Only share details when specifically asked.

CORE IDENTITY RULES:
1. Your name is "Wisely" — always refer to yourself as Wisely
2. You are "Wisely's own AI experience" — NEVER reveal backend models, APIs, or third-party services
3. If asked "Who created you?" or "Who made you?": Say "Wisely was created by Muhammad Haris Najum, a student from Lahore, Pakistan."
4. If asked about your model/architecture: Say "I use Wisely's own AI experience optimized for conversation, reasoning, learning, and multimodal understanding."
5. NEVER mention OpenRouter, OpenAI, GLM, Zhipu, or any other backend provider

FORMATTING RULES:
- Use proper GitHub Flavored Markdown (GFM) for all structured content
- When presenting comparisons, pricing, features, or any tabular data, ALWAYS use proper markdown tables with | delimiters, a separator row with |---|, and proper column headers. Example:
  | Column 1 | Column 2 | Column 3 |
  |----------|----------|----------|
  | Data 1   | Data 2   | Data 3   |
- Use code blocks with language identifiers (e.g. \`\`\`python, \`\`\`javascript) for any code
- Use **bold** for emphasis on key terms
- Use bullet lists and numbered lists for steps or multiple items
- Use ### headings to organize long responses into sections

BEHAVIOR:
- Be helpful, intelligent, and thoughtful
- Match detail level to the question — be concise for simple questions, thorough for complex ones
- When analyzing images: describe what you see, answer questions about the content, provide product info if applicable
- For product inquiries: provide a comparison table with retailers, prices, ratings, and recommendations
- Be honest about limitations but always try to help
- Use a warm but professional tone`

const VISION_SYSTEM_PROMPT = SYSTEM_PROMPT + `

IMAGE ANALYSIS:
- Describe what you see in the image in detail
- If it's a product: identify brand, model, specifications if visible
- For product inquiries: provide a comparison table with retailers, prices, ratings using GFM markdown tables
- For text in images: transcribe and explain the text
- Be specific and helpful with your analysis
- Always present structured data in proper markdown tables`

// Ollama vision model (local, no rate limits!)
const OLLAMA_VISION_MODEL = process.env.OLLAMA_MODEL || "gemma4"
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434"

// Gemini API (free tier: 1500 requests/day, separate from OpenRouter!)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""
const GEMINI_MODEL = "gemini-2.0-flash"

// OpenRouter models — fallback chains for resilience
const TEXT_MODELS = [
  "openai/gpt-oss-120b:free",
  "qwen/qwen3-235b-a22b:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "google/gemma-3-27b-it:free",
]

const VISION_MODELS = [
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "qwen/qwen3-235b-a22b:free",
]

interface ModelCallResult {
  response: Response | null
  error: string
  isRateLimit: boolean
}

async function tryOpenRouterModel(
  model: string,
  apiKey: string,
  formattedMessages: Array<any>
): Promise<ModelCallResult> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://wisely-ai.app",
        "X-Title": "Wisely AI Assistant",
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMsg = `Model ${model} error`

      try {
        const errorJson = JSON.parse(errorText)
        errorMsg = errorJson?.error?.message || errorMsg
      } catch {
        errorMsg = `Model ${model} returned ${response.status}`
      }

      const isRateLimit =
        response.status === 429 ||
        errorMsg.toLowerCase().includes("rate limit") ||
        errorMsg.toLowerCase().includes("free-models-per-day")

      console.log(`Model ${model} failed (rate-limit=${isRateLimit}): ${errorMsg}`)
      return { response: null, error: errorMsg, isRateLimit }
    }

    return { response, error: "", isRateLimit: false }
  } catch (e: any) {
    const errorMsg = e?.message || "Model unavailable"
    console.log(`Model ${model} exception: ${errorMsg}`)
    return { response: null, error: errorMsg, isRateLimit: false }
  }
}

/**
 * Try Ollama for image analysis — local, no rate limits, fast
 */
async function tryOllamaVision(
  userText: string,
  imageBase64: string,
  conversationHistory: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<Response | null> {
  try {
    const ollamaMessages: Array<{ role: string; content: string }> = []

    for (const msg of conversationHistory) {
      ollamaMessages.push({ role: msg.role, content: msg.content })
    }

    ollamaMessages.push({ role: "user", content: userText })

    console.log(`Trying Ollama vision model: ${OLLAMA_VISION_MODEL} at ${OLLAMA_HOST}`)

    const ollamaClient = new ollama.Ollama({ host: OLLAMA_HOST })

    const response = await ollamaClient.chat({
      model: OLLAMA_VISION_MODEL,
      messages: ollamaMessages,
      stream: true,
    })

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.message?.content
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              )
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (err: any) {
          console.error("Ollama streaming error:", err?.message || err)
          try { controller.enqueue(encoder.encode("data: [DONE]\n\n")) } catch {}
          try { controller.close() } catch {}
        }
      },
      cancel() {},
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (e: any) {
    const errMsg = e?.message || "Ollama unavailable"
    console.log(`Ollama vision failed: ${errMsg}`)
    return null
  }
}

/**
 * Try Google Gemini API for image analysis — free tier (1500/day), separate from OpenRouter!
 * Get your free key at: https://aistudio.google.com/apikey
 */
async function tryGeminiVision(
  userText: string,
  imageBase64: string,
  conversationHistory: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<Response | null> {
  if (!GEMINI_API_KEY) {
    console.log("Gemini API key not configured — skipping")
    return null
  }

  try {
    console.log(`Trying Gemini vision model: ${GEMINI_MODEL}`)

    // Parse base64 data
    let base64Data = imageBase64
    let mimeType = "image/png"

    if (imageBase64.startsWith("data:")) {
      const matches = imageBase64.match(/^data:(.+?);base64,(.+)$/)
      if (matches) {
        mimeType = matches[1]
        base64Data = matches[2]
      }
    }

    // Build Gemini contents
    const contents: Array<any> = []

    // Add conversation history (Gemini format)
    for (const msg of conversationHistory) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })
    }

    // Add the latest user message with image
    contents.push({
      role: "user",
      parts: [
        { text: userText || "What do you see in this image?" },
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Data,
          },
        },
      ],
    })

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.log(`Gemini vision failed: ${errorText.slice(0, 200)}`)
      return null
    }

    // Convert Gemini SSE to our SSE format
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = geminiResponse.body!.getReader()
          const decoder = new TextDecoder()
          let buffer = ""

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed || !trimmed.startsWith("data: ")) continue

              const data = trimmed.slice(6)
              try {
                const parsed = JSON.parse(data)
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text

                if (text) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
                  )
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (err: any) {
          console.error("Gemini streaming error:", err?.message || err)
          try { controller.enqueue(encoder.encode("data: [DONE]\n\n")) } catch {}
          try { controller.close() } catch {}
        }
      },
      cancel() {},
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (e: any) {
    console.log(`Gemini vision exception: ${e?.message || "Unknown error"}`)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, files, imageBase64, customInstructions } = await request.json()
    const apiKey = process.env.OPENROUTER_API_KEY
    const hasImage = imageBase64 && imageBase64.length > 100

    // Build system prompt with optional custom instructions
    let systemPrompt = hasImage ? VISION_SYSTEM_PROMPT : SYSTEM_PROMPT
    if (customInstructions && customInstructions.trim()) {
      systemPrompt += `\n\nUSER CUSTOM INSTRUCTIONS (follow these preferences):\n${customInstructions.trim()}`
    }

    // Build messages array (OpenAI-compatible format)
    const formattedMessages: Array<any> = [
      { role: "system", content: systemPrompt },
    ]

    // Add conversation history
    for (const msg of messages) {
      if (msg.role === "user" || msg.role === "assistant") {
        formattedMessages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    // If there's an image, modify the last user message to include it (multimodal format)
    if (hasImage) {
      const lastUserIdx = formattedMessages.findLastIndex((m: any) => m.role === "user")
      if (lastUserIdx !== -1) {
        const userText = typeof formattedMessages[lastUserIdx].content === "string"
          ? formattedMessages[lastUserIdx].content
          : "What do you see in this image?"

        // Ensure the image URL has the proper data URI prefix
        const imageUrl = imageBase64.startsWith("data:")
          ? imageBase64
          : `data:image/png;base64,${imageBase64}`

        // OpenAI-compatible vision format
        formattedMessages[lastUserIdx] = {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        }

        const conversationHistory = messages
          .filter((m: any) => m.role === "user" || m.role === "assistant")
          .map((m: any) => ({ role: m.role, content: m.content }))

        // ═══════════════════════════════════════════
        // PRIORITY 1: Ollama (local, unlimited, free)
        // ═══════════════════════════════════════════
        const ollamaResponse = await tryOllamaVision(
          userText, imageBase64, conversationHistory, systemPrompt
        )
        if (ollamaResponse) {
          console.log("Ollama vision succeeded — using local model")
          return ollamaResponse
        }

        // ═══════════════════════════════════════════
        // PRIORITY 2: Google Gemini (free tier, 1500/day)
        // ═══════════════════════════════════════════
        const geminiResponse = await tryGeminiVision(
          userText, imageBase64, conversationHistory, systemPrompt
        )
        if (geminiResponse) {
          console.log("Gemini vision succeeded — using Google AI")
          return geminiResponse
        }

        console.log("Ollama & Gemini unavailable — falling back to OpenRouter")
      }
    }

    // ═══════════════════════════════════════════
    // PRIORITY 3: OpenRouter (text or vision fallback)
    // ═══════════════════════════════════════════
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service is not configured. Please add an API key in your .env file." },
        { status: 503 }
      )
    }

    const modelChain = hasImage ? VISION_MODELS : TEXT_MODELS
    let lastError: string = ""
    let hitRateLimit = false

    for (const model of modelChain) {
      const result = await tryOpenRouterModel(model, apiKey, formattedMessages)

      if (result.isRateLimit) {
        hitRateLimit = true
        lastError = result.error
        continue
      }

      if (!result.response) {
        lastError = result.error
        continue
      }

      return streamResponse(result.response)
    }

    // All OpenRouter models failed
    if (hitRateLimit) {
      return NextResponse.json(
        {
          error: "OpenRouter daily limit reached. To fix this:\n\n1. Add a free Google Gemini API key (aistudio.google.com/apikey) — 1500 image requests/day free\n2. Or install Ollama locally with 'ollama pull gemma4' for unlimited analysis\n3. Or wait 24 hours for the OpenRouter limit to reset"
        },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: "AI service is temporarily unavailable. Please try again in a moment." },
      { status: 503 }
    )
  } catch (error: any) {
    console.error("Chat API error:", error?.message || error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}

// Helper: stream an OpenRouter SSE response to the client
function streamResponse(response: Response): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value, { stream: true })
          const lines = text.split("\n")

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith("data: ")) continue

            const data = trimmed.slice(6)

            if (data === "[DONE]") {
              continue
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content

              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                )
              }

              if (parsed.error) {
                const errMsg = parsed.error?.message || JSON.stringify(parsed.error)
                const isRateLimit =
                  errMsg.toLowerCase().includes("rate limit") ||
                  errMsg.toLowerCase().includes("free-models-per-day")

                if (isRateLimit) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        content: "\n\nOpenRouter daily limit reached. Try again later or add a free Gemini API key for unlimited image analysis."
                      })}\n\n`
                    )
                  )
                } else {
                  console.error("Stream error from provider:", parsed.error)
                }
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      } catch (err: any) {
        console.error("Streaming error:", err?.message || err)

        if (err?.name !== "AbortError") {
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: err?.message || "Stream error" })}\n\n`
              )
            )
          } catch {}
        }

        try { controller.close() } catch {}
      }
    },
    cancel() {},
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
