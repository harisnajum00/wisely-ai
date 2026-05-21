'use client'

import { useEffect, useRef } from 'react'
import { getSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import Demo from '@/components/landing/Demo'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'
import AuthModal from '@/components/auth/AuthModal'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatArea from '@/components/chat/ChatArea'
import SettingsPanel from '@/components/settings/SettingsPanel'
import { useIsMobile } from '@/hooks/use-mobile'

const viewVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
}

const chatVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2, ease: 'easeIn' } },
}

export default function Home() {
  const {
    currentView,
    setCurrentView,
    setUser,
    setAuthMode,
    isAuthenticated,
    sidebarOpen,
    setSidebarOpen,
    createNewChat,
    addMessage,
    hydrate,
    isDarkMode,
  } = useAppStore()

  const landingRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)

  // Hydrate store from localStorage on mount
  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Apply theme class whenever isDarkMode changes
  useEffect(() => {
    const html = document.documentElement
    if (isDarkMode) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }, [isDarkMode])

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const session = await getSession()
        if (session?.user) {
          setUser({
            id: (session.user as Record<string, unknown>).id as string || '',
            email: session.user.email || '',
            name: session.user.name || '',
            image: session.user.image || undefined,
          })
          setCurrentView('chat')
        }
      } catch {
        // Session check failed, stay on landing
      }
    }
    checkSession()
  }, [setUser, setCurrentView])

  const isMobile = useIsMobile()

  // Landing page handlers
  const handleGetStarted = () => {
    setCurrentView('auth')
    setAuthMode('signup')
  }

  const handleSignIn = () => {
    setCurrentView('auth')
    setAuthMode('login')
  }

  const handleFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleAbout = () => {
    landingRef.current?.scrollTo({ top: landingRef.current.scrollHeight, behavior: 'smooth' })
  }

  // Guest mode: go directly to chat without auth
  const handleStartChat = () => {
    if (!isAuthenticated) {
      // Set a guest user so the chat experience works
      setUser({
        id: 'guest',
        email: '',
        name: 'Guest',
      })
    }
    setCurrentView('chat')
  }

  const handleLearnMore = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handlePromptClick = (prompt: string) => {
    if (!isAuthenticated) {
      setUser({
        id: 'guest',
        email: '',
        name: 'Guest',
      })
    }
    const chatId = createNewChat()
    addMessage(chatId, {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      createdAt: new Date(),
    })
    setCurrentView('chat')
  }

  // Chat view handlers
  const handleNewChat = () => {
    createNewChat()
  }

  // Auto-close sidebar on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false)
    }
  }, [isMobile])

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="h-screen overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {/* Landing + Auth View */}
        {(currentView === 'landing' || currentView === 'auth') && (
          <motion.div
            key="landing"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            ref={landingRef}
            className="h-screen overflow-y-auto"
          >
            <Navbar
              onGetStarted={handleGetStarted}
              onSignIn={handleSignIn}
              onFeatures={handleFeatures}
              onAbout={handleAbout}
            />
            <section id="hero">
              <Hero
                onStartChat={handleStartChat}
                onLearnMore={handleLearnMore}
              />
            </section>
            <section id="features" ref={featuresRef}>
              <Features />
            </section>
            <section id="demo">
              <Demo onPromptClick={handlePromptClick} />
            </section>
            <section id="cta">
              <CTA onGetStarted={handleGetStarted} />
            </section>
            <Footer />

            {/* Auth Modal Overlay */}
            {currentView === 'auth' && (
              <AuthModal />
            )}
          </motion.div>
        )}

        {/* Chat View */}
        {currentView === 'chat' && (
          <motion.div
            key="chat"
            variants={chatVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-screen flex relative"
          >
            {/* Mobile sidebar overlay */}
            {isMobile && sidebarOpen && (
              <div className="fixed inset-0 z-40 bg-[var(--overlay-bg)] backdrop-blur-sm" onClick={handleToggleSidebar} />
            )}
            {/* Sidebar - mobile: fixed overlay, desktop: inline */}
            <div className={isMobile && sidebarOpen ? 'fixed inset-y-0 left-0 z-50' : ''}>
              <ChatSidebar
                onNewChat={handleNewChat}
                onToggle={handleToggleSidebar}
                isOpen={sidebarOpen}
              />
            </div>

            {/* Chat Area */}
            <ChatArea />
          </motion.div>
        )}

        {/* Settings View */}
        {currentView === 'settings' && (
          <motion.div
            key="settings"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-screen"
          >
            <SettingsPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
