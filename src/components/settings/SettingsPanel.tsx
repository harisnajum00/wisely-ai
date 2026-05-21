'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Sun,
  Moon,
  Globe,
  MessageSquare,
  Shield,
  User,
  Trash2,
  LogOut,
  Clock,
  Minimize2,
  AlertTriangle,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

type SettingsTab = 'general' | 'chat' | 'privacy' | 'account'

interface SettingsToggleProps {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function SettingsToggle({ id, label, description, checked, onCheckedChange }: SettingsToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5 pr-4">
        <label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export default function SettingsPanel() {
  const { user, setUser, settingsTab, setSettingsTab, setCurrentView, chats, customInstructions, setCustomInstructions } = useAppStore()
  const { toast } = useToast()

  // Local settings state
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wisely-theme') !== 'light'
    }
    return true
  })
  const [compactMode, setCompactMode] = useState(false)
  const [showTimestamps, setShowTimestamps] = useState(true)
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [isEditingName, setIsEditingName] = useState(false)

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked)
    const html = document.documentElement
    if (checked) {
      html.classList.add('dark')
      localStorage.setItem('wisely-theme', 'dark')
    } else {
      html.classList.remove('dark')
      localStorage.setItem('wisely-theme', 'light')
    }
    toast({ title: checked ? 'Dark mode enabled' : 'Light mode enabled' })
  }

  const handleClearChats = () => {
    // Reset chats in store
    const state = useAppStore.getState()
    state.chats.forEach((chat) => state.deleteChat(chat.id))
    toast({
      title: 'All chats cleared',
      description: 'Your conversation history has been removed.',
    })
  }

  const handleDeleteAccount = () => {
    toast({
      title: 'Account deletion requested',
      description: 'This feature is not yet available. Contact support for assistance.',
      variant: 'destructive',
    })
  }

  const handleSignOut = () => {
    setUser(null)
    setCurrentView('landing')
    toast({
      title: 'Signed out',
      description: 'You have been signed out successfully.',
    })
  }

  const handleSaveName = () => {
    if (user && displayName.trim()) {
      setUser({ ...user, name: displayName.trim() })
      setIsEditingName(false)
      toast({
        title: 'Display name updated',
        description: 'Your name has been saved.',
      })
    }
  }

  const tabContentVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-6 py-4 glass-strong border-b border-border/50"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentView('chat')}
          className="hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      </motion.header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Tabs
            value={settingsTab}
            onValueChange={(val) => setSettingsTab(val)}
            className="flex flex-col md:flex-row gap-6"
          >
            {/* Left side tab list */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <TabsList className="flex flex-col h-auto gap-1 bg-transparent p-0 w-48 shrink-0">
                <TabsTrigger
                  value="general"
                  className="w-full justify-start gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground data-[state=active]:bg-white/5 data-[state=active]:text-foreground data-[state=active]:shadow-none transition-all"
                >
                  <Sun className="size-4" />
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="chat"
                  className="w-full justify-start gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground data-[state=active]:bg-white/5 data-[state=active]:text-foreground data-[state=active]:shadow-none transition-all"
                >
                  <MessageSquare className="size-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger
                  value="privacy"
                  className="w-full justify-start gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground data-[state=active]:bg-white/5 data-[state=active]:text-foreground data-[state=active]:shadow-none transition-all"
                >
                  <Shield className="size-4" />
                  Privacy
                </TabsTrigger>
                <TabsTrigger
                  value="account"
                  className="w-full justify-start gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground data-[state=active]:bg-white/5 data-[state=active]:text-foreground data-[state=active]:shadow-none transition-all"
                >
                  <User className="size-4" />
                  Account
                </TabsTrigger>
              </TabsList>
            </motion.div>

            {/* Right side tab content */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {/* General Tab */}
                <TabsContent value="general">
                  <motion.div
                    key="general"
                    variants={tabContentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="glass rounded-xl p-6 space-y-1"
                  >
                    <h2 className="text-lg font-semibold mb-4">General</h2>

                    <SettingsToggle
                      id="dark-mode"
                      label="Dark mode"
                      description="Toggle between dark and light theme"
                      checked={darkMode}
                      onCheckedChange={handleDarkModeToggle}
                    />

                    <Separator className="bg-white/5" />

                    <div className="flex items-center justify-between py-3">
                      <div className="space-y-0.5 pr-4">
                        <label className="text-sm font-medium text-foreground">Language</label>
                        <p className="text-xs text-muted-foreground">Choose your preferred language</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="size-4" />
                        <span>English (US)</span>
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>

                {/* Chat Tab */}
                <TabsContent value="chat">
                  <motion.div
                    key="chat"
                    variants={tabContentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="glass rounded-xl p-6 space-y-1"
                  >
                    <h2 className="text-lg font-semibold mb-4">Chat Preferences</h2>

                    <SettingsToggle
                      id="compact-mode"
                      label="Compact mode"
                      description="Reduce spacing between messages for a denser view"
                      checked={compactMode}
                      onCheckedChange={setCompactMode}
                    />

                    <Separator className="bg-white/5" />

                    <SettingsToggle
                      id="show-timestamps"
                      label="Show timestamps"
                      description="Display time stamps on each message"
                      checked={showTimestamps}
                      onCheckedChange={setShowTimestamps}
                    />

                    <Separator className="bg-white/5" />

                    <div className="pt-2 space-y-2">
                      <div className="space-y-0.5">
                        <label htmlFor="custom-instructions" className="text-sm font-medium text-foreground">Custom Instructions</label>
                        <p className="text-xs text-muted-foreground">Tell Wisely how to respond. e.g., "Always respond in Urdu" or "Be more concise"</p>
                      </div>
                      <textarea
                        id="custom-instructions"
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="e.g., Always respond in Urdu, Be more concise, Use simple language..."
                        className="w-full h-24 glass rounded-lg px-3 py-2 text-sm bg-transparent border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/50"
                      />
                    </div>

                    <Separator className="bg-white/5" />

                    <div className="pt-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/40"
                          >
                            <Trash2 className="size-4" />
                            Clear all chats
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="glass-strong border-border/50">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="size-5 text-destructive" />
                              Clear all chats?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete all your conversation history. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleClearChats}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              Delete all
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </motion.div>
                </TabsContent>

                {/* Privacy Tab */}
                <TabsContent value="privacy">
                  <motion.div
                    key="privacy"
                    variants={tabContentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="glass rounded-xl p-6 space-y-4"
                  >
                    <h2 className="text-lg font-semibold">Privacy & Data</h2>

                    <div className="space-y-3">
                      <div className="glass rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Shield className="size-5 text-primary mt-0.5 shrink-0" />
                          <div>
                            <h3 className="text-sm font-medium">Data retention</h3>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              Your conversations are stored locally and encrypted end-to-end. We do not use your data to train AI models. Chat history is retained until you manually delete it.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="glass rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Clock className="size-5 text-primary mt-0.5 shrink-0" />
                          <div>
                            <h3 className="text-sm font-medium">Auto-delete</h3>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              Conversations older than 90 days are automatically archived. You can configure this in your account settings.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-white/5" />

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/40"
                        >
                          <Trash2 className="size-4" />
                          Delete account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-strong border-border/50">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="size-5 text-destructive" />
                            Delete your account?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete your account and all associated data, including all conversations, settings, and preferences. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            Delete account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </motion.div>
                </TabsContent>

                {/* Account Tab */}
                <TabsContent value="account">
                  <motion.div
                    key="account"
                    variants={tabContentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="glass rounded-xl p-6 space-y-4"
                  >
                    <h2 className="text-lg font-semibold">Account</h2>

                    <div className="space-y-4">
                      {/* Display Name */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Display name</label>
                        {isEditingName ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              className="glass border-white/10 focus:border-primary/50 input-glow"
                              placeholder="Enter your name"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveName()
                                if (e.key === 'Escape') {
                                  setDisplayName(user?.name || '')
                                  setIsEditingName(false)
                                }
                              }}
                              autoFocus
                            />
                            <Button size="sm" onClick={handleSaveName} className="shrink-0 btn-primary">
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setDisplayName(user?.name || '')
                                setIsEditingName(false)
                              }}
                              className="shrink-0"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center justify-between glass rounded-lg px-4 py-2.5 cursor-pointer hover:bg-white/5 transition-colors group"
                            onClick={() => setIsEditingName(true)}
                          >
                            <span className="text-sm">{user?.name || 'Not set'}</span>
                            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to edit
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Email (read-only) */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email</label>
                        <div className="glass rounded-lg px-4 py-2.5 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{user?.email || 'No email on file'}</span>
                          <span className="text-xs text-muted-foreground/60">Read-only</span>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Sign Out */}
                    <Button
                      variant="outline"
                      onClick={handleSignOut}
                      className="w-full justify-start gap-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </Button>
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
