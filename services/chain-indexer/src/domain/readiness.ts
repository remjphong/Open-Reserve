import type { Dependency } from '@openreserve/api-contracts'
import type { Config } from '../config.js'
import pg from 'pg'

export async function database(url?: string): Promise<Dependency> {
  if (!url) return { name: 'database', ok: false, reason: 'NOT_CONFIGURED' }
  let client: pg.Client | undefined
  try {
    const endpoint = new URL(url)
    if (!['postgres:', 'postgresql:'].includes(endpoint.protocol)) throw new Error('Invalid database protocol')
    client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 1000, query_timeout: 1000, statement_timeout: 1000 })
    client.on('error', () => { /* suppress upstream errors and credentials */ })
    await client.connect()
    const { rows: [identity] } = await client.query('SELECT current_database() AS db, current_user AS role')
    if (identity?.db !== 'chain_db' || identity?.role !== 'chain_user') {
      return { name: 'database', ok: false, reason: 'WRONG_DATABASE' }
    }
    return { name: 'database', ok: true, reason: 'OK' }
  } catch { return { name: 'database', ok: false, reason: 'UNAVAILABLE' } }
  finally { await client?.end().catch(() => {}) }
}

export async function rpc(url: string | undefined, expected: number): Promise<Dependency> {
  if (!url) return { name: 'rpc', ok: false, reason: 'NOT_CONFIGURED' }
  try {
    if (![31337, 43113].includes(expected)) throw new Error('unsupported chain')
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }), signal: AbortSignal.timeout(1000) })
    const body = await response.json() as { jsonrpc?: string; id?: number; result?: string; error?: unknown }
    if (!response.ok || body.jsonrpc !== '2.0' || body.id !== 1 || body.error || !/^0x[0-9a-fA-F]+$/.test(body.result ?? '')) throw new Error('invalid RPC response')
    if (BigInt(body.result!) !== BigInt(expected)) return { name: 'rpc', ok: false, reason: 'WRONG_CHAIN' }
    return { name: 'rpc', ok: true, reason: 'OK' }
  } catch { return { name: 'rpc', ok: false, reason: 'UNAVAILABLE' } }
}

export async function checkDependencies(config: Config, synced = false): Promise<Dependency[]> {
  return [...await Promise.all([database(config.databaseUrl), rpc(config.rpcUrl, config.chainId)]),
    { name: 'sync', ok: synced, reason: synced ? 'OK' : 'UNAVAILABLE' } as Dependency]
}
