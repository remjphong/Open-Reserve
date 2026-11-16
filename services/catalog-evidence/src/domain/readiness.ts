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
    client.on('error', () => { /* report probe failure without logging upstream details */ })
    await client.connect()
    const { rows: [identity] } = await client.query('SELECT current_database() AS db, current_user AS role')
    if (identity?.db !== 'catalog_db' || identity?.role !== 'catalog_user') {
      return { name: 'database', ok: false, reason: 'WRONG_DATABASE' }
    }
    return { name: 'database', ok: true, reason: 'OK' }
  } catch { return { name: 'database', ok: false, reason: 'UNAVAILABLE' } }
  finally { await client?.end().catch(() => {}) }
}

export async function checkDependencies(config: Config): Promise<Dependency[]> {
  return [await database(config.databaseUrl)]
}
