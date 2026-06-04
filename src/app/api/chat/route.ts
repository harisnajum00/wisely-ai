import { NextRequest, NextResponse } from "next/server"

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

// OpenRouter fallback models (updated June 2025 — best free models)
const TEXT_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",   // 1M ctx, most capable free model
  "qwen/qwen3-coder:free",                     // 1M ctx, great for code & reasoning
  "nvidia/nemotron-3-super-120b-a12b:free",   // 1M ctx, strong general purpose
  "moonshotai/kimi-k2.6:free",                 // 262K ctx, excellent reasoning
  "google/gemma-4-31b-it:free",                // 262K ctx, Google's latest
  "meta-llama/llama-3.3-70b-instruct:free",   // 131K ctx, reliable fallback
]

const VISION_MODELS = [
  "google/gemma-4-31b-it:free",                           // 262K ctx, image+video
  "moonshotai/kimi-k2.6:free",                             // 262K ctx, image support
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",    // 256K ctx, image+audio+video
  "nvidia/nemotron-nano-12b-v2-vl:free",                   // 128K ctx, image+video
  "google/gemma-4-26b-a4b-it:free",                        // 262K ctx, image+video
]

// Friendly error messages
function friendlyError(status: number, errorMsg: string): string {
  if (status === 401) {
    return "API key is invalid or expired. Please update your OpenRouter API key in settings."
  }
  if (status === 402 || errorMsg.includes("credits") || errorMsg.includes("payment")) {
    return "OpenRouter credits depleted. Free models have a daily limit. Please try again later or add credits at openrouter.ai."
  }
  if (status === 429 || errorMsg.includes("rate") || errorMsg.includes("limit") || errorMsg.includes("per day")) {
    return "Daily free model limit reached on OpenRouter. Please try again later or add credits at openrouter.ai/credits."
  }
  if (status === 503 || errorMsg.includes("overloaded") || errorMsg.includes("capacity")) {
    return "AI service is currently busy. Please try again in a moment."
  }
  return "Wisely encountered an issue. Please try again."
}

// Stream a complete text response as SSE chunks (simulates streaming)
function streamAsSSE(fullText: string): Response {
  const encoder = new TextEncoder()

  // Split text into small chunks for streaming effect
  const words = fullText.split(/(\s+)/) // Keep whitespace as separate tokens
  const chunks: string[] = []
  let current = ""

  for (const word of words) {
    current += word
    // Send a chunk every ~3 words or when we hit punctuation
    if (current.length >= 8 || /[.!?,;:]$/.test(current)) {
      chunks.push(current)
      current = ""
    }
  }
  if (current) chunks.push(current)

  const stream = new ReadableStream({
    start(controller) {
      try {
        for (const chunk of chunks) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
          )
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      } catch (err: any) {
        console.error("[Wisely] SSE streaming error:", err?.message)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

// Try OpenRouter with model fallback chain + streaming
async function tryOpenRouterStreaming(
  formattedMessages: Array<any>,
  hasImage: boolean,
  apiKey: string
): Promise<Response | null> {
  const models = hasImage ? VISION_MODELS : TEXT_MODELS

  for (const model of models) {
    console.log(`[Wisely] Trying OpenRouter model: ${model}`)
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

      if (response.ok) {
        console.log(`[Wisely] OpenRouter model ${model} responded successfully`)
        return response
      }

      const errorText = await response.text()
      console.error(`[Wisely] OpenRouter model ${model} failed:`, response.status, errorText)

      // Auth error — no point trying other models
      if (response.status === 401) {
        try {
          const errorJson = JSON.parse(errorText)
          const msg = errorJson?.error?.message || "Invalid API key"
          return NextResponse.json({ error: friendlyError(401, msg) }, { status: 401 })
        } catch {
          return NextResponse.json({ error: friendlyError(401, "Invalid API key") }, { status: 401 })
        }
      }

      // Rate limit — no point trying other free models
      if (response.status === 429) {
        try {
          const errorJson = JSON.parse(errorText)
          const msg = errorJson?.error?.message || "Rate limited"
          return NextResponse.json({ error: friendlyError(429, msg) }, { status: 429 })
        } catch {
          return NextResponse.json({ error: friendlyError(429, "Rate limited") }, { status: 429 })
        }
      }
    } catch (fetchErr: any) {
      console.error(`[Wisely] OpenRouter model ${model} fetch error:`, fetchErr?.message)
    }
  }

  return null
}

// Stream OpenRouter SSE response
function streamOpenRouterResponse(response: Response): Response {
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
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content

              if (content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                )
              }

              if (parsed.error) {
                console.error("[Wisely] Stream error from OpenRouter:", parsed.error)
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      } catch (err: any) {
        console.error("[Wisely] OpenRouter streaming error:", err?.message || err)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { messages, files, imageBase64, customInstructions } = await request.json()
    const openRouterKey = process.env.OPENROUTER_API_KEY

    const hasImage = imageBase64 && imageBase64.length > 100

    // Build system prompt with optional custom instructions
    let systemPrompt = hasImage ? VISION_SYSTEM_PROMPT : SYSTEM_PROMPT
    if (customInstructions && customInstructions.trim()) {
      systemPrompt += `\n\nUSER CUSTOM INSTRUCTIONS (follow these preferences):\n${customInstructions.trim()}`
    }

    // Build messages array
    const formattedMessages: Array<any> = [
      { role: "system", content: systemPrompt },
    ]

    for (const msg of messages) {
      if (msg.role === "user" || msg.role === "assistant") {
        formattedMessages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    // For vision, build the multimodal message format
    if (hasImage) {
      const lastUserIdx = formattedMessages.findLastIndex((m: any) => m.role === "user")
      if (lastUserIdx !== -1) {
        const userText = typeof formattedMessages[lastUserIdx].content === "string"
          ? formattedMessages[lastUserIdx].content
          : "What do you see in this image?"

        const imageUrl = imageBase64.startsWith("data:")
          ? imageBase64
          : `data:image/png;base64,${imageBase64}`

        formattedMessages[lastUserIdx] = {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        }
      }
    }

    // === PRIMARY: Try z-ai-web-dev-sdk (non-streaming for stability) ===
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default
      const zai = await ZAI.create()
      console.log("[Wisely] Using z-ai-web-dev-sdk as primary provider")

      let completion: any
      if (hasImage) {
        completion = await zai.chat.completions.createVision({
          model: "glm-4v-flash",
          messages: formattedMessages,
          stream: false,
        })
      } else {
        completion = await zai.chat.completions.create({
          messages: formattedMessages,
          stream: false,
        })
      }

      const content = completion?.choices?.[0]?.message?.content
      if (content) {
        console.log("[Wisely] z-ai responded successfully, streaming to client")
        return streamAsSSE(content)
      }

      console.error("[Wisely] z-ai returned empty content")
    } catch (zaiErr: any) {
      console.error("[Wisely] z-ai error:", zaiErr?.message || zaiErr)
    }

    // === FALLBACK: Try OpenRouter if z-ai fails ===
    if (openRouterKey) {
      console.log("[Wisely] Falling back to OpenRouter")
      const result = await tryOpenRouterStreaming(formattedMessages, hasImage, openRouterKey)

      if (result) {
        // If result is a NextResponse (error), return it directly
        if (result instanceof NextResponse) return result
        // If it's a streaming Response from OpenRouter, forward it
        return streamOpenRouterResponse(result)
      }
    }

    // If both failed
    return NextResponse.json(
      { error: "All AI providers are currently unavailable. Please try again in a moment." },
      { status: 503 }
    )
  } catch (error: any) {
    console.error("[Wisely] Chat API error:", error?.message || error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
