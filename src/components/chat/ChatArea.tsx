'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { Square } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)

  // Streaming state — accumulate content in a ref for zero-lag updates
  const streamingContentRef = useRef('')
  const streamingChatIdRef = useRef('')
  const streamingMsgIdRef = useRef('')
  const rafIdRef = useRef<number>(0)
  const lastFlushRef = useRef<string>('')

  const currentChat = getCurrentChat()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [currentChat?.messages?.length, scrollToBottom])

  // Flush streaming content to Zustand store using requestAnimationFrame
  // This ensures updates happen at screen refresh rate (~16ms) for butter-smooth streaming
  const scheduleFlush = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = requestAnimationFrame(() => {
      const content = streamingContentRef.current
      if (content !== lastFlushRef.current) {
        lastFlushRef.current = content
        updateMessage(streamingChatIdRef.current, streamingMsgIdRef.current, {
          content,
          isLoading: false,
        })
      }
    })
  }, [updateMessage])

  // Stop generating — aborts the fetch and finalizes the message
  const handleStopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Finalize whatever content we have so far
    cancelAnimationFrame(rafIdRef.current)
    const content = streamingContentRef.current
    if (streamingChatIdRef.current && streamingMsgIdRef.current) {
      updateMessage(streamingChatIdRef.current, streamingMsgIdRef.current, {
        content: content || 'Response stopped.',
        isLoading: false,
      })
    }

    setIsStreaming(false)
    streamingContentRef.current = ''
    lastFlushRef.current = ''
  }, [updateMessage])

  /**
   * Parse Server-Sent Events from a streaming response
   */
  async function* parseSSE(stream: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<string> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        if (signal?.aborted) return
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (signal?.aborted) return
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              yield parsed.content
            } else if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) {
              throw e
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // Make error messages user-friendly
  const friendlyError = useCallback((error: string): string => {
    const lower = error.toLowerCase()

    if (lower.includes('rate limit') || lower.includes('free-models-per-day') || lower.includes('429')) {
      return 'Daily free model limit reached. This resets every 24 hours — try again later. You can also add credits on OpenRouter for unlimited access.'
    }
    if (lower.includes('no endpoints') || lower.includes('no available')) {
      return 'This feature is temporarily unavailable. Please try again in a few minutes.'
    }
    if (lower.includes('timeout') || lower.includes('timed out')) {
      return 'The request took too long. Please try again.'
    }
    if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to connect')) {
      return 'Connection error. Please check your internet and try again.'
    }

    // If it's already a friendly message, return as-is
    if (error.length < 200) return error
    return 'Something went wrong. Please try again.'
  }, [])

  const handleSend = useCallback(
    async (message: string, files?: File[], imageBase64?: string) => {
      let chatId = currentChatId

      if (!chatId) {
        chatId = createNewChat()
      }

      const allFiles = [
        ...(files?.map((f) => ({
          id: crypto.randomUUID(),
          name: f.name,
          type: f.type,
          url: URL.createObjectURL(f),
          size: f.size,
        })) || []),
      ]

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
      addMessage(chatId, {
        id: userMessageId,
        role: 'user' as const,
        content: message,
        files: allFiles.length > 0 ? allFiles : undefined,
        isLoading: false,
        createdAt: new Date(),
      })

      // Add assistant placeholder
      const assistantMessageId = crypto.randomUUID()
      addMessage(chatId, {
        id: assistantMessageId,
        role: 'assistant' as const,
        content: '',
        isLoading: true,
        createdAt: new Date(),
      })

      scrollToBottom()

      // Set up streaming state
      streamingContentRef.current = ''
      lastFlushRef.current = ''
      streamingChatIdRef.current = chatId
      streamingMsgIdRef.current = assistantMessageId

      // Create abort controller for this request
      const controller = new AbortController()
      abortControllerRef.current = controller
      setIsStreaming(true)

      try {
        const currentMessages = useAppStore
          .getState()
          .chats.find((c) => c.id === chatId)
          ?.messages.filter((m) => !m.isLoading && m.id !== assistantMessageId) || []

        const apiMessages = currentMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content }))

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            files: files?.map((f) => f.name),
            imageBase64,
            customInstructions,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          updateMessage(chatId, assistantMessageId, {
            content: friendlyError(data?.error || 'Failed to get response from Wisely.'),
            isLoading: false,
          })
          setIsStreaming(false)
          return
        }

        const contentType = res.headers.get('Content-Type') || ''

        if (contentType.includes('text/event-stream') && res.body) {
          // Mark as streaming (not loading spinner anymore)
          updateMessage(chatId, assistantMessageId, {
            content: '',
            isLoading: false,
          })

          for await (const chunk of parseSSE(res.body, controller.signal)) {
            streamingContentRef.current += chunk
            scheduleFlush()
          }

          // Final flush — ensure all content is in the store
          cancelAnimationFrame(rafIdRef.current)
          const fullContent = streamingContentRef.current
          updateMessage(chatId, assistantMessageId, {
            content: fullContent,
            isLoading: false,
          })

          // Generate smart title after first exchange
          const chat = useAppStore.getState().chats.find((c) => c.id === chatId)
          if (chat?.title === 'New Chat' && message.trim()) {
            updateChat(chatId, { title: message.trim().slice(0, 50) })

            fetch('/api/chat/title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: message.trim(), response: fullContent.slice(0, 300) }),
            })
              .then(res => res.json())
              .then(data => {
                if (data.title) {
                  const currentChat = useAppStore.getState().chats.find((c) => c.id === chatId)
                  if (currentChat) {
                    updateChat(chatId, { title: data.title })
                  }
                }
              })
              .catch(() => {})
          }
        } else {
          const data = await res.json().catch(() => ({}))
          updateMessage(chatId, assistantMessageId, {
            content: friendlyError(data?.error || data?.message || 'I could not generate a response.'),
            isLoading: false,
          })
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          // User stopped generation — content already finalized in handleStopGenerating
        } else {
          console.error('Chat error:', error)
          updateMessage(chatId, assistantMessageId, {
            content: friendlyError(error?.message || 'Something went wrong. Please try again.'),
            isLoading: false,
          })
        }
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
        streamingContentRef.current = ''
        lastFlushRef.current = ''
        scrollToBottom()
      }
    },
    [currentChatId, createNewChat, addMessage, updateMessage, updateChat, scrollToBottom, scheduleFlush, customInstructions, friendlyError]
  )

  const handleRegenerate = useCallback(
    async (messageId: string) => {
      if (!currentChatId) return
      const chat = useAppStore.getState().chats.find((c) => c.id === currentChatId)
      if (!chat) return

      const messageIndex = chat.messages.findIndex((m) => m.id === messageId)
      if (messageIndex === -1) return

      updateMessage(currentChatId, messageId, { content: '', isLoading: true })

      // Set up streaming state
      streamingContentRef.current = ''
      lastFlushRef.current = ''
      streamingChatIdRef.current = currentChatId
      streamingMsgIdRef.current = messageId

      const controller = new AbortController()
      abortControllerRef.current = controller
      setIsStreaming(true)

      try {
        const apiMessages = chat.messages
          .filter((m) => m.role === 'user' || (m.role === 'assistant' && !m.isLoading && m.id !== messageId))
          .slice(0, messageIndex)
          .map((m) => ({ role: m.role, content: m.content }))

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages, customInstructions }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          updateMessage(currentChatId, messageId, {
            content: friendlyError(data?.error || 'Failed to regenerate response.'),
            isLoading: false,
          })
          setIsStreaming(false)
          return
        }

        const contentType = res.headers.get('Content-Type') || ''

        if (contentType.includes('text/event-stream') && res.body) {
          updateMessage(currentChatId, messageId, { content: '', isLoading: false })

          for await (const chunk of parseSSE(res.body, controller.signal)) {
            streamingContentRef.current += chunk
            scheduleFlush()
          }

          cancelAnimationFrame(rafIdRef.current)
          updateMessage(currentChatId, messageId, {
            content: streamingContentRef.current,
            isLoading: false,
          })
        } else {
          const data = await res.json().catch(() => ({}))
          updateMessage(currentChatId, messageId, {
            content: friendlyError(data?.error || 'Could not regenerate response.'),
            isLoading: false,
          })
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          updateMessage(currentChatId, messageId, {
            content: friendlyError(error?.message || 'Something went wrong.'),
            isLoading: false,
          })
        }
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
        streamingContentRef.current = ''
        lastFlushRef.current = ''
      }
    },
    [currentChatId, updateMessage, scheduleFlush, customInstructions, friendlyError]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafIdRef.current)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col h-full relative bg-chat-bg">
      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
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

      {/* Stop generating button — like ChatGPT */}
      <AnimatePresence>
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="flex justify-center pb-2"
          >
            <button
              onClick={handleStopGenerating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--divider-color)] bg-[var(--btn-ghost-bg)] hover:bg-[var(--btn-ghost-hover-bg)] text-foreground/80 hover:text-foreground text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
            >
              <Square className="size-3 fill-current" />
              Stop generating
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  )
}
