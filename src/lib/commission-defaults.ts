export type MilestoneStage = { label: string; percent: number }
export type MilestoneTemplate = { name: string; stages: MilestoneStage[] }

export type CommissionDefaults = {
  depositPercent: number
  revisionsIncluded: number
  turnaroundDays: number
  preferMilestones: boolean
  milestoneTemplates: MilestoneTemplate[]
}

export const BUILTIN_TEMPLATES: MilestoneTemplate[] = [
  { name: '50/50 — half upfront, half on delivery', stages: [
    { label: 'Deposit', percent: 50 },
    { label: 'Final delivery', percent: 50 },
  ]},
  { name: '30/40/30 — sketch, lines, final', stages: [
    { label: 'Sketch', percent: 30 },
    { label: 'Line art', percent: 40 },
    { label: 'Final render', percent: 30 },
  ]},
  { name: '25/25/25/25 — four-stage', stages: [
    { label: 'Concept', percent: 25 },
    { label: 'Draft', percent: 25 },
    { label: 'Revision', percent: 25 },
    { label: 'Final', percent: 25 },
  ]},
]

export const DEFAULT_COMMISSION_DEFAULTS: CommissionDefaults = {
  depositPercent: 30,
  revisionsIncluded: 1,
  turnaroundDays: 14,
  preferMilestones: false,
  milestoneTemplates: [],
}

export function parseCommissionDefaults(raw: string | null | undefined): CommissionDefaults {
  if (!raw) return DEFAULT_COMMISSION_DEFAULTS
  try {
    const j = JSON.parse(raw) as Partial<CommissionDefaults>
    return {
      depositPercent:      clampInt(j.depositPercent,      0, 100, 30),
      revisionsIncluded:   clampInt(j.revisionsIncluded,   0, 20,  1),
      turnaroundDays:      clampInt(j.turnaroundDays,      1, 365, 14),
      preferMilestones:    !!j.preferMilestones,
      milestoneTemplates:  sanitizeTemplates(j.milestoneTemplates),
    }
  } catch {
    return DEFAULT_COMMISSION_DEFAULTS
  }
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

function sanitizeTemplates(v: unknown): MilestoneTemplate[] {
  if (!Array.isArray(v)) return []
  return v
    .map((t) => {
      const tpl = t as Partial<MilestoneTemplate>
      if (!tpl.name || !Array.isArray(tpl.stages)) return null
      const stages = tpl.stages
        .map((s) => {
          const st = s as Partial<MilestoneStage>
          if (!st.label) return null
          const pct = clampInt(st.percent, 1, 100, 0)
          if (pct === 0) return null
          return { label: String(st.label).slice(0, 80), percent: pct }
        })
        .filter((x): x is MilestoneStage => !!x)
      if (stages.length === 0) return null
      return { name: String(tpl.name).slice(0, 80), stages }
    })
    .filter((x): x is MilestoneTemplate => !!x)
    .slice(0, 10)
}

export function validateTemplate(tpl: MilestoneTemplate): string | null {
  if (!tpl.name.trim()) return 'Template name is required'
  if (tpl.stages.length < 2) return 'At least 2 stages required'
  if (tpl.stages.length > 10) return 'Max 10 stages per template'
  const sum = tpl.stages.reduce((s, x) => s + x.percent, 0)
  if (sum !== 100) return `Stage percentages must sum to 100 (currently ${sum})`
  if (tpl.stages.some((s) => !s.label.trim())) return 'Every stage needs a label'
  return null
}
