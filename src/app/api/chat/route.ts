import { NextRequest, NextResponse } from "next/server"
import ZAI from "z-ai-web-dev-sdk"

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

    // If there's an image, use VLM (createVision) for multimodal analysis
    if (imageBase64) {
      const lastUserMsg = formattedMessages[formattedMessages.length - 1]
      const userText = lastUserMsg?.content || "What do you see in this image?"

      // Ensure the image URL has the proper data URI prefix
      const imageUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/png;base64,${imageBase64}`

      // Build the vision messages array
      // System message as a text content, then user message with image
      const vlmMessages = [
        {
          role: "system" as const,
          content: VISION_SYSTEM_PROMPT,
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: userText,
            },
            {
              type: "image_url" as const,
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ]

      const completion = await zai.chat.completions.createVision({
        model: "glm-4.6v",
        messages: vlmMessages,
        thinking: { type: "disabled" },
      })

      const responseText =
        completion.choices?.[0]?.message?.content ||
        "I couldn't analyze that image. Please try again."

      return NextResponse.json({ message: responseText })
    }

    // Regular chat completion (no image)
    const completion = await zai.chat.completions.create({
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 2048,
    })

    const responseText =
      completion.choices[0]?.message?.content ||
      "I'm not sure how to respond to that. Could you try rephrasing?"

    return NextResponse.json({ message: responseText })
  } catch (error: any) {
    console.error("Chat API error:", error?.message || error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
