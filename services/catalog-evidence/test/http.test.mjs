import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../dist/app.js'
import { loadConfig } from '../dist/config.js'
import { healthSchema, readySchema, errorSchema } from '@openreserve/api-contracts'

const config = loadConfig({})
test('catalog-evidence: liveness and actual unconfigured readiness', async t => {
  const app = buildApp(config); t.after(() => app.close())
  const health = await app.inject('/health')
  assert.equal(health.statusCode, 200); healthSchema.parse(health.json())
  const ready = await app.inject('/ready')
  assert.equal(ready.statusCode, 503); readySchema.parse(ready.json())
  assert.equal(ready.json().ready, false)
})
test('catalog-evidence: injected dependency transitions keep liveness independent', async t => {
  let ok = true
  const app = buildApp(config, async () => [{ name: 'database', ok, reason: ok ? 'OK' : 'UNAVAILABLE' }])
  t.after(() => app.close())
  assert.equal((await app.inject('/ready')).statusCode, 200)
  ok = false
  const r = await app.inject('/ready'); assert.equal(r.statusCode, 503); readySchema.parse(r.json())
  assert.equal((await app.inject('/health')).statusCode, 200)
})
test('catalog-evidence: invalid port fails startup configuration', () => {
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
test('catalog and evidence fail closed without their own database', async t => {
  const app = buildApp(config)
  t.after(() => app.close())
  for (const url of ['/v1/packages', '/v1/agreements/1/evidence']) {
    const result = await app.inject(url)
    assert.equal(result.statusCode, 503)
    assert.equal(errorSchema.parse(result.json()).error.code, 'DEPENDENCY_UNAVAILABLE')
  }
})

test('read routes reject invalid IDs, parameters and cursors before storage access', async t => {
  const app = buildApp(config)
  t.after(() => app.close())
  for (const url of [
    '/v1/packages?limit=1',
    '/v1/agreements/0/evidence', '/v1/agreements/01/evidence',
    '/v1/agreements/example/evidence', '/v1/agreements/' + (2n ** 256n) + '/evidence',
    '/v1/agreements/1/evidence?limit=0', '/v1/agreements/1/evidence?limit=101',
    '/v1/agreements/1/evidence?limit=1.5', '/v1/agreements/1/evidence?extra=bad',
    '/v1/agreements/1/evidence?cursor=', '/v1/agreements/1/evidence?cursor=not-a-cursor',
    '/v1/agreements/2/evidence?cursor=' + Buffer.from('1:1').toString('base64url'),
  ]) {
    const result = await app.inject(url)
    assert.equal(result.statusCode, 400, url)
    assert.equal(errorSchema.parse(result.json()).error.code, 'INVALID_REQUEST')
  }
})

test('evidence upload stays disabled for arbitrary JSON and request absence', async t => {
  const app = buildApp(config)
  t.after(() => app.close())
  for (const payload of [undefined, {}, { signature: 'example' }]) {
    const result = await app.inject({ method: 'POST', url: '/v1/evidence', payload })
    assert.equal(result.statusCode, 501)
    assert.equal(errorSchema.parse(result.json()).error.code, 'WRITE_DISABLED')
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
