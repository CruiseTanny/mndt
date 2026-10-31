import { useEffect, useState } from 'react'
import type { Mandate } from '../App'
import { inr, issueOf, ISSUE_LABEL } from '../lib/format'

type Tone = 'polite' | 'formal' | 'firm_dispute'
type Props = {
  mandate: Mandate
  tone: Tone
  subject: string
  body: string
  onTone: (t: Tone) => void
  onClose: () => void
}

const TONES: Array<[Tone, string]> = [['polite', 'Polite'], ['formal', 'Formal'], ['firm_dispute', 'Firm dispute']]

function Spark({ h }: { h: Mandate['history'] }) {
  const v = h.slice(-10).map(x => x.amount), mx = Math.max(...v, 1), W = 300, H = 60, bw = W / Math.max(v.length, 1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="60" role="img" aria-label="Recent charges">
      {v.map((a, i) => <rect key={i} x={i * bw + 4} y={H - (a / mx) * (H - 6)} width={bw - 8} height={(a / mx) * (H - 6)} rx="3" fill="var(--brand)" opacity={i === v.length - 1 ? 1 : 0.45} />)}
    </svg>
  )
}

function Node({ x, y, t, s, hi }: { x: number; y: number; t: string; s: string; hi?: boolean }) {
  const cut = (z: string) => (z.length > 15 ? z.slice(0, 14) + '…' : z)
  return (
    <g>
      <rect x={x} y={y} width="112" height="44" rx="10" fill="var(--tint)" stroke={hi ? 'var(--brand)' : 'var(--line)'} />
      <text x={x + 10} y={y + 19} style={{ fontWeight: 600 }}>{cut(t)}</text>
      <text x={x + 10} y={y + 34} style={{ fill: 'var(--mute)', fontSize: 10.5 }}>{cut(s)}</text>
    </g>
  )
}

function Path({ m }: { m: Mandate }) {
  return (
    <svg viewBox="0 0 420 180" width="100%" role="img" aria-label="Graph path from descriptor to merchant, owner and cancellation route">
      <path d="M122 32H150M262 32H306M206 54V110M262 132H306" stroke="var(--mute)" strokeWidth="1.2" fill="none" />
      <Node x={10} y={10} t="Descriptor" s={m.descriptor} />
      <Node x={150} y={10} t={m.merchant_name} s="Merchant" hi />
      <Node x={306} y={10} t={m.parent_name} s="Parent" />
      <Node x={150} y={110} t={m.mechanism_name} s="Mechanism" />
      <Node x={306} y={110} t="Cancel path" s="Revoke mandate" />
      <text x="10" y="172" style={{ fill: 'var(--mute)', fontSize: 10.5 }}>RESOLVES_TO · OWNED_BY · BILLED_VIA · CANCELLED_BY</text>
    </svg>
  )
}

export function MandateDrawer({ mandate: m, tone, subject, body, onTone, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const k = issueOf(m)
  const tiers: any[] = (m as any).escalation_chain || []
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', h)
    return () => removeEventListener('keydown', h)
  }, [onClose])
  const copy = async () => {
    try { await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* clipboard blocked */ }
  }
  return (
    <div className="mr">
      <div className="scrim on" onClick={onClose} />
      <aside className="on" role="dialog" aria-modal="true" aria-label={`${m.merchant_name} details`}>
        <button className="x" onClick={onClose} aria-label="Close">✕</button>
        <span className={`tag t-${k}`}>{ISSUE_LABEL[k]}</span>
        <h3>{m.merchant_name}</h3>
        <div className="ds">{m.descriptor}</div>
        <p className="note">{m.flag_reason}</p>
        <h4>Last charges</h4>
        <Spark h={m.history} />
        <p className="mech">{m.charge_count} charges since {m.first_seen}. Latest {inr(m.latest_amount)}.</p>
        <h4>How we identified it</h4>
        {m.is_recognized ? <Path m={m} /> : <p className="mech">No verified match, so this is shown as unrecognised. We do not guess.</p>}
        <p className="mech">Owned by {m.parent_name}. Billed via {m.mechanism_name}.</p>
        <h4>How to stop it</h4>
        <ol>{m.cancellation_steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        {m.pitfall && <p className="note">{m.pitfall}</p>}
        <h4>Revocation notice</h4>
        <div className="tones" role="group" aria-label="Notice tone">
          {TONES.map(([t, l]) => <button key={t} className="chip" aria-pressed={tone === t} onClick={() => onTone(t)}>{l}</button>)}
        </div>
        <textarea className="notice" readOnly value={body} aria-label="Revocation notice" />
        <button className="cta" onClick={copy}>{copied ? 'Copied' : 'Copy notice'}</button>
        {tiers.length > 0 && <>
          <h4>If they keep charging you</h4>
          {tiers.map(t => (
            <div className="tier" key={t.tier}><b>{t.sla}</b><span><strong>{t.name}.</strong> {t.summary}</span></div>
          ))}
        </>}
      </aside>
    </div>
  )
}
