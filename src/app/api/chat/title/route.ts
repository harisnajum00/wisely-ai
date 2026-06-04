import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message, response } = await request.json()

    if (!message) {
      return NextResponse.json({ title: 'New Chat' })
    }

    // Build a context string for better title generation
    let userContent = message
    if (response && typeof response === 'string' && response.trim()) {
      const responseSummary = response.slice(0, 200)
      userContent = `User asked: "${message.trim()}"\nAI responded: "${responseSummary}..."`
    }

    // Use z-ai-web-dev-sdk for title generation (no API key needed)
    let title = ""
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "system", content: "Generate a very short chat title (3-6 words max) for a conversation. Return ONLY the title text, nothing else. No quotes, no punctuation at end." },
          { role: "user", content: userContent },
        ],
        stream: false,
      })

      title = completion?.choices?.[0]?.message?.content?.trim() || ""
    } catch (zaiErr: any) {
      console.error("[Wisely] Title generation error:", zaiErr?.message)
    }

    // Clean up any quotes the model might add
    if (title) {
      const cleanTitle = title.replace(/^["']|["']$/g, '').replace(/\.$/, '')
      return NextResponse.json({ title: cleanTitle.slice(0, 80) })
    }

    // Fallback: use the message itself as title
    return NextResponse.json({ title: message.slice(0, 50) })
  } catch {
    return NextResponse.json({ title: 'New Chat' })
  }
}
