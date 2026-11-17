import type { Dependency } from '@openreserve/api-contracts'
import type { Config } from '../config.js'
import pg from 'pg'

type DatabaseResult<T> = { ok: true; value: T } |
  { ok: false; reason: 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'WRONG_DATABASE' }

export async function withCatalogDatabase<T>(
  url: string | undefined, operation: (client: pg.Client) => Promise<T>,
): Promise<DatabaseResult<T>> {
  if (!url) return { ok: false, reason: 'NOT_CONFIGURED' }
  let client: pg.Client | undefined
  try {
    const endpoint = new URL(url)
    if (!['postgres:', 'postgresql:'].includes(endpoint.protocol)) throw new Error('Invalid database protocol')
    client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 1000, query_timeout: 1000, statement_timeout: 1000 })
    client.on('error', () => { /* report probe failure without logging upstream details */ })
    await client.connect()
    const { rows: [identity] } = await client.query('SELECT current_database() AS db, current_user AS role')
    if (identity?.db !== 'catalog_db' || identity?.role !== 'catalog_user') {
      return { ok: false, reason: 'WRONG_DATABASE' }
    }
    return { ok: true, value: await operation(client) }
  } catch { return { ok: false, reason: 'UNAVAILABLE' } }
  finally { await client?.end().catch(() => {}) }
}

export async function database(url?: string): Promise<Dependency> {
  const result = await withCatalogDatabase(url, async () => null)
  return { name: 'database', ok: result.ok, reason: result.ok ? 'OK' : result.reason }
}

export async function checkDependencies(config: Config): Promise<Dependency[]> {
  return [await database(config.databaseUrl)]
}
