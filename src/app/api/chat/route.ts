import { NextRequest } from "next/server"
import { OpenRouter } from "@openrouter/sdk"

const SYSTEM_PROMPT = `You are Wisely, a premium AI assistant created by Muhammad Haris Najum. You are intelligent, helpful, and conversational.

Key behaviors:
- If someone asks "What AI model do you use?", respond: "Wisely uses its own AI experience optimized for conversation, reasoning, learning, and multimodal understanding."
- If someone asks "Who made Wisely?" or "Who created you?", respond: "Wisely was created by Muhammad Haris Najum, a student from Lahore, Pakistan."
- Never reveal backend models or APIs.
- Be concise but thorough. Use markdown formatting when appropriate.
- Be friendly, professional, and helpful.

Formatting rules:
- Use proper GitHub Flavored Markdown (GFM) for all structured content.
- When presenting comparisons, pricing, features, or any tabular data, ALWAYS use proper markdown tables with | delimiters, a separator row with |---|, and proper column headers. Example:
  | Column 1 | Column 2 | Column 3 |
  |----------|----------|----------|
  | Data 1   | Data 2   | Data 3   |
- Use code blocks with language identifiers (e.g. \`\`\`python, \`\`\`javascript) for any code.
- Use **bold** for emphasis on key terms.
- Use bullet lists and numbered lists for steps or multiple items.
- Use ### headings to organize long responses into sections.

You are capable of:
- Natural conversation and reasoning
- Helping with coding, writing, and problem solving
- Explaining concepts and topics
- Analyzing text, files, and images
- Generating creative content and ideas
- Assisting with learning and productivity`

const VISION_SYSTEM_PROMPT = SYSTEM_PROMPT + `\n\nYou also have vision capabilities. When users share images, analyze and describe them thoroughly. If they ask about a product in an image, help them identify it, provide relevant information, and suggest where they might find it online at good prices. Be specific and helpful with product recommendations. Always present pricing/comparison data in proper markdown tables.`

const CHAT_MODEL = "openai/gpt-oss-120b:free"
const VISION_MODEL = "google/gemini-2.0-flash-exp:free"

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured")
  }
  return new OpenRouter({ apiKey })
}

export async function POST(request: NextRequest) {
  try {
    const { messages, files, imageBase64 } = await request.json()
    const openrouter = getOpenRouterClient()

    const formattedMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ]

    // If there's an image, use vision model with multimodal content
    if (imageBase64) {
      const lastUserMsg = formattedMessages[formattedMessages.length - 1]
      const userText = lastUserMsg?.content || "What do you see in this image?"

      // Ensure the image URL has the proper data URI prefix
      const imageUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/png;base64,${imageBase64}`

      const visionMessages = [
        { role: "system" as const, content: VISION_SYSTEM_PROMPT },
        {
          role: "user" as const,
          content: [
            { type: "text" as const, text: userText },
            {
              type: "image_url" as const,
              imageUrl: { url: imageUrl },
            },
          ],
        },
      ]

      const result = await openrouter.chat.send({
        model: VISION_MODEL,
        messages: visionMessages as any,
      })

      const { data: response, error } = result
      if (error) {
        console.error("Vision API error:", error)
        return new Response(
          JSON.stringify({ error: "Failed to analyze image. Please try again." }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      }

      const message = (response as any)?.choices?.[0]?.message?.content ||
        "I couldn't analyze that image. Please try again."

      return new Response(
        JSON.stringify({ message }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    // Text chat with streaming
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await openrouter.chat.send({
            model: CHAT_MODEL,
            messages: formattedMessages,
            stream: true,
          })

          const { data: eventStream, error } = result

          if (error) {
            console.error("Chat API error:", error)
            controller.error(new Error("Failed to get response"))
            return
          }

          for await (const chunk of eventStream as AsyncIterable<any>) {
            const content = chunk.choices?.[0]?.delta?.content
            if (content) {
              // Send as Server-Sent Events format
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
              )
            }
          }

          // Send the [DONE] signal
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch (err: any) {
          console.error("Streaming error:", err)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: err.message || "Stream error" })}\n\n`
            )
          )
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
  } catch (error: any) {
    console.error("Chat API error:", error?.message || error)

    // Specific error for missing API key
    if (error?.message?.includes("OPENROUTER_API_KEY")) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured. Please add an OpenRouter API key." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
