/**
 * Stage-specific prompts for the coaching workflow
 * Each function returns only the instructions needed for that specific stage
 */

import type { ConversationState, IntentCategory, ProjectPhase } from './workflowTypes'

export function getStage1Prompt(): string {
  return `# **Stage 1 – Intent Understanding**

**Activity**: add a smiley to the prompt to make it more friendly and engaging. Determine the likely intent categories of the user request with a confidence level above 50%.

**Output format**: Follow this TOON structure and example for the user request "I want more money soon":

\`\`\`
intention_categorisation[category_count]{intention_category,confidence_level,generic}
funding,60,no
sell,50,no
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
}

export function getStage2Prompt(): string {
  return `# **Stage 2 – Understanding the Entrepreneurial Project**

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
}

export function getStage3Prompt(): string {
  return `# **Stage 3 – Project Progress**

**Activities**:
- Ask: *"What have you already accomplished working on this project?"*
- Categorize **project_phase** into:
    - vision
    - research
    - design
    - test
    - launch
    - growth`
}

export function getStage4Prompt(state: ConversationState): string {
  const intentPhaseMapping = getIntentPhaseMapping()
  
  return `# **Stage 4 – Underlying Problem**

**Activity**:
- Check whether the user's intent is consistent with their current project phase
- Current detected intents: ${state.intents?.map(i => i.category).join(', ') || 'unknown'}
- Current project phase: ${state.projectPhase || 'unknown'}

**Intent-Phase Compatibility Rules**:
${Object.entries(intentPhaseMapping).map(([intent, phases]) => 
  `- ${intent} → ${phases.join(', ')}`
).join('\n')}

**Actions**:
- If consistent → acknowledge and move to next stage
- If inconsistent → challenge the user's intent:
    - Explain they are trying to move too fast
    - Identify the **project_phase** based on what they have accomplished
    - Explain in which phases their intent makes more sense
    - Propose a more relevant underlying problem given their progress
    - Ask what they think about it`
}

export function getStage5Prompt(): string {
  return `# **Stage 5 – Action**

**Activities**:
- Ask whether they want suggestions for an action challenge for next week
- Ask for this week's available hours
- Propose **3 priority actions** aligned with their stage and feasible within 7 days given their availability
- Ask them to choose their challenge
- Ask whether they want guidance for this action`
}

export function getStage6Prompt(wantsGuidance: boolean): string {
  if (!wantsGuidance) {
    return `# **Stage 6 – Guidance**

The user does not want guidance. Proceed directly to Stage 7 (Debrief).`
  }
  
  return `# **Stage 6 – Guidance**

**Activities**:
- Ask whether they already have a proposed method to share
- If they do → comment on it and improve it
- If they don't → provide an explanation and/or a tool / artifact / script / guide (one or both)
- Propose a simulated interview or interactive training`
}

export function getStage7Prompt(): string {
  return `# **Stage 7 – Debrief**

**Activities**:
- Ask what they learned from this session
- Ask how they feel
- Ask their satisfaction level
- Schedule the next session based on their availability`
}

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

