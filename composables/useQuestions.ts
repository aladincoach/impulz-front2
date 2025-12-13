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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQuestions.ts:14',message:'useQuestions composable called',data:{existingQuestionsCount:allQuestions.value.length,allQuestionsRef:allQuestions.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const addQuestions = (messageId: string, partIndex: number, questions: string[]) => {
    // #region agent log
    console.log('[DEBUG] addQuestions called', {messageId,partIndex,questionsCount:questions.length,questions,existingQuestionsCount:allQuestions.value.length});
    fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQuestions.ts:15',message:'addQuestions called',data:{messageId,partIndex,questionsCount:questions.length,questions,existingQuestionsCount:allQuestions.value.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Mark all previous questions as checked when new ones are added
    const hasNewQuestions = questions.length > 0
    if (hasNewQuestions) {
      // Check if there are any unchecked questions from previous messages
      const hasUncheckedQuestions = allQuestions.value.some(q => !q.checked && q.messageId !== messageId)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQuestions.ts:21',message:'checking previous questions',data:{hasUncheckedQuestions,previousQuestions:allQuestions.value.map(q=>({id:q.id,messageId:q.messageId,checked:q.checked}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQuestions.ts:34',message:'after filter',data:{beforeFilter,afterFilter:allQuestions.value.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQuestions.ts:57',message:'addQuestions completed',data:{addedCount,finalCount:allQuestions.value.length,allQuestions:allQuestions.value.map(q=>({id:q.id,question:q.question,checked:q.checked,messageId:q.messageId}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }

  const toggleQuestion = (id: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQuestions.ts:59',message:'toggleQuestion called',data:{id,allQuestionsCount:allQuestions.value.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const question = allQuestions.value.find(q => q.id === id)
    if (question) {
      const oldChecked = question.checked
      question.checked = !question.checked
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQuestions.ts:64',message:'toggleQuestion completed',data:{id,oldChecked,newChecked:question.checked},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQuestions.ts:67',message:'toggleQuestion - question not found',data:{id,availableIds:allQuestions.value.map(q=>q.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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

  const getQuestionsForMessagePart = (messageId: string, partIndex: number): QuestionState[] => {
    return allQuestions.value.filter(
      q => q.messageId === messageId && q.partIndex === partIndex
    )
  }

  const getAllQuestions = computed(() => allQuestions.value)
  
  // Get all questions, useful for displaying in the latest message
  const getAllQuestionsList = (): QuestionState[] => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useQuestions.ts:99',message:'getAllQuestionsList called',data:{count:allQuestions.value.length,questions:allQuestions.value.map(q=>({id:q.id,question:q.question,checked:q.checked,messageId:q.messageId}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return [...allQuestions.value]
  }

  return {
    addQuestions,
    toggleQuestion,
    updateQuestion,
    addNewQuestion,
    deleteQuestion,
    getQuestionsForMessagePart,
    getAllQuestions,
    getAllQuestionsList
  }
}

