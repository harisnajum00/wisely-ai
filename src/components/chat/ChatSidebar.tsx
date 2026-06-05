'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Settings, FileText, PanelLeftClose, PanelLeft, Sparkles, LogIn, Sun, Moon, AlertTriangle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { useIsMobile } from '@/hooks/use-mobile'
import { format } from 'date-fns'

interface ChatSidebarProps {
  onNewChat: () => void
  onToggle: () => void
  isOpen: boolean
}

export default function ChatSidebar({ onNewChat, onToggle, isOpen }: ChatSidebarProps) {
  const { chats, currentChatId, setCurrentChatId, deleteChat, user, setCurrentView, setAuthMode, isAuthenticated, setSidebarOpen, isDarkMode, setIsDarkMode } = useAppStore()
  const isMobile = useIsMobile()

  // Secret admin access: triple-click on logo
  const [logoClicks, setLogoClicks] = useState(0)
  const handleLogoClick = () => {
    const newCount = logoClicks + 1
    setLogoClicks(newCount)
    if (newCount >= 3) {
      setLogoClicks(0)
      if (isMobile) setSidebarOpen(false)
      window.location.href = '/admin'
    }
    setTimeout(() => setLogoClicks(0), 800)
  }

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteTitle, setDeleteTitle] = useState('')

  const isGuest = user?.id === 'guest'

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const getChatDateGroup = (date: Date) => {
    const chatDate = new Date(date)
    if (chatDate.toDateString() === today.toDateString()) return 'Today'
    if (chatDate.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return format(chatDate, 'MMM d')
  }

  const groupedChats = chats.reduce<Record<string, typeof chats>>((acc, chat) => {
    const group = getChatDateGroup(chat.updatedAt)
    if (!acc[group]) acc[group] = []
    acc[group].push(chat)
    return acc
  }, {})

  const groupOrder = ['Today', 'Yesterday']

  const handleThemeToggle = () => {
    const newDark = !isDarkMode
    setIsDarkMode(newDark)
    const html = document.documentElement
    if (newDark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, chatId: string, chatTitle: string) => {
    e.stopPropagation()
    setDeleteTarget(chatId)
    setDeleteTitle(chatTitle)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteChat(deleteTarget)
      setDeleteTarget(null)
      setDeleteTitle('')
    }
  }

  const cancelDelete = () => {
    setDeleteTarget(null)
    setDeleteTitle('')
  }

  // On mobile, the sidebar is rendered as a fixed overlay by the parent
  // On desktop, it's inline in the flex container
  const sidebarWidth = isMobile ? '85vw' : 280
  const maxSidebarWidth = isMobile ? 320 : 280

  const renderChatItem = (chat: { id: string; title: string }) => (
    <div
      key={chat.id}
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
        currentChatId === chat.id
          ? 'bg-[var(--active-chat-bg)] border border-[var(--active-chat-border)] text-foreground'
          : 'hover:bg-[var(--hover-bg)] text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)]'
      }`}
      onClick={() => {
        setCurrentChatId(chat.id)
        if (isMobile) setSidebarOpen(false)
      }}
    >
      <span className="truncate text-sm flex-1">{chat.title}</span>
      {/* Delete button - always visible on mobile, hover-visible on desktop */}
      <button
        onClick={(e) => handleDeleteClick(e, chat.id, chat.title)}
        className={`p-1.5 rounded-lg hover:bg-red-500/20 active:bg-red-500/20 hover:text-red-400 active:text-red-400 text-muted-foreground/40 transition-all shrink-0 ${
          currentChatId === chat.id
            ? 'opacity-70 hover:opacity-100 active:opacity-100'
            : isMobile
              ? 'opacity-70 hover:opacity-100 active:opacity-100'
              : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Delete chat"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )

  return (
    <>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: sidebarWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="h-full flex flex-col glass border-r border-[var(--divider-color)] overflow-hidden shrink-0"
            style={{ minWidth: 0, maxWidth: maxSidebarWidth }}
          >
            {/* Header */}
            <div className="p-3 sm:p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 cursor-pointer select-none" onClick={handleLogoClick} title="Wisely">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 flex items-center justify-center">
                  <Sparkles className="size-3.5 sm:size-4 text-white" />
                </div>
                <span className="font-semibold text-foreground text-base sm:text-lg">Wisely</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="text-[var(--icon-muted)] hover:text-[var(--icon-muted-hover)] hover:bg-[var(--btn-ghost-hover-bg)] h-8 w-8"
              >
                <PanelLeftClose className="size-4" />
              </Button>
            </div>

            {/* New Chat Button */}
            <div className="px-3 mb-2 shrink-0">
              <Button
                onClick={onNewChat}
                className="w-full h-9 sm:h-10 btn-primary rounded-xl text-white font-medium text-sm border-0 justify-start gap-2"
              >
                <Plus className="size-4" />
                New Chat
              </Button>
            </div>

            {/* Chat List - Scrollable area */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2"
              style={{ scrollbarGutter: 'stable', WebkitOverflowScrolling: 'touch' }}
            >
              {chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/30">
                  <Sparkles className="size-8 mb-2" />
                  <p className="text-xs">No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {groupOrder.map((group) => {
                    const groupChats = groupedChats[group]
                    if (!groupChats) return null

                    return (
                      <div key={group} className="mb-3">
                        <p className="text-[11px] font-medium text-muted-foreground/40 uppercase tracking-wider px-2 mb-1">
                          {group}
                        </p>
                        {groupChats.map((chat) => renderChatItem(chat))}
                      </div>
                    )
                  })}
                  {Object.entries(groupedChats)
                    .filter(([group]) => !groupOrder.includes(group))
                    .sort(([a], [b]) => {
                      return b.localeCompare(a)
                    })
                    .map(([group, groupChats]) => (
                      <div key={group} className="mb-3">
                        <p className="text-[11px] font-medium text-muted-foreground/40 uppercase tracking-wider px-2 mb-1">
                          {group}
                        </p>
                        {groupChats.map((chat) => renderChatItem(chat))}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Bottom Section */}
            <div className="shrink-0 mt-auto">
              <Separator className="bg-[var(--divider-color)]" />
              <div className="p-2 sm:p-3 space-y-0.5 sm:space-y-1">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)] hover:bg-[var(--hover-bg)] active:bg-[var(--hover-bg)] transition-all text-sm"
                >
                  <FileText className="size-4" />
                  Files
                </button>
                <button
                  onClick={() => setCurrentView('settings')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)] hover:bg-[var(--hover-bg)] active:bg-[var(--hover-bg)] transition-all text-sm"
                >
                  <Settings className="size-4" />
                  Settings
                </button>
                <button
                  onClick={handleThemeToggle}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)] hover:bg-[var(--hover-bg)] active:bg-[var(--hover-bg)] transition-all text-sm"
                >
                  {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                {/* Hidden admin button — only visible on long press / hover */}
                <button
                  onClick={() => { if (isMobile) setSidebarOpen(false); window.location.href = '/admin' }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)] hover:bg-[var(--hover-bg)] active:bg-[var(--hover-bg)] transition-all text-sm opacity-30 hover:opacity-100"
                >
                  <Shield className="size-4" />
                  Admin
                </button>
              </div>
              <Separator className="bg-[var(--divider-color)]" />

              {/* Guest sign-up prompt */}
              {isGuest && (
                <div className="p-2 sm:p-3">
                  <div className="glass rounded-xl p-2.5 sm:p-3 text-center">
                    <p className="text-[10px] sm:text-xs text-muted-foreground/50 mb-1.5 sm:mb-2">Create an account to save your chats</p>
                    <Button
                      onClick={() => {
                        setCurrentView('auth')
                        setAuthMode('signup')
                      }}
                      className="w-full h-8 btn-primary rounded-lg text-white text-xs border-0 gap-1.5"
                    >
                      <LogIn className="size-3" />
                      Sign Up Free
                    </Button>
                  </div>
                </div>
              )}

              {/* User profile */}
              <div className="p-2 sm:p-3">
                <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-xl hover:bg-[var(--hover-bg)] transition-all">
                  <Avatar className="size-7 sm:size-8 border border-[var(--divider-color)]">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-400 text-white text-[10px] sm:text-xs font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-foreground/80 truncate">{user?.name || 'User'}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground/50 truncate">{user?.email || 'Guest mode'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Toggle button when sidebar is closed — desktop only */}
      {!isOpen && !isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-2 left-2 sm:top-3 sm:left-3 z-20 flex items-center gap-1.5 sm:gap-2"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-[var(--icon-muted)] hover:text-[var(--icon-muted-hover)] hover:bg-[var(--btn-ghost-hover-bg)] h-9 w-9"
          >
            <PanelLeft className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleThemeToggle}
            className="text-[var(--icon-muted)] hover:text-[var(--icon-muted-hover)] hover:bg-[var(--btn-ghost-hover-bg)] h-9 w-9 hidden sm:flex"
          >
            {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && cancelDelete()}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="size-4 text-red-500" />
              </div>
              Delete Chat
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete <span className="font-medium text-foreground">&quot;{deleteTitle}&quot;</span>? This action cannot be undone and all messages in this chat will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={cancelDelete}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="rounded-xl gap-1.5"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
