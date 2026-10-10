import { Check, Minus, Plus } from 'lucide-react'
import type { Quest } from '../types'

export function QuestRow({ quest, onChange }: { quest: Quest; onChange: (quest: Quest, next: number) => void }) {
  const complete = quest.progress >= quest.target
  const pct = Math.min(100, (quest.progress / quest.target) * 100)
  return (
    <article className={`quest-row ${complete ? 'complete' : ''}`}>
      <div className="quest-check">{complete ? <Check size={16} /> : String(Math.round(pct)).padStart(2, '0')}</div>
      <div className="quest-copy"><span>{quest.domain}</span><h3>{quest.title}</h3><div className="quest-meter"><i style={{ width: `${pct}%` }} /></div></div>
      <div className="quest-controls">
        <button aria-label={`Decrease ${quest.title}`} onClick={() => onChange(quest, Math.max(0, quest.progress - 1))}><Minus size={15} /></button>
        <strong>{quest.progress}<small> / {quest.target} {quest.unit}</small></strong>
        <button aria-label={`Increase ${quest.title}`} onClick={() => onChange(quest, Math.min(quest.target, quest.progress + 1))}><Plus size={15} /></button>
      </div>
    </article>
  )
}
