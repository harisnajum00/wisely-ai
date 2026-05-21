'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Settings, FileText, PanelLeftClose, PanelLeft, Sparkles, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'
import { useIsMobile } from '@/hooks/use-mobile'
import { format } from 'date-fns'

interface ChatSidebarProps {
  onNewChat: () => void
  onToggle: () => void
  isOpen: boolean
}

export default function ChatSidebar({ onNewChat, onToggle, isOpen }: ChatSidebarProps) {
  const { chats, currentChatId, setCurrentChatId, deleteChat, user, setCurrentView, setAuthMode, isAuthenticated, setSidebarOpen } = useAppStore()
  const isMobile = useIsMobile()

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

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="h-full flex flex-col glass border-r border-white/5 overflow-hidden shrink-0"
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 flex items-center justify-center">
                <Sparkles className="size-4 text-white" />
              </div>
              <span className="font-semibold text-foreground text-lg">Wisely</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="text-white/40 hover:text-white/80 hover:bg-white/5 h-8 w-8"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="px-3 mb-2">
            <Button
              onClick={onNewChat}
              className="w-full h-10 btn-primary rounded-xl text-white font-medium text-sm border-0 justify-start gap-2"
            >
              <Plus className="size-4" />
              New Chat
            </Button>
          </div>

          {/* Chat List */}
          <ScrollArea className="flex-1 px-2">
            {chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/20">
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
                      <p className="text-[11px] font-medium text-white/25 uppercase tracking-wider px-2 mb-1">
                        {group}
                      </p>
                      {groupChats.map((chat) => (
                        <div
                          key={chat.id}
                          className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                            currentChatId === chat.id
                              ? 'bg-violet-500/15 border border-violet-500/20 text-white'
                              : 'hover:bg-white/5 text-white/60 hover:text-white/90'
                          }`}
                          onClick={() => {
                            setCurrentChatId(chat.id)
                            if (isMobile) setSidebarOpen(false)
                          }}
                        >
                          <span className="truncate text-sm flex-1">{chat.title}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteChat(chat.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 hover:text-red-400 text-white/30 transition-all"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })}
                {/* Other date groups */}
                {Object.entries(groupedChats)
                  .filter(([group]) => !groupOrder.includes(group))
                  .map(([group, groupChats]) => (
                    <div key={group} className="mb-3">
                      <p className="text-[11px] font-medium text-white/25 uppercase tracking-wider px-2 mb-1">
                        {group}
                      </p>
                      {groupChats.map((chat) => (
                        <div
                          key={chat.id}
                          className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                            currentChatId === chat.id
                              ? 'bg-violet-500/15 border border-violet-500/20 text-white'
                              : 'hover:bg-white/5 text-white/60 hover:text-white/90'
                          }`}
                          onClick={() => {
                            setCurrentChatId(chat.id)
                            if (isMobile) setSidebarOpen(false)
                          }}
                        >
                          <span className="truncate text-sm flex-1">{chat.title}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteChat(chat.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 hover:text-red-400 text-white/30 transition-all"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </ScrollArea>

          {/* Bottom Section */}
          <div className="mt-auto">
            <Separator className="bg-white/5" />
            <div className="p-3 space-y-1">
              <button
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/5 transition-all text-sm"
              >
                <FileText className="size-4" />
                Files
              </button>
              <button
                onClick={() => setCurrentView('settings')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/5 transition-all text-sm"
              >
                <Settings className="size-4" />
                Settings
              </button>
            </div>
            <Separator className="bg-white/5" />

            {/* Guest sign-up prompt */}
            {isGuest && (
              <div className="p-3">
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-xs text-white/40 mb-2">Create an account to save your chats</p>
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
            <div className="p-3">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-all">
                <Avatar className="size-8 border border-white/10">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-400 text-white text-xs font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80 truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground/50 truncate">{user?.email || 'Guest mode'}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>
      )}

      {/* Toggle button when sidebar is closed */}
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-3 left-3 z-20"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-white/40 hover:text-white/80 hover:bg-white/5 h-9 w-9"
          >
            <PanelLeft className="size-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
