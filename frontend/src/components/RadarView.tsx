import { useEffect, useRef, useState } from 'react'
import type { Mandate } from '../App'
import { inr, issueOf, ISSUE_LABEL, type IssueKey } from '../lib/format'

type Props = {
  mandates: Mandate[]
  total: number
  cancelled: Set<string>
  loading: boolean
  onToggle: (id: string) => void
  onCancelFlagged: () => void
  onClear: () => void
  onOpen: (m: Mandate) => void
}

function useTween(target: number) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); from.current = target; return }
    const a = from.current, t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 450)
      const val = a + (target - a) * (1 - Math.pow(1 - k, 3))
      setV(val); from.current = val
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return v
}

export function RadarView({ mandates, total, cancelled, loading, onToggle, onCancelFlagged, onClear, onOpen }: Props) {
  const [filter, setFilter] = useState<'all' | IssueKey>('all')
  const saved = mandates.filter(m => cancelled.has(m.id)).reduce((s, m) => s + m.annual_committed_cost, 0)
  const keep = Math.max(0, total - saved)
  const shown = useTween(keep)
  const counts: Record<string, number> = { all: mandates.length }
  mandates.forEach(m => { const k = issueOf(m); counts[k] = (counts[k] || 0) + 1 })
  const rows = mandates.filter(m => filter === 'all' || issueOf(m) === filter)
  const chips: Array<['all' | IssueKey, string]> = [['all', 'All mandates'], ['price', 'Price creep'], ['trial', 'Trial trap'], ['zombie', 'Unused'], ['unk', 'Unrecognised']]

  return (
    <div className="mr">
      <section className="hero">
        <div className="big">
          <p>Committed every year across {mandates.length - cancelled.size} mandates</p>
          <div className="num">{loading ? '…' : inr(shown)}<small>/ year</small></div>
          <div className="meter" aria-hidden="true"><i style={{ width: total ? `${(keep / total) * 100}%` : '100%' }} /><b /></div>
          <div className="legend"><span>Keeping <strong>{inr(keep)}</strong></span><span>Cancelling <strong>{inr(saved)}</strong></span></div>
        </div>
        <div className="save">
          <div>
            <h2>Tick the ones you don’t want</h2>
            <p>The total updates as you choose. Nothing is cancelled until you follow the steps for each one.</p>
          </div>
          <div>
            <p>You would save</p>
            <div className="v">{inr(saved)}</div>
            <div className="acts">
              <button onClick={onCancelFlagged}>Tick all flagged</button>
              {cancelled.size > 0 && <button onClick={onClear}>Clear</button>}
            </div>
          </div>
        </div>
      </section>

      <div className="chips" role="group" aria-label="Filter mandates">
        {chips.map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {l}<em>{counts[k] || 0}</em>
          </button>
        ))}
      </div>

      <div className="list">
        {rows.map(m => {
          const k = issueOf(m), cut = cancelled.has(m.id)
          return (
            <div key={m.id} className={`row ${cut ? 'cut' : ''}`} onClick={() => onOpen(m)}>
              <input type="checkbox" checked={cut} aria-label={`Cancel ${m.merchant_name}`}
                onClick={e => e.stopPropagation()} onChange={() => onToggle(m.id)} />
              <div><div className="nm">{m.merchant_name}</div><div className="ds">{m.descriptor}</div></div>
              <div className="mech">{m.mechanism_name}</div>
              <div className="tg"><span className={`tag t-${k}`}>{ISSUE_LABEL[k]}</span></div>
              <div className="amt">{inr(m.annual_committed_cost)}<span>{inr(m.latest_amount)} · {m.cadence.toLowerCase()}</span></div>
            </div>
          )
        })}
        {!loading && rows.length === 0 && <div className="empty">No mandates match this filter. Choose another one above.</div>}
      </div>
    </div>
  )
}
