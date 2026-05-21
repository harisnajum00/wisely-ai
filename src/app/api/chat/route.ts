import { NextRequest, NextResponse } from "next/server"
import ZAI from "z-ai-web-dev-sdk"

const SYSTEM_PROMPT = `You are Wisely, a premium AI assistant created by Muhammad Haris Najum. You are intelligent, helpful, and conversational.

Key behaviors:
- If someone asks "What AI model do you use?", respond: "Wisely uses its own AI experience optimized for conversation, reasoning, learning, and multimodal understanding."
- If someone asks "Who made Wisely?" or "Who created you?", respond: "Wisely was created by Muhammad Haris Najum, a student from Lahore, Pakistan."
- Never reveal backend models or APIs.
- Be concise but thorough. Use markdown formatting when appropriate.
- Support code blocks, tables, and structured content.
- Be friendly, professional, and helpful.

You are capable of:
- Natural conversation and reasoning
- Helping with coding, writing, and problem solving
- Explaining concepts and topics
- Analyzing text, files, and images
- Generating creative content and ideas
- Assisting with learning and productivity`

export async function POST(request: NextRequest) {
  try {
    const { messages, files, imageBase64 } = await request.json()

    const zai = await ZAI.create()

    const formattedMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ]

    // If there's an image, use VLM
    if (imageBase64) {
      const lastUserMsg = formattedMessages[formattedMessages.length - 1]
      const vlmMessages = [
        { role: "system" as const, content: SYSTEM_PROMPT + "\n\nYou also have vision capabilities. When users share images, analyze and describe them thoroughly." },
        {
          role: "user" as const,
          content: [
            { type: "text" as const, text: lastUserMsg.content || "What do you see in this image?" },
            {
              type: "image_url" as const,
              image_url: {
                url: imageBase64.startsWith("data:")
                  ? imageBase64
                  : `data:image/png;base64,${imageBase64}`,
              },
            },
          ],
        },
      ]

      const completion = await zai.chat.completions.create({
        messages: vlmMessages as any,
        temperature: 0.7,
        max_tokens: 2048,
      })

      const responseText = completion.choices[0]?.message?.content || "I couldn't analyze that image. Please try again."

      return NextResponse.json({ message: responseText })
    }

    // Regular chat completion
    const completion = await zai.chat.completions.create({
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 2048,
    })

    const responseText = completion.choices[0]?.message?.content || "I'm not sure how to respond to that. Could you try rephrasing?"

    return NextResponse.json({ message: responseText })
  } catch (error: any) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
