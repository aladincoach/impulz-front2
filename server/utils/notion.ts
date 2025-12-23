import { Client } from '@notionhq/client'

// Durée du cache en secondes (configurable via variable d'environnement)
// Par défaut : 300 secondes (5 minutes)
function getCacheDuration(): number {
  const envSeconds = process.env.NOTION_CACHE_SECONDS
  const seconds = envSeconds ? parseInt(envSeconds, 10) : 300
  return seconds * 1000 // Convertir en millisecondes
}

/**
 * Formate un UUID Notion en ajoutant les tirets si nécessaire
 * Notion attend les UUIDs au format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
function formatNotionId(id: string): string {
  if (!id) return id
  // Si l'ID n'a pas de tirets et fait 32 caractères, ajouter les tirets
  if (id.length === 32 && !id.includes('-')) {
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20, 32)}`
  }
  return id
}

interface NotionConfig {
  apiKey: string
  pageId: string
}

/**
 * Récupère le contenu d'une page Notion et le convertit en texte Markdown
 */
async function fetchNotionPageContent(config: NotionConfig): Promise<string> {
  const notion = new Client({ auth: config.apiKey })
  
  try {
    console.log('🔍 [NOTION] Fetching page content from Notion...')
    // Formater l'ID pour s'assurer qu'il a les tirets au bon format
    const formattedPageId = formatNotionId(config.pageId)
    console.log('🔍 [NOTION] Page ID:', formattedPageId)
    
    // Récupérer les blocs de la page
    const response = await notion.blocks.children.list({
      block_id: formattedPageId,
      page_size: 100
    })
    
    console.log('✅ [NOTION] Received', response.results.length, 'blocks')
    
    // Convertir les blocs en texte
    const content = await convertBlocksToMarkdown(notion, response.results)
    
    console.log('✅ [NOTION] Content converted, length:', content.length)
    return content
  } catch (error: any) {
    console.error('❌ [NOTION] Error fetching page:', error.message)
    throw new Error(`Failed to fetch Notion page: ${error.message}`)
  }
}

/**
 * Convertit les blocs Notion en Markdown
 */
async function convertBlocksToMarkdown(notion: Client, blocks: any[]): Promise<string> {
  const lines: string[] = []
  
  for (const block of blocks) {
    try {
      const text = await blockToMarkdown(notion, block)
      if (text) {
        lines.push(text)
      }
    } catch (error: any) {
      console.warn('⚠️  [NOTION] Error converting block:', error.message)
    }
  }
  
  return lines.join('\n\n')
}

/**
 * Convertit un bloc Notion individuel en Markdown
 */
async function blockToMarkdown(notion: Client, block: any): Promise<string> {
  const type = block.type
  
  switch (type) {
    case 'paragraph':
      return richTextToString(block.paragraph.rich_text)
    
    case 'heading_1':
      return '# ' + richTextToString(block.heading_1.rich_text)
    
    case 'heading_2':
      return '## ' + richTextToString(block.heading_2.rich_text)
    
    case 'heading_3':
      return '### ' + richTextToString(block.heading_3.rich_text)
    
    case 'bulleted_list_item':
      return '- ' + richTextToString(block.bulleted_list_item.rich_text)
    
    case 'numbered_list_item':
      return '1. ' + richTextToString(block.numbered_list_item.rich_text)
    
    case 'quote':
      return '> ' + richTextToString(block.quote.rich_text)
    
    case 'code':
      const code = richTextToString(block.code.rich_text)
      const language = block.code.language || ''
      return '```' + language + '\n' + code + '\n```'
    
    case 'divider':
      return '---'
    
    case 'toggle':
      // Pour les toggles, on récupère aussi le contenu enfant
      let toggleText = richTextToString(block.toggle.rich_text)
      if (block.has_children) {
        try {
          const children = await notion.blocks.children.list({
            block_id: block.id
          })
          const childContent = await convertBlocksToMarkdown(notion, children.results)
          if (childContent) {
            toggleText += '\n' + childContent
          }
        } catch (error) {
          console.warn('⚠️  [NOTION] Could not fetch toggle children')
        }
      }
      return toggleText
    
    case 'callout':
      return '> 💡 ' + richTextToString(block.callout.rich_text)
    
    default:
      // Pour les types non supportés, essayer d'extraire le texte s'il existe
      if (block[type]?.rich_text) {
        return richTextToString(block[type].rich_text)
      }
      console.warn('⚠️  [NOTION] Unsupported block type:', type)
      return ''
  }
}

/**
 * Convertit le rich text Notion en string simple
 */
function richTextToString(richText: any[]): string {
  if (!richText || !Array.isArray(richText)) {
    return ''
  }
  
  return richText.map(text => {
    let content = text.plain_text || ''
    
    // Appliquer les annotations Markdown
    if (text.annotations) {
      if (text.annotations.bold) content = `**${content}**`
      if (text.annotations.italic) content = `*${content}*`
      if (text.annotations.code) content = `\`${content}\``
      if (text.annotations.strikethrough) content = `~~${content}~~`
    }
    
    // Gérer les liens
    if (text.href) {
      content = `[${content}](${text.href})`
    }
    
    return content
  }).join('')
}

/**
 * Cache pour les prompts multiples (base + stages)
 */
interface PromptCache {
  content: string
  timestamp: number
}

const promptCaches = new Map<string, PromptCache>()

/**
 * Récupère un prompt depuis Notion avec cache
 */
async function getPromptFromNotion(
  cacheKey: string, 
  pageId: string | undefined, 
  useCache: boolean = true
): Promise<string | null> {
  const apiKey = process.env.NOTION_API_KEY
  
  if (!apiKey || !pageId) {
    return null
  }
  
  // Vérifier si on peut utiliser le cache
  const now = Date.now()
  const cacheDuration = getCacheDuration()
  const cached = promptCaches.get(cacheKey)
  
  if (useCache && cached && (now - cached.timestamp) < cacheDuration) {
    const ageSeconds = Math.round((now - cached.timestamp) / 1000)
    const durationSeconds = Math.round(cacheDuration / 1000)
    console.log(`✅ [NOTION] Using cached ${cacheKey} (age: ${ageSeconds}s, expires after ${durationSeconds}s)`)
    return cached.content
  }
  
  // Sinon, récupérer depuis Notion
  console.log(`🔄 [NOTION] Fetching ${cacheKey} from Notion...`)
  try {
    const prompt = await fetchNotionPageContent({ apiKey, pageId })
    
    // Mettre en cache
    if (useCache) {
      promptCaches.set(cacheKey, { content: prompt, timestamp: now })
      console.log(`✅ [NOTION] ${cacheKey} cached`)
    }
    
    return prompt
  } catch (error: any) {
    console.error(`❌ [NOTION] Error fetching ${cacheKey}:`, error.message)
    return null
  }
}

/**
 * Récupère le base prompt depuis Notion
 */
export async function getBasePromptFromNotion(useCache: boolean = true): Promise<string | null> {
  const pageId = process.env.NOTION_BASEPROMPT
  return getPromptFromNotion('base_prompt', pageId, useCache)
}

/**
 * Récupère un stage prompt depuis Notion
 */
export async function getStagePromptFromNotion(
  stageNumber: number, 
  useCache: boolean = true
): Promise<string | null> {
  const envVar = `NOTION_STAGEPROMPT_${stageNumber}`
  const pageId = process.env[envVar]
  return getPromptFromNotion(`stage_${stageNumber}`, pageId, useCache)
}

/**
 * Force le rechargement du cache
 */
export function clearNotionCache(): void {
  promptCaches.clear()
  knowledgeBaseCache = null
  console.log('🔄 [NOTION] All caches cleared')
}

// ============================================
// KNOWLEDGE BASE (Coaching Recommendations)
// ============================================

export interface KnowledgeEntry {
  id: string
  titre: string
  thematique: string
  contexte_narratif: string
  question_posee: string
  variantes_questions: string
  probleme_sous_jacent: string
  recommandation_impulz: string
  punchline: string
  histoire_vraie: string
  persona: string[]
  maturite: string[]  // 'idée', 'MVP', 'traction', 'scale'
  challenge_utilisateur: string
  temps_action: number | null
}

interface KnowledgeBaseCache {
  entries: KnowledgeEntry[]
  timestamp: number
}

let knowledgeBaseCache: KnowledgeBaseCache | null = null

/**
 * Extract text from Notion rich text array
 */
function extractRichText(richText: any[]): string {
  if (!richText || !Array.isArray(richText)) return ''
  return richText.map(t => t.plain_text || '').join('')
}

/**
 * Extract multi-select values from Notion property
 */
function extractMultiSelect(multiSelect: any[]): string[] {
  if (!multiSelect || !Array.isArray(multiSelect)) return []
  return multiSelect.map(item => item.name || '')
}

/**
 * Extract select value from Notion property
 */
function extractSelect(select: any): string {
  return select?.name || ''
}

/**
 * Extract number from Notion property
 */
function extractNumber(num: any): number | null {
  return typeof num === 'number' ? num : null
}

/**
 * Convert a Notion database row to KnowledgeEntry
 */
function notionRowToKnowledgeEntry(row: any): KnowledgeEntry {
  const props = row.properties
  
  return {
    id: row.id,
    titre: extractRichText(props['Titre']?.title) || '',
    thematique: extractSelect(props['Thématique']?.select) || extractRichText(props['Thématique']?.rich_text) || '',
    contexte_narratif: extractRichText(props['Contexte narratif']?.rich_text) || '',
    question_posee: extractRichText(props['Question posée']?.rich_text) || '',
    variantes_questions: extractRichText(props['variantes questions']?.rich_text) || '',
    probleme_sous_jacent: extractRichText(props['Problème sous-jacent']?.rich_text) || '',
    recommandation_impulz: extractRichText(props['Recommandation boostée Impulz']?.rich_text) || '',
    punchline: extractRichText(props['Punchline']?.rich_text) || '',
    histoire_vraie: extractRichText(props['Histoire vraie']?.rich_text) || '',
    persona: extractMultiSelect(props['Persona']?.multi_select) || [],
    maturite: extractMultiSelect(props['Maturité']?.multi_select) || [],
    challenge_utilisateur: extractRichText(props['Challenge utilisateur (actions prioritaires)']?.rich_text) || '',
    temps_action: extractNumber(props['Temps d\'action (jours)']?.number)
  }
}

/**
 * Fetch knowledge base from Notion database
 */
export async function getKnowledgeBase(useCache: boolean = true): Promise<KnowledgeEntry[]> {
  const apiKey = process.env.NOTION_API_KEY
  const rawDatabaseId = process.env.NOTION_KNOWLEDGE_BASE
  
  if (!apiKey || !rawDatabaseId) {
    console.warn('⚠️ [NOTION] NOTION_API_KEY or NOTION_KNOWLEDGE_BASE not configured')
    return []
  }
  
  // Formater l'ID pour s'assurer qu'il a les tirets au bon format
  const databaseId = formatNotionId(rawDatabaseId)
  
  // Check cache
  const now = Date.now()
  const cacheDuration = getCacheDuration()
  
  if (useCache && knowledgeBaseCache && (now - knowledgeBaseCache.timestamp) < cacheDuration) {
    const ageSeconds = Math.round((now - knowledgeBaseCache.timestamp) / 1000)
    console.log(`✅ [NOTION] Using cached knowledge base (${knowledgeBaseCache.entries.length} entries, age: ${ageSeconds}s)`)
    return knowledgeBaseCache.entries
  }
  
  // Fetch from Notion
  console.log('🔄 [NOTION] Fetching knowledge base from Notion...')
  const notion = new Client({ auth: apiKey })
  
  try {
    const entries: KnowledgeEntry[] = []
    let hasMore = true
    let startCursor: string | undefined = undefined
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notion.ts:368',message:'getKnowledgeBase: starting pagination loop',data:{databaseId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    while (hasMore) {
      
      // In Notion SDK v5, databases.query() was removed from the SDK
      // We need to call the API directly using fetch since notion.request() doesn't work with this endpoint
      let response: any
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notion.ts:386',message:'getKnowledgeBase: calling API directly with fetch',data:{databaseId,startCursor,apiKeyLength:apiKey?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
        // #endregion
        
        // Call the Notion API directly using fetch
        const apiResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...(startCursor && { start_cursor: startCursor }),
            page_size: 100
          })
        })
        
        if (!apiResponse.ok) {
          const errorData = await apiResponse.json().catch(() => ({}))
          throw new Error(`API error: ${apiResponse.status} ${apiResponse.statusText} - ${JSON.stringify(errorData)}`)
        }
        
        response = await apiResponse.json()
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notion.ts:407',message:'getKnowledgeBase: API call succeeded',data:{hasResults:!!response.results,resultsLength:response.results?.length,hasMore:response.has_more,responseKeys:Object.keys(response)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
        // #endregion
      } catch (apiError: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notion.ts:412',message:'getKnowledgeBase: API call failed',data:{errorMessage:apiError?.message,errorStack:apiError?.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
        // #endregion
        throw apiError
      }
      
      for (const row of response.results) {
        const entry = notionRowToKnowledgeEntry(row)
        // Only include entries with valid recommendations
        if (entry.recommandation_impulz || entry.punchline) {
          entries.push(entry)
        }
      }
      
      hasMore = response.has_more
      startCursor = response.next_cursor || undefined
    }
    
    console.log(`✅ [NOTION] Loaded ${entries.length} knowledge base entries`)
    
    // Cache the results
    if (useCache) {
      knowledgeBaseCache = { entries, timestamp: now }
    }
    
    return entries
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/30efcb70-2bcc-4424-99b4-7c9b6585f9ec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'notion.ts:425',message:'getKnowledgeBase: outer catch block',data:{errorMessage:error?.message,errorCode:error?.code,errorStatus:error?.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    console.error('❌ [NOTION] Error fetching knowledge base:', error.message)
    return knowledgeBaseCache?.entries || []
  }
}

/**
 * Format a knowledge entry for display in chat
 */
export function formatKnowledgeEntry(entry: KnowledgeEntry): string {
  const parts: string[] = []
  
  if (entry.punchline) {
    parts.push(`**${entry.punchline}**`)
  }
  
  if (entry.recommandation_impulz) {
    parts.push(entry.recommandation_impulz)
  }
  
  if (entry.histoire_vraie) {
    parts.push(`\n**Exemple réel:** ${entry.histoire_vraie}`)
  }
  
  if (entry.challenge_utilisateur) {
    parts.push(`\n**Ton challenge:**\n${entry.challenge_utilisateur}`)
    if (entry.temps_action) {
      parts.push(`\n*Temps estimé: ${entry.temps_action} jour(s)*`)
    }
  }
  
  return parts.join('\n\n')
}

