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
    strengths.push(`Domain expertise in ${memory.user.skills.join(', ')}`)
  }
  
  // Existing assets
  if (memory.user.assets.length > 0) {
    strengths.push(`Existing assets: ${memory.user.assets.join(', ')}`)
  }
  
  // Progress made
  if (memory.progress.activities.length > 0) {
    const hasUserResearch = memory.progress.activities.some(a => 
      a.toLowerCase().includes('interview') || 
      a.toLowerCase().includes('user') ||
      a.toLowerCase().includes('client')
    )
    if (hasUserResearch) {
      strengths.push('Already talking to users/clients')
    }
    
    const hasCompetitorResearch = memory.progress.activities.some(a =>
      a.toLowerCase().includes('competitor') ||
      a.toLowerCase().includes('benchmark') ||
      a.toLowerCase().includes('market')
    )
    if (hasCompetitorResearch) {
      strengths.push('Market awareness through competitor analysis')
    }
  }
  
  // Clear value proposition
  if (memory.project.problem && memory.project.solution) {
    strengths.push('Clear problem-solution fit articulated')
  }
  
  return strengths.length > 0 ? strengths : ['Motivation to start']
}

function identifyGaps(memory: SessionMemory): string[] {
  const gaps: string[] = []
  
  // Technical gaps
  if (memory.user.constraints.lacking?.some(l => 
    l.toLowerCase().includes('tech') || l.toLowerCase().includes('développ')
  )) {
    gaps.push('Technical skills gap')
  }
  
  // Time constraints
  if (memory.user.constraints.time?.toLowerCase().includes('soir') ||
      memory.user.constraints.time?.toLowerCase().includes('weekend') ||
      memory.user.constraints.time?.toLowerCase().includes('evening')) {
    gaps.push('Limited time availability (side project mode)')
  }
  
  // Budget constraints
  if (memory.user.constraints.budget) {
    const budgetMatch = memory.user.constraints.budget.match(/(\d+)/g)
    if (budgetMatch && parseInt(budgetMatch[0]) < 10000) {
      gaps.push('Limited initial budget')
    }
  }
  
  // Missing validation
  if (memory.progress.activities.length === 0) {
    gaps.push('No market validation activities yet')
  } else {
    const hasPayingCustomers = memory.progress.activities.some(a =>
      a.toLowerCase().includes('vente') ||
      a.toLowerCase().includes('client payant') ||
      a.toLowerCase().includes('revenue')
    )
    if (!hasPayingCustomers && memory.project.phase !== 'idée') {
      gaps.push('No paying customers yet')
    }
  }
  
  // Missing team
  if (!memory.user.assets.some(a => 
    a.toLowerCase().includes('associé') ||
    a.toLowerCase().includes('co-founder') ||
    a.toLowerCase().includes('équipe')
  )) {
    gaps.push('Solo founder (no co-founder identified)')
  }
  
  return gaps.length > 0 ? gaps : ['Need more information to identify gaps']
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
  
  return `## Flash Diagnostic: ${projectName}

### Project Summary
${description}
${memory.project.features?.length ? `\nKey features: ${memory.project.features.join(', ')}` : ''}

### Current Phase: ${phase.toUpperCase()}
${getPhaseDescription(phase)}

### Strengths Identified
${strengths.map(s => `✅ ${s}`).join('\n')}

### Gaps & Risks
${gaps.map(g => `⚠️ ${g}`).join('\n')}

### Top 3 Recommendations
${getPhaseRecommendations(phase, gaps)}

---
*This is a flash diagnostic based on our conversation. Want to go deeper?*`
}

function getPhaseDescription(phase: string): string {
  const descriptions: Record<string, string> = {
    'idée': 'You are in the early ideation phase. Focus on validating your problem and understanding your target users.',
    'MVP': 'You are building your minimum viable product. Focus on shipping fast and getting real user feedback.',
    'traction': 'You have initial traction. Focus on understanding what works and doubling down on it.',
    'scale': 'You are ready to scale. Focus on systems, team, and sustainable growth.'
  }
  return descriptions[phase] || descriptions['idée']
}

function getPhaseRecommendations(phase: string, gaps: string[]): string {
  const recommendations: string[] = []
  
  // Phase-specific recommendations
  switch (phase) {
    case 'idée':
      recommendations.push('1. **Validate the problem**: Talk to 10 potential customers this week. Focus on understanding their pain, not pitching your solution.')
      if (gaps.some(g => g.includes('Technical'))) {
        recommendations.push('2. **Find a technical co-founder or partner**: Your idea needs execution. Explore communities like CoFoundersLab or Antler.')
      } else {
        recommendations.push('2. **Define your micro-market**: Choose ONE specific customer segment to test with first.')
      }
      recommendations.push('3. **Pre-sell before building**: Try to get 3 paying early adopters before writing code.')
      break
      
    case 'MVP':
      recommendations.push('1. **Ship in 2 weeks**: Whatever you have, get it in front of users. Perfect is the enemy of good.')
      recommendations.push('2. **Set up feedback loops**: Create a simple way for users to share feedback (Slack channel, Typeform, direct calls).')
      recommendations.push('3. **Define your North Star metric**: What\'s the ONE number that tells you if you\'re succeeding?')
      break
      
    case 'traction':
      recommendations.push('1. **Double down on what works**: Identify your best acquisition channel and focus 80% of effort there.')
      recommendations.push('2. **Improve retention**: Analyze why users leave and fix the top 3 reasons.')
      recommendations.push('3. **Document your processes**: Start building systems for what you do repeatedly.')
      break
      
    case 'scale':
      recommendations.push('1. **Build the team**: Your next hire should free you from operational tasks.')
      recommendations.push('2. **Systematize growth**: Turn your best practices into repeatable playbooks.')
      recommendations.push('3. **Consider funding strategically**: Only raise if it accelerates a proven model.')
      break
  }
  
  return recommendations.join('\n')
}

