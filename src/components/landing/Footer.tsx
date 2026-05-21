'use client'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative border-t border-[var(--divider-color)]">
      <div className="absolute inset-0 bg-[var(--landing-bg)]" />
      <div className="absolute inset-0 bg-gradient-radial-bottom" />

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary/70" />
            <span className="gradient-text text-sm font-semibold tracking-tight">
              Wisely by Haris
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6" aria-label="Footer navigation">
            <a
              href="#privacy"
              className="text-xs text-muted-foreground/50 hover:text-foreground/70 transition-colors duration-200"
            >
              Privacy
            </a>
            <a
              href="#terms"
              className="text-xs text-muted-foreground/50 hover:text-foreground/70 transition-colors duration-200"
            >
              Terms
            </a>
            <a
              href="#contact"
              className="text-xs text-muted-foreground/50 hover:text-foreground/70 transition-colors duration-200"
            >
              Contact
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-[11px] text-muted-foreground/30">
            &copy; {new Date().getFullYear()} Wisely by Haris. All rights reserved.
          </p>
        </div>
      </motion.div>
    </footer>
  )
}
