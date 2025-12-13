/**
 * Supabase client utility for server-side operations
 */

import { createClient } from '@supabase/supabase-js'

let supabaseClient: ReturnType<typeof createClient> | null = null

/**
 * Get Supabase client instance (server-side only)
 * Uses service key for admin operations
 */
export function getSupabaseClient(event?: any) {
  if (supabaseClient) {
    return supabaseClient
  }

  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  const supabaseUrl = config.supabaseUrl
  const supabaseKey = config.supabaseServiceKey || config.supabaseAnonKey

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY environment variables.')
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return supabaseClient
}

/**
 * Database types (inferred from schema)
 */
export interface Conversation {
  id: string
  session_id: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

export interface Message {
  id: string
  conversation_id: string
  content: string
  role: 'user' | 'assistant'
  created_at: string
  metadata?: Record<string, any>
}

/**
 * Get conversation by session ID
 */
export async function getConversationBySessionId(sessionId: string, event?: any): Promise<Conversation | null> {
  const supabase = getSupabaseClient(event)
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .single() as { data: Conversation | null; error: any }

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Get all messages for a conversation, ordered by creation time
 */
export async function getConversationMessages(conversationId: string, event?: any): Promise<Message[]> {
  const supabase = getSupabaseClient(event)
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true }) as { data: Message[] | null; error: any }

  if (error || !data) {
    return []
  }

  return data
}

/**
 * Get conversation history formatted for the chat API
 */
export async function getConversationHistory(sessionId: string, event?: any): Promise<Array<{ text: string; isUser: boolean }>> {
  const conversation = await getConversationBySessionId(sessionId, event)
  if (!conversation) {
    return []
  }

  const messages = await getConversationMessages(conversation.id, event)
  return messages.map(msg => ({
    text: msg.content,
    isUser: msg.role === 'user'
  }))
}

