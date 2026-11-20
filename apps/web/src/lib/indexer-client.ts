import type { IndexerActivityStatus } from '@openreserve/contracts-sdk'

export type IndexedActivityEvent = {
  txHash: `0x${string}`
  blockNumber: bigint
  logIndex: number
  removed: boolean
}

export type ActivitySnapshot = {
  status: IndexerActivityStatus
  items: IndexedActivityEvent[]
  lastIndexedBlock?: bigint
  nextCursor?: string | null
  reason?: string
}

export type ActivityReadContext = {
  chainId: number
  vault: string
  headBlock: bigint
}

const uint256 = (value: unknown): value is string =>
  typeof value === 'string' && /^(0|[1-9][0-9]{0,77})$/.test(value) &&
  BigInt(value) < 2n ** 256n

const hex32 = (value: unknown): value is `0x${string}` =>
  typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value)

const address = (value: unknown): value is string =>
  typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value)

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

const invalid = (reason: string): ActivitySnapshot =>
  ({ status: 'INVALID_RESPONSE', items: [], reason })

/**
 * Validates the chain-indexer's activity projection against the Vault RPC snapshot.
 * Financial values never enter this type or override Vault readContract results.
 */
export function parseIndexedActivity(
  payload: unknown,
  context: ActivityReadContext,
  agreementId: bigint,
): ActivitySnapshot {
  if (!record(payload) || !record(payload.meta) || !Array.isArray(payload.items)) {
    return invalid('Indexer response format is invalid.')
  }
  const { meta } = payload
  if (meta.chainId !== context.chainId || !address(meta.contractAddress) ||
      !sameAddress(meta.contractAddress, context.vault) ||
      meta.source !== 'CHAIN_READ_MODEL' || !uint256(meta.lastIndexedBlock) ||
      typeof meta.isStale !== 'boolean' ||
      typeof meta.indexedAt !== 'string' || Number.isNaN(Date.parse(meta.indexedAt)) ||
      !(payload.nextCursor === null || typeof payload.nextCursor === 'string')) {
    return invalid('Indexer metadata does not match the Vault or schema.')
  }
  const lastIndexedBlock = BigInt(meta.lastIndexedBlock)
  if (lastIndexedBlock > context.headBlock) {
    return invalid('Indexer head exceeds pinned Vault RPC head.')
  }

  const items: IndexedActivityEvent[] = []
  const seen = new Set<string>()
  for (const item of payload.items) {
    if (!record(item) || item.chainId !== context.chainId ||
        !address(item.contractAddress) || !sameAddress(item.contractAddress, context.vault) ||
        item.agreementId !== agreementId.toString() || !hex32(item.txHash) ||
        !hex32(item.blockHash) || !uint256(item.blockNumber) ||
        !uint256(item.confirmations) ||
        !Number.isSafeInteger(item.logIndex) || (item.logIndex as number) < 0 ||
        !Number.isSafeInteger(item.transactionIndex) || (item.transactionIndex as number) < 0 ||
        !Array.isArray(item.topics) || item.topics.length < 1 || item.topics.length > 4 ||
        !item.topics.every(hex32) || typeof item.data !== 'string' ||
        !/^0x(?:[0-9a-fA-F]{2})*$/.test(item.data) ||
        typeof item.removed !== 'boolean' || BigInt(item.blockNumber) > lastIndexedBlock) {
      return invalid('Indexer activity event failed schema/identity validation.')
    }
    const unique = item.txHash.toLowerCase() + ':' + item.logIndex
    if (seen.has(unique)) return invalid('Indexer returned a duplicate log.')
    seen.add(unique)
    items.push({
      txHash: item.txHash,
      blockNumber: BigInt(item.blockNumber),
      logIndex: item.logIndex as number,
      removed: item.removed,
    })
  }

  return {
    status: meta.isStale || lastIndexedBlock < context.headBlock ? 'STALE' : 'FRESH',
    items,
    lastIndexedBlock,
    nextCursor: payload.nextCursor as string | null,
  }
}

/**
 * Returns a clearly degraded activity state on unavailable indexer.
 * 501 is unimplemented, not an empty successful event list.
 */
export async function readIndexedActivity(
  context: ActivityReadContext,
  agreementId: bigint,
  baseUrl: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<ActivitySnapshot> {
  if (!baseUrl?.trim()) return {
    status: 'NOT_CONFIGURED', items: [], reason: 'Indexer not configured.',
  }
  if (agreementId < 1n || agreementId >= 2n ** 256n) {
    return invalid('Invalid agreement ID.')
  }
  let url: URL
  try {
    url = new URL(baseUrl)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
      return invalid('Invalid indexer protocol or credentials.')
    }
    // Preserve the same-origin /api/chain prefix used by Compose/Vite preview.
    url.pathname = url.pathname.replace(/\/+$/, '') + '/v1/agreements/' + agreementId.toString() + '/events'
    url.search = ''
    url.hash = ''
  } catch {
    return invalid('Invalid indexer URL.')
  }

  let response: Response
  try {
    response = await fetchImpl(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    })
  } catch {
    return { status: 'DOWN', items: [], reason: 'Indexer unavailable.' }
  }
  if (response.status === 501) return {
    status: 'NOT_IMPLEMENTED', items: [], reason: 'Indexer activity API not implemented.',
  }
  if (!response.ok) return {
    status: 'DOWN', items: [], reason: 'Indexer HTTP ' + response.status,
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return invalid('Indexer sent malformed JSON.')
  }
  return parseIndexedActivity(payload, context, agreementId)
}
