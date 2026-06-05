'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Paperclip, ImageIcon, Mic, Send, X, ClipboardPaste, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'

interface ChatInputProps {
  onSend: (message: string, files?: File[], imageBase64?: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<{ name: string; base64: string }[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const [pasteFlash, setPasteFlash] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const autoResize = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const maxHeight = isMobile ? 4 * 20 : 6 * 24 // fewer lines on mobile
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px'
    }
  }, [isMobile])

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
    // On mobile, don't prevent default Enter (allow newline)
    // On desktop, Enter sends, Shift+Enter = newline
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
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

  const addImageFromBlob = useCallback((blob: Blob, name?: string) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setImagePreviews((prev) => {
        return [{ name: name || 'pasted-image.png', base64 }]
      })
    }
    reader.readAsDataURL(blob)
  }, [])

  // Handle paste events for clipboard images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      if (item.type.startsWith('image/')) {
        e.preventDefault()

        const blob = item.getAsFile()
        if (!blob) continue

        const mimeToExt: Record<string, string> = {
          'image/png': 'png',
          'image/jpeg': 'jpg',
          'image/gif': 'gif',
          'image/webp': 'webp',
          'image/svg+xml': 'svg',
          'image/bmp': 'bmp',
        }
        const ext = mimeToExt[item.type] || 'png'
        const fileName = `pasted-image.${ext}`

        addImageFromBlob(blob, fileName)

        setPasteFlash(true)
        setTimeout(() => setPasteFlash(false), 600)

        break
      }
    }
  }, [addImageFromBlob])

  // Global paste listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          e.preventDefault()

          const blob = item.getAsFile()
          if (!blob) continue

          const mimeToExt: Record<string, string> = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/svg+xml': 'svg',
            'image/bmp': 'bmp',
          }
          const ext = mimeToExt[item.type] || 'png'
          const fileName = `pasted-image.${ext}`

          addImageFromBlob(blob, fileName)

          setPasteFlash(true)
          setTimeout(() => setPasteFlash(false), 600)

          textareaRef.current?.focus()
          break
        }
      }
    }

    window.addEventListener('paste', handleGlobalPaste)
    return () => window.removeEventListener('paste', handleGlobalPaste)
  }, [addImageFromBlob])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) return

    const imageFiles = droppedFiles.filter(f => f.type.startsWith('image/'))
    const otherFiles = droppedFiles.filter(f => !f.type.startsWith('image/'))

    if (otherFiles.length > 0) {
      setFiles((prev) => [...prev, ...otherFiles])
    }

    imageFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setImagePreviews((prev) => {
          return [{ name: file.name, base64 }]
        })
      }
      reader.readAsDataURL(file)
    })

    setPasteFlash(true)
    setTimeout(() => setPasteFlash(false), 600)

    textareaRef.current?.focus()
  }, [])

  const canSend = message.trim() || files.length > 0 || imagePreviews.length > 0

  return (
    <div
      ref={containerRef}
      className="w-full max-w-4xl mx-auto px-2 pb-2 pt-1 sm:px-4 sm:pb-4 sm:pt-2 relative shrink-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-violet-500/50 animate-scale-in">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 flex items-center justify-center animate-float">
              <Upload className="size-8 text-white" />
            </div>
            <div>
              <p className="text-foreground font-medium text-base">Drop your image here</p>
              <p className="text-muted-foreground text-sm mt-1">Images will be analyzed by Wisely</p>
            </div>
          </div>
        </div>
      )}

      {/* File & Image previews */}
      {(files.length > 0 || imagePreviews.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-2 animate-scale-in">
          {files.map((file, index) => (
            <div
              key={`file-${index}`}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 glass rounded-lg text-xs sm:text-sm text-muted-foreground group"
            >
              <Paperclip className="size-3 sm:size-3.5 text-muted-foreground/50" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="text-muted-foreground/40 hover:text-foreground active:text-foreground transition-colors"
              >
                <X className="size-3 sm:size-3.5" />
              </button>
            </div>
          ))}
          {imagePreviews.map((img, index) => (
            <div
              key={`img-${index}`}
              className="relative group glass rounded-xl overflow-hidden"
            >
              <img
                src={img.base64}
                alt={img.name}
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 active:bg-black/40 transition-all duration-200 rounded-xl flex items-center justify-center">
                <button
                  onClick={() => removeImage(index)}
                  className="p-1 sm:p-1.5 bg-black/60 rounded-full text-white/80 hover:text-white active:text-white transition-colors opacity-70 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <X className="size-3 sm:size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paste flash indicator */}
      {pasteFlash && (
        <div className="mb-1.5 flex items-center gap-2 text-primary text-xs animate-message-in">
          <ClipboardPaste className="size-3.5" />
          <span>Image added from clipboard</span>
        </div>
      )}

      {/* Input area */}
      <div
        className={`relative flex items-end gap-1 sm:gap-2 glass rounded-2xl p-1.5 sm:p-2 transition-all duration-300 ${
          isFocused ? 'glow-border input-glow' : ''
        } ${pasteFlash ? 'ring-1 ring-primary/40' : ''} ${
          isDragOver ? 'ring-2 ring-primary/50 border-primary/30' : ''
        }`}
      >
        {/* Attachment buttons - compact on mobile */}
        <div className="flex items-center gap-0.5 sm:gap-1 pb-0.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv,.json,.md,.py,.js,.ts,.tsx,.jsx,.html,.css"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[var(--icon-muted)] hover:text-[var(--icon-muted-hover)] hover:bg-[var(--btn-ghost-hover-bg)] rounded-lg sm:rounded-xl shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                <Paperclip className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Attach file
            </TooltipContent>
          </Tooltip>

          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageChange}
            className="hidden"
            accept="image/*"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[var(--icon-muted)] hover:text-[var(--icon-muted-hover)] hover:bg-[var(--btn-ghost-hover-bg)] rounded-lg sm:rounded-xl shrink-0"
                onClick={() => imageInputRef.current?.click()}
                disabled={disabled}
              >
                <ImageIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Upload image
            </TooltipContent>
          </Tooltip>

          {/* Hide mic on mobile to save space */}
          {!isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[var(--icon-muted)] hover:text-[var(--icon-muted-hover)] hover:bg-[var(--btn-ghost-hover-bg)] rounded-xl shrink-0"
                  disabled
                >
                  <Mic className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Voice input (coming soon)
              </TooltipContent>
            </Tooltip>
          )}
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
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Ask Wisely anything..."
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-foreground text-sm placeholder:text-[var(--input-placeholder)] resize-none outline-none py-2 px-1 max-h-[120px] sm:max-h-[144px] min-h-[32px] sm:min-h-[36px] leading-relaxed"
        />

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!canSend || disabled}
          className={`h-8 w-8 p-0 rounded-lg sm:rounded-xl shrink-0 transition-all duration-200 ${
            canSend
              ? 'bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 text-white hover:shadow-lg hover:shadow-violet-500/20 active:scale-95'
              : 'bg-[var(--btn-ghost-bg)] text-muted-foreground/30'
          }`}
        >
          <Send className="size-3.5 sm:size-4" />
        </Button>
      </div>

      <p className="text-center text-[10px] sm:text-[11px] text-muted-foreground/40 mt-1.5">
        Wisely can make mistakes. Consider checking important information.
      </p>
    </div>
  )
}
