'use client'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CTAProps {
  onGetStarted: () => void
}

export default function CTA({ onGetStarted }: CTAProps) {
  return (
    <section className="relative py-24 md:py-32">
      {/* Background */}
      <div className="absolute inset-0 bg-[var(--landing-bg)]" />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 10, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-violet-500/[0.06] blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -20, 30, 0],
            y: [0, 15, -25, 0],
            scale: [1, 0.95, 1.1, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[400px] rounded-full bg-cyan-500/[0.04] blur-[100px]"
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Sparkle icon */}
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center mb-6"
          >
            <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-400/10 flex items-center justify-center border border-[var(--divider-color)] glow-primary">
              <Sparkles className="size-7 text-primary" />
            </div>
          </motion.div>

          {/* Heading */}
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="text-foreground/90">Ready to experience </span>
            <span className="gradient-text-warm">Wisely</span>
            <span className="text-foreground/90">?</span>
          </h2>

          {/* Subtext */}
          <p className="text-muted-foreground/60 text-base md:text-lg max-w-lg mx-auto mb-8 leading-relaxed">
            Start your AI journey today — free for a limited time. No credit card required.
          </p>

          {/* CTA Button */}
          <Button
            onClick={onGetStarted}
            size="lg"
            className="btn-primary text-white text-base h-12 px-10 rounded-xl border-0 group"
          >
            <Sparkles className="size-4" />
            Start Free
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
