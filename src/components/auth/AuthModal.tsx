'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signIn, getSession } from 'next-auth/react'
import { X, Mail, Lock, User, Chrome, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store'

interface AuthModalProps {
  onClose?: () => void
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { authMode, setAuthMode, setUser, setCurrentView } = useAppStore()

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      setCurrentView('landing')
    }
  }

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isLogin = authMode === 'login'

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  const toggleMode = () => {
    resetForm()
    setAuthMode(isLogin ? 'signup' : 'login')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    if (!isLogin) {
      if (!name.trim()) {
        setError('Please enter your name.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        return
      }
    }

    setLoading(true)

    try {
      if (isLogin) {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          setError('Invalid email or password.')
          return
        }

        const session = await getSession()
        if (session?.user) {
          setUser({
            id: session.user.id || '',
            email: session.user.email || '',
            name: session.user.name || '',
            image: session.user.image || undefined,
          })
          setCurrentView('chat')
          handleClose()
        }
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Something went wrong.')
          return
        }

        // Auto sign in after registration
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          setError('Account created but could not sign in automatically. Please try logging in.')
          setAuthMode('login')
          return
        }

        const session = await getSession()
        if (session?.user) {
          setUser({
            id: session.user.id || data.id,
            email: session.user.email || email,
            name: session.user.name || name,
            image: session.user.image || undefined,
          })
          setCurrentView('chat')
          handleClose()
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      await signIn('google', { callbackUrl: '/' })
    } catch {
      setError('Google sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="glass-strong relative w-full max-w-md mx-4 rounded-2xl p-8 glow-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"
          >
            <X className="size-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 mb-4">
              <span className="text-2xl font-bold text-white">W</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              {isLogin ? 'Welcome to Wisely' : 'Create Account'}
            </h2>
            <p className="text-white/40 mt-1 text-sm">
              {isLogin ? 'Sign in to continue your journey' : 'Start your AI experience today'}
            </p>
          </div>

          {/* Error display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google sign-in */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl mb-4"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <Chrome className="size-5 mr-2" />
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[#12121c] text-white/30">or continue with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                  <Input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 pl-10 bg-white/5 border-white/10 focus:border-violet-500/50 text-white placeholder:text-white/30 rounded-xl"
                    disabled={loading}
                  />
                </div>
              </motion.div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 pl-10 bg-white/5 border-white/10 focus:border-violet-500/50 text-white placeholder:text-white/30 rounded-xl"
                disabled={loading}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pl-10 bg-white/5 border-white/10 focus:border-violet-500/50 text-white placeholder:text-white/30 rounded-xl"
                disabled={loading}
              />
            </div>

            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 pl-10 bg-white/5 border-white/10 focus:border-violet-500/50 text-white placeholder:text-white/30 rounded-xl"
                    disabled={loading}
                  />
                </div>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 btn-primary rounded-xl text-white font-semibold text-sm border-0"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-sm text-white/40 mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={toggleMode}
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
