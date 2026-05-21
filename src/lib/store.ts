import { create } from 'zustand'

export type AppView = 'landing' | 'auth' | 'chat' | 'settings'
export type AuthMode = 'login' | 'signup'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  files?: FileAttachment[]
  isLoading?: boolean
  createdAt: Date
}

export interface FileAttachment {
  id: string
  name: string
  type: string
  url: string
  size: number
}

export interface Chat {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  name: string
  image?: string
}

interface AppState {
  // Navigation
  currentView: AppView
  setCurrentView: (view: AppView) => void

  // Auth
  user: User | null
  setUser: (user: User | null) => void
  authMode: AuthMode
  setAuthMode: (mode: AuthMode) => void
  isAuthenticated: boolean

  // Chat
  chats: Chat[]
  currentChatId: string | null
  setCurrentChatId: (id: string | null) => void
  addChat: (chat: Chat) => void
  updateChat: (id: string, updates: Partial<Chat>) => void
  deleteChat: (id: string) => void
  addMessage: (chatId: string, message: ChatMessage) => void
  updateMessage: (chatId: string, messageId: string, updates: Partial<ChatMessage>) => void

  // UI
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  settingsTab: string
  setSettingsTab: (tab: string) => void

  // Helpers
  getCurrentChat: () => Chat | undefined
  createNewChat: () => string
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'landing',
  setCurrentView: (view) => set({ currentView: view }),

  // Auth
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  authMode: 'login',
  setAuthMode: (mode) => set({ authMode: mode }),
  isAuthenticated: false,

  // Chat
  chats: [],
  currentChatId: null,
  setCurrentChatId: (id) => set({ currentChatId: id }),
  addChat: (chat) => set((state) => ({ chats: [chat, ...state.chats] })),
  updateChat: (id, updates) =>
    set((state) => ({
      chats: state.chats.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  deleteChat: (id) =>
    set((state) => ({
      chats: state.chats.filter((c) => c.id !== id),
      currentChatId: state.currentChatId === id ? null : state.currentChatId,
    })),
  addMessage: (chatId, message) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, messages: [...c.messages, message], updatedAt: new Date() } : c
      ),
    })),
  updateMessage: (chatId, messageId, updates) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId
          ? {
              ...c,
              messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
            }
          : c
      ),
    })),

  // UI
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  settingsTab: 'general',
  setSettingsTab: (tab) => set({ settingsTab: tab }),

  // Helpers
  getCurrentChat: () => {
    const state = get()
    return state.chats.find((c) => c.id === state.currentChatId)
  },
  createNewChat: () => {
    const id = crypto.randomUUID()
    const chat: Chat = {
      id,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    set((state) => ({
      chats: [chat, ...state.chats],
      currentChatId: id,
    }))
    return id
  },
}))
