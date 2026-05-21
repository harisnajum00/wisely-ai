'use client'

import { useState, useRef, useCallback } from 'react'
import { Paperclip, ImageIcon, Mic, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface ChatInputProps {
  onSend: (message: string, files?: File[], imageBase64?: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<{ name: string; base64: string }[]>([])
  const [isFocused, setIsFocused] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const maxHeight = 6 * 24 // 6 lines ~ 144px
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px'
    }
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = message.trim()
    if (!trimmed && files.length === 0 && imagePreviews.length === 0) return

    const imageBase64 = imagePreviews.length > 0 ? imagePreviews[0].base64 : undefined
    onSend(trimmed, files.length > 0 ? files : undefined, imageBase64)

    setMessage('')
    setFiles([])
    setImagePreviews([])

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [message, files, imagePreviews, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...selected])
    e.target.value = ''
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])

    selected.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setImagePreviews((prev) => [...prev, { name: file.name, base64 }])
      }
      reader.readAsDataURL(file)
    })

    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const canSend = message.trim() || files.length > 0 || imagePreviews.length > 0

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 pt-2">
      {/* File previews */}
      {(files.length > 0 || imagePreviews.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {files.map((file, index) => (
            <div
              key={`file-${index}`}
              className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg text-sm text-white/70 group"
            >
              <Paperclip className="size-3.5 text-white/40" />
              <span className="max-w-[120px] truncate">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {imagePreviews.map((img, index) => (
            <div
              key={`img-${index}`}
              className="relative group glass rounded-lg overflow-hidden"
            >
              <img
                src={img.base64}
                alt={img.name}
                className="w-16 h-16 object-cover"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white/60 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        className={`relative flex items-end gap-2 glass rounded-2xl p-2 transition-all duration-300 ${
          isFocused ? 'glow-border input-glow' : ''
        }`}
      >
        {/* Attachment buttons */}
        <div className="flex items-center gap-1 pb-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv,.json,.md,.py,.js,.ts,.tsx,.jsx,.html,.css"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/30 hover:text-white/60 hover:bg-white/5 rounded-xl shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Attach file"
          >
            <Paperclip className="size-4.5" />
          </Button>

          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageChange}
            className="hidden"
            accept="image/*"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/30 hover:text-white/60 hover:bg-white/5 rounded-xl shrink-0"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled}
            title="Upload image"
          >
            <ImageIcon className="size-4.5" />
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white/30 hover:text-white/60 hover:bg-white/5 rounded-xl shrink-0"
                disabled
              >
                <Mic className="size-4.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-[#16162a] text-white/70 border-white/10">
              Coming soon
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            autoResize()
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Ask Wisely anything..."
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 resize-none outline-none py-2.5 px-1 max-h-[144px] min-h-[36px] leading-relaxed"
        />

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!canSend || disabled}
          className={`h-9 w-9 p-0 rounded-xl shrink-0 transition-all duration-200 ${
            canSend
              ? 'bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 text-white hover:shadow-lg hover:shadow-violet-500/20'
              : 'bg-white/5 text-white/20'
          }`}
        >
          <Send className="size-4" />
        </Button>
      </div>

      <p className="text-center text-[11px] text-white/15 mt-2">
        Wisely can make mistakes. Consider checking important information.
      </p>
    </div>
  )
}
