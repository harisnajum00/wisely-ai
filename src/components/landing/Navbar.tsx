'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavbarProps {
  onSignIn: () => void
  onGetStarted: () => void
  onFeatures: () => void
  onAbout: () => void
}

export default function Navbar({ onSignIn, onGetStarted, onFeatures, onAbout }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'Features', onClick: onFeatures },
    { label: 'About', onClick: onAbout },
  ]

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-[var(--divider-color)]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Sparkles className="size-6 text-violet-500" />
              <div className="absolute inset-0 size-6 bg-violet-500/20 blur-md rounded-full" />
            </div>
            <span className="gradient-text text-lg font-semibold tracking-tight">
              Wisely by Haris
            </span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={link.onClick}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-[var(--hover-bg)]"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onSignIn}
              className="text-muted-foreground hover:text-foreground hover:bg-[var(--hover-bg)] text-sm"
            >
              Sign In
            </Button>
            <Button
              onClick={onGetStarted}
              className="btn-primary text-white text-sm h-9 px-5 rounded-lg border-0"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="md:hidden bg-background/95 backdrop-blur-xl border-b border-[var(--divider-color)]"
        >
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  link.onClick()
                  setMobileOpen(false)
                }}
                className="block w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-2 border-t border-[var(--divider-color)] flex flex-col gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  onSignIn()
                  setMobileOpen(false)
                }}
                className="w-full text-muted-foreground hover:text-foreground hover:bg-[var(--hover-bg)] text-sm justify-center"
              >
                Sign In
              </Button>
              <Button
                onClick={() => {
                  onGetStarted()
                  setMobileOpen(false)
                }}
                className="btn-primary text-white text-sm w-full justify-center border-0"
              >
                Get Started
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.nav>
  )
}
