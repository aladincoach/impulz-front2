/**
 * Manages conversation state persistence across requests
 * In production, this should be backed by a database or cache
 */

import type { ConversationState } from './workflowTypes'
import { initializeConversationState } from './workflowEngine'

// In-memory storage (replace with Redis/DB in production)
const conversationStates = new Map<string, ConversationState>()

/**
 * Get or create conversation state for a session
 */
export function getConversationState(sessionId: string): ConversationState {
  if (!conversationStates.has(sessionId)) {
    conversationStates.set(sessionId, initializeConversationState())
  }
  return conversationStates.get(sessionId)!
}

/**
 * Update conversation state for a session
 */
export function setConversationState(sessionId: string, state: ConversationState): void {
  conversationStates.set(sessionId, state)
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

