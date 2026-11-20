import { agreementResponse, eventsResponse, syncResponse, type AgreementProjection, type EventsResponse, type SyncStatus } from '@openreserve/api-contracts'
import { FUJI, type RecordedLog, decimalId } from './protocol.js'
import { FujiRpc, type ChainReader } from './rpc-client.js'
import { PgStore, type Checkpoint } from './store.js'
import type { Config } from '../config.js'

const WINDOW_SIZE = 100n // inclusive maximum is 100 blocks
const REPLAY_DEPTH = 12n
export interface IndexerDatabase {
  initialize(): Promise<void>
  checkpoint(): Promise<Checkpoint | null>
  applyWindow(from: bigint, to: bigint, blockHash: string, logs: RecordedLog[]): Promise<void>
  projection(id: string): ReturnType<PgStore['projection']>
  events(id: string, offset: number, limit: number): ReturnType<PgStore['events']>
  close(): Promise<void>
}
export class Indexer {
  private checkpointValue: Checkpoint | null = null
  private chainTip: bigint | null = null
  private lastError: string | null = 'NOT_STARTED'
  private replayState: 'NOT_STARTED' | 'REPLAYING' | 'IDLE' = 'NOT_STARTED'
  private verifiedIdentity = false
  private lastSuccess = 0
  private busy = false
  private timer: ReturnType<typeof setInterval> | undefined
  constructor(private readonly rpc: ChainReader, private readonly store: IndexerDatabase,
    private readonly maxWindows = 8, private readonly pollMs = 5000) {
    if (!Number.isInteger(maxWindows) || maxWindows < 1 || maxWindows > 100) throw new Error('INVALID_WINDOW_COUNT')
  }
  static fromConfig(config: Config): Indexer | undefined {
    if (!config.rpcUrl || !config.databaseUrl || config.chainId !== 43113) return undefined
    return new Indexer(new FujiRpc(config.rpcUrl), new PgStore(config.databaseUrl), config.maxWindows, config.pollMs)
  }
  async start(): Promise<void> {
    try {
      await this.store.initialize()
      this.checkpointValue = await this.store.checkpoint()
    } catch { this.lastError = 'DB_UNAVAILABLE' }
    await this.tick()
    if (!this.timer) this.timer = setInterval(() => { void this.tick() }, this.pollMs)
  }
  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    await this.store.close()
  }
  async tick(): Promise<void> {
    if (this.busy) return
    this.busy = true
    try { await this.syncBatch() }
    catch (error) {
      const known = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      const safeErrors = new Set(['WRONG_CHAIN', 'VAULT_RUNTIME_MISMATCH', 'WRONG_DEPLOYMENT', 'SYNC_GAP',
        'UNKNOWN_VAULT_EVENT', 'INVALID_LOG_ABI', 'INVALID_LOG_IDENTITY', 'REMOVED_LOG', 'RPC_DUPLICATE_LOG',
        'RPC_BLOCK_INCONSISTENT', 'SYNC_CONCURRENT_WRITER', 'CHAIN_TIP_BEHIND_CHECKPOINT',
        'RPC_LOGS_NOT_ARRAY', 'RPC_INVALID_ENVELOPE', 'VAULT_CODE_MISSING',
        'LOG_BLOCK_HASH_MISMATCH', 'CHECKPOINT_REORG_UNVERIFIED'])
      this.lastError = safeErrors.has(known) ? known : 'SYNC_DEPENDENCY_UNAVAILABLE'
      if (['WRONG_CHAIN', 'VAULT_RUNTIME_MISMATCH', 'WRONG_DEPLOYMENT', 'VAULT_CODE_MISSING'].includes(known)) this.verifiedIdentity = false
    } finally { this.busy = false }
  }
  async syncBatch(): Promise<void> {
    await this.store.initialize()
    // Do not query logs until all deployment identity gates are verified against this RPC.
    await this.rpc.assertIdentity()
    this.verifiedIdentity = true
    const tip = await this.rpc.tip()
    this.chainTip = tip
    const target = tip - 2n // only two-block-confirmed windows are persisted
    let checkpoint = await this.store.checkpoint()
    this.checkpointValue = checkpoint
    if (checkpoint && target < checkpoint.height) throw new Error('CHAIN_TIP_BEHIND_CHECKPOINT')
    if (target < FUJI.deploymentBlock) { this.lastError = 'CHAIN_BEFORE_DEPLOYMENT'; return }
    if (checkpoint) {
      // This hash must still exist on the canonical chain. A change forces overlapping replay.
      const canonical = await this.rpc.block(checkpoint.height)
      if (canonical.hash !== checkpoint.hash) {
        // Without independent proof of fork depth, do not silently certify history.
        // Existing confirmed rows remain available only as STALE until approved recovery.
        throw new Error('CHECKPOINT_REORG_UNVERIFIED')
      }
    }
    this.replayState = checkpoint ? 'REPLAYING' : 'NOT_STARTED'
    let from = checkpoint ? (checkpoint.height - REPLAY_DEPTH + 1n > FUJI.deploymentBlock ? checkpoint.height - REPLAY_DEPTH + 1n : FUJI.deploymentBlock) : FUJI.deploymentBlock
    for (let i = 0; i < this.maxWindows && from <= target; i++) {
      const to = from + WINDOW_SIZE - 1n <= target ? from + WINDOW_SIZE - 1n : target
      const [logs, block] = await Promise.all([this.rpc.logs(from, to), this.rpc.block(to)])
      const validatedHashes = new Map<string, string>([[to.toString(), block.hash]])
      for (const event of logs) {
        let expected = validatedHashes.get(event.blockNumber)
        if (!expected) {
          expected = (await this.rpc.block(BigInt(event.blockNumber))).hash
          validatedHashes.set(event.blockNumber, expected)
        }
        if (event.blockHash !== expected) throw new Error('LOG_BLOCK_HASH_MISMATCH')
      }
      await this.store.applyWindow(from, to, block.hash, logs)
      checkpoint = await this.store.checkpoint()
      if (!checkpoint || checkpoint.height < to) throw new Error('CHECKPOINT_NOT_SAVED')
      this.checkpointValue = checkpoint
      from = to + 1n
    }
    this.replayState = 'IDLE'
    this.lastSuccess = Date.now()
    this.lastError = (this.checkpointValue && target - this.checkpointValue.height > 0n) ? 'SYNC_CATCHING_UP' : null
  }
  getSync(): { payload: SyncStatus; code: 200 | 503 } {
    const checkpoint = this.checkpointValue, tip = this.chainTip
    const lag = checkpoint && tip !== null && tip >= checkpoint.height ? tip - checkpoint.height : null
    const timely = this.lastSuccess > 0 && Date.now() - this.lastSuccess < Math.max(30_000, this.pollMs * 3)
    const healthy = this.verifiedIdentity && timely && checkpoint !== null && lag !== null && lag <= 2n && this.lastError === null
    const data: SyncStatus = syncResponse.parse({
      chainId: FUJI.chainId,
      contractAddress: this.verifiedIdentity ? FUJI.vault : null,
      deploymentBlock: FUJI.deploymentBlock.toString(),
      lastIndexedBlock: checkpoint?.height.toString() ?? null,
      chainTip: tip?.toString() ?? null,
      lag: lag?.toString() ?? null,
      isStale: !healthy,
      replayState: this.replayState,
      lastError: this.lastError,
    })
    return { payload: data, code: healthy ? 200 : 503 }
  }
  get ready(): boolean { return this.getSync().code === 200 }
  private meta() {
    const { payload } = this.getSync()
    const cp = this.checkpointValue
    if (!this.verifiedIdentity || !cp) throw new Error('SYNC_NOT_READY')
    return { chainId: FUJI.chainId, contractAddress: FUJI.vault, lastIndexedBlock: cp.height.toString(),
      isStale: payload.isStale, indexedAt: cp.indexedAt, source: 'CHAIN_READ_MODEL' as const }
  }
  async agreement(id: string): Promise<AgreementProjection | null> {
    decimalId(id)
    const meta = this.meta()
    const row = await this.store.projection(id)
    if (!row) throw new Error('HISTORY_NOT_PROVEN')
    const financial = await this.rpc.financial(id)
    if (financial.buyer.toLowerCase() !== row.opened.buyer.toLowerCase() ||
      financial.merchant.toLowerCase() !== row.opened.merchant.toLowerCase() ||
      financial.policy !== row.opened.policy || financial.termsHash.toLowerCase() !== row.opened.termsHash.toLowerCase() ||
      financial.deposited !== row.opened.deposited ||
      financial.startAt !== row.opened.startAt || financial.endAt !== row.opened.endAt ||
      financial.challengeWindow !== row.opened.challengeWindow) throw new Error('PROJECTION_VAULT_MISMATCH')
    return agreementResponse.parse({ meta, ...financial })
  }
  async events(id: string, offset: number, limit: number): Promise<EventsResponse | null> {
    decimalId(id)
    const meta = this.meta()
    const row = await this.store.projection(id)
    if (!row) throw new Error('HISTORY_NOT_PROVEN')
    const { items, hasNext } = await this.store.events(id, offset, limit)
    const tip = this.chainTip
    return eventsResponse.parse({ meta, items: items.map(({ eventName: _kind, ...event }) => ({
      ...event, confirmations: tip === null ? '0' : (tip - BigInt(event.blockNumber) + 1n >= 0n ? tip - BigInt(event.blockNumber) + 1n : 0n).toString(),
    })), nextCursor: hasNext ? Buffer.from(JSON.stringify({ id, offset: offset + limit })).toString('base64url') : null })
  }
}
