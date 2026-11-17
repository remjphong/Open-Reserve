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
const reference = {
  label: 'MINH HỌA',
  currency: 'VND',
  price: 1_500_000,
  variableGymCost: 0,
  annualCostOfFunds: 0,
  termDays: 90,
  platformCAC: 70_000,
  platformVariableCost: 20_000,
  platformFeeRate: 0.04,
  incrementalNewCustomers: 1,
  refundRate: 0,
}
const compareUrl = '/v1/scenarios/compare'

test('valid scenarios surface the Decision Record blocker without returning made-up results', async t => {
  const app = buildApp(config)
  t.after(() => app.close())
  for (const payload of [
    reference,
    { ...reference, price: 0, termDays: 1, incrementalNewCustomers: 0, platformFeeRate: 0 },
    { ...reference, termDays: 3650, annualCostOfFunds: 1, platformFeeRate: 1, refundRate: 1, incrementalNewCustomers: 25 },
  ]) {
    const result = await app.inject({ method: 'POST', url: compareUrl, payload })
    assert.equal(result.statusCode, 501)
    const { error } = errorSchema.parse(result.json())
    assert.equal(error.code, 'NOT_IMPLEMENTED')
    assert.match(error.message, /BLOCKED_PENDING_DECISION_RECORD/)
  }
})

test('invalid compare inputs fail schema validation before the Decision Record check', async t => {
  const app = buildApp(config)
  t.after(() => app.close())
  for (const payload of [
    undefined, {}, { ...reference, currency: 'USD' }, { ...reference, label: 'REAL' },
    { ...reference, unknown: 'field' }, { ...reference, platformFeeRate: 1.01 },
    { ...reference, refundRate: -0.01 }, { ...reference, annualCostOfFunds: -0.01 },
    { ...reference, termDays: 0 }, { ...reference, termDays: 3651 },
    { ...reference, platformCAC: -1 }, { ...reference, price: '1500000' },
    { ...reference, price: null }, { ...reference, incrementalNewCustomers: 1.5 },
    { ...reference, incrementalNewCustomers: -1 },
  ]) {
    const result = await app.inject({ method: 'POST', url: compareUrl, payload })
    assert.equal(result.statusCode, 400)
    assert.equal(errorSchema.parse(result.json()).error.code, 'INVALID_REQUEST')
  }

  const raw = JSON.stringify(reference).replace('"price":1500000', '"price":1e999')
  const result = await app.inject({
    method: 'POST', url: compareUrl, headers: { 'content-type': 'application/json' }, payload: raw,
  })
  assert.equal(result.statusCode, 400)
  assert.equal(errorSchema.parse(result.json()).error.code, 'INVALID_REQUEST')
  assert.equal((await app.inject('/not-a-route')).statusCode, 404)
})
