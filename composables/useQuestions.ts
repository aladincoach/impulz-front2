import { ref, computed } from 'vue'

export interface QuestionState {
  id: string
  question: string
  checked: boolean
  messageId: string
  partIndex: number
  questionIndex: number
}

const allQuestions = ref<QuestionState[]>([])

export const useQuestions = () => {
  const addQuestions = (messageId: string, partIndex: number, questions: string[]) => {
    // Mark all previous questions as checked when new ones are added
    const hasNewQuestions = questions.length > 0
    if (hasNewQuestions) {
      // Check if there are any unchecked questions from previous messages
      const hasUncheckedQuestions = allQuestions.value.some(q => !q.checked && q.messageId !== messageId)
      if (hasUncheckedQuestions) {
        // Mark all previous questions as checked
        allQuestions.value.forEach(q => {
          if (q.messageId !== messageId && !q.checked) {
            q.checked = true
          }
        })
      }
    }
    
    // Remove any existing questions for this message part
    const beforeFilter = allQuestions.value.length
    allQuestions.value = allQuestions.value.filter(
      q => !(q.messageId === messageId && q.partIndex === partIndex)
    )
    
    // Add new questions
    let addedCount = 0
    questions.forEach((question, questionIndex) => {
      const existingQuestion = allQuestions.value.find(
        q => q.question === question && q.messageId !== messageId
      )
      
      if (existingQuestion) {
        // If question already exists from a previous message, keep it but update references
        // Don't duplicate, just update the reference
        return
      }
      
      allQuestions.value.push({
        id: `${messageId}-${partIndex}-${questionIndex}`,
        question,
        checked: false,
        messageId,
        partIndex,
        questionIndex
      })
      addedCount++
    })
  }

  const toggleQuestion = (id: string) => {
    const question = allQuestions.value.find(q => q.id === id)
    if (question) {
      question.checked = !question.checked
    }
  }

  const updateQuestion = (id: string, newText: string) => {
    const question = allQuestions.value.find(q => q.id === id)
    if (question) {
      question.question = newText
    }
  }

  const addNewQuestion = (messageId: string, partIndex: number) => {
    const newQuestion: QuestionState = {
      id: `new-${Date.now()}-${Math.random()}`,
      question: '',
      checked: false,
      messageId,
      partIndex,
      questionIndex: -1 // Special index for new questions
    }
    allQuestions.value.push(newQuestion)
    return newQuestion.id
  }

  const deleteQuestion = (id: string) => {
    allQuestions.value = allQuestions.value.filter(q => q.id !== id)
  }

  const reorderQuestions = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    
    const questions = [...allQuestions.value]
    const [moved] = questions.splice(fromIndex, 1)
    questions.splice(toIndex, 0, moved)
    
    // Update questionIndex for all questions to reflect new order
    questions.forEach((q, index) => {
      q.questionIndex = index
    })
    
    allQuestions.value = questions
  }

  const getQuestionsForMessagePart = (messageId: string, partIndex: number): QuestionState[] => {
    return allQuestions.value.filter(
      q => q.messageId === messageId && q.partIndex === partIndex
    )
  }

  const getAllQuestions = computed(() => allQuestions.value)
  
  // Get all questions, useful for displaying in the latest message
  const getAllQuestionsList = (): QuestionState[] => {
    return [...allQuestions.value]
  }

  return {
    addQuestions,
    toggleQuestion,
    updateQuestion,
    addNewQuestion,
    deleteQuestion,
    reorderQuestions,
    getQuestionsForMessagePart,
    getAllQuestions,
    getAllQuestionsList
  }
}

