/**
 * Workflow engine that manages stage progression and state transitions
 */

import type { 
  ConversationState, 
  WorkflowStage, 
  StageResult,
  IntentCategorization,
  IntentCategory,
  ProjectPhase
} from './workflowTypes'
import { 
  getStage1Prompt, 
  getStage2Prompt, 
  getStage3Prompt, 
  getStage4Prompt,
  getStage5Prompt,
  getStage6Prompt,
  getStage7Prompt,
  type StagePromptResult
} from './stagePrompts'

/**
 * Initialize a new conversation state
 * // TODO: change later to intent_understanding
 */
export function initializeConversationState(): ConversationState {
  return {
    currentStage: 'project_understanding', 
    completedStages: []
  }
}

/**
 * Get the appropriate prompt for the current stage
 * Now async to support Notion loading
 * Returns both the prompt and whether a fallback was used
 */
export async function getStagePrompt(state: ConversationState, useCache: boolean = true): Promise<StagePromptResult> {
  switch (state.currentStage) {
    case 'intent_understanding':
      return await getStage1Prompt(useCache)
    case 'project_understanding':
      return await getStage2Prompt(useCache)
    case 'project_progress':
      return await getStage3Prompt(useCache)
    case 'underlying_problem':
      return await getStage4Prompt(state, useCache)
    case 'action':
      return await getStage5Prompt(useCache)
    case 'guidance':
      return await getStage6Prompt(state.wantsGuidance || false, useCache)
    case 'debrief':
      return await getStage7Prompt(useCache)
    default:
      return await getStage1Prompt(useCache)
  }
}

/**
 * Determine if a stage should be skipped based on current state
 */
export function shouldSkipStage(stage: WorkflowStage, state: ConversationState): boolean {
  switch (stage) {
    case 'project_understanding':
      // Skip if question is generic OR project description already exists
      return state.isGenericQuestion === true || state.hasProjectDescription === true
    
    case 'project_progress':
      // Skip if project phase is already known
      return state.projectPhase !== undefined
    
    case 'guidance':
      // Skip if user doesn't want guidance
      return state.wantsGuidance === false
    
    default:
      return false
  }
}

/**
 * Get the next stage in the workflow
 */
export function getNextStage(currentStage: WorkflowStage, state: ConversationState): WorkflowStage | null {
  const stageOrder: WorkflowStage[] = [
    'intent_understanding',
    'project_understanding',
    'project_progress',
    'underlying_problem',
    'action',
    'guidance',
    'debrief'
  ]
  
  const currentIndex = stageOrder.indexOf(currentStage)
  
  // Find next stage that shouldn't be skipped
  for (let i = currentIndex + 1; i < stageOrder.length; i++) {
    const nextStage = stageOrder[i]
    if (!shouldSkipStage(nextStage, state)) {
      return nextStage
    }
  }
  
  // No more stages
  return null
}

/**
 * Parse assistant response to extract structured data
 * This is a simple parser - in production you might want more robust parsing
 */
export function parseAssistantResponse(response: string, currentStage: WorkflowStage): Partial<ConversationState> {
  const extractedData: Partial<ConversationState> = {}
  
  switch (currentStage) {
    case 'intent_understanding':
      extractedData.intents = parseIntentCategorization(response)
      // Check if any intent is marked as generic
      if (extractedData.intents && extractedData.intents.length > 0) {
        extractedData.isGenericQuestion = extractedData.intents.some(i => i.generic)
      }
      break
    
    case 'project_understanding':
      extractedData.businessModel = parseBusinessModel(response)
      extractedData.hasProjectDescription = true
      break
    
    case 'project_progress':
      extractedData.projectPhase = parseProjectPhase(response)
      break
    
    case 'action':
      // Check if user wants guidance (simple keyword detection)
      const wantsGuidanceMatch = response.toLowerCase().match(/guidance|help|guide|support/)
      if (wantsGuidanceMatch) {
        extractedData.wantsGuidance = true
      }
      break
  }
  
  return extractedData
}

/**
 * Check if intent is compatible with project phase
 */
export function isIntentCompatibleWithPhase(intent: IntentCategory, phase: ProjectPhase): boolean {
  const mapping: Record<IntentCategory, ProjectPhase[]> = {
    'no_question': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'personality_assessment': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'project_assessment': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'next_steps': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'personal_efficiency': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'sell': ['test', 'launch', 'growth'],
    'funding': ['growth'],
    'meet_people': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'build_product': ['design', 'test', 'launch', 'growth'],
    'request_expertise': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'ideation': ['vision', 'research', 'design'],
    'other': ['vision', 'research', 'design', 'test', 'launch', 'growth']
  }
  
  return mapping[intent]?.includes(phase) || false
}

/**
 * Update conversation state after processing a stage
 */
export function updateConversationState(
  state: ConversationState, 
  extractedData: Partial<ConversationState>
): ConversationState {
  const updatedState = {
    ...state,
    ...extractedData
  }
  
  // Mark current stage as completed
  if (!updatedState.completedStages.includes(state.currentStage)) {
    updatedState.completedStages.push(state.currentStage)
  }
  
  // Move to next stage
  const nextStage = getNextStage(state.currentStage, updatedState)
  if (nextStage) {
    updatedState.currentStage = nextStage
  }
  
  return updatedState
}

// ============================================================================
// Parser helper functions
// ============================================================================

function parseIntentCategorization(response: string): IntentCategorization[] {
  const intents: IntentCategorization[] = []
  
  // Look for TOON format: intention_categorisation[N]{...}
  const toonMatch = response.match(/intention_categorisation\[\d+\]\{[^}]+\}([\s\S]*?)(?=\n\n|$)/i)
  
  if (toonMatch) {
    const lines = toonMatch[1].trim().split('\n')
    
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim())
      if (parts.length >= 3) {
        const category = normalizeIntentCategory(parts[0])
        const confidence = parseInt(parts[1]) || 0
        const generic = parts[2].toLowerCase() === 'yes'
        
        if (category && confidence > 50) {
          intents.push({ category, confidence, generic })
        }
      }
    }
  }
  
  return intents
}

function parseBusinessModel(response: string): any {
  // Simple parser for business_model TOON format
  const model: any = {}
  
  const fields = ['name', 'market_category', 'client_segment', 'problem', 
                  'value_proposition', 'differentiator', 'solution', 'pitch']
  
  for (const field of fields) {
    const regex = new RegExp(`${field}[:\\s]+([^\\n]+)`, 'i')
    const match = response.match(regex)
    if (match) {
      model[field] = match[1].trim()
    }
  }
  
  return Object.keys(model).length > 0 ? model : undefined
}

function parseProjectPhase(response: string): ProjectPhase | undefined {
  const phases: ProjectPhase[] = ['vision', 'research', 'design', 'test', 'launch', 'growth']
  const lowerResponse = response.toLowerCase()
  
  for (const phase of phases) {
    if (lowerResponse.includes(phase)) {
      return phase
    }
  }
  
  return undefined
}

function normalizeIntentCategory(category: string): IntentCategory | null {
  const normalized = category.toLowerCase().replace(/\s+/g, '_')
  
  const mapping: Record<string, IntentCategory> = {
    'no_question_specified': 'no_question',
    'no_question': 'no_question',
    'personality_assessment': 'personality_assessment',
    'project_assessment': 'project_assessment',
    'next_steps': 'next_steps',
    'personal_efficiency': 'personal_efficiency',
    'sell': 'sell',
    'funding': 'funding',
    'meet_people': 'meet_people',
    'build_the_product': 'build_product',
    'build_product': 'build_product',
    'request_expertise': 'request_expertise',
    'ideation': 'ideation',
    'other': 'other'
  }
  
  return mapping[normalized] || null
}

