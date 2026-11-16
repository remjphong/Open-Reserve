import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../dist/app.js'
import { loadConfig } from '../dist/config.js'
import { healthSchema, readySchema, errorSchema } from '@openreserve/api-contracts'

const config = loadConfig({})
test('chain-indexer: liveness and actual unconfigured readiness', async t => {
  const app = buildApp(config); t.after(() => app.close())
  const health = await app.inject('/health')
  assert.equal(health.statusCode, 200); healthSchema.parse(health.json())
  const ready = await app.inject('/ready')
  assert.equal(ready.statusCode, 503); readySchema.parse(ready.json())
  assert.equal(ready.json().ready, false)
})
test('chain-indexer reports degradation with reachable DB/RPC and absent sync', async t => {
  const app = buildApp(config, async () => [
    { name: 'database', ok: true, reason: 'OK' },
    { name: 'rpc', ok: true, reason: 'OK' },
    { name: 'sync', ok: false, reason: 'SYNC_NOT_IMPLEMENTED' },
  ])
  t.after(() => app.close())
  const ready = await app.inject('/ready')
  assert.equal(ready.statusCode, 503)
  assert.equal(readySchema.parse(ready.json()).dependencies.at(-1).reason, 'SYNC_NOT_IMPLEMENTED')
})

test('chain-indexer: invalid port fails startup configuration', () => {
  for (const port of ['0', '-1', 'abc', '65536']) assert.throws(() => loadConfig({ PORT: port }))
})
test('configured but unreachable database degrades without leaking credentials', async t => {
  const app = buildApp(loadConfig({ DATABASE_URL: 'postgres://private_user:private_password@127.0.0.1:1/missing' }))
  t.after(() => app.close())
  const result = await app.inject('/ready')
  assert.equal(result.statusCode, 503)
  assert.equal(result.json().dependencies[0].reason, 'UNAVAILABLE')
  assert.doesNotMatch(result.body, /private_user|private_password/)
})
test('business routes never fabricate success', async t => {
  const app = buildApp(config); t.after(() => app.close())
  for (const [method, url] of [["GET", "/v1/agreements/1"], ["GET", "/v1/agreements/1/events"], ["GET", "/v1/sync"]]) {
    const result = await app.inject({ method, url })
    assert.equal(result.statusCode, 501); errorSchema.parse(result.json())
    assert.equal(result.json().error.code, url === '/v1/evidence' ? 'WRITE_DISABLED' : 'NOT_IMPLEMENTED')
  }
  assert.equal((await app.inject('/not-a-route')).statusCode, 404)
})

test('malformed database URL returns 503 without leaking configuration', async t => {
  const app = buildApp(loadConfig({ DATABASE_URL: 'invalid_private_url' }))
  t.after(() => app.close())
  const ready = await app.inject('/ready')
  assert.equal(ready.statusCode, 503)
  assert.equal(readySchema.parse(ready.json()).dependencies[0].reason, 'UNAVAILABLE')
  assert.doesNotMatch(ready.body, /invalid_private_url/)
})
