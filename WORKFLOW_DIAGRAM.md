# Workflow Diagram

## Architecture Actuelle du Système de Coaching

Ce document décrit le flux réel de traitement des messages utilisateur dans le système Impulz, basé sur le **Reasoning Engine** avec gestion de mémoire, backlog de questions, et capabilities.

## Request Flow (Flux de Requête)

```
┌─────────────┐
│   CLIENT    │
│  (Browser)  │
│ pages/chat.vue
└──────┬──────┘
       │
       │ POST /api/chat
       │ {
       │   message: string
       │   conversationHistory: Message[]
       │   sessionId?: string
       │   projectId?: string
       │   topicId: string (required)
       │   locale?: string
       │ }
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    SERVER: chat.post.ts                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Validation                                                │
│     ├─> Check message exists                                 │
│     └─> Check topicId exists (required)                      │
│                                                               │
│  2. Session Management                                        │
│     ├─> Generate sessionId:                                  │
│     │     generateSessionId(conversationHistory)              │
│     │     OR use provided sessionId                          │
│     ├─> Add topicId to sessionId:                            │
│     │     sessionId = `${baseSessionId}_topic_${topicId}`    │
│     └─> Get session: getSession(sessionId)                   │
│         └─> Returns SessionState with memory & questions     │
│                                                               │
│  3. Supabase Integration                                      │
│     ├─> Find/Create conversation by topic_id + session_id    │
│     ├─> Save user message to messages table                  │
│     └─> Get conversationId for later use                     │
│                                                               │
│  4. Capability Check                                         │
│     └─> shouldTriggerCapability(sessionId, message)          │
│         ├─> Checks for keywords: "diagnostic", "action plan"│
│         ├─> Validates memory sufficiency                     │
│         └─> Returns: { capability, reason }                   │
│                                                               │
│  5. Build System Prompt                                      │
│     └─> buildSystemPrompt(sessionId, useCache, locale)      │
│         └─> reasoningEngine.ts                               │
│             ├─> getBasePromptFromNotion() (~400-800 chars)    │
│             ├─> getKnowledgeBase() (entries from Notion DB)  │
│             ├─> buildMemoryContext(session.memory)           │
│             ├─> buildBacklogContext(session.questions)       │
│             ├─> buildKnowledgeBaseContext(kbEntries)        │
│             ├─> buildInstructions(session.memory)            │
│             └─> buildLanguageInstructions(locale)           │
│                                                               │
│  6. Add Capability Prompt (if triggered)                     │
│     └─> getCapabilityPrompt(capability, session.memory)     │
│         └─> Adds specific instructions for capability        │
│                                                               │
│  7. Call Anthropic API                                       │
│     └─> client.messages.stream({                            │
│           model: 'claude-sonnet-4-20250514',                │
│           system: systemPrompt (complete),                   │
│           messages: conversationHistory + newMessage         │
│         })                                                   │
│                                                               │
│  8. Stream Response to Client                                │
│     └─> Server-Sent Events (SSE)                            │
│         ├─> Send metadata: { sessionId }                     │
│         ├─> Stream text chunks: { text: "..." }             │
│         └─> Send done signal: [DONE]                        │
│                                                               │
│  9. Post-Process Response                                    │
│     └─> processResponse(sessionId, fullResponse, ...)       │
│         ├─> parseMemoryUpdates(response)                     │
│         │   └─> Extracts <memory_update> tags               │
│         ├─> updateMemory(sessionId, updates, projectId)      │
│         │   └─> Updates SessionState.memory                 │
│         │   └─> Optionally saves to Supabase projects table │
│         ├─> parseQuestionBacklog(response)                   │
│         │   └─> Extracts <question_backlog> tags            │
│         ├─> updateQuestionBacklog(sessionId, newQuestions)  │
│         │   └─> Updates SessionState.questions               │
│         └─> Returns cleanResponse (tags removed)            │
│                                                               │
│  10. Save to Supabase                                        │
│      ├─> Save assistant message to messages table           │
│      └─> Create challenge document if capability triggered   │
│          └─> Saves as action_plan or flash_diagnostic       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
       │
       │ SSE Stream
       │ data: { text: "..." }
       │ data: [DONE]
       │
       ▼
┌─────────────┐
│   CLIENT    │
│  (Browser)  │
│ Updates UI │
└─────────────┘
```

## Architecture Layers (Couches d'Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│                   (pages/chat.vue)                           │
│  • Vue component with chat interface                         │
│  • Handles SSE stream reception                              │
│  • Manages conversation history                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│                (server/api/chat.post.ts)                     │
│  • Request handling                                          │
│  • Session management                                        │
│  • Response streaming                                        │
│  • Supabase integration                                      │
│  • Capability triggering                                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   REASONING LAYER                            │
│            (server/utils/reasoningEngine.ts)                 │
│  • System prompt construction                               │
│  • Memory context building                                  │
│  • Question backlog management                              │
│  • Knowledge base integration                               │
│  • Response processing & parsing                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MEMORY LAYER                              │
│         (server/utils/memory.ts)                             │
│  • Session state management                                 │
│  • Memory structure (project, progress, user)               │
│  • Question backlog operations                               │
│  • Memory completeness checks                               │
│  • Session ID generation                                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE LAYER                           │
│         (server/utils/notion.ts)                            │
│  • Base prompt from Notion                                  │
│  • Knowledge base entries (coaching recommendations)        │
│  • Caching mechanism                                         │
│  • Notion API integration                                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  CAPABILITIES LAYER                           │
│      (server/utils/capabilities/index.ts)                   │
│  • Flash diagnostic generation                               │
│  • Action plan generation                                    │
│  • Capability prompt building                                │
│  • Capability triggering logic                               │
└─────────────────────────────────────────────────────────────┘
```

## Memory Structure (Structure de Mémoire)

```
┌────────────────────────────────────────────────────────────────┐
│                     SESSION STATE                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  sessionId: string                                              │
│  createdAt: Date                                               │
│  updatedAt: Date                                               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ MEMORY: SessionMemory                                    │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │ project: ProjectMemory                                   │  │
│  │   ├─ name?: string                                       │  │
│  │   ├─ description?: string                                │  │
│  │   ├─ features?: string[]                                 │  │
│  │   ├─ market_category?: string                           │  │
│  │   ├─ target_segment?: string                            │  │
│  │   ├─ problem?: string                                    │  │
│  │   ├─ solution?: string                                   │  │
│  │   └─ phase?: ProjectPhase                                │  │
│  │      ('vision' | 'research' | 'design' | 'test' |        │  │
│  │       'launch' | 'growth')                               │  │
│  │                                                           │  │
│  │ progress: ProgressMemory                                 │  │
│  │   ├─ activities: string[]                                │  │
│  │   └─ milestones: string[]                                │  │
│  │                                                           │  │
│  │ user: UserMemory                                         │  │
│  │   ├─ skills: string[]                                    │  │
│  │   ├─ assets: string[]                                    │  │
│  │   └─ constraints: {                                       │  │
│  │       time?: string                                      │  │
│  │       budget?: string                                    │  │
│  │       geography?: string                                 │  │
│  │       lacking?: string[]                                  │  │
│  │     }                                                     │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ QUESTIONS: QuestionItem[]                                │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │ Each question has:                                        │  │
│  │   ├─ id: string                                          │  │
│  │   ├─ question: string                                    │  │
│  │   ├─ topic: 'project' | 'progress' | 'user' |           │  │
│  │   │         'constraints'                                │  │
│  │   ├─ status: 'pending' | 'in_progress' |                 │  │
│  │   │         'completed' | 'skipped'                      │  │
│  │   ├─ memoryField?: string (e.g., "project.description") │  │
│  │   └─ answer?: string                                     │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## System Prompt Structure (Structure du Prompt Système)

```
┌────────────────────────────────────────────────────────────┐
│                    SYSTEM PROMPT                            │
│  (Built by reasoningEngine.ts)                              │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. BASE PROMPT (~400-800 chars)                            │
│     └─> From Notion (NOTION_BASEPROMPT)                    │
│         OR fallback DEFAULT_BASE_PROMPT                     │
│                                                             │
│  2. REASONING INSTRUCTIONS                                  │
│     └─> Response format with tags:                         │
│         • <thinking>...</thinking>                         │
│         • <memory_update>...</memory_update>                │
│         • <question_backlog>...</question_backlog>         │
│                                                             │
│  3. LANGUAGE INSTRUCTIONS                                  │
│     └─> Based on locale parameter                          │
│                                                             │
│  4. MEMORY CONTEXT                                          │
│     └─> Current state of:                                  │
│         • Project information                               │
│         • Progress activities                               │
│         • User profile (skills, assets)                     │
│         • Constraints                                       │
│         • Information gaps                                 │
│                                                             │
│  5. QUESTION BACKLOG CONTEXT                                │
│     └─> Current question being asked                       │
│     └─> Pending questions (top 5)                          │
│     └─> Recently completed questions                       │
│                                                             │
│  6. KNOWLEDGE BASE CONTEXT                                  │
│     └─> List of coaching recommendations                   │
│     └─> Grouped by theme                                   │
│     └─> Entry index for matching                           │
│                                                             │
│  7. CAPABILITIES INSTRUCTIONS                               │
│     └─> Flash Diagnostic readiness                         │
│     └─> Action Plan readiness                              │
│     └─> Current turn instructions                          │
│                                                             │
│  8. CAPABILITY PROMPT (if triggered)                        │
│     └─> Specific instructions for:                         │
│         • flash_diagnostic                                  │
│         • action_plan                                       │
│                                                             │
│  Total: ~2000-4000 chars (varies with memory/kb size)      │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Response Processing Flow (Flux de Traitement de la Réponse)

```
┌────────────────────────────────────────────────────────────┐
│              CLAUDE RESPONSE                                │
│  (Streamed text with embedded tags)                        │
└───────────────────────────┬────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────┐
│         processResponse()                                   │
│         (reasoningEngine.ts)                                │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Parse Memory Updates                                    │
│     └─> parseMemoryUpdates(response)                       │
│         ├─> Extract <memory_update> tags                    │
│         ├─> Parse JSON: {"project.name": "...", ...}       │
│         └─> Convert to SessionMemory structure              │
│                                                             │
│  2. Update Memory                                           │
│     └─> updateMemory(sessionId, updates, projectId)       │
│         ├─> Deep merge with existing memory                 │
│         ├─> Update SessionState                             │
│         └─> Optionally save to Supabase projects table     │
│                                                             │
│  3. Parse Question Backlog                                  │
│     └─> parseQuestionBacklog(response)                     │
│         ├─> Extract <question_backlog> tags                 │
│         └─> Parse JSON array: ["question1", ...]           │
│                                                             │
│  4. Update Question Backlog                                 │
│     └─> updateQuestionBacklog(sessionId, newQuestions)    │
│         ├─> Preserve completed/skipped questions            │
│         ├─> Replace pending with new list                   │
│         └─> Mark first question as "in_progress"            │
│                                                             │
│  5. Clean Response                                          │
│     └─> Remove <memory_update> tags (keep thinking/backlog)│
│                                                             │
│  6. Return                                                  │
│     └─> { cleanResponse, memoryUpdated, backlogUpdated }   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Capability System (Système de Capabilities)

```
┌────────────────────────────────────────────────────────────┐
│           CAPABILITY TRIGGERING                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  User message analyzed for keywords:                        │
│  • "diagnostic", "diagnos", "assess" → flash_diagnostic    │
│  • "action plan", "next steps", "plan d'action" →          │
│    action_plan                                              │
│                                                             │
│  Memory sufficiency check:                                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ flash_diagnostic requires:                            │ │
│  │   ✓ project.description                              │ │
│  │   ✓ at least 2 progress.activities                   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ action_plan requires:                                 │ │
│  │   ✓ project.description                              │ │
│  │   ✓ project.phase                                    │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                             │
│  If sufficient:                                             │
│  └─> Add capability prompt to system prompt               │
│                                                             │
│  After response:                                            │
│  └─> Create challenge document in Supabase                │
│      • document_type: 'action_plan' | 'flash_diagnostic'    │
│      • content: full response                              │
│      • expires_at: 7 days from now                         │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Knowledge Base Integration (Intégration de la Base de Connaissances)

```
┌────────────────────────────────────────────────────────────┐
│              KNOWLEDGE BASE                                 │
│         (Notion Database)                                   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Structure:                                                 │
│  • Entries fetched from Notion DB                          │
│  • Cached for performance (5 min default)                  │
│                                                             │
│  Each Entry Contains:                                       │
│  • titre: Title                                            │
│  • thematique: Theme/category                              │
│  • question_posee: Main question                           │
│  • variantes_questions: Question variants                 │
│  • probleme_sous_jacent: Underlying problem                 │
│  • recommandation_impulz: Recommendation                   │
│  • punchline: Key insight                                  │
│  • maturite: Compatible phases                             │
│  • challenge_utilisateur: Action challenge                  │
│                                                             │
│  Usage in Prompt:                                           │
│  • Listed in context for matching                          │
│  • LLM matches user question to entries                    │
│  • Validates phase compatibility                           │
│  • Uses recommendation if match found                     │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Example Conversation Flow (Exemple de Flux de Conversation)

```
USER: "I want to launch my SaaS product"
  │
  ▼
SESSION CREATED
  ├─> sessionId generated
  ├─> Default memory initialized (empty)
  └─> Default question backlog created
  │
  ▼
SYSTEM PROMPT BUILT
  ├─> Base prompt from Notion
  ├─> Memory context (mostly empty, shows gaps)
  ├─> Question backlog (7 default questions)
  ├─> Knowledge base entries
  └─> Capabilities status (not ready)
  │
  ▼
CLAUDE RESPONSE
  ├─> <thinking>Analyzes user message...</thinking>
  ├─> <memory_update>{"project.description": "..."}</memory_update>
  ├─> <question_backlog>["What phase are you in?", ...]</question_backlog>
  └─> Natural response asking about project details
  │
  ▼
RESPONSE PROCESSED
  ├─> Memory updated with project.description
  ├─> Question backlog updated
  └─> Clean response sent to user
  │
  ▼
USER: "I'm in the MVP phase, have built a prototype"
  │
  ▼
SYSTEM PROMPT BUILT (updated)
  ├─> Memory context now includes:
  │   • project.description
  │   • project.phase: "test" (MVP = test phase)
  │   • progress.activities: ["built prototype"]
  └─> Question backlog updated
  │
  ▼
CLAUDE RESPONSE
  ├─> <memory_update>{"project.phase": "test", ...}</memory_update>
  ├─> Knowledge base entry matched (if relevant)
  └─> Provides phase-specific advice
  │
  ▼
USER: "Can you give me a diagnostic?"
  │
  ▼
CAPABILITY CHECK
  ├─> Keyword detected: "diagnostic"
  ├─> Memory check: ✓ description, ✓ 2+ activities
  └─> Capability triggered: flash_diagnostic
  │
  ▼
SYSTEM PROMPT BUILT (with capability)
  └─> Adds flash_diagnostic instructions
  │
  ▼
CLAUDE RESPONSE
  ├─> Generates structured diagnostic
  └─> Includes: summary, phase, strengths, gaps, recommendations
  │
  ▼
POST-PROCESS
  ├─> Challenge document created in Supabase
  └─> Document type: flash_diagnostic
```

## Key Differences from Old Workflow System

### Old System (Documented but Not Used)
- ❌ 7-stage workflow progression
- ❌ Stage-based prompts
- ❌ ConversationState with stages
- ❌ Stage skip logic

### Current System (Actually Implemented)
- ✅ Memory-based reasoning
- ✅ Question backlog system
- ✅ Capability triggers (diagnostic, action plan)
- ✅ Knowledge base integration
- ✅ Session-based memory persistence
- ✅ Supabase integration for conversations & challenges

## Files Involved in Current Flow

1. **`server/api/chat.post.ts`** - API endpoint, request handling
2. **`server/utils/reasoningEngine.ts`** - System prompt building, response processing
3. **`server/utils/memory.ts`** - Session state, memory operations, question backlog
4. **`server/utils/notion.ts`** - Notion integration (prompts, knowledge base)
5. **`server/utils/capabilities/index.ts`** - Capability system
6. **`server/utils/supabase.ts`** - Database operations
7. **`pages/chat.vue`** - Frontend chat interface

## Configuration

### Environment Variables

```bash
# Anthropic API
ANTHROPIC_API_KEY=your_key

# Notion Integration (optional)
NOTION_API_KEY=your_key
NOTION_BASEPROMPT=page_id
NOTION_KNOWLEDGE_BASE=database_id
NOTION_CACHE_SECONDS=300

# Supabase (required)
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
```

### Runtime Config

```typescript
// nuxt.config.ts
runtimeConfig: {
  systemPromptCache: process.env.SYSTEM_PROMPT_CACHE,
  public: {
    useWorkflow: process.env.USE_WORKFLOW !== 'false' // Not currently used
  }
}
```

---

**Note**: Ce document reflète l'architecture actuelle basée sur le Reasoning Engine. L'ancien système de workflow (7 stages) existe toujours dans le codebase (`workflowEngine.ts`, `stagePrompts.ts`) mais n'est pas utilisé dans le flux de production.

