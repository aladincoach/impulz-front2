/**
 * Action Plan Capability
 * Generates prioritized next steps for the entrepreneur
 */

import type { SessionMemory } from '../memory'
import type { CapabilityResult } from './index'

/**
 * Generate an action plan based on current memory
 */
export function generateActionPlan(memory: SessionMemory): CapabilityResult {
  const phase = memory.project.phase || inferPhase(memory)
  const timeAvailable = parseTimeAvailability(memory.user.constraints.time)
  const actions = generateActions(memory, phase, timeAvailable)
  
  const content = buildActionPlanContent(memory, phase, actions, timeAvailable)
  
  return {
    type: 'action_plan',
    content,
    quickButtons: [
      'Get more details on action #1',
      'Adjust the plan',
      'Start a diagnostic'
    ]
  }
}

interface Action {
  title: string
  why: string
  hours: number
  outcome: string
  priority: number
}

function inferPhase(memory: SessionMemory): string {
  const activities = memory.progress.activities.map(a => a.toLowerCase())
  
  if (activities.some(a => a.includes('scale') || a.includes('levée'))) return 'scale'
  if (activities.some(a => a.includes('client payant') || a.includes('revenue'))) return 'traction'
  if (activities.some(a => a.includes('mvp') || a.includes('prototype'))) return 'MVP'
  return 'idée'
}

function parseTimeAvailability(timeConstraint?: string): number {
  if (!timeConstraint) return 10 // Default: 10 hours/week
  
  const lower = timeConstraint.toLowerCase()
  
  // Try to extract hours
  const hoursMatch = lower.match(/(\d+)\s*h/)
  if (hoursMatch) return parseInt(hoursMatch[1])
  
  // Interpret common patterns
  if (lower.includes('full') || lower.includes('plein')) return 40
  if (lower.includes('soir') || lower.includes('evening')) return 10
  if (lower.includes('weekend')) return 15
  if (lower.includes('mi-temps') || lower.includes('part')) return 20
  
  return 10
}

function generateActions(memory: SessionMemory, phase: string, hoursPerWeek: number): Action[] {
  const actions: Action[] = []
  const gaps = identifyActionableGaps(memory)
  
  switch (phase) {
    case 'idée':
      actions.push(...getIdeaPhaseActions(memory, gaps))
      break
    case 'MVP':
      actions.push(...getMVPPhaseActions(memory, gaps))
      break
    case 'traction':
      actions.push(...getTractionPhaseActions(memory, gaps))
      break
    case 'scale':
      actions.push(...getScalePhaseActions(memory, gaps))
      break
  }
  
  // Sort by priority and filter to fit available time
  actions.sort((a, b) => a.priority - b.priority)
  
  // Take actions that fit in 2 weeks
  const twoWeekHours = hoursPerWeek * 2
  let totalHours = 0
  const feasibleActions: Action[] = []
  
  for (const action of actions) {
    if (totalHours + action.hours <= twoWeekHours) {
      feasibleActions.push(action)
      totalHours += action.hours
    }
    if (feasibleActions.length >= 5) break
  }
  
  return feasibleActions
}

function identifyActionableGaps(memory: SessionMemory): string[] {
  const gaps: string[] = []
  
  if (memory.progress.activities.length === 0) gaps.push('no_validation')
  if (!memory.user.assets.some(a => a.toLowerCase().includes('client'))) gaps.push('no_customers')
  if (memory.user.constraints.lacking?.some(l => l.toLowerCase().includes('tech'))) gaps.push('no_tech')
  if (!memory.project.target_segment) gaps.push('no_segment')
  
  return gaps
}

function getIdeaPhaseActions(memory: SessionMemory, gaps: string[]): Action[] {
  const actions: Action[] = []
  
  if (gaps.includes('no_validation') || gaps.includes('no_segment')) {
    actions.push({
      title: 'Conduct 5 customer discovery interviews',
      why: 'You need to validate that your target customers actually have the problem you want to solve',
      hours: 5,
      outcome: '5 interview notes with key insights about pain points',
      priority: 1
    })
  }
  
  actions.push({
    title: 'Define your micro-market',
    why: 'A focused target helps you speak their language and find them easily',
    hours: 2,
    outcome: 'One-sentence description of your ideal first customer',
    priority: 2
  })
  
  if (gaps.includes('no_tech')) {
    actions.push({
      title: 'Research no-code/low-code solutions',
      why: 'You can test your idea without building from scratch',
      hours: 3,
      outcome: 'List of 3 tools that could help you prototype',
      priority: 3
    })
  }
  
  actions.push({
    title: 'Create a simple landing page',
    why: 'Test demand by capturing email signups before building',
    hours: 4,
    outcome: 'Live landing page with signup form',
    priority: 4
  })
  
  actions.push({
    title: 'Reach out to 20 potential customers',
    why: 'Build your initial pipeline of people to test with',
    hours: 3,
    outcome: '5+ conversations scheduled',
    priority: 5
  })
  
  return actions
}

function getMVPPhaseActions(memory: SessionMemory, gaps: string[]): Action[] {
  const actions: Action[] = []
  
  actions.push({
    title: 'Ship your MVP this week',
    why: 'Real user feedback is worth more than another week of development',
    hours: 15,
    outcome: 'Working product accessible to test users',
    priority: 1
  })
  
  actions.push({
    title: 'Onboard 3 beta users personally',
    why: 'Watch them use your product to understand friction points',
    hours: 3,
    outcome: '3 beta users + feedback notes',
    priority: 2
  })
  
  actions.push({
    title: 'Set up basic analytics',
    why: 'You need to measure what matters from day 1',
    hours: 2,
    outcome: 'Dashboard tracking key user actions',
    priority: 3
  })
  
  actions.push({
    title: 'Create feedback collection system',
    why: 'Make it easy for users to tell you what\'s broken or missing',
    hours: 1,
    outcome: 'Feedback channel (Slack, form, or direct line)',
    priority: 4
  })
  
  return actions
}

function getTractionPhaseActions(memory: SessionMemory, gaps: string[]): Action[] {
  const actions: Action[] = []
  
  actions.push({
    title: 'Analyze your best customers',
    why: 'Find patterns in who stays and pays to double down on acquisition',
    hours: 3,
    outcome: 'Profile of your best customer segment',
    priority: 1
  })
  
  actions.push({
    title: 'Run 2 growth experiments',
    why: 'Systematically test acquisition channels',
    hours: 6,
    outcome: '2 experiments with measured results',
    priority: 2
  })
  
  actions.push({
    title: 'Interview 5 churned users',
    why: 'Understanding why people leave helps you improve retention',
    hours: 3,
    outcome: 'Top 3 reasons for churn',
    priority: 3
  })
  
  actions.push({
    title: 'Document your sales process',
    why: 'Make your success repeatable and eventually delegable',
    hours: 2,
    outcome: 'Written playbook for converting a lead',
    priority: 4
  })
  
  return actions
}

function getScalePhaseActions(memory: SessionMemory, gaps: string[]): Action[] {
  const actions: Action[] = []
  
  actions.push({
    title: 'Define your next key hire',
    why: 'Scaling requires delegation. Identify what role frees you most.',
    hours: 3,
    outcome: 'Job description and hiring plan',
    priority: 1
  })
  
  actions.push({
    title: 'Create SOPs for core processes',
    why: 'Systems enable scale without your constant involvement',
    hours: 5,
    outcome: 'Documented processes for top 3 operations',
    priority: 2
  })
  
  actions.push({
    title: 'Build your investor pipeline',
    why: 'Fundraising takes 3-6 months. Start relationships early.',
    hours: 4,
    outcome: 'List of 20 target investors with intro paths',
    priority: 3
  })
  
  actions.push({
    title: 'Set up financial dashboards',
    why: 'Scaling decisions need data. Know your unit economics.',
    hours: 3,
    outcome: 'Dashboard with CAC, LTV, runway, burn rate',
    priority: 4
  })
  
  return actions
}

function buildActionPlanContent(
  memory: SessionMemory,
  phase: string,
  actions: Action[],
  hoursPerWeek: number
): string {
  const projectName = memory.project.name || 'Your project'
  const totalHours = actions.reduce((sum, a) => sum + a.hours, 0)
  
  return `## Action Plan: ${projectName}

### Goal for the Next 2 Weeks
${getPhaseGoal(phase)}

### Your Availability
${hoursPerWeek} hours/week → ${hoursPerWeek * 2} hours over 2 weeks

### Action Items (${totalHours}h total)

${actions.map((action, i) => `
**${i + 1}. ${action.title}** (${action.hours}h)
- *Why*: ${action.why}
- *Outcome*: ${action.outcome}
`).join('\n')}

### Dependencies
${getDependencies(actions)}

### Success Criteria
At the end of 2 weeks, you will have:
${actions.slice(0, 3).map(a => `- ${a.outcome}`).join('\n')}

---
*This plan is based on your current phase (${phase}) and availability. Want to adjust?*`
}

function getPhaseGoal(phase: string): string {
  const goals: Record<string, string> = {
    'idée': 'Validate that your target customers have the problem you want to solve.',
    'MVP': 'Ship a working version and get real users testing it.',
    'traction': 'Identify your best growth channel and improve retention.',
    'scale': 'Build systems and team to grow sustainably.'
  }
  return goals[phase] || goals['idée']
}

function getDependencies(actions: Action[]): string {
  if (actions.length <= 1) return 'No dependencies - start with action #1.'
  
  return `- Start with action #1 (highest impact)
- Actions can mostly be done in parallel
- Customer interviews should inform all other actions`
}


