'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import EmptyState from './EmptyState'

export default function ChatArea() {
  const {
    getCurrentChat,
    addMessage,
    updateMessage,
    currentChatId,
    createNewChat,
    updateChat,
  } = useAppStore()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const currentChat = getCurrentChat()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [currentChat?.messages?.length, scrollToBottom])

  /**
   * Parse Server-Sent Events from a streaming response
   */
  async function* parseSSE(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6) // Remove "data: "
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              yield parsed.content
            } else if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch (e: any) {
            // If it's our thrown error, re-throw it
            if (e.message && !e.message.includes('JSON')) {
              throw e
            }
            // Otherwise skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  const handleSend = useCallback(
    async (message: string, files?: File[], imageBase64?: string) => {
      let chatId = currentChatId

      // Create a new chat if there's no current one
      if (!chatId) {
        chatId = createNewChat()
      }

      // Build file attachments list including image if present
      const allFiles = [
        ...(files?.map((f) => ({
          id: crypto.randomUUID(),
          name: f.name,
          type: f.type,
          url: URL.createObjectURL(f),
          size: f.size,
        })) || []),
      ]

      // If there's a pasted/uploaded image, add it to the user's message attachments
      if (imageBase64) {
        allFiles.push({
          id: crypto.randomUUID(),
          name: 'pasted-image.png',
          type: 'image/png',
          url: imageBase64,
          size: 0,
        })
      }

      // Add user message
      const userMessageId = crypto.randomUUID()
      const userMessage = {
        id: userMessageId,
        role: 'user' as const,
        content: message,
        files: allFiles.length > 0 ? allFiles : undefined,
        isLoading: false,
        createdAt: new Date(),
      }
      addMessage(chatId, userMessage)

      // Auto-generate title from first message
      const chat = useAppStore.getState().chats.find((c) => c.id === chatId)
      if (chat?.title === 'New Chat' && message.trim()) {
        const title = message.trim().slice(0, 50) + (message.trim().length > 50 ? '...' : '')
        updateChat(chatId, { title })
      }

      // Add assistant placeholder
      const assistantMessageId = crypto.randomUUID()
      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: '',
        isLoading: true,
        createdAt: new Date(),
      }
      addMessage(chatId, assistantMessage)

      scrollToBottom()

      try {
        // Build messages history for API
        const currentMessages = useAppStore
          .getState()
          .chats.find((c) => c.id === chatId)
          ?.messages.filter((m) => !m.isLoading && m.id !== assistantMessageId) || []

        const apiMessages = currentMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            role: m.role,
            content: m.content,
          }))

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            files: files?.map((f) => f.name),
            imageBase64,
          }),
        })

        if (!res.ok) {
          // Non-streaming error response (e.g., vision, or API key missing)
          const data = await res.json().catch(() => ({}))
          const errorMsg = data?.error || 'Failed to get response from Wisely.'
          updateMessage(chatId, assistantMessageId, {
            content: errorMsg,
            isLoading: false,
          })
          return
        }

        const contentType = res.headers.get('Content-Type') || ''

        // Check if this is a streaming response
        if (contentType.includes('text/event-stream') && res.body) {
          // Streaming path — for text chat
          let fullContent = ''

          // Mark as no longer loading so the typing animation starts showing content
          updateMessage(chatId, assistantMessageId, {
            content: '',
            isLoading: false,
          })

          for await (const chunk of parseSSE(res.body)) {
            fullContent += chunk
            updateMessage(chatId, assistantMessageId, {
              content: fullContent,
              isLoading: false,
            })
          }
        } else {
          // Non-streaming path — for vision responses
          const data = await res.json()
          updateMessage(chatId, assistantMessageId, {
            content: data.message || data.error || 'I apologize, but I could not generate a response.',
            isLoading: false,
          })
        }
      } catch (error: any) {
        console.error('Chat error:', error)
        updateMessage(chatId, assistantMessageId, {
          content: error?.message || 'Something went wrong. Please try again.',
          isLoading: false,
        })
      }

      scrollToBottom()
    },
    [currentChatId, createNewChat, addMessage, updateMessage, updateChat, scrollToBottom]
  )

  const handleRegenerate = useCallback(
    async (messageId: string) => {
      if (!currentChatId) return

      const chat = useAppStore.getState().chats.find((c) => c.id === currentChatId)
      if (!chat) return

      const messageIndex = chat.messages.findIndex((m) => m.id === messageId)
      if (messageIndex === -1) return

      // Set the message to loading state
      updateMessage(currentChatId, messageId, {
        content: '',
        isLoading: true,
      })

      try {
        const apiMessages = chat.messages
          .filter((m) => m.role === 'user' || (m.role === 'assistant' && !m.isLoading && m.id !== messageId))
          .slice(0, messageIndex)
          .map((m) => ({
            role: m.role,
            content: m.content,
          }))

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          updateMessage(currentChatId, messageId, {
            content: data?.error || 'Failed to regenerate response.',
            isLoading: false,
          })
          return
        }

        const contentType = res.headers.get('Content-Type') || ''

        if (contentType.includes('text/event-stream') && res.body) {
          let fullContent = ''
          updateMessage(currentChatId, messageId, {
            content: '',
            isLoading: false,
          })

          for await (const chunk of parseSSE(res.body)) {
            fullContent += chunk
            updateMessage(currentChatId, messageId, {
              content: fullContent,
              isLoading: false,
            })
          }
        } else {
          const data = await res.json()
          updateMessage(currentChatId, messageId, {
            content: data.message || 'I apologize, but I could not generate a response.',
            isLoading: false,
          })
        }
      } catch {
        updateMessage(currentChatId, messageId, {
          content: 'Something went wrong. Please try again.',
          isLoading: false,
        })
      }
    },
    [currentChatId, updateMessage]
  )

  return (
    <div className="flex-1 flex flex-col h-full relative bg-[#0c0c14]">
      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {!currentChat || currentChat.messages.length === 0 ? (
          <EmptyState onSuggestionClick={(suggestion) => handleSend(suggestion)} />
        ) : (
          <div className="py-6 space-y-2">
            {currentChat.messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onRegenerate={
                  msg.role === 'assistant' && !msg.isLoading
                    ? () => handleRegenerate(msg.id)
                    : undefined
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput onSend={handleSend} />
    </div>
  )
}
