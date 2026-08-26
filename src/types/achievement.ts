export type Achievement = {
  id: string
  title: string
  description: string
  type: 'mastery' | 'recovery' | 'consistency' | 'speed' | 'confidence' | 'progression' | 'path'
  priority: 'high' | 'medium' | 'low'
  skillKey?: string
  unlockedAt: number
}
