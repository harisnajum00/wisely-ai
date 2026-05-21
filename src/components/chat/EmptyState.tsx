'use client'

import { motion } from 'framer-motion'
import { Sparkles, Lightbulb, FileText, Eye, Code2 } from 'lucide-react'

interface EmptyStateProps {
  onSuggestionClick: (suggestion: string) => void
}

const suggestions = [
  {
    icon: Lightbulb,
    title: 'Explain a concept',
    prompt: 'Explain quantum computing in simple terms',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: FileText,
    title: 'Summarize a file',
    prompt: 'Can you help me summarize a document?',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Eye,
    title: 'Analyze an image',
    prompt: 'I have an image I would like you to analyze',
    gradient: 'from-rose-500 to-pink-500',
  },
  {
    icon: Sparkles,
    title: 'Generate ideas',
    prompt: 'Help me brainstorm ideas for a creative project',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: Code2,
    title: 'Help with coding',
    prompt: 'Can you help me write a Python script?',
    gradient: 'from-cyan-500 to-blue-500',
  },
]

export default function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="mb-8"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 flex items-center justify-center animate-float">
            <Sparkles className="size-10 text-white" />
          </div>
          <div className="absolute inset-0 w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 blur-2xl opacity-30 animate-wisely-pulse" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="text-3xl font-bold text-white mb-2"
      >
        How can I help today?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-white/30 text-sm mb-10"
      >
        Ask me anything or try a suggestion below
      </motion.p>

      {/* Suggestion Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 w-full max-w-4xl"
      >
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={suggestion.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.08, duration: 0.4 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSuggestionClick(suggestion.prompt)}
            className="group glass rounded-2xl p-4 text-left transition-all duration-300 hover:glow-border cursor-pointer"
          >
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${suggestion.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}
            >
              <suggestion.icon className="size-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-white/80 group-hover:text-white transition-colors mb-1">
              {suggestion.title}
            </h3>
            <p className="text-xs text-white/25 group-hover:text-white/40 transition-colors line-clamp-2">
              {suggestion.prompt}
            </p>
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}
