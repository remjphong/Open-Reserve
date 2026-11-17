import { useEffect, useState } from 'react'

type Evidence = { source: 'DEMO_FIXTURE' | 'SIGNED_UPLOAD'; description: string; externalUrl: string | null }
type Result = { kind: 'matched'; evidence: Evidence } | { kind: 'empty' | 'unavailable' }
type Review = Result | { kind: 'idle' | 'loading' }

async function findEvidence(agreement: string, claim: string, hash: string, signal: AbortSignal): Promise<Result> {
  const query = new URLSearchParams({ limit: '100' })
  const cursors = new Set<string>()
  for (let page = 0; page < 5; page++) {
    const response = await fetch('/api/catalog/v1/agreements/' + agreement + '/evidence?' + query, { signal })
    if (!response.ok) return { kind: 'unavailable' }
    const result = await response.json()
    if (!Array.isArray(result?.items) || !(result.nextCursor === null || typeof result.nextCursor === 'string')) {
      return { kind: 'unavailable' }
    }
    for (const row of result.items) {
      if (row?.agreementId !== agreement || row.claimId !== claim ||
          typeof row.evidenceHash !== 'string' || row.evidenceHash.toLowerCase() !== hash.toLowerCase() ||
          (row.source !== 'DEMO_FIXTURE' && row.source !== 'SIGNED_UPLOAD') ||
          typeof row.description !== 'string' || !row.description.trim() || row.description.length > 4000) continue
      let externalUrl = null
      if (typeof row.externalUrl === 'string' && URL.canParse(row.externalUrl)) {
        const url = new URL(row.externalUrl)
        if (url.protocol === 'https:' && !url.username && !url.password) externalUrl = url.href
      }
      return { kind: 'matched', evidence: { source: row.source, description: row.description, externalUrl } }
    }
    if (result.nextCursor === null) return { kind: 'empty' }
    if (!result.nextCursor || result.nextCursor.length > 512 || cursors.has(result.nextCursor)) break
    cursors.add(result.nextCursor)
    query.set('cursor', result.nextCursor)
  }
  return { kind: 'unavailable' }
}

export function ClaimEvidenceReview({ agreement, claim, hash, busy, onConfirm }: {
  agreement: string; claim: string; hash: string; busy: boolean; onConfirm: () => void
}) {
  const [review, setReview] = useState<Review>({ kind: 'idle' })
  const [opened, setOpened] = useState(false)
  const [accepted, setAccepted] = useState(false)
  useEffect(() => {
    if (!opened) return
    const controller = new AbortController()
    const timeout = AbortSignal.timeout(5000)
    findEvidence(agreement, claim, hash, AbortSignal.any([controller.signal, timeout]))
      .then(result => { if (!controller.signal.aborted) setReview(result) })
      .catch(() => { if (!controller.signal.aborted) setReview({ kind: 'unavailable' }) })
    return () => controller.abort()
  }, [agreement, claim, hash, opened])

  const settled = review.kind === 'matched' || review.kind === 'empty' || review.kind === 'unavailable'
  return <div className="customer-evidence-review">
    {!opened && <button type="button" className="button" onClick={() => {
      setReview({ kind: 'loading' })
      setOpened(true)
    }}>Kiểm tra bằng chứng</button>}
    {opened && <section aria-label={'Bằng chứng đề nghị #' + claim} className="customer-evidence-panel">
      <h4>Bằng chứng đề nghị #{claim}</h4>
      {review.kind === 'loading' && <p role="status">Đang đọc hồ sơ từ Catalog…</p>}
      {review.kind === 'matched' && <>
        <p className="caption">Nguồn Catalog · {review.evidence.source === 'DEMO_FIXTURE'
          ? 'Dữ liệu minh họa (DEMO_FIXTURE)' : 'Hồ sơ được Catalog ghi là có chữ ký (SIGNED_UPLOAD)'}</p>
        <p className="customer-wrap">{review.evidence.description}</p>
        {review.evidence.externalUrl && <a className="inline-link" href={review.evidence.externalUrl}
          target="_blank" rel="noopener noreferrer">Mở tài liệu nguồn ↗</a>}
        <p className="caption">Mã tham chiếu của hồ sơ trùng với hash trên Vault. Nội dung ngoài chuỗi chưa được kiểm tra độc lập.</p>
      </>}
      {review.kind === 'empty' && <p>Chỉ có hash trên Vault. Catalog chưa có hồ sơ khớp với đề nghị này.</p>}
      {review.kind === 'unavailable' && <p>Chỉ có hash trên Vault. Hiện chưa đọc được hồ sơ từ Catalog.</p>}
      <p className="caption">Hash là mã tham chiếu. Việc buổi tập đã diễn ra chưa được xác minh độc lập.</p>
      {settled && <label className="customer-check">
        <input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />
        {review.kind === 'matched'
          ? 'Tôi đã xem hồ sơ trên màn hình và tự xác nhận buổi tập.'
          : 'Tôi tự xác nhận buổi tập khi chưa có nội dung bằng chứng để xem.'}
      </label>}
    </section>}
    <button type="button" className="button button-primary" disabled={busy || !settled || !accepted}
      onClick={onConfirm}>Xác nhận buổi PT</button>
  </div>
}
