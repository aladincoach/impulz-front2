import { Client } from '@notionhq/client'

// Cache pour le system prompt
let cachedPrompt: string | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes en millisecondes

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
    console.log('🔍 [NOTION] Page ID:', config.pageId)
    
    // Récupérer les blocs de la page
    const response = await notion.blocks.children.list({
      block_id: config.pageId,
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
 * Récupère le system prompt depuis Notion avec cache
 */
export async function getSystemPromptFromNotion(useCache: boolean = true): Promise<string> {
  const apiKey = process.env.NOTION_API_KEY
  const pageId = process.env.NOTION_PROMPT_PAGE_ID
  
  if (!apiKey || !pageId) {
    throw new Error('Missing NOTION_API_KEY or NOTION_PROMPT_PAGE_ID environment variables')
  }
  
  // Vérifier si on peut utiliser le cache
  const now = Date.now()
  if (useCache && cachedPrompt && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('✅ [NOTION] Using cached prompt (age:', Math.round((now - cacheTimestamp) / 1000), 'seconds)')
    return cachedPrompt
  }
  
  // Sinon, récupérer depuis Notion
  console.log('🔄 [NOTION] Cache miss or disabled, fetching from Notion...')
  const prompt = await fetchNotionPageContent({ apiKey, pageId })
  
  // Mettre en cache
  if (useCache) {
    cachedPrompt = prompt
    cacheTimestamp = now
    console.log('✅ [NOTION] Prompt cached')
  }
  
  return prompt
}

/**
 * Force le rechargement du cache
 */
export function clearNotionCache(): void {
  cachedPrompt = null
  cacheTimestamp = 0
  console.log('🔄 [NOTION] Cache cleared')
}

