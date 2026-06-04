import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

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

    const titlePrompt = "Generate a very short chat title (3-6 words max) for a conversation. Return ONLY the title text, nothing else. No quotes, no punctuation at end."

    // === PROVIDER 1: z-ai-web-dev-sdk ===
    let title = ""
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "system", content: titlePrompt },
          { role: "user", content: userContent },
        ],
        stream: false,
      })

      title = completion?.choices?.[0]?.message?.content?.trim() || ""
      if (title) {
        const cleanTitle = title.replace(/^["']|["']$/g, '').replace(/\.$/, '')
        return NextResponse.json({ title: cleanTitle.slice(0, 80) })
      }
    } catch (zaiErr: any) {
      console.error("[Wisely] Title gen z-ai error:", zaiErr?.message)
    }

    // === PROVIDER 2: Google Gemini ===
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: userContent }] }],
          systemInstruction: titlePrompt,
        })
        title = result.response.text().trim()
        if (title) {
          const cleanTitle = title.replace(/^["']|["']$/g, '').replace(/\.$/, '')
          return NextResponse.json({ title: cleanTitle.slice(0, 80) })
        }
      } catch (geminiErr: any) {
        console.error("[Wisely] Title gen Gemini error:", geminiErr?.message)
      }
    }

    // === PROVIDER 3: OpenRouter ===
    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (openRouterKey && !title) {
      try {
        const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemma-4-26b-a4b-it:free",
            messages: [
              { role: "system", content: titlePrompt },
              { role: "user", content: userContent },
            ],
            max_tokens: 30,
          }),
        })
        if (orResponse.ok) {
          const data = await orResponse.json()
          title = data?.choices?.[0]?.message?.content?.trim() || ""
          if (title) {
            const cleanTitle = title.replace(/^["']|["']$/g, '').replace(/\.$/, '')
            return NextResponse.json({ title: cleanTitle.slice(0, 80) })
          }
        }
      } catch (orErr: any) {
        console.error("[Wisely] Title gen OpenRouter error:", orErr?.message)
      }
    }

    // Fallback: use the message itself as title
    return NextResponse.json({ title: message.slice(0, 50) })
  } catch {
    return NextResponse.json({ title: 'New Chat' })
  }
}
