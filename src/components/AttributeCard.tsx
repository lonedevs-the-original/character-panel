import type { Attribute } from '../types'

export function AttributeCard({ attribute }: { attribute: Attribute }) {
  const pct = Math.max(0, Math.min(100, (attribute.score / attribute.max_score) * 100))
  return (
    <article className="attribute-card" style={{ '--accent': attribute.accent } as React.CSSProperties}>
      <div className="attribute-head">
        <div><span className="domain-label">{attribute.domain}</span><h3>{attribute.name}</h3></div>
        <strong>{attribute.score}<small>/{attribute.max_score}</small></strong>
      </div>
      <div className="meter"><span style={{ width: `${pct}%` }} /></div>
    </article>
  )
}
