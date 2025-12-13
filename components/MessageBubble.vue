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
            <span class="whitespace-pre-wrap">{{ part.content }}</span>
          </template>
          <template v-else-if="part.type === 'thinking'">
            <details class="border-l-2 border-gray-300 pl-3">
              <summary class="cursor-pointer text-sm text-gray-500 font-light select-none hover:text-gray-700">
                Thinking :
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
            <details class="mt-3 border-l-2 border-blue-300 pl-3">
              <summary class="cursor-pointer text-sm text-blue-600 font-medium select-none hover:text-blue-800">
                📋 Coming up next ({{ part.questions?.length || 0 }} questions)
              </summary>
              <ul class="text-sm text-gray-600 mt-2 space-y-1">
                <li v-for="(question, qIndex) in part.questions" :key="qIndex" class="flex items-start gap-2">
                  <span class="text-blue-400">→</span>
                  <span>{{ question }}</span>
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
import { computed, ref } from 'vue'

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

const parsedContent = computed(() => {
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
</script>

