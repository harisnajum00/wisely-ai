'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Sparkles, Copy, Check, RefreshCw, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatMessage } from '@/lib/store'

interface MessageBubbleProps {
  message: ChatMessage
  onRegenerate?: () => void
}

export default function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null)

  const isUser = message.role === 'user'
  const isLoading = message.isLoading

  const copyToClipboard = async (text: string, blockId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedBlock(blockId)
      setTimeout(() => setCopiedBlock(null), 2000)
    } catch {
      // Fallback - silently fail
    }
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex gap-3 px-4 py-3 max-w-4xl mx-auto"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 flex items-center justify-center shrink-0 mt-1">
          <Sparkles className="size-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 inline-block">
            {message.files?.some(f => f.type.startsWith('image/')) ? (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Sparkles className="size-4 text-violet-400" />
                <span>Analyzing image...</span>
              </div>
            ) : message.files?.length ? (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Sparkles className="size-4 text-violet-400" />
                <span>Reading your file...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-white/60 text-sm">Wisely is thinking</span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 typing-dot-1" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 typing-dot-2" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 typing-dot-3" />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 px-4 py-3 max-w-4xl mx-auto ${
        isUser ? 'flex-row-reverse' : ''
      }`}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-1">
          <User className="size-4 text-white/60" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 flex items-center justify-center shrink-0 mt-1">
          <Sparkles className="size-4 text-white" />
        </div>
      )}

      {/* Message content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white rounded-tr-sm'
              : 'glass text-white/90 rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="markdown-content text-sm">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const codeString = String(children).replace(/\n$/, '')
                    const blockId = `code-${Math.random().toString(36).slice(2)}`

                    if (match) {
                      return (
                        <div className="relative group my-3">
                          <div className="flex items-center justify-between px-4 py-2 bg-black/40 rounded-t-xl border-b border-white/5">
                            <span className="text-xs text-white/40 font-mono">{match[1]}</span>
                            <button
                              onClick={() => copyToClipboard(codeString, blockId)}
                              className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
                            >
                              {copiedBlock === blockId ? (
                                <>
                                  <Check className="size-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="size-3" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderRadius: '0 0 0.75rem 0.75rem',
                              padding: '1rem',
                              background: 'rgba(0, 0, 0, 0.4)',
                              fontSize: '0.8125rem',
                            }}
                            {...props}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
                      )
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Action buttons for AI messages */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-1.5 ml-1">
            {onRegenerate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRegenerate}
                className="h-7 w-7 text-white/20 hover:text-white/60 hover:bg-white/5 rounded-lg"
                title="Regenerate response"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(message.content, 'full-msg')}
              className="h-7 w-7 text-white/20 hover:text-white/60 hover:bg-white/5 rounded-lg"
              title="Copy message"
            >
              {copiedBlock === 'full-msg' ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
