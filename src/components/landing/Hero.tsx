'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeroProps {
  onStartChat: () => void
  onLearnMore: () => void
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2">
      <div className="size-1.5 rounded-full bg-violet-400 typing-dot-1" />
      <div className="size-1.5 rounded-full bg-violet-400 typing-dot-2" />
      <div className="size-1.5 rounded-full bg-violet-400 typing-dot-3" />
    </div>
  )
}

function MockChatPreview() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
      className="glass-strong rounded-2xl p-1 shadow-2xl glow-subtle w-full max-w-md"
    >
      {/* Chat Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
        <div className="relative">
          <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
            <Bot className="size-3.5 text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-emerald-400 rounded-full border-2 border-[#12121c]" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/90">Wisely AI</p>
          <p className="text-[10px] text-emerald-400/80">Online</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="px-4 py-4 space-y-3 min-h-[200px]">
        {/* User message */}
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-2.5 justify-end"
          >
            <div className="bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border border-violet-500/20 rounded-2xl rounded-tr-md px-3.5 py-2.5 max-w-[80%]">
              <p className="text-xs text-white/80 leading-relaxed">
                Explain quantum computing simply
              </p>
            </div>
            <div className="size-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <User className="size-3 text-white/60" />
            </div>
          </motion.div>
        )}

        {/* AI response */}
        {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-start gap-2.5"
          >
            <div className="size-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shrink-0">
              <Bot className="size-3 text-white" />
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[80%]">
              <p className="text-xs text-white/70 leading-relaxed">
                Think of a regular computer as a coin — heads or tails. A quantum computer is like a
                spinning coin that&apos;s both at once. This lets it explore many answers simultaneously,
                solving certain problems exponentially faster. ⚡
              </p>
            </div>
          </motion.div>
        )}

        {/* Typing indicator */}
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-2.5"
          >
            <div className="size-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shrink-0">
              <Bot className="size-3 text-white" />
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-md">
              <TypingIndicator />
            </div>
          </motion.div>
        )}
      </div>

      {/* Chat Input */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5">
          <span className="text-xs text-white/30 flex-1">Ask Wisely anything...</span>
          <div className="size-6 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
            <ArrowRight className="size-3 text-white" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Hero({ onStartChat, onLearnMore }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[#0c0c14]" />
      <div className="absolute inset-0 bg-gradient-radial" />
      <div className="absolute inset-0 bg-mesh" />
      <div className="absolute inset-0 noise-overlay" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 size-96 bg-violet-500/[0.03] rounded-full blur-[120px] animate-float" />
      <div
        className="absolute bottom-1/4 right-1/4 size-80 bg-cyan-500/[0.03] rounded-full blur-[100px] animate-float"
        style={{ animationDelay: '3s' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glow-border bg-violet-500/[0.08] text-xs font-medium text-violet-300/90">
                <Sparkles className="size-3" />
                Free for a limited time
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
            >
              <span className="gradient-text-warm">Wisely</span>
              <br />
              <span className="text-white/90">by Haris</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="text-xl md:text-2xl text-white/70 font-light mb-4"
            >
              Ask anything. Understand everything.
            </motion.p>

            {/* Description */}
            <motion.p
              variants={itemVariants}
              className="text-white/50 max-w-2xl text-base leading-relaxed mb-8 mx-auto lg:mx-0"
            >
              Your AI assistant for conversation, files, images, learning, and creativity.
              Powered by cutting-edge intelligence to help you think deeper, work faster, and
              create more.
            </motion.p>

            {/* Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
            >
              <Button
                onClick={onStartChat}
                className="btn-primary text-white text-base h-11 px-8 rounded-xl border-0"
                size="lg"
              >
                <Sparkles className="size-4" />
                Start Chatting
              </Button>
              <Button
                variant="ghost"
                onClick={onLearnMore}
                className="text-white/60 hover:text-white hover:bg-white/[0.06] text-base h-11 px-8 rounded-xl border border-white/[0.08]"
                size="lg"
              >
                Learn More
                <ArrowRight className="size-4" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Right - Mock Chat */}
          <div className="flex-1 w-full max-w-md lg:max-w-lg">
            <MockChatPreview />
          </div>
        </div>
      </div>
    </section>
  )
}
