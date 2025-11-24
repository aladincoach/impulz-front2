# Quick Start Guide - Workflow System

## 🚀 Getting Started in 5 Minutes

### 1. Environment Setup

Create or update your `.env` file:

```bash
# Required
ANTHROPIC_API_KEY=your_api_key_here

# Recommended (enables workflow mode)
USE_WORKFLOW=true

# Optional: Load prompts from Notion (falls back to hardcoded if not set)
# NOTION_API_KEY=secret_your_token
# NOTION_BASEPROMPT=your_page_id
# NOTION_STAGEPROMPT_1=your_page_id
# ... etc (see NOTION_WORKFLOW_SETUP.md for details)
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Tests

```bash
npx tsx server/utils/workflowEngine.test.ts
```

Expected output:
```
✅ All tests passed!
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Test the Workflow

Visit `http://localhost:3000/chat` and try these test scenarios:

#### Scenario A: Generic Question (Stages 2-3 skipped)
```
You: "What is customer development?"

Expected: Bot answers directly without asking about your project
```

#### Scenario B: Project-Specific Question (Full workflow)
```
You: "I want to launch my SaaS product"

Expected flow:
1. Bot categorizes intent
2. Bot asks about your project
3. Bot asks what you've accomplished
4. Bot validates your stage
5. Bot suggests actions
6. Bot offers guidance
7. Bot does debrief
```

#### Scenario C: Incompatible Intent (Stage 4 challenges)
```
You: "I want funding for my startup"
Bot: "Tell me about your startup"
You: "It's a project management tool"
Bot: "What have you accomplished?"
You: "Just have an idea"

Expected: Bot challenges you (funding too early for vision phase)
```

## 📊 Monitoring

### Console Logs to Watch

When workflow mode is enabled, you'll see:

```
⚙️  [CONFIG] Workflow mode: activé (stage-based)
🔄 [WORKFLOW] Session: session_xyz
🔄 [WORKFLOW] Current stage: intent_understanding
🔄 [WORKFLOW] Completed stages: 
📝 [DEBUG] System prompt length: 800 chars  ← Should be ~800, not ~2500
```

### Verify Token Savings

Check the system prompt length in logs:
- **Workflow mode**: ~800 chars (~200 tokens) ✅
- **Legacy mode**: ~2500 chars (~625 tokens) ❌

## 🔧 Configuration Options

### Enable Workflow Mode (Recommended)
```bash
USE_WORKFLOW=true
```

### Disable Workflow Mode (Legacy)
```bash
USE_WORKFLOW=false
SYSTEM_PROMPT_CACHE=true
```

## 📁 Key Files

### If You Need to Modify Prompts
- `server/utils/basePrompt.ts` - Base system prompt
- `server/utils/stagePrompts.ts` - Stage-specific prompts

### If You Need to Modify Workflow Logic
- `server/utils/workflowEngine.ts` - Stage progression, skip logic
- `server/utils/workflowTypes.ts` - Type definitions

### If You Need to Modify State Management
- `server/utils/conversationStateManager.ts` - Session storage

## 🧪 Running Tests

### Full Test Suite
```bash
npx tsx server/utils/workflowEngine.test.ts
```

### Individual Test
Edit `workflowEngine.test.ts` and comment out tests you don't want to run.

## 🐛 Troubleshooting

### Issue: System prompt still ~2500 chars

**Solution**: Check that `USE_WORKFLOW=true` in your `.env`

### Issue: State not persisting between requests

**Cause**: In-memory storage clears on server restart

**Solution**: For production, implement Redis:

```typescript
// conversationStateManager.ts
import { Redis } from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)

export async function getConversationState(sessionId: string) {
  const state = await redis.get(`session:${sessionId}`)
  return state ? JSON.parse(state) : initializeConversationState()
}
```

### Issue: Stages not progressing correctly

**Debug**: Check console logs for extracted data:
```
🔄 [WORKFLOW] Extracted data: { ... }
```

If data is not being extracted, improve parsing in `workflowEngine.ts`.

## 📈 Performance Comparison

### Before (Monolithic)
```
📝 [DEBUG] System prompt length: 2500 chars
```

### After (Workflow)
```
📝 [DEBUG] System prompt length: 800 chars
```

**Savings**: 68% reduction ✅

## 🔄 Workflow Stages at a Glance

1. **Intent Understanding** - What does the user want?
2. **Project Understanding** - What's their project? (skippable)
3. **Project Progress** - What stage are they at? (skippable)
4. **Underlying Problem** - Is their intent appropriate for their stage?
5. **Action** - What should they do next?
6. **Guidance** - How should they do it? (skippable)
7. **Debrief** - What did they learn?

## 📚 Documentation

- **Technical Details**: `WORKFLOW_REFACTORING.md`
- **Visual Diagrams**: `WORKFLOW_DIAGRAM.md`
- **Summary**: `REFACTORING_SUMMARY.md`
- **General Info**: `README.md`

## 🎯 Next Steps

1. ✅ Test locally with different scenarios
2. ✅ Monitor console logs for workflow stages
3. ✅ Verify token savings (~68% reduction)
4. 🔄 Deploy to staging environment
5. 🔄 Monitor production metrics
6. 🔄 Implement Redis for state persistence (optional)

## 💡 Tips

### Adding a New Stage

1. Add stage to `WorkflowStage` type in `workflowTypes.ts`
2. Create prompt function in `stagePrompts.ts`
3. Add to stage order in `workflowEngine.ts` → `getNextStage()`
4. Add skip logic if needed in `shouldSkipStage()`
5. Add parsing logic in `parseAssistantResponse()`
6. Add test in `workflowEngine.test.ts`

### Modifying Stage Logic

Example: Change when Stage 2 is skipped

```typescript
// workflowEngine.ts
export function shouldSkipStage(stage: WorkflowStage, state: ConversationState): boolean {
  switch (stage) {
    case 'project_understanding':
      // OLD: Skip if generic OR project known
      // return state.isGenericQuestion === true || state.hasProjectDescription === true
      
      // NEW: Only skip if project known (always ask about project)
      return state.hasProjectDescription === true
    
    // ... other cases
  }
}
```

### Debugging State

Add this to `chat.post.ts` after state update:

```typescript
console.log('🔍 [DEBUG] Full state:', JSON.stringify(updatedState, null, 2))
```

## ⚡ Quick Commands

```bash
# Install dependencies
npm install

# Run tests
npx tsx server/utils/workflowEngine.test.ts

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎓 Learning Resources

1. Read `WORKFLOW_DIAGRAM.md` for visual understanding
2. Read `WORKFLOW_REFACTORING.md` for technical deep-dive
3. Study `workflowEngine.test.ts` for usage examples
4. Review `stagePrompts.ts` to see how prompts are structured

## ✅ Checklist

Before deploying to production:

- [ ] Tests passing (`npx tsx server/utils/workflowEngine.test.ts`)
- [ ] Environment variable set (`USE_WORKFLOW=true`)
- [ ] Console logs showing workflow stages
- [ ] System prompt length ~800 chars (check logs)
- [ ] Tested all 3 scenarios (generic, full workflow, incompatible intent)
- [ ] State persistence strategy decided (in-memory OK for low traffic, Redis for production)

## 🆘 Need Help?

1. Check console logs for `[WORKFLOW]` and `[DEBUG]` messages
2. Review `WORKFLOW_REFACTORING.md` for detailed documentation
3. Look at test cases in `workflowEngine.test.ts` for examples
4. Check `WORKFLOW_DIAGRAM.md` for visual flow

---

**Ready to go!** 🚀

Start with `npm run dev` and test the workflow at `http://localhost:3000/chat`

