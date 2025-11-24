# Workflow-Based System Prompt Refactoring

## Overview

This refactoring breaks down the monolithic system prompt into a **workflow-based architecture** that significantly reduces the prompt size sent to Anthropic on each request.

### Benefits

1. **Reduced Token Usage**: Instead of sending the entire ~2500 character prompt every time, we now send:
   - Base prompt (~400 chars) + Current stage prompt (~300-600 chars)
   - **Savings: ~60-75% reduction in system prompt tokens**

2. **Better Stage Management**: Programmatic workflow control with automatic stage progression and skip logic

3. **Maintainability**: Each stage is isolated in its own function, making updates easier

4. **State Persistence**: Conversation state is tracked across requests

## Architecture

### Core Components

```
server/utils/
├── workflowTypes.ts              # TypeScript types and interfaces
├── basePrompt.ts                 # Minimal base system prompt
├── stagePrompts.ts               # Stage-specific prompt generators
├── workflowEngine.ts             # Workflow logic and state management
└── conversationStateManager.ts   # Session state persistence
```

### Workflow Stages

1. **Intent Understanding** - Categorize user's intent
2. **Project Understanding** - Gather business model details (skippable)
3. **Project Progress** - Determine project phase (skippable)
4. **Underlying Problem** - Validate intent-phase compatibility
5. **Action** - Propose action challenges
6. **Guidance** - Provide detailed guidance (skippable)
7. **Debrief** - Session wrap-up

### Stage Skip Logic

The system automatically skips stages based on conditions:

- **Stage 2 (Project Understanding)**: Skipped if question is generic OR project already described
- **Stage 3 (Project Progress)**: Skipped if project phase already known
- **Stage 6 (Guidance)**: Skipped if user doesn't want guidance

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Enable workflow-based system (default: true)
USE_WORKFLOW=true

# Use cached system prompt for legacy mode (default: false)
SYSTEM_PROMPT_CACHE=false

# Anthropic API Key
ANTHROPIC_API_KEY=your_api_key_here
```

### Runtime Configuration

The system is configured in `nuxt.config.ts`:

```typescript
runtimeConfig: {
  systemPromptCache: process.env.SYSTEM_PROMPT_CACHE,
  public: {
    useWorkflow: process.env.USE_WORKFLOW !== 'false'
  }
}
```

## Usage

### API Request Format

The chat API now accepts an optional `sessionId` parameter:

```typescript
POST /api/chat

{
  "message": "I want to launch my product",
  "conversationHistory": [...],
  "sessionId": "optional_session_id"  // New parameter
}
```

If `sessionId` is not provided, one will be generated automatically based on the conversation.

### Conversation State

The system maintains state across requests:

```typescript
interface ConversationState {
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
```

### State Persistence

Currently uses in-memory storage (Map). For production:

1. **Redis**: Fast, session-based storage
2. **Database**: PostgreSQL, MongoDB for persistent storage
3. **Cookies/JWT**: Client-side state management

Example Redis implementation:

```typescript
// conversationStateManager.ts
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function getConversationState(sessionId: string): Promise<ConversationState> {
  const state = await redis.get(`session:${sessionId}`)
  return state ? JSON.parse(state) : initializeConversationState()
}

export async function setConversationState(sessionId: string, state: ConversationState): Promise<void> {
  await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(state)) // 1 hour TTL
}
```

## How It Works

### Request Flow

1. **Request arrives** with message and conversation history
2. **Session identified** via sessionId or generated from history
3. **State retrieved** from state manager
4. **Current stage determined** from conversation state
5. **Prompt constructed**:
   - Base prompt (general rules)
   - Stage-specific prompt (current stage only)
6. **Request sent to Anthropic** with minimal prompt
7. **Response streamed** back to client
8. **Response parsed** to extract structured data
9. **State updated** and next stage determined
10. **State persisted** for next request

### Stage Progression Example

```
User: "I want to get funding for my startup"

Stage 1 (Intent Understanding):
→ Detects intent: "funding" (confidence: 80%)
→ Extracts: isGenericQuestion = false
→ Next: Stage 2

Stage 2 (Project Understanding):
→ Asks about the business model
→ User provides details
→ Extracts: businessModel = {...}
→ Next: Stage 3

Stage 3 (Project Progress):
→ Asks what they've accomplished
→ User: "Just have an idea"
→ Extracts: projectPhase = "vision"
→ Next: Stage 4

Stage 4 (Underlying Problem):
→ Checks: funding intent + vision phase = INCOMPATIBLE
→ Challenges user: "You're trying to move too fast..."
→ Suggests: Focus on research and validation first
→ Next: Stage 5 (after user acknowledges)

... and so on
```

## Backward Compatibility

The system maintains backward compatibility with the old monolithic prompt:

```typescript
// To use legacy mode
USE_WORKFLOW=false
SYSTEM_PROMPT_CACHE=true
```

This will use the original `getWorkflowPrompt()` function from `systemPrompt.ts`.

## Testing

### Manual Testing

1. Start the dev server: `npm run dev`
2. Open the chat interface
3. Monitor console logs for workflow stages:
   ```
   🔄 [WORKFLOW] Session: session_xyz
   🔄 [WORKFLOW] Current stage: intent_understanding
   🔄 [WORKFLOW] Completed stages: 
   ```

### Test Scenarios

1. **Generic Question** (should skip stages 2-3):
   - "What is customer development?"
   
2. **Project-Specific Question** (full workflow):
   - "I want to launch my SaaS product"
   
3. **Inconsistent Intent** (should challenge):
   - User in "vision" phase asks about "funding"
   
4. **Skip Guidance** (should skip stage 6):
   - User says "no" when asked about guidance

## Performance Metrics

### Token Savings

**Before (Monolithic)**:
- System prompt: ~2500 chars (~625 tokens)
- Per request cost: 625 tokens × $0.003/1K = $0.001875

**After (Workflow)**:
- Base prompt: ~400 chars (~100 tokens)
- Stage prompt: ~400 chars (~100 tokens)
- Total: ~200 tokens
- Per request cost: 200 tokens × $0.003/1K = $0.0006

**Savings per request**: ~68% reduction in system prompt tokens

For 10,000 requests/month:
- Before: $18.75
- After: $6.00
- **Monthly savings: $12.75** (just on system prompts)

## Future Enhancements

1. **Persistent State Storage**: Implement Redis/DB backend
2. **State Validation**: Add schema validation for extracted data
3. **Advanced Parsing**: Use structured outputs from Claude
4. **Stage Analytics**: Track stage completion rates and bottlenecks
5. **Dynamic Stage Ordering**: Allow stages to be reordered based on context
6. **Multi-language Support**: Translate prompts based on user locale
7. **A/B Testing**: Compare workflow vs monolithic performance

## Migration Guide

### For Existing Deployments

1. **Add environment variable**:
   ```bash
   USE_WORKFLOW=true
   ```

2. **Deploy the new code**

3. **Monitor logs** for workflow stages

4. **Gradually migrate**: Start with `USE_WORKFLOW=false`, then enable for a percentage of users

5. **Compare metrics**: Token usage, response quality, user satisfaction

### Rollback Plan

If issues arise:

```bash
USE_WORKFLOW=false
SYSTEM_PROMPT_CACHE=true
```

This reverts to the original monolithic prompt system.

## Troubleshooting

### Issue: State not persisting between requests

**Cause**: In-memory storage is cleared on server restart

**Solution**: Implement Redis or database storage

### Issue: Wrong stage progression

**Cause**: Parser not extracting data correctly

**Solution**: Check console logs for extracted data, improve parsing logic in `workflowEngine.ts`

### Issue: Stages being skipped incorrectly

**Cause**: Skip conditions too aggressive

**Solution**: Review `shouldSkipStage()` logic in `workflowEngine.ts`

## Contributing

When adding new stages:

1. Add stage type to `WorkflowStage` in `workflowTypes.ts`
2. Create prompt function in `stagePrompts.ts`
3. Add stage to workflow order in `getNextStage()`
4. Implement skip logic if needed in `shouldSkipStage()`
5. Add parsing logic in `parseAssistantResponse()`
6. Update this documentation

## License

Same as parent project.

