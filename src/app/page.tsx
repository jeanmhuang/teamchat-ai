'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Channel, Message } from '@/lib/types'
import { format } from 'date-fns'

const DEFAULT_USER = 'You'

export default function ChatApp() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [userName, setUserName] = useState(DEFAULT_USER)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load channels on mount
  useEffect(() => {
    loadChannels()
  }, [])

  // Load messages when channel changes
  useEffect(() => {
    if (activeChannel) {
      loadMessages(activeChannel.id)
      subscribeToMessages(activeChannel.id)
    }
  }, [activeChannel])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadChannels = async () => {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      setChannels(data)
      setActiveChannel(data[0])
    } else if (!error) {
      // Create default channels if none exist
      await createDefaultChannels()
    }
  }

  const createDefaultChannels = async () => {
    const defaultChannels = [
      { name: 'general', description: 'General discussion' },
      { name: 'random', description: 'Random chat' },
      { name: 'ai-help', description: 'Ask @Claude for help' },
    ]

    const { data } = await supabase
      .from('channels')
      .insert(defaultChannels)
      .select()

    if (data) {
      setChannels(data)
      setActiveChannel(data[0])
    }
  }

  const loadMessages = async (channelId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (data) {
      setMessages(data)
    }
  }

  const subscribeToMessages = (channelId: string) => {
    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeChannel) return

    const messageContent = newMessage.trim()
    setNewMessage('')

    // Insert user message
    const { data: userMsg } = await supabase
      .from('messages')
      .insert({
        channel_id: activeChannel.id,
        user_name: userName,
        content: messageContent,
        is_ai: false,
      })
      .select()
      .single()

    // Check if @Claude is mentioned
    if (messageContent.toLowerCase().includes('@claude')) {
      setIsAiThinking(true)

      try {
        const response = await fetch('/api/ai-respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageContent,
            channelId: activeChannel.id,
            channelName: activeChannel.name,
            userName: userName,
          }),
        })

        const data = await response.json()

        if (data.response) {
          await supabase.from('messages').insert({
            channel_id: activeChannel.id,
            user_name: 'Claude',
            content: data.response,
            is_ai: true,
          })
        }
      } catch (error) {
        console.error('AI response error:', error)
      }

      setIsAiThinking(false)
    }
  }

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a')
  }

  const renderMessageContent = (content: string) => {
    // Highlight @mentions
    const parts = content.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="mention">{part}</span>
      }
      return part
    })
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-60 bg-slack-sidebar flex flex-col">
        {/* Workspace header */}
        <div className="h-12 px-4 flex items-center border-b border-slack-border">
          <h1 className="font-bold text-lg text-white">TeamChat AI</h1>
        </div>

        {/* Channels list */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2">
            <span className="text-xs font-semibold text-slack-muted uppercase tracking-wide">
              Channels
            </span>
          </div>
          {channels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => setActiveChannel(channel)}
              className={`channel-item ${activeChannel?.id === channel.id ? 'active' : ''}`}
            >
              <span className="text-slack-muted">#</span>
              {channel.name}
            </div>
          ))}
        </div>

        {/* User section */}
        <div className="p-4 border-t border-slack-border">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full bg-slack-hover text-slack-text text-sm px-3 py-2 rounded border-none outline-none"
            placeholder="Your name"
          />
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-slack-bg">
        {/* Channel header */}
        <div className="h-12 px-4 flex items-center border-b border-slack-border">
          {activeChannel && (
            <>
              <span className="font-bold text-white">#{activeChannel.name}</span>
              {activeChannel.description && (
                <span className="ml-3 text-sm text-slack-muted">
                  {activeChannel.description}
                </span>
              )}
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {/* Welcome message */}
          {activeChannel && messages.length === 0 && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome to #{activeChannel.name}
              </h2>
              <p className="text-slack-muted">
                This is the start of the #{activeChannel.name} channel.
                {activeChannel.name === 'ai-help' && (
                  <span> Type <span className="mention">@Claude</span> to get AI assistance!</span>
                )}
              </p>
            </div>
          )}

          {/* Message list */}
          {messages.map((message) => (
            <div key={message.id} className="message">
              <div className={`avatar ${message.is_ai ? 'ai' : ''}`}>
                {message.user_name.charAt(0).toUpperCase()}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-author">{message.user_name}</span>
                  <span className="message-time">{formatTime(message.created_at)}</span>
                </div>
                <div className="message-text">
                  {renderMessageContent(message.content)}
                </div>
              </div>
            </div>
          ))}

          {/* AI thinking indicator */}
          {isAiThinking && (
            <div className="message">
              <div className="avatar ai">C</div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-author">Claude</span>
                </div>
                <div className="ai-thinking">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="p-4">
          <form onSubmit={sendMessage}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(e)
                }
              }}
              placeholder={`Message #${activeChannel?.name || 'channel'} (type @Claude for AI help)`}
              className="message-input"
              rows={1}
            />
          </form>
        </div>
      </div>
    </div>
  )
}
