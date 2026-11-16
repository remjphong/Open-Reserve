import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { buildApp as catalog } from '../services/catalog-evidence/dist/app.js'
import { buildApp as indexer } from '../services/chain-indexer/dist/app.js'

const urls = [process.env.CATALOG_DATABASE_URL, process.env.CHAIN_DATABASE_URL]
assert.ok(urls.every(Boolean), 'Set CATALOG_DATABASE_URL and CHAIN_DATABASE_URL for a disposable dev database')
const identities = [['catalog_db', 'catalog_user'], ['chain_db', 'chain_user']]
const connect = url => new pg.Client({ connectionString: url, connectionTimeoutMillis: 2000, query_timeout: 2000 })

for (const [i, url] of urls.entries()) {
  const [db, role] = identities[i]
  const client = connect(url)
  try {
    await client.connect()
    const { rows: [identity] } = await client.query('SELECT current_database() AS db, current_user AS role')
    assert.deepEqual(identity, { db, role })
    const table = `d16_probe_${randomUUID().replaceAll('-', '')}`
    await client.query('BEGIN')
    await client.query(`CREATE TABLE public.${table} (id integer PRIMARY KEY)`)
    await client.query(`INSERT INTO public.${table} VALUES (1)`)
    await client.query('ROLLBACK')
    console.log(`PASS ${role} owns schema and can write ${db} (rolled back)`)
  } finally { await client.end() }

  const otherDb = identities[1 - i][0]
  const crossUrl = new URL(url)
  crossUrl.pathname = '/' + otherDb
  const cross = connect(crossUrl.href)
  try { await assert.rejects(cross.connect(), { code: '42501' }) }
  finally { await cross.end() }
  console.log(`PASS ${role} denied CONNECT to ${otherDb} (42501)`)
}

for (const [label, factory, configs, status, reason] of [
  ['Catalog with own DB', catalog, { databaseUrl: urls[0] }, 200, 'OK'],
  ['Catalog with other service credentials', catalog, { databaseUrl: urls[1] }, 503, 'WRONG_DATABASE'],
  ['Indexer with own DB and no RPC', indexer, { databaseUrl: urls[1], chainId: 43113 }, 503, 'OK'],
]) {
  const app = factory(configs)
  try {
    const health = await app.inject('/health')
    const ready = await app.inject('/ready')
    assert.equal(health.statusCode, 200)
    assert.equal(ready.statusCode, status)
    assert.equal(ready.json().dependencies[0].reason, reason)
    console.log(JSON.stringify({ label, health: health.statusCode, ready: ready.statusCode, body: ready.json() }))
  } finally { await app.close() }
}
