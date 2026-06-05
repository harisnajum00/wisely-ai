'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Lock, Users, MessageSquare, FileText, HardDrive,
  Activity, Trash2, RefreshCw, Eye, Clock, ArrowLeft,
  TrendingUp, Zap, AlertTriangle, Check, LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store'

const ADMIN_KEY = 'wisely-haris-admin-2024'

interface AdminStats {
  totalUsers: number
  totalChats: number
  totalMessages: number
  totalFiles: number
  totalStorageBytes: number
  userMessages: number
  assistantMessages: number
  avgMessagesPerChat: number
  avgChatsPerUser: number
}

interface RecentUser {
  id: string
  email: string
  name: string | null
  createdAt: string
  _count: { chats: number }
}

interface RecentChat {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  user: { name: string | null; email: string }
  _count: { messages: number }
}

interface TopUser {
  id: string
  email: string
  name: string | null
  _count: { chats: number; messages: number }
}

interface AdminData {
  stats: AdminStats
  recentUsers: RecentUser[]
  recentChats: RecentChat[]
  topUsers: TopUser[]
  timestamp: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="size-5 text-white" />
        </div>
        {sub && (
          <span className="text-xs text-muted-foreground/50">{sub}</span>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
      <p className="text-xs sm:text-sm text-muted-foreground mt-1">{label}</p>
    </motion.div>
  )
}

export default function AdminPage() {
  const { setCurrentView } = useAppStore()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'chats'>('overview')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin', {
        headers: { 'x-admin-key': ADMIN_KEY }
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        setError('Failed to fetch data')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_KEY) {
      setIsAuthenticated(true)
      setError('')
      fetchData()
    } else {
      setError('Wrong password. Access denied.')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user and all their data? This cannot be undone.')) return
    try {
      const res = await fetch('/api/admin', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY,
        },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        fetchData() // Refresh data
      }
    } catch {
      // Silently fail
    }
  }

  // Auto-refresh every 30s
  useEffect(() => {
    if (!isAuthenticated) return
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchData])

  // ========== LOGIN SCREEN ==========
  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="glass-strong rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 via-orange-500/20 to-amber-500/20 flex items-center justify-center mb-2">
                <Shield className="size-7 text-amber-500" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Admin Access</h1>
              <p className="text-xs text-muted-foreground mt-1">Wisely by Haris — Restricted Area</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Admin Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    placeholder="Enter admin key..."
                    className="pl-10 bg-transparent border-[var(--divider-color)] focus:border-primary/50"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-red-400 flex items-center gap-1.5"
                >
                  <AlertTriangle className="size-3" />
                  {error}
                </motion.p>
              )}

              <Button
                type="submit"
                className="w-full btn-primary text-white border-0 h-10"
              >
                <Shield className="size-4" />
                Access Dashboard
              </Button>
            </form>

            <p className="text-[10px] text-muted-foreground/30 text-center mt-4">
              Unauthorized access is prohibited
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  // ========== ADMIN DASHBOARD ==========
  const stats = data?.stats

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 glass-strong border-b border-[var(--divider-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 via-orange-500/20 to-amber-500/20 flex items-center justify-center">
              <Shield className="size-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-[10px] text-muted-foreground">Wisely by Haris</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchData}
              className="text-[var(--icon-muted)] hover:text-[var(--icon-muted-hover)] h-9 w-9"
              disabled={loading}
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setIsAuthenticated(false); setPassword('') }}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView('chat')}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <div className="flex gap-1 bg-[var(--btn-ghost-bg)] p-1 rounded-xl w-fit">
          {(['overview', 'users', 'chats'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <AnimatePresence mode="wait">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4 sm:space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard icon={Users} label="Total Users" value={stats?.totalUsers ?? '—'} color="from-violet-500 to-indigo-500" />
                <StatCard icon={MessageSquare} label="Total Chats" value={stats?.totalChats ?? '—'} color="from-cyan-500 to-blue-500" />
                <StatCard icon={Activity} label="Total Messages" value={stats?.totalMessages ?? '—'} sub={`${stats?.userMessages ?? 0} user / ${stats?.assistantMessages ?? 0} AI`} color="from-emerald-500 to-teal-500" />
                <StatCard icon={FileText} label="File Uploads" value={stats?.totalFiles ?? '—'} sub={stats ? formatBytes(stats.totalStorageBytes) : ''} color="from-amber-500 to-orange-500" />
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="glass rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center shrink-0">
                    <TrendingUp className="size-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{stats?.avgMessagesPerChat ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">Avg messages per chat</p>
                  </div>
                </div>
                <div className="glass rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
                    <Zap className="size-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{stats?.avgChatsPerUser ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">Avg chats per user</p>
                  </div>
                </div>
                <div className="glass rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center shrink-0">
                    <HardDrive className="size-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{stats ? formatBytes(stats.totalStorageBytes) : '—'}</p>
                    <p className="text-xs text-muted-foreground">Total storage used</p>
                  </div>
                </div>
              </div>

              {/* Top Users */}
              <div className="glass rounded-2xl p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  Top Users by Activity
                </h3>
                <div className="space-y-2">
                  {data?.topUsers.map((user, i) => (
                    <div key={user.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-[var(--hover-bg)] transition-colors">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{user.name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MessageSquare className="size-3" />{user._count.chats} chats</span>
                        <span className="flex items-center gap-1"><Activity className="size-3" />{user._count.messages} msgs</span>
                      </div>
                    </div>
                  ))}
                  {(!data?.topUsers || data.topUsers.length === 0) && (
                    <p className="text-xs text-muted-foreground/50 py-4 text-center">No users yet</p>
                  )}
                </div>
              </div>

              {/* Last updated */}
              {data?.timestamp && (
                <p className="text-[10px] text-muted-foreground/30 text-center flex items-center justify-center gap-1">
                  <Clock className="size-3" />
                  Last updated: {formatDate(data.timestamp)}
                </p>
              )}
            </motion.div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="glass rounded-2xl overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-[var(--divider-color)] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    Recent Users ({stats?.totalUsers ?? 0})
                  </h3>
                </div>
                <div className="divide-y divide-[var(--divider-color)]">
                  {data?.recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-[var(--hover-bg)] transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-400/20 flex items-center justify-center shrink-0 text-xs font-bold text-foreground">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{user.name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          <Clock className="size-3 inline mr-1" />{formatDate(user.createdAt)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user._count.chats} chats
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user.id)}
                          className="h-7 w-7 text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10"
                          title="Delete user"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!data?.recentUsers || data.recentUsers.length === 0) && (
                    <div className="py-8 text-center text-xs text-muted-foreground/50">No users found</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* CHATS TAB */}
          {activeTab === 'chats' && (
            <motion.div
              key="chats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="glass rounded-2xl overflow-hidden">
                <div className="px-4 sm:px-5 py-3 border-b border-[var(--divider-color)] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="size-4 text-primary" />
                    Recent Chats ({stats?.totalChats ?? 0})
                  </h3>
                </div>
                <div className="divide-y divide-[var(--divider-color)]">
                  {data?.recentChats.map((chat) => (
                    <div key={chat.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-[var(--hover-bg)] transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-400/20 flex items-center justify-center shrink-0">
                        <MessageSquare className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{chat.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          by {chat.user.name || chat.user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{chat._count.messages} msgs</span>
                        <span className="hidden sm:block">
                          <Clock className="size-3 inline mr-1" />{formatDate(chat.updatedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!data?.recentChats || data.recentChats.length === 0) && (
                    <div className="py-8 text-center text-xs text-muted-foreground/50">No chats found</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
