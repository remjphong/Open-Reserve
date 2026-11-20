import type { Session } from './customer-chain'

export type OperationsRoute =
  | { page: 'overview' | 'agreements' | 'disputes' | 'fixture-agreement' | 'fixture-dispute' | 'not-found'; reason?: string }
  | { page: 'detail' | 'claim'; id: bigint; claimId?: bigint }

const MAX_UINT = (1n << 256n) - 1n
export function parseOperationsId(value: string | null | undefined): bigint | undefined {
  if (!value || !/^[1-9][0-9]{0,77}$/.test(value)) return
  const id = BigInt(value)
  return id <= MAX_UINT ? id : undefined
}

/** Fixture routes can never alias an on-chain numeric agreement or claim. */
export function parseOperationsRoute(path: string, search = ''): OperationsRoute {
  if (path === '/operations') return { page: 'overview' }
  if (path === '/operations/agreements') return { page: 'agreements' }
  if (path === '/operations/disputes') return { page: 'disputes' }
  if (path === '/operations/agreements/OR-024') return { page: 'fixture-agreement' }
  if (path === '/operations/disputes/PT-04') return { page: 'fixture-dispute' }
  const detail = /^\/operations\/(agreements|disputes)\/([^/]+)$/.exec(path)
  if (!detail) return { page: 'not-found', reason: 'Đường dẫn Operations không tồn tại.' }
  const id = parseOperationsId(detail[2])
  if (!id) return { page: 'not-found', reason: 'Agreement ID trên Fuji không hợp lệ.' }
  if (detail[1] === 'agreements') return { page: 'detail', id }
  const params = new URLSearchParams(search)
  const claimId = params.has('claimId') ? parseOperationsId(params.get('claimId')) : undefined
  if (params.has('claimId') && !claimId) {
    return { page: 'not-found', reason: 'Claim ID không hợp lệ.' }
  }
  return { page: 'claim', id, claimId }
}

/** A route or URL never grants settlement authority. */
export function isVerifiedResolver(session: Session, role: string): boolean {
  return session.chain.id === 43113 && role === 'resolver'
}

export type EvidenceResult =
  | { status: 'MATCHED'; source: 'DEMO_FIXTURE' | 'SIGNED_UPLOAD'; description: string; externalUrl?: string }
  | { status: 'UNAVAILABLE' | 'NOT_FOUND' | 'INCOMPLETE' }

type FetchLike = typeof fetch
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const hash32 = (value: unknown) => typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value)

/** Catalog is untrusted metadata. Matching a hash never certifies gym attendance. */
export async function readOperationsEvidence(
  agreementId: bigint, claimId: bigint, hash: string, fetchImpl: FetchLike = fetch,
): Promise<EvidenceResult> {
  if (agreementId < 1n || claimId < 1n || !hash32(hash)) return { status: 'UNAVAILABLE' }
  const cursors = new Set<string>()
  const params = new URLSearchParams({ limit: '100' })
  for (let page = 0; page < 5; page++) {
    let response: Response
    try {
      response = await fetchImpl('/api/catalog/v1/agreements/' + agreementId + '/evidence?' + params, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      })
    } catch { return { status: 'UNAVAILABLE' } }
    if (!response.ok) return { status: 'UNAVAILABLE' }
    let body: unknown
    try { body = await response.json() } catch { return { status: 'UNAVAILABLE' } }
    if (!isObject(body) || !Array.isArray(body.items) ||
        !(body.nextCursor === null || typeof body.nextCursor === 'string')) {
      return { status: 'UNAVAILABLE' }
    }
    for (const row of body.items) {
      if (!isObject(row) || row.agreementId !== agreementId.toString() ||
          row.claimId !== claimId.toString() ||
          !hash32(row.evidenceHash) || row.evidenceHash.toLowerCase() !== hash.toLowerCase() ||
          !['SIGNED_UPLOAD', 'DEMO_FIXTURE'].includes(String(row.source)) ||
          typeof row.description !== 'string' || !row.description.trim() ||
          row.description.length > 4000) continue
      let externalUrl: string | undefined
      if (typeof row.externalUrl === 'string') {
        try {
          const url = new URL(row.externalUrl)
          if (url.protocol === 'https:' && !url.username && !url.password) externalUrl = url.href
        } catch { /* invalid external metadata URL */ }
      }
      return { status: 'MATCHED', source: row.source as 'SIGNED_UPLOAD' | 'DEMO_FIXTURE',
        description: row.description, externalUrl }
    }
    if (body.nextCursor === null) return { status: 'NOT_FOUND' }
    const next = body.nextCursor
    if (!next || next.length > 512 || !/^[A-Za-z0-9_-]+$/.test(next) || cursors.has(next)) {
      return { status: 'INCOMPLETE' }
    }
    cursors.add(next)
    params.set('cursor', next)
  }
  return { status: 'INCOMPLETE' }
}
