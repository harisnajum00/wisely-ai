import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message, response } = await request.json()
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      return NextResponse.json({ title: message.slice(0, 50) })
    }

    // Build a context string for better title generation
    let userContent = message
    if (response && typeof response === 'string' && response.trim()) {
      // Include a summary of the AI response for context (truncated to avoid large payloads)
      const responseSummary = response.slice(0, 200)
      userContent = `User asked: "${message.trim()}"\nAI responded: "${responseSummary}..."`
    }

    const response_req = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
          { role: "system", content: "Generate a very short chat title (3-6 words max) for a conversation. Return ONLY the title text, nothing else. No quotes, no punctuation at end." },
          { role: "user", content: userContent },
        ],
        max_tokens: 20,
        stream: false,
      }),
    })

    if (!response_req.ok) {
      return NextResponse.json({ title: message.slice(0, 50) })
    }

    const data = await response_req.json()
    const title = data.choices?.[0]?.message?.content?.trim() || message.slice(0, 50)
    
    // Clean up any quotes the model might add
    const cleanTitle = title.replace(/^["']|["']$/g, '').replace(/\.$/, '')
    
    return NextResponse.json({ title: cleanTitle.slice(0, 80) })
  } catch {
    return NextResponse.json({ title: 'New Chat' })
  }
}
