/**
 * Capabilities Registry
 * Manages available capabilities and their triggers
 */

import type { SessionMemory } from '../memory'
import { generateFlashDiagnostic } from './flashDiagnostic'
import { generateActionPlan } from './actionPlan'

export type CapabilityType = 'flash_diagnostic' | 'action_plan'

export interface CapabilityResult {
  type: CapabilityType
  content: string
  quickButtons?: string[]
}

/**
 * Generate output for a specific capability
 */
export async function generateCapability(
  type: CapabilityType,
  memory: SessionMemory
): Promise<CapabilityResult> {
  switch (type) {
    case 'flash_diagnostic':
      return generateFlashDiagnostic(memory)
    case 'action_plan':
      return generateActionPlan(memory)
    default:
      throw new Error(`Unknown capability: ${type}`)
  }
}

/**
 * Get the system prompt addition for a capability
 */
export function getCapabilityPrompt(type: CapabilityType, memory: SessionMemory): string {
  switch (type) {
    case 'flash_diagnostic':
      return getFlashDiagnosticPrompt(memory)
    case 'action_plan':
      return getActionPlanPrompt(memory)
    default:
      return ''
  }
}

function getFlashDiagnosticPrompt(memory: SessionMemory): string {
  return `
## CAPABILITY TRIGGERED: Flash Diagnostic

You are now generating a flash diagnostic for this project.

Based on the memory state, provide:

### Structure
1. **Project Summary** - What you understood about their project (2-3 sentences)
2. **Current Phase Assessment** - Where they are in their journey
3. **Strengths Identified** - 2-3 key strengths based on their assets/skills/progress
4. **Gaps & Risks** - 2-3 main concerns or missing elements
5. **Top 3 Recommendations** - Prioritized, actionable advice

### Formatting
- Use bullet points for clarity
- Be direct and specific, not generic
- Reference their actual situation, not hypotheticals

### Quick Buttons
End with:
1. Go deeper into the diagnostic
2. Create an action plan
`
}

function getActionPlanPrompt(memory: SessionMemory): string {
  const phase = memory.project.phase || 'idée'
  const timeConstraint = memory.user.constraints.time || 'unknown availability'
  
  return `
## CAPABILITY TRIGGERED: Action Plan

You are now generating an action plan for a project in the "${phase}" phase.
User's time availability: ${timeConstraint}

Based on the memory state, provide:

### Structure
1. **Goal for the Next 2 Weeks** - One clear objective
2. **Action Items** (3-5 items)
   - Each action should have:
     - Title
     - Why it matters at this phase
     - Time estimate (in hours)
     - Expected outcome
3. **Dependencies** - What needs to happen first
4. **Success Criteria** - How to know if the 2-week sprint succeeded

### Phase-Specific Focus
- idée: Focus on validation, user research, problem definition
- MVP: Focus on building minimum viable version, first users
- traction: Focus on growth experiments, retention, metrics
- scale: Focus on systems, team, funding, expansion

### Quick Buttons
End with:
1. Get more details on action #1
2. Adjust the plan
3. Start a diagnostic
`
}

// Functions are imported above for internal use only
// If you need to import these functions, import directly from their source files:
// - generateFlashDiagnostic from './flashDiagnostic'
// - generateActionPlan from './actionPlan'


