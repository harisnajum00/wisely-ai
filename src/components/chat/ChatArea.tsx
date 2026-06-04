'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
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
    customInstructions,
  } = useAppStore()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Throttle streaming updates — batch tokens and flush every 60ms for smoother UI
  const streamBufferRef = useRef<{ chatId: string; msgId: string; content: string } | null>(null)
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null)

  const currentChat = getCurrentChat()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [currentChat?.messages?.length, scrollToBottom])

  // Flush the streaming buffer to the store (throttled)
  const flushStreamBuffer = useCallback(() => {
    if (streamBufferRef.current) {
      const { chatId, msgId, content } = streamBufferRef.current
      updateMessage(chatId, msgId, { content, isLoading: false })
      streamBufferRef.current = null
    }
    streamTimerRef.current = null
  }, [updateMessage])

  // Buffered update — accumulates tokens and flushes every 60ms
  const bufferedUpdate = useCallback(
    (chatId: string, msgId: string, content: string) => {
      streamBufferRef.current = { chatId, msgId, content }
      if (!streamTimerRef.current) {
        streamTimerRef.current = setTimeout(flushStreamBuffer, 60)
      }
    },
    [flushStreamBuffer]
  )

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current)
        // Flush any remaining content
        flushStreamBuffer()
      }
    }
  }, [flushStreamBuffer])

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
            customInstructions,
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

        // All responses now stream (text + vision)
        if (contentType.includes('text/event-stream') && res.body) {
          let fullContent = ''

          // Mark as no longer loading so the typing animation starts showing content
          updateMessage(chatId, assistantMessageId, {
            content: '',
            isLoading: false,
          })

          for await (const chunk of parseSSE(res.body)) {
            fullContent += chunk
            // Use buffered updates for smoother streaming (batches tokens, flushes every 60ms)
            bufferedUpdate(chatId, assistantMessageId, fullContent)
          }

          // Flush any remaining buffered content immediately
          if (streamTimerRef.current) {
            clearTimeout(streamTimerRef.current)
            streamTimerRef.current = null
          }
          updateMessage(chatId, assistantMessageId, {
            content: fullContent,
            isLoading: false,
          })

          // Generate smart title after first exchange
          const chat = useAppStore.getState().chats.find((c) => c.id === chatId)
          if (chat?.title === 'New Chat' && message.trim()) {
            // Immediately set a temporary title
            updateChat(chatId, { title: message.trim().slice(0, 50) })

            // Then generate a smart title in the background (with AI response for better context)
            fetch('/api/chat/title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: message.trim(), response: fullContent.slice(0, 300) }),
            })
              .then(res => res.json())
              .then(data => {
                if (data.title) {
                  // Only update if the chat still exists and still has the temp title
                  const currentChat = useAppStore.getState().chats.find((c) => c.id === chatId)
                  if (currentChat) {
                    updateChat(chatId, { title: data.title })
                  }
                }
              })
              .catch(() => { /* Silently fail, temp title is fine */ })
          }
        } else {
          // Fallback for non-streaming error responses
          const data = await res.json().catch(() => ({}))
          updateMessage(chatId, assistantMessageId, {
            content: data?.error || data?.message || 'I apologize, but I could not generate a response.',
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
    [currentChatId, createNewChat, addMessage, updateMessage, updateChat, scrollToBottom, bufferedUpdate, customInstructions]
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
            // Use buffered updates for smoother streaming
            bufferedUpdate(currentChatId, messageId, fullContent)
          }

          // Flush any remaining buffered content immediately
          if (streamTimerRef.current) {
            clearTimeout(streamTimerRef.current)
            streamTimerRef.current = null
          }
          updateMessage(currentChatId, messageId, {
            content: fullContent,
            isLoading: false,
          })
        } else {
          // Fallback for non-streaming error responses
          const data = await res.json().catch(() => ({}))
          updateMessage(currentChatId, messageId, {
            content: data?.error || data?.message || 'I apologize, but I could not generate a response.',
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
    [currentChatId, updateMessage, bufferedUpdate]
  )

  return (
    <div className="flex-1 flex flex-col h-full relative bg-chat-bg">
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
