# Fallback Warning Implementation

## Overview
This document describes the implementation of a user-facing warning system that alerts users when the system is using fallback prompts instead of the latest Notion-based prompts.

## Problem Statement
When the system cannot fetch prompts from Notion (due to technical issues, API failures, or missing configuration), it falls back to hardcoded prompts. Users should be informed when this happens, as they may be experiencing an older version of the coaching system.

## Solution

### 1. Backend Changes

#### `server/utils/stagePrompts.ts`
- **Added `StagePromptResult` interface**: Returns both the prompt and a `usedFallback` boolean flag
- **Modified all stage prompt functions** (`getStage1Prompt` through `getStage7Prompt`):
  - Changed return type from `Promise<string>` to `Promise<StagePromptResult>`
  - Returns `{ prompt: string, usedFallback: boolean }`
  - Sets `usedFallback: true` when using hardcoded fallback prompts
  - Sets `usedFallback: false` when successfully loading from Notion

#### `server/utils/workflowEngine.ts`
- **Updated `getStagePrompt` function**:
  - Changed return type to `Promise<StagePromptResult>`
  - Now returns the full result object with both prompt and fallback status
  - Imported the `StagePromptResult` type

#### `server/api/chat.post.ts`
- **Added `usedFallback` tracking**:
  - Extracts `usedFallback` flag from `stagePromptResult`
  - Logs the fallback status for debugging
- **Modified streaming response**:
  - Sends metadata event at the start of the stream when `usedFallback` is true
  - Format: `data: {"metadata":{"usedFallback":true}}\n\n`

### 2. Frontend Changes

#### `pages/chat.vue`
- **Added warning banner UI**:
  - Yellow warning banner displayed below the header
  - Shows warning icon and internationalized message
  - Includes dismiss button (X) to close the warning
  - Uses Tailwind CSS for styling
- **Added state management**:
  - New `showFallbackWarning` ref to control banner visibility
- **Updated stream parsing**:
  - Detects metadata events in the SSE stream
  - Sets `showFallbackWarning.value = true` when fallback is detected
  - Logs warning detection for debugging

### 3. Internationalization

#### `i18n/locales/en.json`
Added English translation:
```json
"fallbackWarning": "Due to technical issues, the system is based on a previous version"
```

#### `i18n/locales/fr.json`
Added French translation:
```json
"fallbackWarning": "En raison de problèmes techniques, le système est basé sur une version antérieure"
```

## User Experience

### When Fallback is Used:
1. User sends a message
2. Backend detects that Notion prompt loading failed
3. Backend sends metadata event: `{"metadata":{"usedFallback":true}}`
4. Frontend receives metadata and displays yellow warning banner
5. User sees: "⚠️ Due to technical issues, the system is based on a previous version"
6. User can dismiss the warning by clicking the X button
7. Warning persists across messages until dismissed

### When Notion is Working:
- No warning banner is displayed
- System operates normally with latest prompts

## Technical Details

### Data Flow
```
Stage Prompt Function
  ↓
Returns: { prompt: string, usedFallback: boolean }
  ↓
Workflow Engine (getStagePrompt)
  ↓
Chat API (extracts usedFallback flag)
  ↓
SSE Stream (sends metadata if fallback)
  ↓
Frontend (displays warning banner)
```

### SSE Message Format
```
# Metadata event (sent first, if fallback)
data: {"metadata":{"usedFallback":true}}

# Text chunks (normal streaming)
data: {"text":"Hello"}
data: {"text":" world"}

# Done signal
data: [DONE]
```

## Benefits
1. **Transparency**: Users are informed about system status
2. **Internationalized**: Warning message supports multiple languages
3. **Non-intrusive**: Warning can be dismissed by users
4. **Debugging**: Logs help developers identify when fallbacks occur
5. **Graceful degradation**: System continues to work with fallback prompts

## Testing Scenarios

### Test 1: Notion Working
- Ensure Notion API is configured correctly
- Send a message
- Verify no warning appears
- Check console logs show "✅ Using Notion prompt"

### Test 2: Notion Failing
- Disable Notion API or use invalid credentials
- Send a message
- Verify yellow warning banner appears
- Check console logs show "📝 Using hardcoded fallback"
- Verify warning message is in correct language

### Test 3: Warning Dismissal
- Trigger fallback warning
- Click X button on warning banner
- Verify banner disappears
- Send another message
- Verify banner reappears if still using fallback

## Future Enhancements
1. Add retry mechanism to attempt Notion connection
2. Show different warning levels (info, warning, error)
3. Add link to status page or documentation
4. Persist dismissal state across sessions
5. Add admin notification when fallbacks are triggered

