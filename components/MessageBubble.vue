<template>
  <div :class="containerClass">
    <div :class="bubbleClass">
      <template v-if="message.isLoading">
        <div class="flex items-center gap-1">
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </template>
      <template v-else>
        <div v-for="(part, index) in parsedContent" :key="index">
          <template v-if="part.type === 'text'">
            <div class="markdown-content" v-html="renderMarkdown(part.content || '')"></div>
          </template>
          <template v-else-if="part.type === 'thinking'">
            <details class="border-l-2 border-gray-300 pl-3">
              <summary class="cursor-pointer text-sm text-gray-500 font-light select-none hover:text-gray-700">
                {{ $t('messageBubble.thinking') }} :
              </summary>
              <div class="text-sm text-gray-500 font-light whitespace-pre-wrap">
                {{ part.content }}
              </div>
            </details>
          </template>
          <template v-else-if="part.type === 'options'">
            <div class="mt-3 flex flex-col gap-2">
              <button
                v-for="(option, optionIndex) in part.options"
                :key="optionIndex"
                @click="handleOptionClick(option, optionIndex)"
                :disabled="selectedOptionIndex !== null && selectedOptionIndex !== optionIndex"
                :class="[
                  'px-4 py-3 rounded-lg text-left text-sm font-medium transition-all duration-200',
                  'border flex items-start gap-3',
                  selectedOptionIndex === optionIndex
                    ? 'bg-orange-500 text-white border-orange-500 shadow-lg'
                    : selectedOptionIndex !== null
                    ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-50 cursor-not-allowed'
                    : optionIndex === 0
                    ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600 hover:shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:shadow-md'
                ]"
              >
                <span :class="[
                  'font-bold text-base shrink-0',
                  selectedOptionIndex === optionIndex
                    ? 'text-white'
                    : selectedOptionIndex !== null
                    ? 'text-gray-400'
                    : optionIndex === 0 
                    ? 'text-white' 
                    : 'text-orange-500'
                ]">
                  {{ optionIndex + 1 }}.
                </span>
                <span class="flex-1">{{ option }}</span>
              </button>
            </div>
          </template>
          <template v-else-if="part.type === 'backlog'">
            <details class="mt-3 border-l-2 border-gray-300 pl-3" :open="true">
              <summary class="cursor-pointer text-sm text-gray-500 font-light select-none hover:text-gray-700">
                {{ $t('messageBubble.myNextQuestions') }} ({{ displayedQuestions.length }} {{ displayedQuestions.length === 1 ? $t('messageBubble.question') : $t('messageBubble.questions') }})
              </summary>
              <ul class="text-sm text-gray-500 font-light mt-2 space-y-2 select-none">
                <li 
                  v-for="(questionState, index) in displayedQuestions" 
                  :key="questionState.id" 
                  :draggable="true"
                  data-question-item
                  :class="[
                    'flex items-start gap-2 group cursor-move transition-all',
                    draggedQuestionId === questionState.id ? 'opacity-50 scale-95' : '',
                    draggedOverIndex === index && draggedQuestionId !== questionState.id ? 'border-t-2 border-orange-500 pt-2' : ''
                  ]"
                  @dragstart="handleDragStart($event, questionState.id, index)"
                  @dragover.prevent="handleDragOver($event, index)"
                  @dragenter.prevent="draggedOverIndex = index"
                  @dragleave="handleDragLeave"
                  @drop="handleDrop($event, index)"
                  @dragend="handleDragEnd"
                  @touchstart="handleTouchStart($event, questionState.id, index)"
                  @touchmove.prevent="handleTouchMove($event, index)"
                  @touchend="handleTouchEnd"
                >
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <svg 
                      class="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing touch-none hover:text-gray-600 transition-colors" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      @mousedown.stop
                      @touchstart.stop
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                    </svg>
                    <input 
                      type="checkbox" 
                      :id="questionState.id"
                      :checked="questionState.checked"
                      class="mt-0.5 h-4 w-4 text-gray-400 border-gray-300 rounded focus:ring-gray-500 cursor-pointer"
                      @change="handleQuestionCheck(questionState.id)"
                      @mousedown.stop
                      @touchstart.stop
                    />
                  </div>
                  <div class="flex-1 flex items-start gap-2 min-w-0">
                    <input
                      v-if="editingQuestionId === questionState.id"
                      v-model="editingQuestionText"
                      @blur="saveQuestionEdit(questionState.id)"
                      @keyup.enter="saveQuestionEdit(questionState.id)"
                      @keyup.esc="cancelQuestionEdit"
                      class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                      autofocus
                    />
                    <label 
                      v-else
                      :for="questionState.id" 
                      :class="[
                        'flex-1 cursor-pointer',
                        questionState.checked ? 'line-through text-gray-400' : ''
                      ]"
                      @dblclick="startQuestionEdit(questionState.id, questionState.question)"
                    >
                      {{ questionState.question || $t('messageBubble.newQuestion') }}
                    </label>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        v-if="editingQuestionId !== questionState.id"
                        @click="startQuestionEdit(questionState.id, questionState.question)"
                        class="p-1 text-gray-400 hover:text-gray-600"
                        :title="$t('messageBubble.editQuestion')"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        @click="deleteQuestion(questionState.id)"
                        class="p-1 text-gray-400 hover:text-red-600"
                        :title="$t('messageBubble.deleteQuestion')"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
                <li class="flex items-center gap-2 pt-1">
                  <button
                    @click="addNewQuestion"
                    class="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    {{ $t('messageBubble.addQuestion') }}
                  </button>
                </li>
              </ul>
            </details>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { marked } from 'marked'
import { useI18n } from 'vue-i18n'
import { useQuestions } from '../composables/useQuestions'

interface Message {
  id: string
  text: string
  isUser: boolean
  isLoading?: boolean
}

interface ContentPart {
  type: 'text' | 'thinking' | 'options' | 'backlog'
  content?: string
  options?: string[]
  questions?: string[]
}

const props = defineProps<{
  message: Message
}>()

const emit = defineEmits<{
  optionClick: [option: string]
}>()

const selectedOptionIndex = ref<number | null>(null)
const { t } = useI18n()
const { 
  addQuestions, 
  toggleQuestion, 
  updateQuestion, 
  addNewQuestion: addNewQuestionToStore, 
  deleteQuestion: deleteQuestionFromStore,
  reorderQuestions,
  getQuestionsForMessagePart,
  getAllQuestions,
  getAllQuestionsList
} = useQuestions()

// #region agent log
console.log('[DEBUG] MessageBubble mounted/created', {messageId:props.message.id,messageText:props.message.text.substring(0,100)});
fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubble.vue:182',message:'MessageBubble component created',data:{messageId:props.message.id,messageTextLength:props.message.text.length,hasBacklogTag:props.message.text.includes('<question_backlog>')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
// #endregion

const editingQuestionId = ref<string | null>(null)
const editingQuestionText = ref('')

// Drag and drop state
const draggedQuestionId = ref<string | null>(null)
const draggedOverIndex = ref<number | null>(null)
const touchStartY = ref<number | null>(null)
const touchStartIndex = ref<number | null>(null)

const renderMarkdown = (text: string): string => {
  if (!text) return ''
  return marked.parse(text, { breaks: true }) as string
}

const parsedContent = computed(() => {
  // #region agent log
  console.log('[DEBUG] parsedContent computed', {messageId:props.message.id,textLength:props.message.text.length,hasBacklogTag:props.message.text.includes('<question_backlog>')});
  fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubble.vue:354',message:'parsedContent computed',data:{messageId:props.message.id,textLength:props.message.text.length,hasBacklogTag:props.message.text.includes('<question_backlog>'),textPreview:props.message.text.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  const parts: ContentPart[] = []
  let text = props.message.text
  
  // Remove memory_update tags completely (they should be hidden)
  text = text.replace(/<memory_update>[\s\S]*?<\/memory_update>/g, '')
  
  // Regex to match <thinking>...</thinking> tags (including incomplete ones during streaming)
  const thinkingRegex = /<thinking>([\s\S]*?)(?:<\/thinking>|$)/g
  
  // Regex to match <question_backlog>...</question_backlog> tags
  const backlogRegex = /<question_backlog>([\s\S]*?)(?:<\/question_backlog>|$)/g
  
  let lastIndex = 0
  const matches: Array<{ index: number; length: number; type: 'thinking' | 'options' | 'backlog'; data: any }> = []
  
  // Find all thinking blocks
  let match
  while ((match = thinkingRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      type: 'thinking',
      data: match[1]
    })
  }
  
  // Find all question backlog blocks
  while ((match = backlogRegex.exec(text)) !== null) {
    try {
      const questions = JSON.parse(match[1])
      // #region agent log
      console.log('[DEBUG] parsed question backlog', {messageId:props.message.id,questionsCount:questions.length,questions});
      fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubble.vue:386',message:'parsed question backlog',data:{messageId:props.message.id,matchText:match[0],questionsCount:questions.length,questions},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      if (Array.isArray(questions) && questions.length > 0) {
        matches.push({
          index: match.index,
          length: match[0].length,
          type: 'backlog',
          data: questions
        })
      }
    } catch (e) {
      // If JSON parse fails, skip this block
      // #region agent log
      console.log('[DEBUG] failed to parse question backlog', {messageId:props.message.id,error:String(e)});
      fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubble.vue:400',message:'failed to parse question backlog',data:{messageId:props.message.id,error:String(e),matchText:match[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.warn('Failed to parse question backlog:', e)
    }
  }
  
  // Find all ordered lists (numbered lines starting with "1. ")
  // We look for sequences of consecutive numbered lines
  const lines = text.split('\n')
  let currentLineIndex = 0
  let currentCharIndex = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()
    
    // Check if this line starts with "1. " (beginning of an ordered list)
    if (trimmedLine && /^1\.\s+/.test(trimmedLine)) {
      const startIndex = currentCharIndex
      const options: string[] = []
      let totalLength = 0
      let expectedNum = 1
      let linesProcessed = 0
      
      // Collect all consecutive numbered lines
      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j]
        const currentTrimmed = currentLine.trim()
        
        if (currentTrimmed && new RegExp(`^${expectedNum}\\.\\s+`).test(currentTrimmed)) {
          // This is the next expected numbered item
          options.push(currentTrimmed.replace(/^\d+\.\s+/, '').trim())
          totalLength += currentLine.length + 1 // +1 for newline
          expectedNum++
          linesProcessed++
        } else if (currentTrimmed === '') {
          // Empty line - could be spacing between items
          totalLength += currentLine.length + 1
          linesProcessed++
          // Check if next line continues the list
          if (j + 1 < lines.length) {
            const nextTrimmed = lines[j + 1].trim()
            if (nextTrimmed && new RegExp(`^${expectedNum}\\.\\s+`).test(nextTrimmed)) {
              // Continue collecting
              continue
            } else if (options.length >= 2) {
              // We have at least 2 options, end the list here
              break
            }
          }
        } else if (options.length >= 2) {
          // Non-empty, non-numbered line after we have at least 2 options
          // End of the ordered list
          break
        } else {
          // Not part of the list
          break
        }
      }
      
      // Only create an options block if we have at least 2 items
      if (options.length >= 2) {
        matches.push({
          index: startIndex,
          length: totalLength,
          type: 'options',
          data: options
        })
        
        // Advance character index by the total length of all processed lines
        currentCharIndex += totalLength
        // Skip the lines we just processed in the outer loop
        i += linesProcessed - 1
        continue // Skip the normal currentCharIndex increment below
      }
    }
    
    currentCharIndex += line.length + 1 // +1 for newline
  }
  
  // Sort matches by index
  matches.sort((a, b) => a.index - b.index)
  
  // Build parts array
  lastIndex = 0
  for (const match of matches) {
    // Add text before this match
    if (match.index > lastIndex) {
      const beforeText = text.substring(lastIndex, match.index)
      if (beforeText.trim()) {
        parts.push({ type: 'text', content: beforeText })
      }
    }
    
    // Add the match
    if (match.type === 'thinking') {
      parts.push({ type: 'thinking', content: match.data })
    } else if (match.type === 'options') {
      parts.push({ type: 'options', options: match.data })
    } else if (match.type === 'backlog') {
      parts.push({ type: 'backlog', questions: match.data })
    }
    
    lastIndex = match.index + match.length
  }
  
  // Add remaining text after last match
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex)
    if (remainingText.trim()) {
      parts.push({ type: 'text', content: remainingText })
    }
  }
  
  // If no special blocks found, return the whole text as a single text part
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text })
  }
  
  return parts
})

// Find backlog parts and initialize questions
const backlogParts = computed(() => {
  const parts = parsedContent.value
    .map((part, index) => ({ part, index }))
    .filter(({ part }) => part.type === 'backlog')
  // #region agent log
  console.log('[DEBUG] backlogParts computed', {messageId:props.message.id,backlogPartsCount:parts.length,parts:parts.map(({part,index})=>({index,questionsCount:part.questions?.length||0,questions:part.questions}))});
  fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubble.vue:188',message:'backlogParts computed',data:{messageId:props.message.id,backlogPartsCount:parts.length,parts:parts.map(({part,index})=>({index,questionsCount:part.questions?.length||0,questions:part.questions}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  return parts
})

// Watch for new backlog parts and add questions
watch(
  () => [parsedContent.value, props.message.id],
  (newVal, oldVal) => {
    // #region agent log
    console.log('[DEBUG] watch triggered', {messageId:props.message.id,parsedContentLength:parsedContent.value.length,backlogPartsCount:backlogParts.value.length,backlogParts:backlogParts.value.map(({part,index})=>({index,hasQuestions:!!part.questions,questionsCount:part.questions?.length||0,questions:part.questions}))});
    fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubble.vue:195',message:'watch triggered',data:{messageId:props.message.id,parsedContentLength:parsedContent.value.length,backlogPartsCount:backlogParts.value.length,backlogParts:backlogParts.value.map(({part,index})=>({index,hasQuestions:!!part.questions,questionsCount:part.questions?.length||0,questions:part.questions}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    backlogParts.value.forEach(({ part, index }) => {
      if (part.questions && part.questions.length > 0) {
        // #region agent log
        console.log('[DEBUG] calling addQuestions', {messageId:props.message.id,partIndex:index,questions:part.questions});
        fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubble.vue:201',message:'calling addQuestions',data:{messageId:props.message.id,partIndex:index,questions:part.questions},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        addQuestions(props.message.id, index, part.questions)
      }
    })
  },
  { immediate: true, deep: true }
)

// Watch getAllQuestions to verify reactivity
watch(
  () => getAllQuestions.value,
  (newVal, oldVal) => {
    // #region agent log
    console.log('[DEBUG] getAllQuestions changed', {messageId:props.message.id,newCount:newVal.length,oldCount:oldVal?.length||0,questions:newVal.map(q=>({id:q.id,question:q.question,checked:q.checked,messageId:q.messageId}))});
    fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubble.vue:212',message:'getAllQuestions changed',data:{messageId:props.message.id,newCount:newVal.length,oldCount:oldVal?.length||0,questions:newVal.map(q=>({id:q.id,question:q.question,checked:q.checked,messageId:q.messageId}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  },
  { deep: true }
)

// Get displayed questions - show all questions from all messages, with previous ones checked
const displayedQuestions = computed(() => {
    // #region agent log
    console.log('[DEBUG] displayedQuestions computed', {messageId:props.message.id,backlogPartsCount:backlogParts.value.length,getAllQuestionsValue:getAllQuestions.value.length});
    fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubble.vue:220',message:'displayedQuestions computed',data:{messageId:props.message.id,backlogPartsCount:backlogParts.value.length,getAllQuestionsValue:getAllQuestions.value.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  // If this message has backlog parts, show all questions (from all messages)
  // Otherwise, show only questions from this message
  if (backlogParts.value.length > 0) {
    // Show all questions from all messages - use reactive computed instead of function
    const allQuestions = getAllQuestions.value
    // #region agent log
    console.log('[DEBUG] got allQuestions from computed', {count:allQuestions.length,questions:allQuestions.map(q=>({id:q.id,question:q.question,checked:q.checked,messageId:q.messageId}))});
    fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubble.vue:224',message:'got allQuestions from computed',data:{count:allQuestions.length,questions:allQuestions.map(q=>({id:q.id,question:q.question,checked:q.checked,messageId:q.messageId}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Sort by messageId (to group by message) and then by questionIndex
    // Create a copy before sorting to avoid mutating the reactive array
    const sorted = [...allQuestions].sort((a, b) => {
      // First, check if questions are from the same message
      if (a.messageId === b.messageId) {
        // Same message: sort by questionIndex
        if (a.questionIndex === -1 && b.questionIndex !== -1) return 1
        if (a.questionIndex !== -1 && b.questionIndex === -1) return -1
        if (a.questionIndex !== -1 && b.questionIndex !== -1) {
          return a.questionIndex - b.questionIndex
        }
        return a.id.localeCompare(b.id)
      }
      // Different messages: try to extract timestamp from messageId
      // Message IDs are like "bot-1234567890" or "user-1234567890"
      const aMatch = a.messageId.match(/\d+/)
      const bMatch = b.messageId.match(/\d+/)
      if (aMatch && bMatch) {
        const aTime = parseInt(aMatch[0])
        const bTime = parseInt(bMatch[0])
        if (aTime !== bTime) {
          return bTime - aTime // Newer messages first
        }
      }
      // Fallback: sort by messageId string (newer messages typically come later alphabetically)
      return b.messageId.localeCompare(a.messageId)
    })
    // #region agent log
    console.log('[DEBUG] displayedQuestions sorted', {count:sorted.length,questions:sorted.map(q=>({id:q.id,question:q.question,checked:q.checked,messageId:q.messageId}))});
    fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubble.vue:254',message:'displayedQuestions sorted',data:{count:sorted.length,questions:sorted.map(q=>({id:q.id,question:q.question,checked:q.checked,messageId:q.messageId}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return sorted
  } else {
    // No backlog parts in this message, return empty array
    return []
  }
})

const containerClass = computed(() => {
  return props.message.isUser 
    ? 'flex justify-end mb-4 px-4'
    : 'flex justify-start mb-4 px-4'
})

const bubbleClass = computed(() => {
  const baseClass = 'max-w-[80%] px-4 py-3 break-words'
  
  if (props.message.isUser) {
    return `${baseClass} bg-[#FAECE0] text-gray-900 rounded-xl rounded-tr-none`
  } else {
    return `${baseClass} text-gray-900 rounded-xl rounded-tl-none`
  }
})

const handleOptionClick = (option: string, index: number) => {
  selectedOptionIndex.value = index
  emit('optionClick', option)
}

const handleQuestionCheck = (questionId: string) => {
  // #region agent log
  console.log('[DEBUG] handleQuestionCheck called', {questionId});
  fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubble.vue:290',message:'handleQuestionCheck called',data:{questionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  toggleQuestion(questionId)
}

const startQuestionEdit = (questionId: string, currentText: string) => {
  editingQuestionId.value = questionId
  editingQuestionText.value = currentText
}

const saveQuestionEdit = (questionId: string) => {
  if (editingQuestionText.value.trim()) {
    updateQuestion(questionId, editingQuestionText.value.trim())
  }
  editingQuestionId.value = null
  editingQuestionText.value = ''
}

const cancelQuestionEdit = () => {
  editingQuestionId.value = null
  editingQuestionText.value = ''
}

const addNewQuestion = () => {
  const firstBacklogPart = backlogParts.value[0]
  if (firstBacklogPart) {
    const newId = addNewQuestionToStore(props.message.id, firstBacklogPart.index)
    startQuestionEdit(newId, '')
  }
}

const deleteQuestion = (questionId: string) => {
  deleteQuestionFromStore(questionId)
}

// Drag and drop handlers (mouse)
const handleDragStart = (event: DragEvent, questionId: string, index: number) => {
  draggedQuestionId.value = questionId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', questionId)
  }
}

const handleDragOver = (event: DragEvent, index: number) => {
  event.preventDefault()
  draggedOverIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDragLeave = () => {
  // Don't clear draggedOverIndex here as it might flicker
}

const handleDrop = (event: DragEvent, toIndex: number) => {
  event.preventDefault()
  if (draggedQuestionId.value === null) return
  
  const fromIndex = displayedQuestions.value.findIndex(q => q.id === draggedQuestionId.value)
  if (fromIndex !== -1 && fromIndex !== toIndex) {
    // Find the actual indices in allQuestions
    const allQuestionsArray = getAllQuestions.value
    const fromGlobalIndex = allQuestionsArray.findIndex(q => q.id === draggedQuestionId.value)
    const toGlobalIndex = allQuestionsArray.findIndex(q => q.id === displayedQuestions.value[toIndex].id)
    
    if (fromGlobalIndex !== -1 && toGlobalIndex !== -1) {
      reorderQuestions(fromGlobalIndex, toGlobalIndex)
    }
  }
  
  handleDragEnd()
}

const handleDragEnd = () => {
  draggedQuestionId.value = null
  draggedOverIndex.value = null
}

// Touch handlers (mobile)
const handleTouchStart = (event: TouchEvent, questionId: string, index: number) => {
  // Only start drag if touching the drag handle area (not checkbox or buttons)
  const target = event.target as HTMLElement
  if (target.closest('input[type="checkbox"]') || target.closest('button') || target.closest('input[type="text"]')) {
    return
  }
  
  touchStartY.value = event.touches[0].clientY
  touchStartIndex.value = index
  draggedQuestionId.value = questionId
  const element = event.currentTarget as HTMLElement
  if (element) {
    element.style.transition = 'none'
  }
}

const handleTouchMove = (event: TouchEvent, index: number) => {
  if (touchStartY.value === null || touchStartIndex.value === null || draggedQuestionId.value === null) return
  
  event.preventDefault()
  const touchY = event.touches[0].clientY
  const deltaY = touchY - touchStartY.value
  
  // Only move if drag has started (threshold to prevent accidental drags)
  if (Math.abs(deltaY) < 10) return
  
  // Find the element being dragged
  const draggedElement = event.currentTarget as HTMLElement
  if (draggedElement) {
    draggedElement.style.transform = `translateY(${deltaY}px)`
    draggedElement.style.zIndex = '1000'
  }
  
  // Find which index we're over by checking all question items
  const allItems = Array.from(document.querySelectorAll('[data-question-item]')) as HTMLElement[]
  const startIndex = touchStartIndex.value
  if (startIndex === null) return
  
  let newIndex = startIndex
  
  allItems.forEach((item, i) => {
    const rect = item.getBoundingClientRect()
    const itemCenter = rect.top + rect.height / 2
    
    if (touchY < itemCenter && i < startIndex) {
      newIndex = Math.min(newIndex, i)
    } else if (touchY > itemCenter && i > startIndex) {
      newIndex = Math.max(newIndex, i)
    }
  })
  
  draggedOverIndex.value = newIndex
}

const handleTouchEnd = (event: TouchEvent) => {
  if (touchStartIndex.value === null || draggedQuestionId.value === null) {
    touchStartY.value = null
    touchStartIndex.value = null
    draggedQuestionId.value = null
    draggedOverIndex.value = null
    return
  }
  
  const target = event.currentTarget as HTMLElement
  if (target) {
    target.style.transform = ''
    target.style.transition = ''
    target.style.zIndex = ''
  }
  
  const finalIndex = draggedOverIndex.value ?? touchStartIndex.value
  
  if (touchStartIndex.value !== finalIndex && finalIndex >= 0 && finalIndex < displayedQuestions.value.length) {
    // Find the actual indices in allQuestions
    const allQuestionsArray = getAllQuestions.value
    const fromGlobalIndex = allQuestionsArray.findIndex(q => q.id === draggedQuestionId.value)
    const toQuestion = displayedQuestions.value[finalIndex]
    const toGlobalIndex = allQuestionsArray.findIndex(q => q.id === toQuestion?.id)
    
    if (fromGlobalIndex !== -1 && toGlobalIndex !== -1) {
      reorderQuestions(fromGlobalIndex, toGlobalIndex)
    }
  }
  
  touchStartY.value = null
  touchStartIndex.value = null
  draggedQuestionId.value = null
  draggedOverIndex.value = null
}
</script>

<style scoped>
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 0.5em;
  line-height: 1.25;
}

.markdown-content :deep(h1) {
  font-size: 1.5em;
}

.markdown-content :deep(h2) {
  font-size: 1.3em;
}

.markdown-content :deep(h3) {
  font-size: 1.1em;
}

.markdown-content :deep(p) {
  margin-bottom: 0.75em;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.75em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
}

.markdown-content :deep(strong) {
  font-weight: 600;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 1em 0;
}

.markdown-content :deep(code) {
  background-color: #f3f4f6;
  padding: 0.125em 0.25em;
  border-radius: 0.25em;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  background-color: #f3f4f6;
  padding: 1em;
  border-radius: 0.5em;
  overflow-x: auto;
  margin: 0.75em 0;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}
</style>

