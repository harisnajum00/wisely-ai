import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

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

// OpenRouter models (updated June 2025 — sorted by speed/reliability)
const TEXT_MODELS = [
  "moonshotai/kimi-k2.6:free",                 // 262K ctx, fast & smart
  "google/gemma-4-31b-it:free",                // 262K ctx, Google's latest
  "meta-llama/llama-3.3-70b-instruct:free",   // 131K ctx, reliable & fast
  "qwen/qwen3-coder:free",                     // 1M ctx, great for code
  "nvidia/nemotron-3-ultra-550b-a55b:free",   // 1M ctx, very smart but slow
  "nvidia/nemotron-3-super-120b-a12b:free",   // 1M ctx, strong but slow
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

  const words = fullText.split(/(\s+)/)
  const chunks: string[] = []
  let current = ""

  for (const word of words) {
    current += word
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

      // Auth error — no point trying other models (bad key affects all)
      if (response.status === 401) {
        try {
          const errorJson = JSON.parse(errorText)
          const msg = errorJson?.error?.message || "Invalid API key"
          return NextResponse.json({ error: friendlyError(401, msg) }, { status: 401 })
        } catch {
          return NextResponse.json({ error: friendlyError(401, "Invalid API key") }, { status: 401 })
        }
      }

      // Rate limit — try next model, different free models may have separate limits
      if (response.status === 429) {
        console.warn(`[Wisely] Model ${model} rate limited, trying next model...`)
        continue
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

// Helper: Convert formatted messages to Gemini format
function toGeminiHistory(formattedMessages: Array<any>): any[] {
  const geminiHistory: any[] = []

  for (const msg of formattedMessages) {
    if (msg.role === "system") continue

    if (msg.role === "user") {
      if (Array.isArray(msg.content)) {
        const parts: any[] = []
        for (const part of msg.content) {
          if (part.type === "text") {
            parts.push({ text: part.text })
          } else if (part.type === "image_url" && part.image_url?.url) {
            const imgUrl = part.image_url.url
            if (imgUrl.startsWith("data:")) {
              const matches = imgUrl.match(/^data:([^;]+);base64,(.+)$/)
              if (matches) {
                parts.push({
                  inlineData: {
                    mimeType: matches[1],
                    data: matches[2],
                  },
                })
              }
            }
          }
        }
        geminiHistory.push({ role: "user", parts })
      } else {
        geminiHistory.push({ role: "user", parts: [{ text: msg.content }] })
      }
    } else if (msg.role === "assistant") {
      const text = typeof msg.content === "string" ? msg.content : ""
      geminiHistory.push({ role: "model", parts: [{ text }] })
    }
  }

  return geminiHistory
}

// Helper: Call Gemini and return response
async function tryGemini(
  geminiKey: string,
  formattedMessages: Array<any>,
  systemPrompt: string,
  isVision: boolean
): Promise<Response | null> {
  try {
    const genAI = new GoogleGenerativeAI(geminiKey)

    // For vision: Gemini 2.0 Flash (best free vision)
    // For text with code: Gemini 2.5 Flash (best free coding)
    // For general text: Gemini 2.0 Flash (fast & smart)
    let modelName = "gemini-2.0-flash"
    if (!isVision) {
      const lastUserMsg = formattedMessages
        .filter((m: any) => m.role === 'user')
        .map((m: any) => typeof m.content === 'string' ? m.content : '')
        .pop() || ''
      const isCodingTask = /\b(code|coding|program|function|script|debug|fix.*code|write.*code|implement|algorithm|api|python|javascript|typescript|react|node|html|css|sql|database|git|deploy|build|compile|syntax|error|bug|stack|class|method|loop|array|object|json|yaml|docker|server|backend|frontend|fullstack|component|hook|library|package|npm|pip|import|export|async|await|fetch|promise)\b/i.test(lastUserMsg)
      if (isCodingTask) modelName = "gemini-2.5-flash-preview-05-20"
    }

    console.log(`[Wisely] Gemini model: ${modelName} (vision: ${isVision})`)
    const model = genAI.getGenerativeModel({ model: modelName })
    const geminiHistory = toGeminiHistory(formattedMessages)

    let responseText = ""

    if (geminiHistory.length > 1) {
      const chat = model.startChat({
        history: geminiHistory.slice(0, -1),
        systemInstruction: systemPrompt,
      })
      const lastMessage = geminiHistory[geminiHistory.length - 1]
      const result = await chat.sendMessage(lastMessage.parts)
      responseText = result.response.text()
    } else if (geminiHistory.length === 1) {
      const result = await model.generateContent({
        contents: geminiHistory,
        systemInstruction: systemPrompt,
      })
      responseText = result.response.text()
    }

    if (responseText) {
      console.log("[Wisely] Gemini responded successfully")
      return streamAsSSE(responseText)
    }

    console.error("[Wisely] Gemini returned empty content")
    return null
  } catch (geminiErr: any) {
    console.error("[Wisely] Gemini error:", geminiErr?.message || geminiErr)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, files, imageBase64, customInstructions } = await request.json()
    const openRouterKey = process.env.OPENROUTER_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY

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

    // ============================================================
    // PROVIDER CHAIN — Gemini first (fast), OpenRouter as backup:
    //   ALL: z-ai (dev only) → Gemini → OpenRouter
    //   Gemini 2.5 Flash for code, 2.0 Flash for general/vision
    // ============================================================

    // === PROVIDER 1: z-ai-web-dev-sdk (dev container only, unlimited) ===
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default
      const zai = await ZAI.create()
      console.log("[Wisely] Using z-ai-web-dev-sdk (provider 1)")

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

    // === PROVIDER 2: Google Gemini (fast + 1500 free req/day) ===
    if (geminiKey) {
      console.log("[Wisely] Trying Gemini (provider 2)")
      const result = await tryGemini(geminiKey, formattedMessages, systemPrompt, hasImage)
      if (result) return result
    }

    // === PROVIDER 3: OpenRouter as fallback ===
    if (openRouterKey) {
      console.log("[Wisely] Trying OpenRouter (provider 3)")
      const result = await tryOpenRouterStreaming(formattedMessages, hasImage, openRouterKey)
      if (result) {
        if (result instanceof NextResponse) return result
        return streamOpenRouterResponse(result)
      }
    }

    // If all providers failed
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
