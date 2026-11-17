import test from 'node:test'
import assert from 'node:assert/strict'
import { errorSchema, scenarioRequest, scenarioResponseV2 } from '@openreserve/api-contracts'
import { buildApp } from '../dist/app.js'
import { loadConfig } from '../dist/config.js'

const v2 = '/v2/scenarios/compare'
const reference = {
  label: 'MINH HỌA', currency: 'VND',
  price: 1_500_000, variableGymCost: 300_000, gymProcessingCostPerPackage: 15_000,
  annualCostOfFunds: 0.12, termDays: 90, averageSettlementDelayDays: 45,
  coverageEvaluationDay: 10, protectionFeeRate: 0.03, protectionFeeGymShareRate: 0.40,
  referralFeeRate: 0.04, advanceRate: 0.30, platformCAC: 70_000, platformVariableCost: 20_000,
  incrementalNewCustomers: 10, incrementalCapacity: 15,
}
function fixture(t) {
  const app = buildApp(loadConfig({
    DATABASE_URL: 'postgres://invalid:1/missing', RPC_URL: 'http://127.0.0.1:1',
  }))
  t.after(() => app.close())
  return app
}
async function compare(app, request) {
  const response = await app.inject({ method: 'POST', url: v2, payload: request })
  assert.equal(response.statusCode, 200, response.body)
  const data = scenarioResponseV2.parse(response.json())
  assert.deepEqual(data.assumptions, request)
  return data
}
function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-8, actual + ' differs from ' + expected)
}

test('workbook A/B/C/D references, units, warnings, funding and aggregate math', async t => {
  const app = fixture(t)
  const result = await compare(app, reference)
  assert.equal(result.label, 'MINH HỌA')
  assert.equal(result.currency, 'VND')
  assert.deepEqual(result.warnings, ['INCREMENTAL_CUSTOMER_ATTRIBUTION_UNVERIFIED'])
  assert.deepEqual(result.scenarios.map(s => s.model), ['A', 'B', 'C', 'D'])
  const expected = [
    [1180808.2191780822, -63000, 1, 22191.780821917808, 1500000],
    [1102808.2191780822, -30000, 1, 22191.780821917808, 1500000],
    [1169465.7534246575, -90000, 0.7, 15534.246575342466, 1050000],
    [1127465.7534246575, -3000, 0.7, 15534.246575342466, 1050000],
  ]
  for (const [i, s] of result.scenarios.entries()) {
    const [gym, platform, reserve, funding, cashGap] = expected[i]
    near(s.gymIncrementalContributionPerPackage, gym)
    near(s.platformUnitMarginPerPackage, platform)
    assert.equal(s.initialVaultProtectionFraction, reserve)
    near(s.gymFundingCostPerPackage, funding)
    near(s.gymUpfrontCashGap, cashGap)
    near(s.gymIncrementalContributionAggregate, gym * 10)
    near(s.platformContributionAggregateBeforeFixedCosts, platform * 10)
  }
  assert.deepEqual((await app.inject('/ready')).json().dependencies, [])
})

test('coverage at day 0, 10, 27, 30 and expiry only advances in C and D', async t => {
  const app = fixture(t)
  for (const [day, shortfall] of [[0, 450000], [10, 283333.3333333333], [27, 0], [30, 0], [90, 0]]) {
    const { scenarios } = await compare(app, { ...reference, coverageEvaluationDay: day })
    assert.deepEqual(scenarios.map(s => s.coverageEvaluationDay), [day, day, day, day])
    for (const item of scenarios) near(item.buyerCoverageShortfallAtDay, 'CD'.includes(item.model) ? shortfall : 0)
  }
})

test('zero case, finite large amounts, full advance, and positive platform margin', async t => {
  const app = fixture(t)
  const zero = await compare(app, {
    ...reference, price: 0, variableGymCost: 0, gymProcessingCostPerPackage: 0, annualCostOfFunds: 0,
    termDays: 1, averageSettlementDelayDays: 0, coverageEvaluationDay: 0, protectionFeeRate: 0,
    protectionFeeGymShareRate: 0, referralFeeRate: 0, advanceRate: 0, platformCAC: 0,
    platformVariableCost: 0, incrementalNewCustomers: 0, incrementalCapacity: 0,
  })
  assert.deepEqual(zero.warnings, [])
  for (const s of zero.scenarios) assert.equal(s.gymIncrementalContributionAggregate + s.platformUnitMarginPerPackage, 0)
  const max = await compare(app, {
    ...reference, price: Number.MAX_SAFE_INTEGER, incrementalNewCustomers: Number.MAX_SAFE_INTEGER,
    incrementalCapacity: Number.MAX_SAFE_INTEGER, protectionFeeRate: 1, protectionFeeGymShareRate: 0,
    referralFeeRate: 1, advanceRate: 1, annualCostOfFunds: 1, termDays: 3650, averageSettlementDelayDays: 3650,
    coverageEvaluationDay: 0,
  })
  const d = max.scenarios.find(s => s.model === 'D')
  assert.equal(d.initialVaultProtectionFraction, 0)
  assert.equal(d.gymFundingCostPerPackage, 0)
  assert.equal(d.gymUpfrontCashGap, 0)
  assert.equal(d.buyerCoverageShortfallAtDay, Number.MAX_SAFE_INTEGER)
  assert.ok(d.platformUnitMarginPerPackage > 0)
  assert.ok(d.gymIncrementalContributionPerPackage < 0)
})

test('capacity and attribution warnings preserve the submitted count', async t => {
  const app = fixture(t)
  const { incrementalCapacity: _, ...withoutCapacity } = reference
  const missing = await compare(app, withoutCapacity)
  assert.deepEqual(missing.warnings, ['INCREMENTAL_CUSTOMER_ATTRIBUTION_UNVERIFIED', 'CAPACITY_NOT_PROVIDED'])
  const limited = await compare(app, { ...reference, incrementalCapacity: 2 })
  assert.deepEqual(limited.warnings, ['INCREMENTAL_CUSTOMER_ATTRIBUTION_UNVERIFIED', 'CAPACITY_EXCEEDED'])
  assert.deepEqual(limited.scenarios, missing.scenarios)
})

test('v2 strict validation and v1 preserves its existing schema and behavior', async t => {
  const app = fixture(t)
  for (const input of [
    { ...reference, platformFeeRate: 0.04 }, { ...reference, refundRate: 0 },
    { ...reference, price: -1 }, { ...reference, currency: 'USD' }, { ...reference, termDays: 0 },
    { ...reference, termDays: 3651 }, { ...reference, coverageEvaluationDay: 91 },
    { ...reference, coverageEvaluationDay: 0.5 }, { ...reference, averageSettlementDelayDays: -1 },
    { ...reference, referralFeeRate: 1.01 }, { ...reference, protectionFeeRate: -0.01 },
    { ...reference, protectionFeeGymShareRate: null }, { ...reference, advanceRate: 1.01 },
    { ...reference, incrementalCapacity: 1.5 }, { ...reference, incrementalNewCustomers: Number.MAX_SAFE_INTEGER + 1 },
  ]) {
    const response = await app.inject({ method: 'POST', url: v2, payload: input })
    assert.equal(response.statusCode, 400, response.body)
    assert.equal(errorSchema.parse(response.json()).error.code, 'INVALID_REQUEST')
  }
  const raw = JSON.stringify(reference).replace('"price":1500000', '"price":1e999')
  const infinity = await app.inject({ method: 'POST', url: v2, headers: { 'content-type': 'application/json' }, payload: raw })
  assert.equal(infinity.statusCode, 400)
  assert.equal(errorSchema.parse(infinity.json()).error.code, 'INVALID_REQUEST')
  const v1 = scenarioRequest.parse({
    label: reference.label, currency: reference.currency, price: reference.price,
    variableGymCost: reference.variableGymCost, annualCostOfFunds: reference.annualCostOfFunds,
    termDays: reference.termDays, platformCAC: reference.platformCAC, platformVariableCost: reference.platformVariableCost,
    incrementalNewCustomers: reference.incrementalNewCustomers, refundRate: 0, platformFeeRate: 0.04,
  })
  assert.equal(scenarioRequest.safeParse(reference).success, false)
  const response = await app.inject({ method: 'POST', url: '/v1/scenarios/compare', payload: v1 })
  assert.equal(response.statusCode, 501)
  assert.deepEqual(response.json(), { error: { code: 'NOT_IMPLEMENTED', message: 'Unavailable in D16-09; no operation performed.' } })
})
