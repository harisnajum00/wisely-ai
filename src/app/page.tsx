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
  } = useAppStore()

  const landingRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)

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
    // Scroll to the bottom of the landing page (footer area)
    landingRef.current?.scrollTo({ top: landingRef.current.scrollHeight, behavior: 'smooth' })
  }

  const handleStartChat = () => {
    if (isAuthenticated) {
      setCurrentView('chat')
    } else {
      setCurrentView('auth')
      setAuthMode('signup')
    }
  }

  const handleLearnMore = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handlePromptClick = (prompt: string) => {
    if (isAuthenticated) {
      const chatId = createNewChat()
      addMessage(chatId, {
        id: crypto.randomUUID(),
        role: 'user',
        content: prompt,
        createdAt: new Date(),
      })
    } else {
      setCurrentView('auth')
      setAuthMode('signup')
    }
  }

  // Chat view handlers
  const handleNewChat = () => {
    createNewChat()
  }

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
            className="h-screen flex"
          >
            {/* Sidebar */}
            <ChatSidebar
              onNewChat={handleNewChat}
              onToggle={handleToggleSidebar}
              isOpen={sidebarOpen}
            />

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
