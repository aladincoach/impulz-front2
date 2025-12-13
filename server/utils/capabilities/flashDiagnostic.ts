/**
 * Flash Diagnostic Capability
 * Generates a quick project health assessment
 */

import type { SessionMemory } from '../memory'
import type { CapabilityResult } from './index'

/**
 * Generate a flash diagnostic based on current memory
 */
export function generateFlashDiagnostic(memory: SessionMemory): CapabilityResult {
  const strengths = identifyStrengths(memory)
  const gaps = identifyGaps(memory)
  const phase = assessPhase(memory)
  
  // Build the diagnostic content
  const content = buildDiagnosticContent(memory, strengths, gaps, phase)
  
  return {
    type: 'flash_diagnostic',
    content,
    quickButtons: [
      'Go deeper into the diagnostic',
      'Create an action plan'
    ]
  }
}

function identifyStrengths(memory: SessionMemory): string[] {
  const strengths: string[] = []
  
  // Domain expertise
  if (memory.user.skills.length > 0) {
    strengths.push(`🎓 Domain expertise in ${memory.user.skills.join(', ')}`)
  }
  
  // Existing assets
  if (memory.user.assets.length > 0) {
    strengths.push(`💼 Existing assets: ${memory.user.assets.join(', ')}`)
  }
  
  // Progress made
  if (memory.progress.activities.length > 0) {
    const hasUserResearch = memory.progress.activities.some(a => 
      a.toLowerCase().includes('interview') || 
      a.toLowerCase().includes('user') ||
      a.toLowerCase().includes('client')
    )
    if (hasUserResearch) {
      strengths.push('🎤 Already talking to users/clients')
    }
    
    const hasCompetitorResearch = memory.progress.activities.some(a =>
      a.toLowerCase().includes('competitor') ||
      a.toLowerCase().includes('benchmark') ||
      a.toLowerCase().includes('market')
    )
    if (hasCompetitorResearch) {
      strengths.push('🔍 Market awareness through competitor analysis')
    }
  }
  
  // Clear value proposition
  if (memory.project.problem && memory.project.solution) {
    strengths.push('💡 Clear problem-solution fit articulated')
  }
  
  return strengths.length > 0 ? strengths : ['💪 Motivation to start']
}

function identifyGaps(memory: SessionMemory): string[] {
  const gaps: string[] = []
  
  // Technical gaps
  if (memory.user.constraints.lacking?.some(l => 
    l.toLowerCase().includes('tech') || l.toLowerCase().includes('développ')
  )) {
    gaps.push('💻 Technical skills gap')
  }
  
  // Time constraints
  if (memory.user.constraints.time?.toLowerCase().includes('soir') ||
      memory.user.constraints.time?.toLowerCase().includes('weekend') ||
      memory.user.constraints.time?.toLowerCase().includes('evening')) {
    gaps.push('⏰ Limited time availability (side project mode)')
  }
  
  // Budget constraints
  if (memory.user.constraints.budget) {
    const budgetMatch = memory.user.constraints.budget.match(/(\d+)/g)
    if (budgetMatch && parseInt(budgetMatch[0]) < 10000) {
      gaps.push('💰 Limited initial budget')
    }
  }
  
  // Missing validation
  if (memory.progress.activities.length === 0) {
    gaps.push('📊 No market validation activities yet')
  } else {
    const hasPayingCustomers = memory.progress.activities.some(a =>
      a.toLowerCase().includes('vente') ||
      a.toLowerCase().includes('client payant') ||
      a.toLowerCase().includes('revenue')
    )
    if (!hasPayingCustomers && memory.project.phase !== 'idée') {
      gaps.push('💵 No paying customers yet')
    }
  }
  
  // Missing team
  if (!memory.user.assets.some(a => 
    a.toLowerCase().includes('associé') ||
    a.toLowerCase().includes('co-founder') ||
    a.toLowerCase().includes('équipe')
  )) {
    gaps.push('👤 Solo founder (no co-founder identified)')
  }
  
  return gaps.length > 0 ? gaps : ['❓ Need more information to identify gaps']
}

function assessPhase(memory: SessionMemory): string {
  if (memory.project.phase) {
    return memory.project.phase
  }
  
  // Infer phase from activities
  const activities = memory.progress.activities.map(a => a.toLowerCase())
  
  if (activities.some(a => a.includes('scale') || a.includes('growth') || a.includes('levée'))) {
    return 'scale'
  }
  if (activities.some(a => a.includes('launch') || a.includes('client payant') || a.includes('revenue'))) {
    return 'traction'
  }
  if (activities.some(a => a.includes('mvp') || a.includes('prototype') || a.includes('développ'))) {
    return 'MVP'
  }
  if (activities.some(a => a.includes('interview') || a.includes('recherche') || a.includes('benchmark'))) {
    return 'idée'
  }
  
  return 'idée'
}

function buildDiagnosticContent(
  memory: SessionMemory,
  strengths: string[],
  gaps: string[],
  phase: string
): string {
  const projectName = memory.project.name || 'Your project'
  const description = memory.project.description || 'your project idea'
  
  return `## 🔍 DIAGNOSTIC FLASH - ${projectName}

### 📋 Résumé du projet

${description}
${memory.project.features?.length ? `\n**Fonctionnalités clés**: ${memory.project.features.join(', ')}` : ''}

### 🚀 Phase actuelle: ${getPhaseEmoji(phase)} ${phase.toUpperCase()}

${getPhaseDescription(phase)}

### ✅ Points forts

${strengths.map(s => `- ${formatStrengthOrGap(s)}`).join('\n')}

### ⚠️ Points d'attention

${gaps.map(g => `- ${formatStrengthOrGap(g)}`).join('\n')}

### 🎯 Priorités immédiates

${getPhaseRecommendations(phase, gaps)}

---

💬 *Ceci est un diagnostic flash basé sur notre conversation. Tu veux aller plus loin ?*`
}

function getPhaseEmoji(phase: string): string {
  const emojis: Record<string, string> = {
    'idée': '💡',
    'MVP': '🔨',
    'traction': '📈',
    'scale': '🚀'
  }
  return emojis[phase] || '💡'
}

function getPhaseDescription(phase: string): string {
  const descriptions: Record<string, string> = {
    'idée': 'Tu es dans la phase de structuration de ton projet, avec les bases techniques mais il reste du travail de planification avant le lancement.',
    'MVP': 'Tu es en train de construire ton produit minimum viable. Concentre-toi sur livrer rapidement et obtenir de vrais retours utilisateurs.',
    'traction': 'Tu as une traction initiale. Concentre-toi sur comprendre ce qui fonctionne et double dessus.',
    'scale': 'Tu es prêt à scaler. Concentre-toi sur les systèmes, l\'équipe et la croissance durable.'
  }
  return descriptions[phase] || descriptions['idée']
}

function getPhaseRecommendations(phase: string, gaps: string[]): string {
  const recommendations: string[] = []
  
  // Phase-specific recommendations
  switch (phase) {
    case 'idée':
      recommendations.push('- **Valider le problème**: Parle à 10 clients potentiels cette semaine. Concentre-toi sur comprendre leur douleur, pas sur présenter ta solution.')
      if (gaps.some(g => g.includes('Technical'))) {
        recommendations.push('- **Trouver un co-fondateur technique**: Ton idée a besoin d\'exécution. Explore des communautés comme CoFoundersLab ou Antler.')
      } else {
        recommendations.push('- **Définir ton micro-marché**: Choisis UN segment de clientèle spécifique pour tester en premier.')
      }
      recommendations.push('- **Pré-vendre avant de construire**: Essaie d\'obtenir 3 early adopters payants avant d\'écrire du code.')
      break
      
    case 'MVP':
      recommendations.push('- **Livrer dans 2 semaines**: Ce que tu as, mets-le devant les utilisateurs. Le parfait est l\'ennemi du bien.')
      recommendations.push('- **Mettre en place des boucles de feedback**: Crée un moyen simple pour les utilisateurs de partager leurs retours (canal Slack, Typeform, appels directs).')
      recommendations.push('- **Définir ta métrique North Star**: Quel est le UN chiffre qui te dit si tu réussis ?')
      break
      
    case 'traction':
      recommendations.push('- **Doubler sur ce qui fonctionne**: Identifie ton meilleur canal d\'acquisition et concentre 80% de tes efforts là-dessus.')
      recommendations.push('- **Améliorer la rétention**: Analyse pourquoi les utilisateurs partent et corrige les 3 principales raisons.')
      recommendations.push('- **Documenter tes processus**: Commence à construire des systèmes pour ce que tu fais de manière répétée.')
      break
      
    case 'scale':
      recommendations.push('- **Construire l\'équipe**: Ton prochain recrutement devrait te libérer des tâches opérationnelles.')
      recommendations.push('- **Systématiser la croissance**: Transforme tes meilleures pratiques en playbooks répétables.')
      recommendations.push('- **Considérer le financement stratégiquement**: Ne lève des fonds que si cela accélère un modèle éprouvé.')
      break
  }
  
  return recommendations.join('\n')
}

function formatStrengthOrGap(text: string): string {
  // Extract emoji and text
  const emojiMatch = text.match(/^([🎓💼🎤🔍💡💪💻⏰💰📊💵👤❓🔴✨]+)\s*(.+)$/)
  if (emojiMatch) {
    const emoji = emojiMatch[1]
    const content = emojiMatch[2]
    
    // Try to extract a label (text before colon) and description
    const colonIndex = content.indexOf(':')
    if (colonIndex > 0) {
      const label = content.substring(0, colonIndex).trim()
      const description = content.substring(colonIndex + 1).trim()
      return `${emoji} **${label}**: ${description}`
    }
    
    // If no colon, try to extract first few words as label
    const words = content.split(' ')
    if (words.length > 2) {
      const label = words.slice(0, 2).join(' ')
      const description = words.slice(2).join(' ')
      return `${emoji} **${label}**: ${description}`
    }
    
    return `${emoji} ${content}`
  }
  
  // If no emoji, try to format as label: description
  const colonIndex = text.indexOf(':')
  if (colonIndex > 0) {
    const label = text.substring(0, colonIndex).trim()
    const description = text.substring(colonIndex + 1).trim()
    return `**${label}**: ${description}`
  }
  
  return text
}

