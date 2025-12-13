/**
 * Memory system for the coaching agent
 * Manages session state, project memory, and question backlog
 */

import type { ProjectPhase } from './workflowTypes'

// ============================================
// MEMORY INTERFACES
// ============================================

export interface ProjectMemory {
  name?: string
  description?: string
  features?: string[]
  market_category?: string
  target_segment?: string
  problem?: string
  solution?: string
  phase?: ProjectPhase
}

export interface ProgressMemory {
  activities: string[]
  milestones: string[]
}

export interface UserMemory {
  skills: string[]
  assets: string[]
  constraints: {
    time?: string
    budget?: string
    geography?: string
    lacking?: string[]
  }
}

export interface SessionMemory {
  project: ProjectMemory
  progress: ProgressMemory
  user: UserMemory
}

// ============================================
// QUESTION BACKLOG (Todo-like system)
// ============================================

export type QuestionStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

export interface QuestionItem {
  id: string
  question: string
  topic: 'project' | 'progress' | 'user' | 'constraints'
  status: QuestionStatus
  memoryField?: string
  answer?: string
}

// ============================================
// SESSION STATE
// ============================================

export interface SessionState {
  sessionId: string
  memory: SessionMemory
  questions: QuestionItem[]
  createdAt: Date
  updatedAt: Date
}

// In-memory storage (replace with Redis/DB in production)
const sessions = new Map<string, SessionState>()

// ============================================
// DEFAULT QUESTION BACKLOG
// ============================================

const DEFAULT_QUESTIONS: Omit<QuestionItem, 'status'>[] = [
  {
    id: 'q-project-desc',
    question: 'Can you tell me more about your project idea?',
    topic: 'project',
    memoryField: 'project.description'
  },
  {
    id: 'q-progress',
    question: 'What have you already accomplished on this project?',
    topic: 'progress',
    memoryField: 'progress.activities'
  },
  {
    id: 'q-user-skills',
    question: 'What skills or expertise do you bring to this project?',
    topic: 'user',
    memoryField: 'user.skills'
  },
  {
    id: 'q-user-assets',
    question: 'What other assets do you have? (network, partners, data...)',
    topic: 'user',
    memoryField: 'user.assets'
  },
  {
    id: 'q-constraints-lacking',
    question: 'What are you lacking to succeed in this project?',
    topic: 'constraints',
    memoryField: 'user.constraints.lacking'
  },
  {
    id: 'q-constraints-time',
    question: 'How much time can you dedicate to this project?',
    topic: 'constraints',
    memoryField: 'user.constraints.time'
  },
  {
    id: 'q-constraints-budget',
    question: 'What budget do you have available?',
    topic: 'constraints',
    memoryField: 'user.constraints.budget'
  }
]

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Create a new session with default memory and question backlog
 */
export function createSession(sessionId: string): SessionState {
  const session: SessionState = {
    sessionId,
    memory: {
      project: {},
      progress: {
        activities: [],
        milestones: []
      },
      user: {
        skills: [],
        assets: [],
        constraints: {}
      }
    },
    questions: DEFAULT_QUESTIONS.map(q => ({ ...q, status: 'pending' as QuestionStatus })),
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  sessions.set(sessionId, session)
  return session
}

/**
 * Get or create a session
 */
export function getSession(sessionId: string): SessionState {
  if (!sessions.has(sessionId)) {
    return createSession(sessionId)
  }
  return sessions.get(sessionId)!
}

/**
 * Update session state
 */
export function updateSession(sessionId: string, updates: Partial<SessionState>): SessionState {
  const session = getSession(sessionId)
  const updated = {
    ...session,
    ...updates,
    updatedAt: new Date()
  }
  sessions.set(sessionId, updated)
  return updated
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId)
}

// ============================================
// MEMORY OPERATIONS
// ============================================

/**
 * Update memory with new data (deep merge)
 */
export function updateMemory(sessionId: string, memoryUpdates: Partial<SessionMemory>): SessionMemory {
  const session = getSession(sessionId)
  
  const updatedMemory: SessionMemory = {
    project: { ...session.memory.project, ...memoryUpdates.project },
    progress: {
      activities: memoryUpdates.progress?.activities 
        ? [...new Set([...session.memory.progress.activities, ...memoryUpdates.progress.activities])]
        : session.memory.progress.activities,
      milestones: memoryUpdates.progress?.milestones
        ? [...new Set([...session.memory.progress.milestones, ...memoryUpdates.progress.milestones])]
        : session.memory.progress.milestones
    },
    user: {
      skills: memoryUpdates.user?.skills
        ? [...new Set([...session.memory.user.skills, ...memoryUpdates.user.skills])]
        : session.memory.user.skills,
      assets: memoryUpdates.user?.assets
        ? [...new Set([...session.memory.user.assets, ...memoryUpdates.user.assets])]
        : session.memory.user.assets,
      constraints: {
        ...session.memory.user.constraints,
        ...memoryUpdates.user?.constraints,
        lacking: memoryUpdates.user?.constraints?.lacking
          ? [...new Set([...(session.memory.user.constraints.lacking || []), ...memoryUpdates.user.constraints.lacking])]
          : session.memory.user.constraints.lacking
      }
    }
  }
  
  updateSession(sessionId, { memory: updatedMemory })
  return updatedMemory
}

/**
 * Parse memory updates from LLM response tags
 * Format: <memory_update>{"project.description": "...", "user.skills": ["..."]}</memory_update>
 */
export function parseMemoryUpdates(response: string): Partial<SessionMemory> | null {
  const match = response.match(/<memory_update>([\s\S]*?)<\/memory_update>/)
  if (!match) return null
  
  try {
    const updates = JSON.parse(match[1])
    const memory: Partial<SessionMemory> = {}
    
    for (const [path, value] of Object.entries(updates)) {
      setNestedValue(memory, path, value)
    }
    
    return memory
  } catch (e) {
    console.error('Failed to parse memory updates:', e)
    return null
  }
}

/**
 * Set a nested value in an object using dot notation path
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current)) {
      current[key] = {}
    }
    current = current[key]
  }
  
  current[keys[keys.length - 1]] = value
}

// ============================================
// QUESTION BACKLOG OPERATIONS
// ============================================

/**
 * Update question backlog from LLM response
 * Format: <question_backlog>["question1", "question2"]</question_backlog>
 */
export function parseQuestionBacklog(response: string): string[] | null {
  const match = response.match(/<question_backlog>([\s\S]*?)<\/question_backlog>/)
  if (!match) return null
  
  try {
    return JSON.parse(match[1])
  } catch (e) {
    console.error('Failed to parse question backlog:', e)
    return null
  }
}

/**
 * Update the question backlog with new questions
 */
export function updateQuestionBacklog(sessionId: string, newQuestions: string[]): QuestionItem[] {
  const session = getSession(sessionId)
  
  // Keep completed/skipped questions, replace pending ones with new list
  const preservedQuestions = session.questions.filter(
    q => q.status === 'completed' || q.status === 'skipped'
  )
  
  const newQuestionItems: QuestionItem[] = newQuestions.map((question, index) => ({
    id: `q-dynamic-${Date.now()}-${index}`,
    question,
    topic: 'project' as const, // Default topic, could be inferred
    status: index === 0 ? 'in_progress' as const : 'pending' as const
  }))
  
  const updatedQuestions = [...preservedQuestions, ...newQuestionItems]
  updateSession(sessionId, { questions: updatedQuestions })
  
  return updatedQuestions
}

/**
 * Mark a question as completed
 */
export function completeQuestion(sessionId: string, questionId: string, answer?: string): void {
  const session = getSession(sessionId)
  const questions = session.questions.map(q => 
    q.id === questionId 
      ? { ...q, status: 'completed' as QuestionStatus, answer }
      : q
  )
  updateSession(sessionId, { questions })
}

/**
 * Get pending questions
 */
export function getPendingQuestions(sessionId: string): QuestionItem[] {
  const session = getSession(sessionId)
  return session.questions.filter(q => q.status === 'pending' || q.status === 'in_progress')
}

/**
 * Get the current in-progress question
 */
export function getCurrentQuestion(sessionId: string): QuestionItem | null {
  const session = getSession(sessionId)
  return session.questions.find(q => q.status === 'in_progress') || null
}

// ============================================
// MEMORY COMPLETENESS CHECK
// ============================================

/**
 * Check what information is missing from memory
 */
export function getMemoryGaps(memory: SessionMemory): string[] {
  const gaps: string[] = []
  
  if (!memory.project.description) gaps.push('project description')
  if (memory.progress.activities.length === 0) gaps.push('progress/accomplishments')
  if (memory.user.skills.length === 0) gaps.push('user skills')
  if (memory.user.assets.length === 0) gaps.push('user assets')
  if (!memory.user.constraints.time) gaps.push('time constraints')
  if (!memory.user.constraints.budget) gaps.push('budget constraints')
  if (!memory.project.phase) gaps.push('project phase')
  
  return gaps
}

/**
 * Check if memory is sufficient for a capability
 */
export function isMemorySufficientFor(
  memory: SessionMemory, 
  capability: 'flash_diagnostic' | 'action_plan'
): { sufficient: boolean; missing: string[] } {
  const missing: string[] = []
  
  switch (capability) {
    case 'flash_diagnostic':
      if (!memory.project.description) missing.push('project description')
      if (memory.progress.activities.length < 2) missing.push('at least 2 progress items')
      break
      
    case 'action_plan':
      if (!memory.project.description) missing.push('project description')
      if (!memory.project.phase) missing.push('project phase')
      break
  }
  
  return {
    sufficient: missing.length === 0,
    missing
  }
}

// ============================================
// SESSION ID GENERATION
// ============================================

/**
 * Generate a session ID from request context
 */
export function generateSessionId(conversationHistory?: any[]): string {
  if (!conversationHistory || conversationHistory.length === 0) {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
  
  // Use a consistent ID based on conversation start
  const firstMessage = conversationHistory[0]?.text || ''
  const hash = simpleHash(firstMessage)
  return `session_${hash}`
}

/**
 * Simple string hash for session ID generation
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

