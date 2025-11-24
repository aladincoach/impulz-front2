/**
 * Workflow types and interfaces for the coaching conversation system
 */

export type WorkflowStage = 
  | 'intent_understanding'
  | 'project_understanding'
  | 'project_progress'
  | 'underlying_problem'
  | 'action'
  | 'guidance'
  | 'debrief'

export type IntentCategory =
  | 'no_question'
  | 'personality_assessment'
  | 'project_assessment'
  | 'next_steps'
  | 'personal_efficiency'
  | 'sell'
  | 'funding'
  | 'meet_people'
  | 'build_product'
  | 'request_expertise'
  | 'ideation'
  | 'other'

export type ProjectPhase = 
  | 'vision'
  | 'research'
  | 'design'
  | 'test'
  | 'launch'
  | 'growth'

export interface IntentCategorization {
  category: IntentCategory
  confidence: number
  generic: boolean
}

export interface BusinessModel {
  name?: string
  market_category?: string
  client_segment?: string
  problem?: string
  value_proposition?: string
  differentiator?: string
  solution?: string
  pitch?: string
}

export interface ConversationState {
  currentStage: WorkflowStage
  intents?: IntentCategorization[]
  businessModel?: BusinessModel
  projectPhase?: ProjectPhase
  isGenericQuestion?: boolean
  hasProjectDescription?: boolean
  selectedAction?: string
  wantsGuidance?: boolean
  completedStages: WorkflowStage[]
}

export interface StageResult {
  shouldProceed: boolean
  nextStage?: WorkflowStage
  extractedData?: Partial<ConversationState>
}

