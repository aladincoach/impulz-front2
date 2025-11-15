import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Cache global pour le system prompt (si activé)
let systemPromptCache: string | null = null

// Fonction pour charger le system prompt
async function getSystemPrompt(useCache: boolean): Promise<string> {
  // Si le cache est désactivé, recharger le fichier à chaque fois
  if (!useCache) {
    try {
      const prompt = await loadPromptFile()
      console.log('🔄 [RELOAD] System prompt rechargé (cache désactivé)')
      console.log('📝 [DEBUG] Prompt length:', prompt.length)
      return prompt
    } catch (error) {
      console.error('❌ [ERROR] Erreur lors du chargement du system prompt:', error)
      throw error
    }
  }

  // Si le cache est activé, charger une seule fois
  if (systemPromptCache === null) {
    try {
      systemPromptCache = await loadPromptFile()
      console.log('✅ [CACHE] System prompt chargé et mis en cache')
      console.log('📝 [DEBUG] Prompt length:', systemPromptCache.length)
    } catch (error) {
      console.error('❌ [ERROR] Erreur lors du chargement du system prompt:', error)
      throw error
    }
  }
  return systemPromptCache
}

// Fonction pour charger le fichier prompt depuis différents emplacements
async function loadPromptFile(): Promise<string> {
  console.log('🔍 [LOAD] ========== DEBUT CHARGEMENT SYSTEM PROMPT ==========')
  console.log('🔍 [LOAD] CWD:', process.cwd())
  console.log('🔍 [LOAD] __filename:', import.meta.url)
  console.log('🔍 [LOAD] NODE_ENV:', process.env.NODE_ENV)
  console.log('🔍 [LOAD] NETLIFY:', process.env.NETLIFY)
  
  // Lister les fichiers dans le répertoire courant pour debug
  try {
    const { readdirSync } = await import('fs')
    console.log('🔍 [LOAD] Files in CWD:', readdirSync(process.cwd()))
    
    // Essayer de lister /var/task si on est sur Netlify
    if (existsSync('/var/task')) {
      console.log('🔍 [LOAD] Files in /var/task:', readdirSync('/var/task'))
    }
  } catch (error: any) {
    console.log('⚠️  [LOAD] Could not list directories:', error.message)
  }
  
  // 1. Essayer avec useStorage (pour le dev local et si serverAssets fonctionne)
  console.log('🔍 [LOAD] --- Tentative 1: useStorage ---')
  try {
    const storage = useStorage('assets:prompts')
    console.log('🔍 [LOAD] Storage created, attempting getItem...')
    const prompt = await storage.getItem('system-prompt.md')
    console.log('🔍 [LOAD] getItem returned type:', typeof prompt)
    console.log('🔍 [LOAD] getItem returned value length:', prompt ? String(prompt).length : 0)
    
    if (prompt && typeof prompt === 'string' && prompt.length > 50) {
      console.log('✅ [LOAD] Prompt chargé via useStorage (length:', prompt.length, ')')
      return prompt
    } else {
      console.log('⚠️  [LOAD] useStorage returned invalid data')
    }
  } catch (error: any) {
    console.log('⚠️  [LOAD] useStorage failed:', error.message)
    console.log('⚠️  [LOAD] useStorage error stack:', error.stack)
  }

  // 2. Fallback: essayer de lire directement depuis le système de fichiers
  console.log('🔍 [LOAD] --- Tentative 2: File System ---')
  const possiblePaths = [
    join(process.cwd(), 'prompts', 'system-prompt.md'),
    join(process.cwd(), 'dist', 'prompts', 'system-prompt.md'),
    join(process.cwd(), '..', '..', 'prompts', 'system-prompt.md'),
    '/var/task/prompts/system-prompt.md',
    '/var/task/dist/prompts/system-prompt.md',
  ]
  
  console.log('🔍 [LOAD] Will try', possiblePaths.length, 'paths')
  
  for (let i = 0; i < possiblePaths.length; i++) {
    const path = possiblePaths[i]
    console.log(`🔍 [LOAD] [${i + 1}/${possiblePaths.length}] Trying:`, path)
    try {
      const exists = existsSync(path)
      console.log(`🔍 [LOAD] [${i + 1}/${possiblePaths.length}] existsSync returned:`, exists)
      
      if (exists) {
        console.log(`🔍 [LOAD] [${i + 1}/${possiblePaths.length}] File exists! Reading...`)
        const prompt = readFileSync(path, 'utf8')
        console.log(`✅ [LOAD] SUCCESS! Prompt loaded from: ${path}`)
        console.log(`✅ [LOAD] Prompt length: ${prompt.length} characters`)
        console.log(`✅ [LOAD] Prompt preview: ${prompt.substring(0, 50)}...`)
        return prompt
      } else {
        console.log(`⚠️  [LOAD] [${i + 1}/${possiblePaths.length}] Path does not exist`)
      }
    } catch (error: any) {
      console.log(`❌ [LOAD] [${i + 1}/${possiblePaths.length}] Error:`, error.message)
    }
  }

  console.error('❌ [LOAD] ========== ALL LOADING METHODS FAILED ==========')
  throw new Error('Unable to load system prompt from any location')
}

export default defineEventHandler(async (event) => {
  const { message, conversationHistory } = await readBody(event)

  console.log('🔵 [API] Message reçu:', message)
  console.log('🔵 [API] Historique:', conversationHistory?.length || 0, 'messages')

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Message is required'
    })
  }

  const config = useRuntimeConfig(event)
  const useCache = config.systemPromptCache
  const apiKey = process.env.ANTHROPIC_API_KEY // ✅ lu à l’exécution, pas au build
  if (!apiKey) return { statusCode: 500, body: 'Missing ANTHROPIC_API_KEY' }

  console.log('✅ [API] API Key présente (length:', apiKey.length, ')')
  console.log('⚙️  [CONFIG] Cache system prompt:', useCache ? 'activé' : 'désactivé')

  const client = new Anthropic({
    apiKey: apiKey
  })

  try {
    // Construire l'historique de conversation pour Claude
    const messages: Anthropic.MessageParam[] = []
    
    // Ajouter l'historique si présent
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: { text: string; isUser: boolean }) => {
        messages.push({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.text
        })
      })
    }
    
    // Ajouter le nouveau message utilisateur
    messages.push({
      role: 'user',
      content: message
    })

    console.log('📤 [API] Envoi à Claude avec', messages.length, 'messages')

    // Charger le system prompt
    const systemPrompt = await getSystemPrompt(useCache)
    console.log('📝 [DEBUG] System prompt type:', typeof systemPrompt)
    console.log('📝 [DEBUG] System prompt preview:', systemPrompt.substring(0, 100))

    // Créer le stream avec Claude - Utilisation du modèle correct
    const stream = await client.messages.stream({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages
    })

    console.log('✅ [API] Stream créé avec succès, début du streaming...')

    // Configurer la réponse pour le streaming
    setResponseHeaders(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })

    // Créer un stream de réponse
    const encoder = new TextEncoder()
    let chunkCount = 0
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text
              chunkCount++
              if (chunkCount === 1) {
                console.log('🟢 [API] Premier chunk reçu de Claude!')
              }
              // Envoyer le texte en format SSE
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          console.log('✅ [API] Streaming terminé -', chunkCount, 'chunks envoyés')
          // Envoyer le signal de fin
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('❌ [API] Streaming error:', error)
          controller.error(error)
        }
      }
    })

    return readableStream
  } catch (error: any) {
    console.error('❌ [API] Claude API error:', error)
    console.error('❌ [API] Error status:', error.status)
    console.error('❌ [API] Error message:', error.message)
    throw createError({
      statusCode: error.status || 500,
      statusMessage: error.message || 'Error communicating with Claude'
    })
  }
})

