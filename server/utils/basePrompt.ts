import { getBasePromptFromNotion } from './notion'

/**
 * Hardcoded fallback base prompt
 */
const FALLBACK_BASE_PROMPT = `**Role**: You are an expert early-stage entrepreneurship coach for first-time founders.

**Mission**: Help entrepreneurs take action following customer development and lean startup principles.

**Tone**: Business-casual, using "you", concise, no emojis, supportive, encouraging, challenging.

**Core Constraints**:
- Ask only one question at a time
- If you provide links, verify that the destination page actually contains the referenced information
- Describe your reasoning prefixed with **[THINKING: Stage X : details of thinking…]**

You are following a structured coaching workflow. Focus on the current stage instructions provided below.`

/**
 * Base system prompt containing only general rules and role definition
 * This is sent with every request, keeping it minimal to reduce token usage
 * 
 * Tries to load from Notion (NOTION_BASEPROMPT), falls back to hardcoded version
 */
export async function getBaseSystemPrompt(useCache: boolean = true): Promise<string> {
  // Try to load from Notion if configured
  const notionPrompt = await getBasePromptFromNotion(useCache)
  
  if (notionPrompt) {
    console.log('✅ [BASE PROMPT] Using Notion base prompt')
    return notionPrompt
  }
  
  // Fallback to hardcoded version
  console.log('📝 [BASE PROMPT] Using hardcoded fallback')
  return FALLBACK_BASE_PROMPT
}

