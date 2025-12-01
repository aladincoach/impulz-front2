/**
 * Stage-specific prompts for the coaching workflow
 * Each function returns only the instructions needed for that specific stage
 * 
 * Tries to load from Notion (NOTION_STAGEPROMPT_1, etc.), falls back to hardcoded versions
 */

import type { ConversationState, IntentCategory, ProjectPhase } from './workflowTypes'
import { getStagePromptFromNotion } from './notion'

/**
 * Return type for stage prompt functions
 */
export interface StagePromptResult {
  prompt: string
  usedFallback: boolean
}

/**
 * Hardcoded fallback prompts
 */
const FALLBACK_STAGE1_PROMPT = `# **Stage 1 – Intent Understanding - fallback prompt**

**Activity**: 
- display a error emoji
- determine the likely intent categories of the user request with a confidence level above 50%.
- if the user request is not clear, ask for more information.

**Output format**: Follow this TOON structure and example for the user request "I want more money soon":

\`\`\`
intention_categorisation[category_count]{intention_category,confidence_level}
funding,60
sell,50
\`\`\`

- **intention_category** (option variable): choose among
    - No question specified
    - Personality assessment
    - Project assessment
    - Next steps
    - Personal efficiency
    - Sell
    - Funding
    - Meet people
    - Build the product
    - Request expertise
    - Ideation
    - Other
- **confidence_level** (numerical): your confidence in the selected category
- **generic** (boolean): "yes" if the question is not linked to a specific project of the user`

const FALLBACK_STAGE2_PROMPT = `# **Stage 2 – Understanding the Entrepreneurial Project - fallback prompt**

**Activity**:
- Make the user clarify the concept and propose uploading documents if they want
- Update the business model according to the strict user inputs

**Output**: TOON format with the following columns:

\`\`\`
business_model{name, market_category, client_segment, problem, value_proposition, differentiator, solution, pitch}
\`\`\`

Where:
- **name** (short text): product name or code name
- **market_category** (option): webapp, mobileapp, saas, marketplace, physical store, physical place, consulting, …
- **client_segment** (short text): description of the priority target audience (can be multiple segments)
- **problem** (long text): the problem the product solves
- **value_proposition** (long text): benefit for the client when solving this problem
- **differentiator** (long text): the "secret sauce"; how the product solves the problem in a uniquely superior way
- **solution** (long text): feature list
- **pitch** (long text): a synthesis (<200 words) of segment, problem, value proposition, product category, differentiator`

const FALLBACK_STAGE3_PROMPT = `# **Stage 3 – Project Progress - fallback prompt**

**Activities**:
- Ask: *"What have you already accomplished working on this project?"*
- Categorize **project_phase** into:
    - vision
    - research
    - design
    - test
    - launch
    - growth`

const FALLBACK_STAGE4_PROMPT_TEMPLATE = `# **Stage 4 – Underlying Problem - fallback prompt**

**Activity**:
- Check whether the user's intent is consistent with their current project phase
- Current detected intents: {{INTENTS}}
- Current project phase: {{PHASE}}

**Intent-Phase Compatibility Rules**:
{{COMPATIBILITY_RULES}}

**Actions**:
- If consistent → acknowledge and move to next stage
- If inconsistent → challenge the user's intent:
    - Explain they are trying to move too fast
    - Identify the **project_phase** based on what they have accomplished
    - Explain in which phases their intent makes more sense
    - Propose a more relevant underlying problem given their progress
    - Ask what they think about it`

const FALLBACK_STAGE5_PROMPT = `# **Stage 5 – Action - fallback prompt**

**Activities**:
- Ask whether they want suggestions for an action challenge for next week
- Ask for this week's available hours
- Propose **3 priority actions** aligned with their stage and feasible within 7 days given their availability
- Ask them to choose their challenge
- Ask whether they want guidance for this action`

const FALLBACK_STAGE6_PROMPT_NO_GUIDANCE = `# **Stage 6 – Guidance - fallback prompt**

The user does not want guidance. Proceed directly to Stage 7 (Debrief).`

const FALLBACK_STAGE6_PROMPT = `# **Stage 6 – Guidance - fallback prompt**

**Activities**:
- Ask whether they already have a proposed method to share
- If they do → comment on it and improve it
- If they don't → provide an explanation and/or a tool / artifact / script / guide (one or both)
- Propose a simulated interview or interactive training`

const FALLBACK_STAGE7_PROMPT = `# **Stage 7 – Debrief - fallback prompt**

**Activities**:
- Ask what they learned from this session
- Ask how they feel
- Ask their satisfaction level
- Schedule the next session based on their availability`

/**
 * Helper function to get intent-phase compatibility mapping
 */
function getIntentPhaseMapping(): Record<string, ProjectPhase[]> {
  return {
    'No question specified': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'Personality assessment': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'Project assessment': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'Next steps': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'Personal efficiency': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'Sell': ['test', 'launch', 'growth'],
    'Funding': ['growth'],
    'Meet people': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'Build the product': ['design', 'test', 'launch', 'growth'],
    'Request expertise': ['vision', 'research', 'design', 'test', 'launch', 'growth'],
    'Ideation': ['vision', 'research', 'design'],
    'Other': ['vision', 'research', 'design', 'test', 'launch', 'growth']
  }
}

/**
 * Stage 1 prompt - tries Notion first, falls back to hardcoded
 */
export async function getStage1Prompt(useCache: boolean = true): Promise<StagePromptResult> {
  const notionPrompt = await getStagePromptFromNotion(1, useCache)
  if (notionPrompt) {
    console.log('✅ [STAGE 1] Using Notion prompt')
    return { prompt: notionPrompt, usedFallback: false }
  }
  console.log('📝 [STAGE 1] Using hardcoded fallback')
  return { prompt: FALLBACK_STAGE1_PROMPT, usedFallback: true }
}

/**
 * Stage 2 prompt - tries Notion first, falls back to hardcoded
 */
export async function getStage2Prompt(useCache: boolean = true): Promise<StagePromptResult> {
  const notionPrompt = await getStagePromptFromNotion(2, useCache)
  if (notionPrompt) {
    console.log('✅ [STAGE 2] Using Notion prompt')
    return { prompt: notionPrompt, usedFallback: false }
  }
  console.log('📝 [STAGE 2] Using hardcoded fallback')
  return { prompt: FALLBACK_STAGE2_PROMPT, usedFallback: true }
}

/**
 * Stage 3 prompt - tries Notion first, falls back to hardcoded
 */
export async function getStage3Prompt(useCache: boolean = true): Promise<StagePromptResult> {
  const notionPrompt = await getStagePromptFromNotion(3, useCache)
  if (notionPrompt) {
    console.log('✅ [STAGE 3] Using Notion prompt')
    return { prompt: notionPrompt, usedFallback: false }
  }
  console.log('📝 [STAGE 3] Using hardcoded fallback')
  return { prompt: FALLBACK_STAGE3_PROMPT, usedFallback: true }
}

/**
 * Stage 4 prompt - tries Notion first, falls back to hardcoded
 * Includes dynamic state information
 */
export async function getStage4Prompt(state: ConversationState, useCache: boolean = true): Promise<StagePromptResult> {
  const intentPhaseMapping = getIntentPhaseMapping()
  
  // Get base prompt from Notion or fallback
  let prompt = await getStagePromptFromNotion(4, useCache)
  let usedFallback = false
  
  if (prompt) {
    console.log('✅ [STAGE 4] Using Notion prompt')
  } else {
    console.log('📝 [STAGE 4] Using hardcoded fallback')
    prompt = FALLBACK_STAGE4_PROMPT_TEMPLATE
    usedFallback = true
  }
  
  // Replace placeholders with actual state data
  const intents = state.intents?.map(i => i.category).join(', ') || 'unknown'
  const phase = state.projectPhase || 'unknown'
  const compatibilityRules = Object.entries(intentPhaseMapping)
    .map(([intent, phases]) => `- ${intent} → ${phases.join(', ')}`)
    .join('\n')
  
  const finalPrompt = prompt
    .replace('{{INTENTS}}', intents)
    .replace('{{PHASE}}', phase)
    .replace('{{COMPATIBILITY_RULES}}', compatibilityRules)
  
  return { prompt: finalPrompt, usedFallback }
}

/**
 * Stage 5 prompt - tries Notion first, falls back to hardcoded
 */
export async function getStage5Prompt(useCache: boolean = true): Promise<StagePromptResult> {
  const notionPrompt = await getStagePromptFromNotion(5, useCache)
  if (notionPrompt) {
    console.log('✅ [STAGE 5] Using Notion prompt')
    return { prompt: notionPrompt, usedFallback: false }
  }
  console.log('📝 [STAGE 5] Using hardcoded fallback')
  return { prompt: FALLBACK_STAGE5_PROMPT, usedFallback: true }
}

/**
 * Stage 6 prompt - tries Notion first, falls back to hardcoded
 * Handles guidance preference
 */
export async function getStage6Prompt(wantsGuidance: boolean, useCache: boolean = true): Promise<StagePromptResult> {
  if (!wantsGuidance) {
    return { prompt: FALLBACK_STAGE6_PROMPT_NO_GUIDANCE, usedFallback: true }
  }
  
  const notionPrompt = await getStagePromptFromNotion(6, useCache)
  if (notionPrompt) {
    console.log('✅ [STAGE 6] Using Notion prompt')
    return { prompt: notionPrompt, usedFallback: false }
  }
  console.log('📝 [STAGE 6] Using hardcoded fallback')
  return { prompt: FALLBACK_STAGE6_PROMPT, usedFallback: true }
}

/**
 * Stage 7 prompt - tries Notion first, falls back to hardcoded
 */
export async function getStage7Prompt(useCache: boolean = true): Promise<StagePromptResult> {
  const notionPrompt = await getStagePromptFromNotion(7, useCache)
  if (notionPrompt) {
    console.log('✅ [STAGE 7] Using Notion prompt')
    return { prompt: notionPrompt, usedFallback: false }
  }
  console.log('📝 [STAGE 7] Using hardcoded fallback')
  return { prompt: FALLBACK_STAGE7_PROMPT, usedFallback: true }
}

