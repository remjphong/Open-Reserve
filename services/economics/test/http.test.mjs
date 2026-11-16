import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../dist/app.js'
import { loadConfig } from '../dist/config.js'
import { healthSchema, readySchema, errorSchema } from '@openreserve/api-contracts'

const config = loadConfig({})
test('economics: liveness and actual unconfigured readiness', async t => {
  const app = buildApp(config); t.after(() => app.close())
  const health = await app.inject('/health')
  assert.equal(health.statusCode, 200); healthSchema.parse(health.json())
  const ready = await app.inject('/ready')
  assert.equal(ready.statusCode, 200); readySchema.parse(ready.json())
  assert.equal(ready.json().ready, true)
})
test('economics ignores DB and RPC configuration', async t => {
  const app = buildApp(loadConfig({ DATABASE_URL: 'invalid', RPC_URL: 'invalid' }))
  t.after(() => app.close())
  const ready = await app.inject('/ready')
  assert.equal(ready.statusCode, 200)
  assert.deepEqual(ready.json().dependencies, [])
})

test('economics: invalid port fails startup configuration', () => {
  for (const port of ['0', '-1', 'abc', '65536']) assert.throws(() => loadConfig({ PORT: port }))
})
test('business routes never fabricate success', async t => {
  const app = buildApp(config); t.after(() => app.close())
  for (const [method, url] of [["POST", "/v1/scenarios/compare"]]) {
    const result = await app.inject({ method, url })
    assert.equal(result.statusCode, 501); errorSchema.parse(result.json())
    assert.equal(result.json().error.code, url === '/v1/evidence' ? 'WRITE_DISABLED' : 'NOT_IMPLEMENTED')
  }
  assert.equal((await app.inject('/not-a-route')).statusCode, 404)
})
