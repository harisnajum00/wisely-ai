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

// Load persisted state from localStorage
function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable
  }
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
  customInstructions: string
  setCustomInstructions: (instructions: string) => void
  isDarkMode: boolean
  setIsDarkMode: (dark: boolean) => void

  // Initialization
  hydrate: () => void

  // Helpers
  getCurrentChat: () => Chat | undefined
  createNewChat: () => string
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'landing',
  setCurrentView: (view) => {
    saveToStorage('wisely-current-view', view)
    set({ currentView: view })
  },

  // Auth
  user: null,
  setUser: (user) => {
    saveToStorage('wisely-user', user)
    set({ user, isAuthenticated: !!user })
  },
  authMode: 'login',
  setAuthMode: (mode) => set({ authMode: mode }),
  isAuthenticated: false,

  // Chat
  chats: [],
  currentChatId: null,
  setCurrentChatId: (id) => {
    saveToStorage('wisely-current-chat-id', id)
    set({ currentChatId: id })
  },
  addChat: (chat) => {
    set((state) => {
      const chats = [chat, ...state.chats]
      saveToStorage('wisely-chats', chats)
      return { chats }
    })
  },
  updateChat: (id, updates) =>
    set((state) => {
      const chats = state.chats.map((c) => (c.id === id ? { ...c, ...updates } : c))
      saveToStorage('wisely-chats', chats)
      return { chats }
    }),
  deleteChat: (id) =>
    set((state) => {
      const chats = state.chats.filter((c) => c.id !== id)
      saveToStorage('wisely-chats', chats)
      return {
        chats,
        currentChatId: state.currentChatId === id ? null : state.currentChatId,
      }
    }),
  addMessage: (chatId, message) =>
    set((state) => {
      const chats = state.chats.map((c) =>
        c.id === chatId ? { ...c, messages: [...c.messages, message], updatedAt: new Date() } : c
      )
      saveToStorage('wisely-chats', chats)
      return { chats }
    }),
  updateMessage: (chatId, messageId, updates) =>
    set((state) => {
      const chats = state.chats.map((c) =>
        c.id === chatId
          ? {
              ...c,
              messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
            }
          : c
      )
      saveToStorage('wisely-chats', chats)
      return { chats }
    }),

  // UI
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  settingsTab: 'general',
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  customInstructions: '',
  setCustomInstructions: (instructions) => {
    saveToStorage('wisely-custom-instructions', instructions)
    set({ customInstructions: instructions })
  },
  isDarkMode: true,
  setIsDarkMode: (dark) => {
    saveToStorage('wisely-theme', dark ? 'dark' : 'light')
    set({ isDarkMode: dark })
  },

  // Hydrate from localStorage on client mount
  hydrate: () => {
    const customInstructions = loadFromStorage<string>('wisely-custom-instructions', '')
    const themeRaw = loadFromStorage<string>('wisely-theme', 'dark')
    const isDarkMode = themeRaw !== 'light'
    const chats = loadFromStorage<Chat[]>('wisely-chats', [])
    const currentChatId = loadFromStorage<string | null>('wisely-current-chat-id', null)
    const currentView = loadFromStorage<AppView>('wisely-current-view', 'landing')
    const savedUser = loadFromStorage<User | null>('wisely-user', null)
    set({
      customInstructions,
      isDarkMode,
      chats,
      currentChatId,
      currentView: currentView === 'auth' ? 'landing' : currentView,
      user: savedUser,
      isAuthenticated: !!savedUser,
    })
  },

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
    set((state) => {
      const chats = [chat, ...state.chats]
      saveToStorage('wisely-chats', chats)
      saveToStorage('wisely-current-chat-id', id)
      return { chats, currentChatId: id }
    })
    return id
  },
}))
