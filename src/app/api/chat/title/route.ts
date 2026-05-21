import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      return NextResponse.json({ title: message.slice(0, 50) })
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://wisely-ai.app",
        "X-Title": "Wisely AI Assistant",
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-30b-a3b:free",
        messages: [
          { role: "system", content: "Generate a very short chat title (3-6 words max) for a conversation that starts with this message. Return ONLY the title text, nothing else. No quotes, no punctuation at end." },
          { role: "user", content: message },
        ],
        max_tokens: 20,
        stream: false,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ title: message.slice(0, 50) })
    }

    const data = await response.json()
    const title = data.choices?.[0]?.message?.content?.trim() || message.slice(0, 50)
    
    // Clean up any quotes the model might add
    const cleanTitle = title.replace(/^["']|["']$/g, '').replace(/\.$/, '')
    
    return NextResponse.json({ title: cleanTitle.slice(0, 80) })
  } catch {
    return NextResponse.json({ title: (await request.json().catch(() => ({ message: '' }))).message?.slice(0, 50) || 'New Chat' })
  }
}
