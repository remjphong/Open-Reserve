// D18-11 read-only Compose runtime gate. No chain writes, no secrets, no synthetic sync.
import assert from 'node:assert/strict'

const base = process.env.OPENRESERVE_SMOKE_URL || 'http://127.0.0.1:4173'
const indexerDown = process.argv.includes('--indexer-down')
const timeoutMs = 180_000

async function request(path, options = {}) {
  const response = await fetch(new URL(path, base), {
    ...options,
    signal: AbortSignal.timeout(5000),
    headers: { 'cache-control': 'no-cache', ...options.headers },
  })
  const body = await response.text()
  let json
  try { json = JSON.parse(body) } catch { /* HTML responses are checked separately */ }
  return { status: response.status, body, json, type: response.headers.get('content-type') ?? '',
    cors: response.headers.get('access-control-allow-origin') }
}

async function until(path, accept, label) {
  let last = 'no response'
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const result = await request(path)
      if (accept(result)) {
        console.log('PASS ' + label + ' HTTP ' + result.status)
        return result
      }
      last = 'HTTP ' + result.status
    } catch (error) {
      last = error instanceof Error ? error.name : 'UNKNOWN'
    }
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  throw new Error(label + ' not ready within bounded deadline; last=' + last)
}

async function check(path, status, label, options) {
  const result = await request(path, options)
  assert.equal(result.status, status, label + ': HTTP status')
  console.log('PASS ' + label + ' HTTP ' + status)
  return result
}

for (const path of ['/customer', '/customer/passes', '/gym', '/gym/agreements/1',
  '/operations', '/operations/disputes']) {
  const page = await until(path, response => response.status === 200 &&
    response.type.includes('text/html') && /id=["']root["']/.test(response.body), 'SPA refresh ' + path)
  assert.ok(page.body.includes('OpenReserve') || page.body.includes('openreserve'),
    'HTML entry has unexpected title')
}

await until('/api/catalog/health', r => r.status === 200 &&
  r.json?.service === 'catalog-evidence' && r.json?.status === 'alive', 'Catalog liveness')
await until('/api/economics/health', r => r.status === 200 &&
  r.json?.service === 'economics' && r.json?.status === 'alive', 'Economics liveness')
await until('/api/catalog/ready', r => r.status === 200 &&
  r.json?.ready === true, 'Catalog DB readiness')
await until('/api/economics/ready', r => r.status === 200 &&
  r.json?.ready === true, 'Economics readiness')

if (indexerDown) {
  let unreachable = false
  try {
    const result = await request('/api/chain/health')
    unreachable = result.status >= 500
  } catch { unreachable = true }
  assert.ok(unreachable, 'Stopped Indexer must not return a healthy/green proxy response')
  console.log('PASS Indexer stopped: proxy does not return fabricated health')
} else {
  await until('/api/chain/health', r => r.status === 200 &&
    r.json?.service === 'chain-indexer' && r.json?.status === 'alive', 'Indexer liveness')
  const ready = await check('/api/chain/ready', 503, 'Indexer readiness degraded (no Fuji RPC)')
  assert.equal(ready.json?.ready, false)
  assert.ok(ready.json?.dependencies?.some(d => d.name === 'rpc' && d.ok === false),
    'Missing RPC must be disclosed in readiness')
  const sync = await check('/api/chain/v1/sync', 503, 'Indexer sync unavailable (no Fuji RPC)')
  assert.equal(sync.json?.isStale, true)
  assert.equal(sync.json?.lastIndexedBlock, null)
  const invalidId = await check('/api/chain/v1/agreements/0', 400, 'Indexer bad agreement ID')
  assert.equal(invalidId.json?.error?.code, 'INVALID_REQUEST')
}

const packages = await check('/api/catalog/v1/packages', 200, 'Catalog packages via proxy')
assert.equal(packages.json?.packages?.length, 2)
assert.ok(packages.json.packages.every(p => p.source === 'DEMO_FIXTURE'),
  'Fixture catalog must disclose provenance')
const badCatalog = await check('/api/catalog/v1/packages?unapproved=1', 400, 'Catalog query validation')
assert.equal(badCatalog.json?.error?.code, 'INVALID_REQUEST')
const disabled = await check('/api/catalog/v1/evidence', 501, 'Evidence write disabled', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
})
assert.equal(disabled.json?.error?.code, 'WRITE_DISABLED')
const invalidEconomics = await check('/api/economics/v2/scenarios/compare', 400,
  'Economics request schema rejection', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
  })
assert.equal(invalidEconomics.json?.error?.code, 'INVALID_REQUEST')
const noRoute = await check('/api/catalog/v1/unknown', 404, 'API 404 does not become SPA HTML')
assert.ok(noRoute.type.includes('application/json'), 'Unexpected SPA fallback for API 404')
assert.notEqual(packages.cors, '*', 'Wildcard CORS must not be enabled')

console.log('D18-11 COMPOSE HTTP SMOKE PASS; indexerDown=' + indexerDown)
