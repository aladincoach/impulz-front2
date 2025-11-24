# Workflow Diagram

## Visual Representation of the 7-Stage Coaching Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER SENDS MESSAGE                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: INTENT UNDERSTANDING                                   │
│  ─────────────────────────────────                               │
│  • Categorize user's intent                                      │
│  • Detect if question is generic                                 │
│  • Output: intent categories with confidence levels              │
│                                                                   │
│  Skip: NEVER                                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Is Generic?   │
                    │ OR Project    │
                    │ Known?        │
                    └───┬───────┬───┘
                        │       │
                    YES │       │ NO
                        │       │
                        │       ▼
                        │   ┌─────────────────────────────────────┐
                        │   │ STAGE 2: PROJECT UNDERSTANDING      │
                        │   │ ────────────────────────────────    │
                        │   │ • Gather business model details     │
                        │   │ • Ask about problem, solution, etc. │
                        │   │ • Output: business model in TOON    │
                        │   │                                     │
                        │   │ Skip: If generic OR already known   │
                        │   └──────────────┬──────────────────────┘
                        │                  │
                        └──────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Project Phase │
                    │ Known?        │
                    └───┬───────┬───┘
                        │       │
                    YES │       │ NO
                        │       │
                        │       ▼
                        │   ┌─────────────────────────────────────┐
                        │   │ STAGE 3: PROJECT PROGRESS           │
                        │   │ ─────────────────────────────       │
                        │   │ • Ask what they've accomplished     │
                        │   │ • Categorize into phase:            │
                        │   │   vision → research → design →      │
                        │   │   test → launch → growth            │
                        │   │                                     │
                        │   │ Skip: If phase already known        │
                        │   └──────────────┬──────────────────────┘
                        │                  │
                        └──────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: UNDERLYING PROBLEM                                     │
│  ────────────────────────────                                    │
│  • Validate intent-phase compatibility                           │
│  • Check mapping:                                                │
│    - Funding → growth only                                       │
│    - Sell → test, launch, growth                                 │
│    - Build → design, test, launch, growth                        │
│    - Ideation → vision, research, design                         │
│                                                                   │
│  If INCOMPATIBLE:                                                │
│    → Challenge user (moving too fast)                            │
│    → Explain appropriate phases                                  │
│    → Suggest better approach                                     │
│                                                                   │
│  Skip: NEVER                                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 5: ACTION                                                 │
│  ────────────────                                                │
│  • Ask if they want action suggestions                           │
│  • Ask for available hours this week                             │
│  • Propose 3 priority actions                                    │
│  • Ask them to choose                                            │
│  • Ask if they want guidance                                     │
│                                                                   │
│  Skip: NEVER                                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Wants         │
                    │ Guidance?     │
                    └───┬───────┬───┘
                        │       │
                     NO │       │ YES
                        │       │
                        │       ▼
                        │   ┌─────────────────────────────────────┐
                        │   │ STAGE 6: GUIDANCE                   │
                        │   │ ─────────────────                   │
                        │   │ • Ask if they have a method         │
                        │   │ • If yes: comment and improve       │
                        │   │ • If no: provide tools/guides       │
                        │   │ • Offer simulated interview         │
                        │   │                                     │
                        │   │ Skip: If user doesn't want guidance │
                        │   └──────────────┬──────────────────────┘
                        │                  │
                        └──────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 7: DEBRIEF                                                │
│  ─────────────────                                               │
│  • Ask what they learned                                         │
│  • Ask how they feel                                             │
│  • Ask satisfaction level                                        │
│  • Schedule next session                                         │
│                                                                   │
│  Skip: NEVER (final stage)                                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  CONVERSATION │
                    │     ENDS      │
                    └───────────────┘
```

## State Flow

```
┌────────────────────────────────────────────────────────────────┐
│                     CONVERSATION STATE                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  currentStage: WorkflowStage                                   │
│  completedStages: WorkflowStage[]                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Extracted Data (accumulated across stages)               │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ • intents: IntentCategorization[]      (from Stage 1)    │ │
│  │ • isGenericQuestion: boolean           (from Stage 1)    │ │
│  │ • businessModel: BusinessModel         (from Stage 2)    │ │
│  │ • hasProjectDescription: boolean       (from Stage 2)    │ │
│  │ • projectPhase: ProjectPhase           (from Stage 3)    │ │
│  │ • selectedAction: string               (from Stage 5)    │ │
│  │ • wantsGuidance: boolean               (from Stage 5)    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Request Flow

```
┌─────────────┐
│   CLIENT    │
│  (Browser)  │
└──────┬──────┘
       │
       │ POST /api/chat
       │ { message, conversationHistory, sessionId }
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│                    SERVER: chat.post.ts                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Get/Create Session ID                                    │
│     └─> generateSessionId()                                  │
│                                                               │
│  2. Retrieve Conversation State                              │
│     └─> getConversationState(sessionId)                      │
│                                                               │
│  3. Build System Prompt                                      │
│     ├─> getBaseSystemPrompt()         (~400 chars)          │
│     └─> getStagePrompt(state)         (~400 chars)          │
│         Total: ~800 chars (vs 2500 in monolithic)           │
│                                                               │
│  4. Call Anthropic API                                       │
│     └─> client.messages.stream({                            │
│           system: basePrompt + stagePrompt,                 │
│           messages: conversationHistory + newMessage        │
│         })                                                   │
│                                                               │
│  5. Stream Response to Client                                │
│     └─> Server-Sent Events (SSE)                            │
│                                                               │
│  6. Parse Response                                           │
│     └─> parseAssistantResponse(response, currentStage)      │
│                                                               │
│  7. Update State                                             │
│     ├─> updateConversationState(state, extractedData)       │
│     └─> setConversationState(sessionId, updatedState)       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
       │
       │ SSE Stream
       │ data: { text: "..." }
       │
       ▼
┌─────────────┐
│   CLIENT    │
│  (Browser)  │
└─────────────┘
```

## Token Savings Visualization

```
MONOLITHIC APPROACH (Before)
┌────────────────────────────────────────────────────────────┐
│                    SYSTEM PROMPT                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Role + Mission + Tone + Constraints                  │  │
│  │ + Stage 1 Instructions                               │  │
│  │ + Stage 2 Instructions                               │  │
│  │ + Stage 3 Instructions                               │  │
│  │ + Stage 4 Instructions                               │  │
│  │ + Stage 5 Instructions                               │  │
│  │ + Stage 6 Instructions                               │  │
│  │ + Stage 7 Instructions                               │  │
│  │                                                       │  │
│  │ Total: ~2500 chars (~625 tokens)                     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                    Sent EVERY request ❌


WORKFLOW APPROACH (After)
┌────────────────────────────────────────────────────────────┐
│                    SYSTEM PROMPT                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ BASE PROMPT                                          │  │
│  │ ├─ Role + Mission + Tone + Core Constraints          │  │
│  │ │  (~400 chars, ~100 tokens)                         │  │
│  │ │                                                     │  │
│  │ └─ CURRENT STAGE PROMPT ONLY                         │  │
│  │    └─ Stage X Instructions                           │  │
│  │       (~400 chars, ~100 tokens)                      │  │
│  │                                                       │  │
│  │ Total: ~800 chars (~200 tokens)                      │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                    Sent EVERY request ✅

SAVINGS: 68% reduction in system prompt tokens
```

## Intent-Phase Compatibility Matrix

```
┌──────────────────┬───────┬─────────┬────────┬──────┬────────┬────────┐
│     INTENT       │ Vision│ Research│ Design │ Test │ Launch │ Growth │
├──────────────────┼───────┼─────────┼────────┼──────┼────────┼────────┤
│ Funding          │   ❌  │    ❌   │   ❌   │  ❌  │   ❌   │   ✅   │
│ Sell             │   ❌  │    ❌   │   ❌   │  ✅  │   ✅   │   ✅   │
│ Build Product    │   ❌  │    ❌   │   ✅   │  ✅  │   ✅   │   ✅   │
│ Ideation         │   ✅  │    ✅   │   ✅   │  ❌  │   ❌   │   ❌   │
│ Meet People      │   ✅  │    ✅   │   ✅   │  ✅  │   ✅   │   ✅   │
│ Next Steps       │   ✅  │    ✅   │   ✅   │  ✅  │   ✅   │   ✅   │
│ Project Assess   │   ✅  │    ✅   │   ✅   │  ✅  │   ✅   │   ✅   │
│ Personality      │   ✅  │    ✅   │   ✅   │  ✅  │   ✅   │   ✅   │
│ Personal Eff.    │   ✅  │    ✅   │   ✅   │  ✅  │   ✅   │   ✅   │
│ Request Expert   │   ✅  │    ✅   │   ✅   │  ✅  │   ✅   │   ✅   │
│ Other            │   ✅  │    ✅   │   ✅   │  ✅  │   ✅   │   ✅   │
└──────────────────┴───────┴─────────┴────────┴──────┴────────┴────────┘

✅ = Compatible (proceed to next stage)
❌ = Incompatible (challenge user, suggest better approach)
```

## Example Conversation Flow

```
USER: "I want to get funding for my startup"
  │
  ▼
STAGE 1: Intent Understanding
  → Detects: funding (80%), generic: no
  │
  ▼
STAGE 2: Project Understanding
  → Asks: "Tell me about your startup"
  → USER: "It's a SaaS for project management"
  → Extracts: businessModel = {...}
  │
  ▼
STAGE 3: Project Progress
  → Asks: "What have you accomplished?"
  → USER: "Just have an idea"
  → Extracts: projectPhase = "vision"
  │
  ▼
STAGE 4: Underlying Problem
  → Checks: funding + vision = ❌ INCOMPATIBLE
  → ASSISTANT: "You're trying to move too fast. Funding is 
               typically sought during the growth phase. 
               You're in the vision phase. Let's focus on 
               validating your idea first."
  │
  ▼
STAGE 5: Action
  → Proposes: 
     1. Interview 10 potential users
     2. Create landing page
     3. Build MVP prototype
  → USER chooses: "Interview users"
  → Asks: "Want guidance?" → USER: "Yes"
  │
  ▼
STAGE 6: Guidance
  → Provides: Interview script, tips, analysis framework
  → Offers: Simulated interview practice
  │
  ▼
STAGE 7: Debrief
  → Asks about learnings, feelings, satisfaction
  → Schedules next session
  │
  ▼
END
```

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│                   (pages/chat.vue)                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│                (server/api/chat.post.ts)                     │
│  • Request handling                                          │
│  • Session management                                        │
│  • Response streaming                                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   WORKFLOW LAYER                             │
│            (server/utils/workflowEngine.ts)                  │
│  • Stage progression logic                                   │
│  • Skip condition evaluation                                 │
│  • Response parsing                                          │
│  • State updates                                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PROMPT LAYER                              │
│         (server/utils/basePrompt.ts + stagePrompts.ts)       │
│  • Base system prompt                                        │
│  • Stage-specific prompts                                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    STATE LAYER                               │
│       (server/utils/conversationStateManager.ts)             │
│  • Session storage (in-memory)                               │
│  • State persistence                                         │
│  • State retrieval                                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     TYPE LAYER                               │
│            (server/utils/workflowTypes.ts)                   │
│  • TypeScript interfaces                                     │
│  • Type definitions                                          │
│  • Enums                                                     │
└─────────────────────────────────────────────────────────────┘
```

