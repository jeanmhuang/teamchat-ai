export interface Channel {
  id: string
  name: string
  description?: string
  created_at: string
}

export interface Message {
  id: string
  channel_id: string
  user_name: string
  user_avatar?: string
  content: string
  is_ai: boolean
  created_at: string
}

export interface User {
  id: string
  name: string
  avatar?: string
}
