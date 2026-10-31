export const inr = (v: number) => '₹' + Math.round(v).toLocaleString('en-IN')

export type IssueKey = 'price' | 'trial' | 'zombie' | 'unk' | 'ok'

export const issueOf = (m: { flag: string; is_recognized: boolean }): IssueKey =>
  !m.is_recognized ? 'unk'
  : m.flag === 'PRICE_HIKE' ? 'price'
  : m.flag === 'TRIAL_CONVERTED' ? 'trial'
  : m.flag === 'UNUSED_ZOMBIE' ? 'zombie'
  : 'ok'

export const ISSUE_LABEL: Record<IssueKey, string> = {
  price: 'Price creep', trial: 'Trial trap', zombie: 'Unused', unk: 'Unrecognised', ok: 'Looks fine'
}
