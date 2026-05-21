'use client'
import { motion } from 'framer-motion'
import { Lightbulb, FileSearch, Image, Code2, Sparkles, type LucideIcon } from 'lucide-react'

interface PromptCard {
  icon: LucideIcon
  prompt: string
  label: string
}

const prompts: PromptCard[] = [
  {
    icon: Lightbulb,
    prompt: 'Explain this topic simply',
    label: 'Simplify',
  },
  {
    icon: FileSearch,
    prompt: 'Summarize a document',
    label: 'Summarize',
  },
  {
    icon: Image,
    prompt: 'Analyze this image',
    label: 'Analyze',
  },
  {
    icon: Code2,
    prompt: 'Help me write code',
    label: 'Code',
  },
  {
    icon: Sparkles,
    prompt: 'Generate ideas',
    label: 'Create',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

interface DemoProps {
  onPromptClick: (prompt: string) => void
}

export default function Demo({ onPromptClick }: DemoProps) {
  return (
    <section id="demo" className="relative py-24 md:py-32">
      {/* Background */}
      <div className="absolute inset-0 bg-[var(--landing-bg)]" />
      <div className="absolute inset-0 bg-gradient-radial" />
      <div className="absolute inset-0 bg-mesh" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="text-foreground/90">Try </span>
            <span className="gradient-text-warm">Wisely</span>
          </h2>
          <p className="text-muted-foreground/60 text-base md:text-lg max-w-lg mx-auto">
            See what Wisely can do for you. Pick a prompt to get started.
          </p>
        </motion.div>

        {/* Prompt Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {prompts.map((card) => {
            const Icon = card.icon
            return (
              <motion.button
                key={card.prompt}
                variants={cardVariants}
                onClick={() => onPromptClick(card.prompt)}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                className="glass card-hover rounded-2xl p-5 text-left group cursor-pointer border border-[var(--divider-color)] hover:border-primary/20 hover:shadow-[0_0_30px_rgba(124,58,237,0.08)] transition-all duration-300"
              >
                {/* Icon + Label */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-400/10 flex items-center justify-center border border-[var(--divider-color)] group-hover:border-primary/30 transition-colors duration-300">
                    <Icon className="size-4 text-primary group-hover:text-cyan-500 transition-colors duration-300" />
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/30 group-hover:text-primary/60 transition-colors duration-300">
                    {card.label}
                  </span>
                </div>

                {/* Prompt Text */}
                <p className="text-foreground/70 text-sm font-medium group-hover:text-foreground/90 transition-colors duration-300">
                  &ldquo;{card.prompt}&rdquo;
                </p>

                {/* Hover arrow */}
                <div className="mt-3 flex items-center gap-1.5 text-primary/0 group-hover:text-primary/80 transition-all duration-300">
                  <span className="text-xs font-medium">Try it</span>
                  <svg
                    className="size-3 group-hover:translate-x-1 transition-transform duration-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
