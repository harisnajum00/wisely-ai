'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, AlertCircle, X, Sparkles } from 'lucide-react'

interface RateLimitPopupProps {
  isOpen: boolean
  onClose: () => void
  resetTime?: Date | null
}

export default function RateLimitPopup({ isOpen, onClose, resetTime }: RateLimitPopupProps) {
  const [timeLeft, setTimeLeft] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [phase, setPhase] = useState<'intro' | 'details'>('intro') // intro for 1 second, then details

  // Phase transition: show intro for 1 second, then show details
  useEffect(() => {
    if (!isOpen) {
      setPhase('intro')
      return
    }
    const timer = setTimeout(() => {
      setPhase('details')
    }, 1000)
    return () => clearTimeout(timer)
  }, [isOpen])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !resetTime || phase !== 'details') return

    const updateCountdown = () => {
      const now = new Date()
      const diff = resetTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Resets now!')
        setSecondsLeft(0)
        setTimeout(onClose, 2000)
        return
      }

      setSecondsLeft(Math.ceil(diff / 1000))

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`)
      } else {
        setTimeLeft(`${seconds}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [isOpen, resetTime, phase, onClose])

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(onClose, 15000)
    return () => clearTimeout(timer)
  }, [isOpen, onClose])

  // Format the reset time in user's local timezone
  const formatLocalResetTime = useCallback(() => {
    if (!resetTime) return ''
    try {
      return resetTime.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return ''
    }
  }, [resetTime])

  // Calculate progress for the circular timer (max 1 hour = 3600s)
  const progress = resetTime
    ? Math.max(0, Math.min(100, (secondsLeft / 3600) * 100))
    : 0

  const localResetTime = formatLocalResetTime()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[calc(100%-2rem)]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/90 via-orange-950/90 to-red-950/90 backdrop-blur-xl shadow-2xl shadow-amber-500/10">
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 animate-pulse" />

            {/* Top accent bar */}
            <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

            {/* Phase 1: Intro - beautiful animated popup */}
            <AnimatePresence mode="wait">
              {phase === 'intro' ? (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="relative p-8 flex flex-col items-center justify-center text-center"
                >
                  {/* Pulsing icon */}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping" style={{ animationDuration: '1s' }} />
                    <div className="relative w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                      <AlertCircle className="size-8 text-amber-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-amber-100">
                    Limit Reached
                  </h3>
                  <p className="text-xs text-amber-200/60 mt-1">
                    Please wait a moment...
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="relative p-4 flex items-start gap-4"
                >
                  {/* Icon with pulse animation */}
                  <div className="shrink-0">
                    <div className="relative">
                      <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                      <div className="relative w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                        <AlertCircle className="size-5 text-amber-400" />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-amber-100">
                      Daily Limit Reached
                    </h3>
                    <p className="text-xs text-amber-200/70 mt-1 leading-relaxed">
                      The free AI service limit has been reached for today. Your access will reset automatically.
                    </p>

                    {/* Countdown timer + local reset time */}
                    {resetTime && timeLeft && (
                      <div className="mt-3 flex items-center gap-3">
                        <div className="relative w-9 h-9 shrink-0">
                          <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                            <circle
                              cx="18" cy="18" r="15"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              className="text-amber-500/20"
                            />
                            <circle
                              cx="18" cy="18" r="15"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeDasharray={`${progress} ${100 - progress}`}
                              strokeLinecap="round"
                              className="text-amber-400 transition-all duration-1000"
                            />
                          </svg>
                          <Clock className="absolute inset-0 m-auto size-3.5 text-amber-300" />
                        </div>
                        <div>
                          <p className="text-xs text-amber-200/50">Resets in</p>
                          <p className="text-sm font-bold text-amber-100 tabular-nums">{timeLeft}</p>
                        </div>
                      </div>
                    )}

                    {/* User's local time when limit resets */}
                    {localResetTime && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-500/10 rounded-lg border border-amber-500/15">
                        <Sparkles className="size-3.5 text-amber-400 shrink-0" />
                        <p className="text-xs text-amber-200/80">
                          Your limit resets at <span className="font-semibold text-amber-100">{localResetTime}</span> (your local time)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-amber-200/40 hover:text-amber-200 transition-all"
                  >
                    <X className="size-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
