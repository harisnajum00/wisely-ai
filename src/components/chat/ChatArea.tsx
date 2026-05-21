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

  const handleSend = useCallback(
    async (message: string, files?: File[], imageBase64?: string) => {
      let chatId = currentChatId

      // Create a new chat if there's no current one
      if (!chatId) {
        chatId = createNewChat()
      }

      // Add user message
      const userMessageId = crypto.randomUUID()
      const userMessage = {
        id: userMessageId,
        role: 'user' as const,
        content: message,
        files: files?.map((f) => ({
          id: crypto.randomUUID(),
          name: f.name,
          type: f.type,
          url: URL.createObjectURL(f),
          size: f.size,
        })),
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
        files: imageBase64
          ? [
              {
                id: crypto.randomUUID(),
                name: 'image',
                type: 'image/png',
                url: imageBase64,
                size: 0,
              },
            ]
          : undefined,
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
          throw new Error('Failed to get response')
        }

        const data = await res.json()

        updateMessage(chatId, assistantMessageId, {
          content: data.message || data.error || 'I apologize, but I could not generate a response.',
          isLoading: false,
        })
      } catch (error) {
        updateMessage(chatId, assistantMessageId, {
          content: 'Something went wrong. Please try again.',
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

      // Find the last user message before this assistant message
      let userMessageContent = ''
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (chat.messages[i].role === 'user') {
          userMessageContent = chat.messages[i].content
          break
        }
      }

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
          throw new Error('Failed to get response')
        }

        const data = await res.json()

        updateMessage(currentChatId, messageId, {
          content: data.message || 'I apologize, but I could not generate a response.',
          isLoading: false,
        })
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
