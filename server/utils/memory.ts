/**
 * Memory system for the coaching agent
 * Manages session state, project memory, and question backlog
 * 
 * Memory is persisted to Supabase (project_memory table) for cross-device sync
 * A local cache is maintained for performance during the session
 */

// ============================================
// TYPES
// ============================================

export type ProjectPhase = 
  | 'vision'
  | 'research'
  | 'design'
  | 'test'
  | 'launch'
  | 'growth'

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
  projectId: string
  memory: SessionMemory
  questions: QuestionItem[]
  createdAt: Date
  updatedAt: Date
}

// In-memory cache for current session (populated from Supabase on first access)
const sessionCache = new Map<string, SessionState>()

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_MEMORY: SessionMemory = {
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
}

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
// SESSION MANAGEMENT (Async with Supabase)
// ============================================

/**
 * Create a new session with default memory and question backlog
 */
function createDefaultSession(projectId: string): SessionState {
  return {
    projectId,
    memory: JSON.parse(JSON.stringify(DEFAULT_MEMORY)),
    questions: DEFAULT_QUESTIONS.map(q => ({ ...q, status: 'pending' as QuestionStatus })),
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

/**
 * Get session for a project - loads from Supabase if not in cache
 * This is now ASYNC to support loading from database
 */
export async function getSession(projectId: string, event?: any): Promise<SessionState> {
  // Check cache first
  if (sessionCache.has(projectId)) {
    console.log('📦 [MEMORY] Using cached session for project:', projectId)
    return sessionCache.get(projectId)!
  }

  // Try to load from Supabase
  if (event) {
    try {
      const { getSupabaseClient } = await import('./supabase')
      const supabase = getSupabaseClient(event)
      
      const { data, error } = await supabase
        .from('project_memory')
        .select('memory, questions, created_at, updated_at')
        .eq('project_id', projectId)
        .single() as { data: any; error: any }

      if (!error && data) {
        const session: SessionState = {
          projectId,
          memory: data.memory || JSON.parse(JSON.stringify(DEFAULT_MEMORY)),
          questions: data.questions || DEFAULT_QUESTIONS.map(q => ({ ...q, status: 'pending' as QuestionStatus })),
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at)
        }
        
        // Cache it
        sessionCache.set(projectId, session)
        console.log('💾 [MEMORY] Loaded session from Supabase for project:', projectId)
        return session
      }
    } catch (error) {
      console.warn('⚠️ [MEMORY] Failed to load from Supabase, using default:', error)
    }
  }

  // Create new session if not found
  console.log('🆕 [MEMORY] Creating new session for project:', projectId)
  const session = createDefaultSession(projectId)
  sessionCache.set(projectId, session)
  
  // Save to Supabase (async, don't wait)
  if (event) {
    saveSessionToSupabase(projectId, session, event).catch(err => {
      console.warn('⚠️ [MEMORY] Failed to save new session to Supabase:', err)
    })
  }
  
  return session
}

/**
 * Get session synchronously from cache only (for non-async contexts)
 * Returns null if not cached - caller should use async getSession first
 */
export function getSessionSync(projectId: string): SessionState | null {
  return sessionCache.get(projectId) || null
}

/**
 * Save session to Supabase
 */
async function saveSessionToSupabase(projectId: string, session: SessionState, event: any): Promise<void> {
  try {
    const { getSupabaseClient } = await import('./supabase')
    const supabase = getSupabaseClient(event)
    
    const { error } = await supabase
      .from('project_memory')
      .upsert({
        project_id: projectId,
        memory: session.memory,
        questions: session.questions,
        updated_at: new Date().toISOString()
      } as any, {
        onConflict: 'project_id'
      })

    if (error) {
      console.error('❌ [MEMORY] Failed to save to Supabase:', error)
    } else {
      console.log('💾 [MEMORY] Saved session to Supabase for project:', projectId)
    }
  } catch (error) {
    console.error('❌ [MEMORY] Error saving to Supabase:', error)
  }
}

/**
 * Update session state in cache
 */
function updateSessionCache(projectId: string, updates: Partial<SessionState>): SessionState {
  const session = sessionCache.get(projectId) || createDefaultSession(projectId)
  const updated = {
    ...session,
    ...updates,
    updatedAt: new Date()
  }
  sessionCache.set(projectId, updated)
  return updated
}

/**
 * Clear session from cache
 */
export function clearSessionCache(projectId: string): void {
  sessionCache.delete(projectId)
}

// ============================================
// MEMORY OPERATIONS
// ============================================

/**
 * Update memory with new data (deep merge)
 * Saves immediately to Supabase for cross-device sync
 */
export async function updateMemory(
  projectId: string, 
  memoryUpdates: Partial<SessionMemory>,
  event?: any
): Promise<SessionMemory> {
  // Get current session (from cache if available)
  const session = sessionCache.get(projectId) || createDefaultSession(projectId)
  
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
  
  // Update cache
  const updatedSession = updateSessionCache(projectId, { memory: updatedMemory })
  
  // Save to Supabase immediately (async but don't block)
  if (event) {
    saveSessionToSupabase(projectId, updatedSession, event).catch(err => {
      console.warn('⚠️ [MEMORY] Failed to save memory update to Supabase:', err)
    })
  }
  
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
    const updates = JSON.parse(match[1]) as Record<string, any>
    const memory: Partial<SessionMemory> = {}
    
    for (const [path, value] of Object.entries(updates)) {
      setNestedValue(memory as Record<string, any>, path, value)
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
function setNestedValue(obj: Record<string, any>, path: string, value: any): void {
  const keys = path.split('.')
  let current: any = obj
  
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
export async function updateQuestionBacklog(
  projectId: string, 
  newQuestions: string[],
  event?: any
): Promise<QuestionItem[]> {
  const session = sessionCache.get(projectId) || createDefaultSession(projectId)
  
  // Keep completed/skipped questions, replace pending ones with new list
  const preservedQuestions = session.questions.filter(
    q => q.status === 'completed' || q.status === 'skipped'
  )
  
  const newQuestionItems: QuestionItem[] = newQuestions.map((question, index) => ({
    id: `q-dynamic-${Date.now()}-${index}`,
    question,
    topic: 'project' as const,
    status: index === 0 ? 'in_progress' as const : 'pending' as const
  }))
  
  const updatedQuestions = [...preservedQuestions, ...newQuestionItems]
  const updatedSession = updateSessionCache(projectId, { questions: updatedQuestions })
  
  // Save to Supabase
  if (event) {
    saveSessionToSupabase(projectId, updatedSession, event).catch(err => {
      console.warn('⚠️ [MEMORY] Failed to save question backlog to Supabase:', err)
    })
  }
  
  return updatedQuestions
}

/**
 * Mark a question as completed
 */
export async function completeQuestion(
  projectId: string, 
  questionId: string, 
  answer?: string,
  event?: any
): Promise<void> {
  const session = sessionCache.get(projectId)
  if (!session) return
  
  const questions = session.questions.map(q => 
    q.id === questionId 
      ? { ...q, status: 'completed' as QuestionStatus, answer }
      : q
  )
  const updatedSession = updateSessionCache(projectId, { questions })
  
  if (event) {
    saveSessionToSupabase(projectId, updatedSession, event).catch(err => {
      console.warn('⚠️ [MEMORY] Failed to save question completion to Supabase:', err)
    })
  }
}

/**
 * Get pending questions (sync, from cache)
 */
export function getPendingQuestions(projectId: string): QuestionItem[] {
  const session = sessionCache.get(projectId)
  if (!session) return []
  return session.questions.filter(q => q.status === 'pending' || q.status === 'in_progress')
}

/**
 * Get the current in-progress question (sync, from cache)
 */
export function getCurrentQuestion(projectId: string): QuestionItem | null {
  const session = sessionCache.get(projectId)
  if (!session) return null
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
