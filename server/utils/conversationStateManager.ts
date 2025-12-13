/**
 * Manages conversation state persistence across requests
 * Now backed by Supabase for persistence
 */

import type { ConversationState } from './workflowTypes'
import { initializeConversationState } from './workflowEngine'
import { getSupabaseClient } from './supabase'

// In-memory cache (fallback if Supabase is unavailable)
const conversationStates = new Map<string, ConversationState>()

/**
 * Get or create conversation state for a session
 * Tries to load from Supabase, falls back to in-memory cache
 */
export async function getConversationState(sessionId: string, event?: any): Promise<ConversationState> {
  // Try to load from Supabase
  try {
    const supabase = getSupabaseClient(event)
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('metadata')
      .eq('session_id', sessionId)
      .single() as { data: { metadata?: { conversationState?: ConversationState } } | null; error: any }

    if (!error && conversation?.metadata?.conversationState) {
      return conversation.metadata.conversationState
    }
  } catch (error) {
    console.warn('⚠️ [CONVERSATION_STATE] Failed to load from Supabase, using cache:', error)
  }

  // Fallback to in-memory cache
  if (!conversationStates.has(sessionId)) {
    conversationStates.set(sessionId, initializeConversationState())
  }
  return conversationStates.get(sessionId)!
}

/**
 * Update conversation state for a session
 * Persists to Supabase metadata, also updates in-memory cache
 */
export async function setConversationState(sessionId: string, state: ConversationState, event?: any): Promise<void> {
  // Update in-memory cache
  conversationStates.set(sessionId, state)

  // Try to persist to Supabase
  try {
    const supabase = getSupabaseClient(event)
    const { error } = await supabase
      .from('conversations')
      .update({
        metadata: { conversationState: state }
      } as any)
      .eq('session_id', sessionId)

    if (error) {
      console.warn('⚠️ [CONVERSATION_STATE] Failed to save to Supabase:', error)
    }
  } catch (error) {
    console.warn('⚠️ [CONVERSATION_STATE] Error saving to Supabase:', error)
  }
}

/**
 * Clear conversation state for a session
 */
export function clearConversationState(sessionId: string): void {
  conversationStates.delete(sessionId)
}

/**
 * Generate a session ID from conversation history
 * In production, use proper session management
 */
export function generateSessionId(conversationHistory?: any[]): string {
  // Simple hash based on conversation length
  // In production, use proper session tokens
  if (!conversationHistory || conversationHistory.length === 0) {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  // Use a consistent ID based on conversation start
  const firstMessage = conversationHistory[0]?.text || ''
  return `session_${firstMessage.substring(0, 20).replace(/\s/g, '_')}`
}

