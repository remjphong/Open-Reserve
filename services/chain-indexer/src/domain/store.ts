import pg from 'pg'
import { FUJI, type RecordedLog } from './protocol.js'

export type Checkpoint = { height: bigint; hash: string; indexedAt: string }
export type StoredProjection = { agreementId: string; opened: NonNullable<RecordedLog['opened']>; openingBlock: string; indexedAt: string }
export type StoredEvent = Omit<RecordedLog, 'opened'>

const ddl = [
  `CREATE TABLE IF NOT EXISTS chain_events (
     chain_id INTEGER NOT NULL, contract_address TEXT NOT NULL, tx_hash TEXT NOT NULL,
     log_index INTEGER NOT NULL, block_number BIGINT NOT NULL, block_hash TEXT NOT NULL,
     transaction_index INTEGER NOT NULL, agreement_id TEXT NOT NULL, event_name TEXT NOT NULL,
     topics JSONB NOT NULL, data TEXT NOT NULL, opened JSONB,
     PRIMARY KEY (chain_id, tx_hash, log_index)
   )`,
  `CREATE INDEX IF NOT EXISTS chain_events_agreement_sort ON chain_events
     (chain_id, contract_address, agreement_id, block_number, transaction_index, log_index)`,
  `CREATE TABLE IF NOT EXISTS agreement_projection (
     chain_id INTEGER NOT NULL, contract_address TEXT NOT NULL, agreement_id TEXT NOT NULL,
     opened JSONB NOT NULL, opening_block BIGINT NOT NULL, indexed_at TIMESTAMPTZ NOT NULL,
     PRIMARY KEY (chain_id, contract_address, agreement_id)
   )`,
  `CREATE TABLE IF NOT EXISTS sync_checkpoint (
     chain_id INTEGER NOT NULL, contract_address TEXT NOT NULL,
     last_indexed_block BIGINT NOT NULL, block_hash TEXT NOT NULL,
     indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     PRIMARY KEY (chain_id, contract_address)
   )`,
]
const identity = [FUJI.chainId, FUJI.vault.toLowerCase()]

export class PgStore {
  private readonly pool: pg.Pool
  constructor(databaseUrl: string) {
    const u = new URL(databaseUrl)
    if (!['postgres:', 'postgresql:'].includes(u.protocol)) throw new Error('INVALID_DB_URL')
    this.pool = new pg.Pool({ connectionString: databaseUrl, max: 3, connectionTimeoutMillis: 2500,
      query_timeout: 5000, statement_timeout: 5000, idleTimeoutMillis: 15000 })
    this.pool.on('error', () => { /* an idle connection failure must not terminate the process */ })
  }
  async close(): Promise<void> { await this.pool.end() }
  async initialize(): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const { rows: [owner] } = await client.query('SELECT current_database() AS db, current_user AS role')
      if (owner?.db !== 'chain_db' || owner?.role !== 'chain_user') throw new Error('WRONG_DATABASE')
      for (const statement of ddl) await client.query(statement)
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      throw e
    } finally { client.release() }
  }
  async checkpoint(): Promise<Checkpoint | null> {
    const { rows } = await this.pool.query(
      `SELECT last_indexed_block::text AS height, block_hash, indexed_at
       FROM sync_checkpoint WHERE chain_id=$1 AND contract_address=$2`, identity)
    const r = rows[0]
    return r ? { height: BigInt(r.height), hash: String(r.block_hash), indexedAt: new Date(r.indexed_at).toISOString() } : null
  }
  // Every scanned block window is committed atomically with the raw logs and checkpoint.
  // Replaying a window replaces its rows, so a reorg inside the overlap cannot leave duplicates.
  async applyWindow(from: bigint, to: bigint, blockHash: string, logs: RecordedLog[]): Promise<void> {
    if (from < FUJI.deploymentBlock || to < from || to - from >= 100n) throw new Error('INVALID_DB_WINDOW')
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const { rows: [lock] } = await client.query('SELECT pg_try_advisory_xact_lock($1, $2) AS locked', [43113, 61240386])
      if (!lock?.locked) throw new Error('SYNC_CONCURRENT_WRITER')
      const { rows: [last] } = await client.query(
        `SELECT last_indexed_block::text AS height, block_hash
         FROM sync_checkpoint WHERE chain_id=$1 AND contract_address=$2 FOR UPDATE`, identity)
      if ((!last && from !== FUJI.deploymentBlock) || (last && from > BigInt(last.height) + 1n)) throw new Error('SYNC_GAP')
      await client.query(`DELETE FROM chain_events WHERE chain_id=$1 AND contract_address=$2 AND block_number BETWEEN $3 AND $4`,
        [...identity, from.toString(), to.toString()])
      for (const log of logs) {
        if (log.chainId !== FUJI.chainId || log.contractAddress.toLowerCase() !== FUJI.vault.toLowerCase() ||
          BigInt(log.blockNumber) < from || BigInt(log.blockNumber) > to) throw new Error('INVALID_LOG_FOR_WINDOW')
        await client.query(
          `INSERT INTO chain_events
           (chain_id,contract_address,tx_hash,log_index,block_number,block_hash,transaction_index,agreement_id,event_name,topics,data,opened)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb)`,
          [...identity, log.txHash, log.logIndex, log.blockNumber, log.blockHash, log.transactionIndex,
            log.agreementId, log.eventName, JSON.stringify(log.topics), log.data, log.opened ? JSON.stringify(log.opened) : null])
      }
      // The projection contains only indexed opening metadata. Financial fields are NOT stored.
      await client.query(`DELETE FROM agreement_projection WHERE chain_id=$1 AND contract_address=$2`, identity)
      await client.query(
        `INSERT INTO agreement_projection (chain_id,contract_address,agreement_id,opened,opening_block,indexed_at)
         SELECT DISTINCT ON (agreement_id) chain_id,contract_address,agreement_id,opened,block_number,NOW()
         FROM chain_events
         WHERE chain_id=$1 AND contract_address=$2 AND event_name='AgreementOpened'
         ORDER BY agreement_id,block_number DESC,transaction_index DESC,log_index DESC`, identity)
      const maxHeight = last && BigInt(last.height) > to ? BigInt(last.height) : to
      const maxHash = last && BigInt(last.height) > to ? String(last.block_hash) : blockHash
      await client.query(
        `INSERT INTO sync_checkpoint (chain_id,contract_address,last_indexed_block,block_hash,indexed_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (chain_id,contract_address) DO UPDATE SET
         last_indexed_block=EXCLUDED.last_indexed_block,block_hash=EXCLUDED.block_hash,indexed_at=NOW()`,
        [...identity, maxHeight.toString(), maxHash])
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      throw e
    } finally { client.release() }
  }
  async projection(id: string): Promise<StoredProjection | null> {
    const { rows } = await this.pool.query(
      `SELECT agreement_id,opened,opening_block::text AS opening_block,indexed_at
       FROM agreement_projection WHERE chain_id=$1 AND contract_address=$2 AND agreement_id=$3`, [...identity, id])
    const r = rows[0]
    return r ? { agreementId: r.agreement_id, opened: r.opened,
      openingBlock: String(r.opening_block), indexedAt: new Date(r.indexed_at).toISOString() } : null
  }
  async events(id: string, offset: number, limit: number): Promise<{ items: StoredEvent[]; hasNext: boolean }> {
    if (!Number.isInteger(offset) || offset < 0 || offset > 1_000_000 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('INVALID_PAGINATION')
    const { rows } = await this.pool.query(
      `SELECT agreement_id,tx_hash,log_index,block_number::text AS block_number,block_hash,
              transaction_index,event_name,topics,data
       FROM chain_events WHERE chain_id=$1 AND contract_address=$2 AND agreement_id=$3
       ORDER BY block_number ASC,transaction_index ASC,log_index ASC LIMIT $4 OFFSET $5`,
      [...identity, id, limit + 1, offset])
    const items: StoredEvent[] = rows.slice(0, limit).map(r => ({
      chainId: FUJI.chainId, contractAddress: FUJI.vault, agreementId: String(r.agreement_id),
      eventName: r.event_name, txHash: String(r.tx_hash), logIndex: Number(r.log_index),
      blockNumber: String(r.block_number), blockHash: String(r.block_hash), transactionIndex: Number(r.transaction_index),
      topics: r.topics as string[], data: String(r.data), removed: false,
    }))
    return { items, hasNext: rows.length > limit }
  }
}
