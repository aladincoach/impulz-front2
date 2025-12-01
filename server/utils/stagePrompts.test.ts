/**
 * Unit tests for stage prompts fallback detection
 * Run with: npx tsx server/utils/stagePrompts.test.ts
 */

import {
  getStage1Prompt,
  getStage2Prompt,
  getStage3Prompt,
  getStage4Prompt,
  getStage5Prompt,
  getStage6Prompt,
  getStage7Prompt,
  type StagePromptResult
} from './stagePrompts'
import type { ConversationState } from './workflowTypes'

// Test utilities
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('❌ FAILED:', message)
    process.exit(1)
  }
  console.log('✅ PASSED:', message)
}

// Test suite
console.log('\n🧪 Running Stage Prompts Tests...\n')

// Test 1: Stage 1 prompt returns StagePromptResult
console.log('Test 1: Stage 1 prompt returns StagePromptResult')
getStage1Prompt(true).then((result: StagePromptResult) => {
  assert(typeof result === 'object', 'Should return an object')
  assert('prompt' in result, 'Should have prompt property')
  assert('usedFallback' in result, 'Should have usedFallback property')
  assert(typeof result.prompt === 'string', 'prompt should be a string')
  assert(typeof result.usedFallback === 'boolean', 'usedFallback should be a boolean')
  assert(result.prompt.length > 0, 'prompt should not be empty')
  console.log('  → usedFallback:', result.usedFallback)
  console.log('  → prompt length:', result.prompt.length, 'chars')
})

// Test 2: Stage 2 prompt returns StagePromptResult
console.log('\nTest 2: Stage 2 prompt returns StagePromptResult')
getStage2Prompt(true).then((result: StagePromptResult) => {
  assert(typeof result === 'object', 'Should return an object')
  assert('prompt' in result, 'Should have prompt property')
  assert('usedFallback' in result, 'Should have usedFallback property')
  console.log('  → usedFallback:', result.usedFallback)
})

// Test 3: Stage 3 prompt returns StagePromptResult
console.log('\nTest 3: Stage 3 prompt returns StagePromptResult')
getStage3Prompt(true).then((result: StagePromptResult) => {
  assert(typeof result === 'object', 'Should return an object')
  assert('prompt' in result, 'Should have prompt property')
  assert('usedFallback' in result, 'Should have usedFallback property')
  console.log('  → usedFallback:', result.usedFallback)
})

// Test 4: Stage 4 prompt with state returns StagePromptResult
console.log('\nTest 4: Stage 4 prompt with state returns StagePromptResult')
const testState: ConversationState = {
  currentStage: 'underlying_problem',
  completedStages: ['intent_understanding', 'project_understanding', 'project_progress'],
  intents: [{ category: 'funding', confidence: 80, generic: false }],
  projectPhase: 'vision'
}
getStage4Prompt(testState, true).then((result: StagePromptResult) => {
  assert(typeof result === 'object', 'Should return an object')
  assert('prompt' in result, 'Should have prompt property')
  assert('usedFallback' in result, 'Should have usedFallback property')
  assert(result.prompt.includes('funding'), 'Should include intent in prompt')
  assert(result.prompt.includes('vision'), 'Should include phase in prompt')
  console.log('  → usedFallback:', result.usedFallback)
})

// Test 5: Stage 5 prompt returns StagePromptResult
console.log('\nTest 5: Stage 5 prompt returns StagePromptResult')
getStage5Prompt(true).then((result: StagePromptResult) => {
  assert(typeof result === 'object', 'Should return an object')
  assert('prompt' in result, 'Should have prompt property')
  assert('usedFallback' in result, 'Should have usedFallback property')
  console.log('  → usedFallback:', result.usedFallback)
})

// Test 6: Stage 6 prompt with guidance returns StagePromptResult
console.log('\nTest 6: Stage 6 prompt with guidance returns StagePromptResult')
getStage6Prompt(true, true).then((result: StagePromptResult) => {
  assert(typeof result === 'object', 'Should return an object')
  assert('prompt' in result, 'Should have prompt property')
  assert('usedFallback' in result, 'Should have usedFallback property')
  console.log('  → usedFallback:', result.usedFallback)
})

// Test 7: Stage 6 prompt without guidance returns StagePromptResult
console.log('\nTest 7: Stage 6 prompt without guidance returns StagePromptResult')
getStage6Prompt(false, true).then((result: StagePromptResult) => {
  assert(typeof result === 'object', 'Should return an object')
  assert('prompt' in result, 'Should have prompt property')
  assert('usedFallback' in result, 'Should have usedFallback property')
  assert(result.usedFallback === true, 'Should always use fallback when no guidance')
  assert(result.prompt.includes('Stage 7'), 'Should skip to Stage 7')
  console.log('  → usedFallback:', result.usedFallback)
})

// Test 8: Stage 7 prompt returns StagePromptResult
console.log('\nTest 8: Stage 7 prompt returns StagePromptResult')
getStage7Prompt(true).then((result: StagePromptResult) => {
  assert(typeof result === 'object', 'Should return an object')
  assert('prompt' in result, 'Should have prompt property')
  assert('usedFallback' in result, 'Should have usedFallback property')
  console.log('  → usedFallback:', result.usedFallback)
})

// Wait for all async tests to complete
setTimeout(() => {
  console.log('\n✅ All stage prompt tests passed!\n')
}, 1000)

