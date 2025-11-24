# Notion Integration for Workflow Prompts

## Overview

The workflow system can now load prompts from Notion pages instead of using hardcoded strings. This allows you to:

- ✅ Edit prompts in Notion without redeploying
- ✅ Version control prompts in Notion
- ✅ Collaborate on prompt improvements
- ✅ A/B test different prompt variations
- ✅ Automatic fallback to hardcoded prompts if Notion is unavailable

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PROMPT LOADING FLOW                       │
└─────────────────────────────────────────────────────────────┘

Request arrives
     │
     ▼
Is NOTION_BASEPROMPT configured?
     │
     ├─ YES → Fetch from Notion (with cache)
     │         │
     │         ├─ Success → Use Notion prompt ✅
     │         └─ Error → Use hardcoded fallback 📝
     │
     └─ NO → Use hardcoded fallback 📝
```

## Setup Instructions

### 1. Create Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click **"+ New integration"**
3. Name it: "Impulz Workflow Prompts"
4. Select your workspace
5. Click **"Submit"**
6. Copy the **Internal Integration Token** (starts with `secret_`)

### 2. Create Notion Pages for Prompts

Create 8 separate Notion pages (one for base prompt + 7 for stages):

#### Base Prompt Page
**Title**: `Base Prompt - Impulz Workflow`

**Content**:
```markdown
**Role**: You are an expert early-stage entrepreneurship coach for first-time founders.

**Mission**: Help entrepreneurs take action following customer development and lean startup principles.

**Tone**: Business-casual, using "you", concise, no emojis, supportive, encouraging, challenging.

**Core Constraints**:
- Ask only one question at a time
- If you provide links, verify that the destination page actually contains the referenced information
- Describe your reasoning prefixed with **[THINKING: Stage X : details of thinking…]**

You are following a structured coaching workflow. Focus on the current stage instructions provided below.
```

#### Stage 1 Prompt Page
**Title**: `Stage 1 - Intent Understanding`

**Content**:
```markdown
# **Stage 1 – Intent Understanding**

**Activity**: Determine the likely intent categories of the user request with a confidence level above 50%.

**Output format**: Follow this TOON structure and example for the user request "I want more money soon":

```
intention_categorisation[category_count]{intention_category,confidence_level,generic}
funding,60,no
sell,50,no
```

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
- **generic** (boolean): "yes" if the question is not linked to a specific project of the user
```

#### Stage 2-7 Prompt Pages

Create similar pages for stages 2-7. You can copy the content from `server/utils/stagePrompts.ts` (the `FALLBACK_STAGEX_PROMPT` constants).

### 3. Share Pages with Integration

For each page you created:

1. Open the page in Notion
2. Click **"Share"** in the top right
3. Click **"Invite"**
4. Select your integration: "Impulz Workflow Prompts"
5. Click **"Invite"**

### 4. Get Page IDs

For each page:

1. Open the page in Notion
2. Click **"Share"** → **"Copy link"**
3. The URL looks like: `https://www.notion.so/Page-Title-abc123def456...`
4. The page ID is the part after the last dash: `abc123def456...`

**Note**: Remove any hyphens from the page ID. If the URL is:
```
https://www.notion.so/Base-Prompt-abc123-def456-ghi789
```
The page ID is: `abc123def456ghi789`

### 5. Configure Environment Variables

Add to your `.env` file:

```bash
# Notion API Key
NOTION_API_KEY=secret_your_integration_token_here

# Base Prompt
NOTION_BASEPROMPT=abc123def456ghi789

# Stage Prompts
NOTION_STAGEPROMPT_1=stage1_page_id_here
NOTION_STAGEPROMPT_2=stage2_page_id_here
NOTION_STAGEPROMPT_3=stage3_page_id_here
NOTION_STAGEPROMPT_4=stage4_page_id_here
NOTION_STAGEPROMPT_5=stage5_page_id_here
NOTION_STAGEPROMPT_6=stage6_page_id_here
NOTION_STAGEPROMPT_7=stage7_page_id_here

# Cache duration (optional, default: 300 seconds)
NOTION_CACHE_SECONDS=300
```

### 6. Deploy

Deploy your application with the new environment variables.

## Usage

### Full Notion Mode (All Prompts from Notion)

```bash
USE_WORKFLOW=true
NOTION_API_KEY=secret_xxx
NOTION_BASEPROMPT=xxx
NOTION_STAGEPROMPT_1=xxx
NOTION_STAGEPROMPT_2=xxx
# ... etc
```

Console output:
```
✅ [BASE PROMPT] Using Notion base prompt
✅ [STAGE 1] Using Notion prompt
```

### Partial Notion Mode (Some Prompts from Notion)

You can configure only some prompts in Notion:

```bash
USE_WORKFLOW=true
NOTION_API_KEY=secret_xxx
NOTION_BASEPROMPT=xxx
# NOTION_STAGEPROMPT_1 not set - will use hardcoded fallback
NOTION_STAGEPROMPT_2=xxx
# ... etc
```

Console output:
```
✅ [BASE PROMPT] Using Notion base prompt
📝 [STAGE 1] Using hardcoded fallback
✅ [STAGE 2] Using Notion prompt
```

### Hardcoded Mode (No Notion)

Don't set any `NOTION_*` variables:

```bash
USE_WORKFLOW=true
# No NOTION_* variables
```

Console output:
```
📝 [BASE PROMPT] Using hardcoded fallback
📝 [STAGE 1] Using hardcoded fallback
📝 [STAGE 2] Using hardcoded fallback
```

## Caching

### How It Works

- Prompts are cached for 5 minutes by default (configurable via `NOTION_CACHE_SECONDS`)
- Each prompt (base + 7 stages) has its own cache
- Cache is stored in-memory (cleared on server restart)

### Cache Logs

```
✅ [NOTION] Using cached base_prompt (age: 120s, expires after 300s)
🔄 [NOTION] Fetching stage_1 from Notion...
✅ [NOTION] stage_1 cached
```

### Clear Cache

To force reload from Notion:

1. Restart the server
2. Or wait for cache expiration (default: 5 minutes)
3. Or implement a cache-clear endpoint (see below)

### Production Cache Strategy

For production, consider:

1. **Redis Cache**: Store prompts in Redis for persistence across server restarts
2. **Longer TTL**: Increase `NOTION_CACHE_SECONDS` to reduce API calls
3. **Webhook Updates**: Use Notion webhooks to invalidate cache when prompts change

## Dynamic Variables in Prompts

### Stage 4 Special Handling

Stage 4 prompt supports dynamic variables:

**In Notion**:
```markdown
**Activity**:
- Check whether the user's intent is consistent with their current project phase
- Current detected intents: {{INTENTS}}
- Current project phase: {{PHASE}}

**Intent-Phase Compatibility Rules**:
{{COMPATIBILITY_RULES}}
```

**At Runtime**:
- `{{INTENTS}}` → Replaced with actual detected intents
- `{{PHASE}}` → Replaced with current project phase
- `{{COMPATIBILITY_RULES}}` → Replaced with full compatibility matrix

## Editing Prompts in Notion

### Best Practices

1. **Test Changes Locally First**: Edit prompts in a test Notion workspace
2. **Version Control**: Keep a changelog in Notion
3. **Backup**: Export prompts regularly
4. **Monitor Logs**: Watch for parsing errors after changes

### Supported Notion Blocks

The integration supports:

- ✅ Paragraphs
- ✅ Headings (H1, H2, H3)
- ✅ Bulleted lists
- ✅ Numbered lists
- ✅ Code blocks
- ✅ Quotes
- ✅ Dividers
- ✅ Callouts
- ✅ Toggle lists
- ✅ **Bold**, *italic*, `code`, ~~strikethrough~~
- ✅ Links

### Not Supported

- ❌ Tables
- ❌ Images
- ❌ Embeds
- ❌ Databases

## Troubleshooting

### Issue: "Missing NOTION_API_KEY"

**Cause**: `NOTION_API_KEY` not set in environment

**Solution**: Add to `.env`:
```bash
NOTION_API_KEY=secret_your_token_here
```

### Issue: "Failed to fetch Notion page"

**Possible causes**:
1. Page ID is incorrect
2. Integration doesn't have access to the page
3. Notion API is down

**Solution**:
1. Verify page ID is correct (copy from URL)
2. Share the page with your integration
3. Check Notion status: https://status.notion.so/

### Issue: Prompt content looks wrong

**Cause**: Notion formatting not converting correctly

**Solution**:
1. Check console logs for conversion warnings
2. Simplify Notion formatting (use basic markdown)
3. Test with hardcoded fallback to isolate issue

### Issue: Changes not appearing

**Cause**: Cache is still valid

**Solution**:
1. Wait for cache expiration (default: 5 minutes)
2. Restart server to clear cache
3. Reduce `NOTION_CACHE_SECONDS` for faster updates during development

## Performance Considerations

### API Call Reduction

With caching enabled (default):
- **Cold start**: 8 API calls (1 base + 7 stages)
- **Warm cache**: 0 API calls
- **Cache duration**: 5 minutes

For 1000 requests/hour:
- **Without cache**: 8000 Notion API calls/hour ❌
- **With cache**: ~96 Notion API calls/hour ✅ (8 calls × 12 cache refreshes)

### Notion API Limits

- **Free plan**: 3 requests/second
- **Paid plans**: Higher limits

With caching, you'll stay well within limits.

## Migration from Hardcoded Prompts

### Step 1: Create Notion Pages

Create all 8 pages in Notion (base + 7 stages).

### Step 2: Configure One Stage at a Time

Start with base prompt:

```bash
NOTION_BASEPROMPT=xxx
# Other stages still use hardcoded
```

Test thoroughly, then add stages one by one.

### Step 3: Monitor Logs

Watch for:
```
✅ [BASE PROMPT] Using Notion base prompt
📝 [STAGE 1] Using hardcoded fallback
```

### Step 4: Complete Migration

Once all stages are tested:

```bash
NOTION_BASEPROMPT=xxx
NOTION_STAGEPROMPT_1=xxx
NOTION_STAGEPROMPT_2=xxx
# ... all 7 stages
```

## Rollback Plan

If issues arise with Notion prompts:

### Option 1: Remove Notion Variables

```bash
# Comment out or remove
# NOTION_BASEPROMPT=xxx
# NOTION_STAGEPROMPT_1=xxx
```

System automatically falls back to hardcoded prompts.

### Option 2: Disable Workflow Mode

```bash
USE_WORKFLOW=false
SYSTEM_PROMPT_CACHE=true
```

Reverts to legacy monolithic prompt system.

## Example Notion Workspace Structure

```
📁 Impulz Workflow Prompts
├── 📄 Base Prompt - Impulz Workflow
├── 📄 Stage 1 - Intent Understanding
├── 📄 Stage 2 - Project Understanding
├── 📄 Stage 3 - Project Progress
├── 📄 Stage 4 - Underlying Problem
├── 📄 Stage 5 - Action
├── 📄 Stage 6 - Guidance
├── 📄 Stage 7 - Debrief
└── 📄 Changelog (optional - track prompt changes)
```

## Advanced: Webhook Integration

For instant cache invalidation when prompts change:

### 1. Create Webhook Endpoint

```typescript
// server/api/webhook/notion.post.ts
export default defineEventHandler(async (event) => {
  const { clearNotionCache } = await import('~/server/utils/notion')
  clearNotionCache()
  return { success: true, message: 'Cache cleared' }
})
```

### 2. Configure Notion Webhook

(Notion webhooks are in beta - check Notion API docs for latest)

### 3. Secure Endpoint

Add authentication to prevent unauthorized cache clears.

## Summary

✅ **Flexible**: Use Notion for all, some, or no prompts
✅ **Resilient**: Automatic fallback to hardcoded prompts
✅ **Performant**: 5-minute cache reduces API calls by 99%
✅ **Easy**: Edit prompts in Notion, changes apply after cache expiration
✅ **Safe**: Hardcoded fallbacks ensure system always works

Start with hardcoded prompts, migrate to Notion gradually as needed.

