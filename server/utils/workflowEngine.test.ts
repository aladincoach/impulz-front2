/**
 * Unit tests for workflow engine
 * Run with: npx tsx server/utils/workflowEngine.test.ts
 */

import {
  initializeConversationState,
  getNextStage,
  shouldSkipStage,
  isIntentCompatibleWithPhase,
  parseAssistantResponse,
  updateConversationState
} from './workflowEngine'
import type { ConversationState } from './workflowTypes'

// Test utilities
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('❌ FAILED:', message)
    process.exit(1)
  }
  console.log('✅ PASSED:', message)
}

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error('❌ FAILED:', message)
    console.error('  Expected:', expected)
    console.error('  Actual:', actual)
    process.exit(1)
  }
  console.log('✅ PASSED:', message)
}

// Test suite
console.log('\n🧪 Running Workflow Engine Tests...\n')

// Test 1: Initialize conversation state
console.log('Test 1: Initialize conversation state')
const initialState = initializeConversationState()
assertEquals(initialState.currentStage, 'intent_understanding', 'Should start at intent_understanding stage')
assertEquals(initialState.completedStages.length, 0, 'Should have no completed stages initially')

// Test 2: Stage progression
console.log('\nTest 2: Stage progression')
const state1: ConversationState = {
  currentStage: 'intent_understanding',
  completedStages: []
}
const nextStage1 = getNextStage('intent_understanding', state1)
assertEquals(nextStage1, 'project_understanding', 'Should progress to project_understanding')

// Test 3: Skip project understanding for generic questions
console.log('\nTest 3: Skip project understanding for generic questions')
const state2: ConversationState = {
  currentStage: 'intent_understanding',
  isGenericQuestion: true,
  completedStages: []
}
const shouldSkip2 = shouldSkipStage('project_understanding', state2)
assert(shouldSkip2, 'Should skip project_understanding for generic questions')

const nextStage2 = getNextStage('intent_understanding', state2)
assertEquals(nextStage2, 'project_progress', 'Should skip to project_progress for generic questions')

// Test 4: Skip project progress if phase already known
console.log('\nTest 4: Skip project progress if phase already known')
const state3: ConversationState = {
  currentStage: 'project_understanding',
  projectPhase: 'design',
  completedStages: []
}
const shouldSkip3 = shouldSkipStage('project_progress', state3)
assert(shouldSkip3, 'Should skip project_progress if phase already known')

const nextStage3 = getNextStage('project_understanding', state3)
assertEquals(nextStage3, 'underlying_problem', 'Should skip to underlying_problem if phase known')

// Test 5: Skip guidance if user doesn't want it
console.log('\nTest 5: Skip guidance if user doesn\'t want it')
const state4: ConversationState = {
  currentStage: 'action',
  wantsGuidance: false,
  completedStages: []
}
const shouldSkip4 = shouldSkipStage('guidance', state4)
assert(shouldSkip4, 'Should skip guidance if user doesn\'t want it')

const nextStage4 = getNextStage('action', state4)
assertEquals(nextStage4, 'debrief', 'Should skip to debrief if guidance not wanted')

// Test 6: Intent-phase compatibility
console.log('\nTest 6: Intent-phase compatibility')
assert(
  isIntentCompatibleWithPhase('funding', 'growth'),
  'Funding should be compatible with growth phase'
)
assert(
  !isIntentCompatibleWithPhase('funding', 'vision'),
  'Funding should NOT be compatible with vision phase'
)
assert(
  isIntentCompatibleWithPhase('ideation', 'vision'),
  'Ideation should be compatible with vision phase'
)
assert(
  !isIntentCompatibleWithPhase('ideation', 'growth'),
  'Ideation should NOT be compatible with growth phase'
)
assert(
  isIntentCompatibleWithPhase('sell', 'launch'),
  'Sell should be compatible with launch phase'
)
assert(
  !isIntentCompatibleWithPhase('sell', 'vision'),
  'Sell should NOT be compatible with vision phase'
)

// Test 7: Parse intent categorization
console.log('\nTest 7: Parse intent categorization')
const response1 = `
intention_categorisation[2]{intention_category,confidence_level,generic}
funding,80,no
sell,60,no
`
const parsed1 = parseAssistantResponse(response1, 'intent_understanding')
assert(parsed1.intents && parsed1.intents.length === 2, 'Should parse 2 intents')
assert(parsed1.intents![0].category === 'funding', 'First intent should be funding')
assert(parsed1.intents![0].confidence === 80, 'First intent confidence should be 80')
assert(parsed1.intents![0].generic === false, 'First intent should not be generic')

// Test 8: Parse generic question
console.log('\nTest 8: Parse generic question')
const response2 = `
intention_categorisation[1]{intention_category,confidence_level,generic}
request_expertise,90,yes
`
const parsed2 = parseAssistantResponse(response2, 'intent_understanding')
assert(parsed2.isGenericQuestion === true, 'Should detect generic question')

// Test 9: Update conversation state
console.log('\nTest 9: Update conversation state')
const state5: ConversationState = {
  currentStage: 'intent_understanding',
  completedStages: []
}
const extractedData = {
  intents: [{ category: 'funding' as const, confidence: 80, generic: false }],
  isGenericQuestion: false
}
const updatedState = updateConversationState(state5, extractedData)
assert(updatedState.intents !== undefined, 'Should have intents')
assert(updatedState.completedStages.includes('intent_understanding'), 'Should mark stage as completed')
assertEquals(updatedState.currentStage, 'project_understanding', 'Should progress to next stage')

// Test 10: Complete workflow progression
console.log('\nTest 10: Complete workflow progression')
let state: ConversationState = initializeConversationState()
const expectedStages = [
  'intent_understanding',
  'project_understanding',
  'project_progress',
  'underlying_problem',
  'action',
  'guidance',
  'debrief'
]

for (let i = 0; i < expectedStages.length - 1; i++) {
  assertEquals(state.currentStage, expectedStages[i], `Stage ${i} should be ${expectedStages[i]}`)
  const nextStage = getNextStage(state.currentStage, state)
  if (nextStage) {
    state = { ...state, currentStage: nextStage, completedStages: [...state.completedStages, state.currentStage] }
  }
}

assertEquals(state.currentStage, 'debrief', 'Should end at debrief stage')
const finalNext = getNextStage('debrief', state)
assertEquals(finalNext, null, 'Should have no stage after debrief')

console.log('\n✅ All tests passed!\n')

