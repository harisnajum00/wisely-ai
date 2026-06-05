import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'wisely-haris-admin-2024'

export async function GET(request: NextRequest) {
  // Verify admin key from header
  const authKey = request.headers.get('x-admin-key')
  if (authKey !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all stats in parallel
    const [
      totalUsers,
      totalChats,
      totalMessages,
      totalFiles,
      recentUsers,
      recentChats,
      chatStats,
    ] = await Promise.all([
      // Total users
      db.user.count(),
      // Total chats
      db.chat.count(),
      // Total messages
      db.message.count(),
      // Total file uploads
      db.fileUpload.count(),
      // Recent users (last 10)
      db.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          _count: { select: { chats: true } },
        },
      }),
      // Recent chats (last 10)
      db.chat.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { name: true, email: true } },
          _count: { select: { messages: true } },
        },
      }),
      // Messages per day (last 7 days)
      db.message.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        orderBy: { createdAt: 'desc' },
        take: 7,
      }),
    ])

    // Get users with most chats
    const topUsers = await db.user.findMany({
      take: 5,
      orderBy: { chats: { _count: 'desc' } },
      select: {
        id: true,
        email: true,
        name: true,
        _count: { select: { chats: true, messages: true } },
      },
    })

    // Calculate storage info
    const totalFileSize = await db.fileUpload.aggregate({
      _sum: { fileSize: true },
    })

    // Messages by role
    const userMessages = await db.message.count({ where: { role: 'user' } })
    const assistantMessages = await db.message.count({ where: { role: 'assistant' } })

    return NextResponse.json({
      stats: {
        totalUsers,
        totalChats,
        totalMessages,
        totalFiles,
        totalStorageBytes: totalFileSize._sum.fileSize || 0,
        userMessages,
        assistantMessages,
        avgMessagesPerChat: totalChats > 0 ? Math.round(totalMessages / totalChats) : 0,
        avgChatsPerUser: totalUsers > 0 ? Math.round(totalChats / totalUsers * 10) / 10 : 0,
      },
      recentUsers,
      recentChats,
      topUsers,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[Admin] Stats error:', error?.message)
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    )
  }
}

// Delete a user
export async function DELETE(request: NextRequest) {
  const authKey = request.headers.get('x-admin-key')
  if (authKey !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    await db.user.delete({ where: { id: userId } })
    return NextResponse.json({ success: true, message: 'User deleted' })
  } catch (error: any) {
    console.error('[Admin] Delete error:', error?.message)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
