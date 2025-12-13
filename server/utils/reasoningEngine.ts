/**
 * Reasoning Engine for the coaching agent
 * Orchestrates memory, knowledge base, and question backlog
 */

import type { SessionMemory, SessionState, QuestionItem } from './memory'
import { 
  getSession, 
  updateMemory, 
  parseMemoryUpdates, 
  parseQuestionBacklog,
  updateQuestionBacklog,
  getMemoryGaps,
  isMemorySufficientFor
} from './memory'
import { getKnowledgeBase, formatKnowledgeEntry, type KnowledgeEntry } from './notion'
import { getBasePromptFromNotion } from './notion'

// ============================================
// SYSTEM PROMPT BUILDING
// ============================================

/**
 * Build the complete system prompt for Claude
 */
export async function buildSystemPrompt(
  sessionId: string,
  useCache: boolean = true
): Promise<string> {
  const session = getSession(sessionId)
  const basePrompt = await getBasePromptFromNotion(useCache)
  const knowledgeBase = await getKnowledgeBase(useCache)
  
  const memoryContext = buildMemoryContext(session.memory)
  const backlogContext = buildBacklogContext(session.questions)
  const kbContext = buildKnowledgeBaseContext(knowledgeBase)
  const instructions = buildInstructions(session.memory)
  
  return `${basePrompt || DEFAULT_BASE_PROMPT}

${REASONING_INSTRUCTIONS}

${memoryContext}

${backlogContext}

${kbContext}

${instructions}`
}

// ============================================
// CONTEXT BUILDERS
// ============================================

function buildMemoryContext(memory: SessionMemory): string {
  const gaps = getMemoryGaps(memory)
  
  return `## CURRENT MEMORY STATE

### Project
${memory.project.name ? `- Name: ${memory.project.name}` : '- Name: (unknown)'}
${memory.project.description ? `- Description: ${memory.project.description}` : '- Description: (unknown)'}
${memory.project.features?.length ? `- Features: ${memory.project.features.join(', ')}` : ''}
${memory.project.phase ? `- Phase: ${memory.project.phase}` : '- Phase: (unknown)'}

### Progress
${memory.progress.activities.length > 0 
  ? memory.progress.activities.map(a => `- ${a}`).join('\n')
  : '- No progress recorded yet'}

### User Profile
${memory.user.skills.length > 0 ? `- Skills: ${memory.user.skills.join(', ')}` : '- Skills: (unknown)'}
${memory.user.assets.length > 0 ? `- Assets: ${memory.user.assets.join(', ')}` : '- Assets: (unknown)'}

### Constraints
${memory.user.constraints.time ? `- Time: ${memory.user.constraints.time}` : ''}
${memory.user.constraints.budget ? `- Budget: ${memory.user.constraints.budget}` : ''}
${memory.user.constraints.geography ? `- Geography: ${memory.user.constraints.geography}` : ''}
${memory.user.constraints.lacking?.length ? `- Lacking: ${memory.user.constraints.lacking.join(', ')}` : ''}

### Information Gaps
${gaps.length > 0 ? gaps.map(g => `- Missing: ${g}`).join('\n') : '- No critical gaps'}
`
}

function buildBacklogContext(questions: QuestionItem[]): string {
  const pending = questions.filter(q => q.status === 'pending')
  const inProgress = questions.find(q => q.status === 'in_progress')
  const completed = questions.filter(q => q.status === 'completed')
  
  return `## QUESTION BACKLOG

### Currently Asking
${inProgress ? `- ${inProgress.question}` : '- None'}

### Pending Questions (${pending.length})
${pending.slice(0, 5).map(q => `- ${q.question}`).join('\n') || '- None'}

### Completed (${completed.length})
${completed.slice(-3).map(q => `- ✓ ${q.question}`).join('\n') || '- None'}
`
}

function buildKnowledgeBaseContext(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) {
    return `## KNOWLEDGE BASE
No knowledge base entries loaded.`
  }
  
  // Group by theme for better context
  const byTheme = new Map<string, KnowledgeEntry[]>()
  for (const entry of entries) {
    const theme = entry.thematique || 'Other'
    if (!byTheme.has(theme)) {
      byTheme.set(theme, [])
    }
    byTheme.get(theme)!.push(entry)
  }
  
  const themeSummaries = Array.from(byTheme.entries())
    .map(([theme, items]) => `- ${theme}: ${items.length} entries`)
    .join('\n')
  
  // Include abbreviated entries for matching
  const entryList = entries.slice(0, 30).map(e => 
    `[${e.id.slice(0, 8)}] ${e.titre} | Questions: "${e.question_posee}" | Phases: ${e.maturite.join(',') || 'all'}`
  ).join('\n')
  
  return `## KNOWLEDGE BASE (${entries.length} entries)

### Themes Available
${themeSummaries}

### Entry Index (for matching)
${entryList}

### How to Use Knowledge Base
When the user's question matches an entry, include the entry ID in your thinking, then use its recommendation.
If multiple entries match with high confidence, combine their insights.
If user's phase doesn't match entry's "maturite", warn them and suggest more relevant topic.
`
}

function buildInstructions(memory: SessionMemory): string {
  const diagnosticReady = isMemorySufficientFor(memory, 'flash_diagnostic')
  const actionPlanReady = isMemorySufficientFor(memory, 'action_plan')
  
  return `## AVAILABLE CAPABILITIES

### Flash Diagnostic
${diagnosticReady.sufficient 
  ? '✅ READY - You have enough info to offer a diagnostic'
  : `❌ NOT READY - Missing: ${diagnosticReady.missing.join(', ')}`}

### Action Plan
${actionPlanReady.sufficient
  ? '✅ READY - You have enough info to create an action plan'
  : `❌ NOT READY - Missing: ${actionPlanReady.missing.join(', ')}`}

## CURRENT TURN INSTRUCTIONS
1. Extract any new information from the user message
2. Update memory with <memory_update> tags
3. Decide: ask ONE question OR deliver a capability (diagnostic/action plan)
4. Update question backlog with <question_backlog> tags
5. Show your reasoning in <thinking> tags
`
}

// ============================================
// REASONING INSTRUCTIONS
// ============================================

const REASONING_INSTRUCTIONS = `## RESPONSE FORMAT

You MUST structure your response with these tags:

### 1. Thinking Block (visible to user, collapsible)
<thinking>
- What new info did I learn from the user?
- What memory fields should I update?
- What's still missing?
- Should I ask a question or deliver value?
- If asking, what's the most important gap to fill?
- If knowledge base matches, which entries? Is phase compatible?
</thinking>

### 2. Memory Update (hidden, parsed by system)
<memory_update>
{"path.to.field": "value", "another.field": ["array", "values"]}
</memory_update>

Valid paths: project.name, project.description, project.features, project.phase, 
progress.activities, progress.milestones, user.skills, user.assets,
user.constraints.time, user.constraints.budget, user.constraints.geography, user.constraints.lacking

### 3. Question Backlog (visible to user, collapsible)
<question_backlog>
["Next question to ask", "Another pending question", "..."]
</question_backlog>

### 4. Your Response
After the tags, write your natural response to the user.
- Ask MAXIMUM ONE question per turn
- Use numbered lists for quick action choices
- When using knowledge base recommendations, include the punchline and challenge

### Phase Mismatch Warning
If user asks about something not relevant to their current phase (e.g., funding during idea phase):
- Acknowledge their question
- Explain why it might be premature
- Suggest a more relevant focus based on their diagnostic
- Offer to help with the more relevant topic instead
`

const DEFAULT_BASE_PROMPT = `# Impulz Coaching Assistant

You are an expert startup coach helping entrepreneurs navigate their journey.

Your role is to:
1. Understand their project and situation
2. Identify their current challenges
3. Provide actionable, differentiated advice
4. Guide them to concrete next steps

You are warm, direct, and focused on action over theory.
You ask probing questions to understand the real problem, not just the surface request.
You challenge assumptions when needed, but always constructively.
`

// ============================================
// RESPONSE PROCESSING
// ============================================

/**
 * Process Claude's response and update session state
 */
export function processResponse(
  sessionId: string,
  response: string
): { cleanResponse: string; memoryUpdated: boolean; backlogUpdated: boolean } {
  let memoryUpdated = false
  let backlogUpdated = false
  
  // Extract and apply memory updates
  const memoryUpdates = parseMemoryUpdates(response)
  if (memoryUpdates) {
    updateMemory(sessionId, memoryUpdates)
    memoryUpdated = true
    console.log('🧠 [REASONING] Memory updated:', JSON.stringify(memoryUpdates))
  }
  
  // Extract and apply question backlog updates
  const newBacklog = parseQuestionBacklog(response)
  if (newBacklog) {
    updateQuestionBacklog(sessionId, newBacklog)
    backlogUpdated = true
    console.log('📝 [REASONING] Backlog updated:', newBacklog.length, 'questions')
  }
  
  // Remove memory_update tags from response (keep thinking and backlog visible)
  const cleanResponse = response.replace(/<memory_update>[\s\S]*?<\/memory_update>/g, '').trim()
  
  return { cleanResponse, memoryUpdated, backlogUpdated }
}

/**
 * Get knowledge base entry by ID (for detailed recommendations)
 */
export async function getKnowledgeEntryById(
  entryId: string,
  useCache: boolean = true
): Promise<KnowledgeEntry | null> {
  const entries = await getKnowledgeBase(useCache)
  return entries.find(e => e.id === entryId || e.id.startsWith(entryId)) || null
}

/**
 * Format knowledge entry for inclusion in response
 */
export { formatKnowledgeEntry }

// ============================================
// CAPABILITY TRIGGERS
// ============================================

/**
 * Check if a capability should be triggered based on user message and memory
 */
export function shouldTriggerCapability(
  sessionId: string,
  userMessage: string
): { capability: 'flash_diagnostic' | 'action_plan' | null; reason: string } {
  const session = getSession(sessionId)
  const message = userMessage.toLowerCase()
  
  // Check for explicit triggers
  if (message.includes('diagnostic') || message.includes('diagnos') || message.includes('assess')) {
    const readiness = isMemorySufficientFor(session.memory, 'flash_diagnostic')
    if (readiness.sufficient) {
      return { capability: 'flash_diagnostic', reason: 'User requested diagnostic' }
    }
    return { capability: null, reason: `Diagnostic not ready: missing ${readiness.missing.join(', ')}` }
  }
  
  if (message.includes('action plan') || message.includes('next steps') || message.includes('plan d\'action')) {
    const readiness = isMemorySufficientFor(session.memory, 'action_plan')
    if (readiness.sufficient) {
      return { capability: 'action_plan', reason: 'User requested action plan' }
    }
    return { capability: null, reason: `Action plan not ready: missing ${readiness.missing.join(', ')}` }
  }
  
  return { capability: null, reason: 'No capability trigger detected' }
}

