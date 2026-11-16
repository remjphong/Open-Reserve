import test from 'node:test'
import assert from 'node:assert/strict'
import * as s from '../dist/index.js'

const hash = '0x' + '1'.repeat(64), address = '0x' + '1'.repeat(40)
const meta = { chainId: 43113, contractAddress: address, lastIndexedBlock: '12', isStale: true, indexedAt: '2026-11-16T00:00:00Z', source: 'CHAIN_READ_MODEL' }
// Shape fixtures only, never served as real evidence or chain data.
const evidence = { agreementId: '1', claimId: '1', evidenceHash: hash, source: 'DEMO_FIXTURE', description: 'Test fixture', externalUrl: null }
const scenario = { label: 'MINH HỌA', currency: 'VND', price: 1500000, variableGymCost: 0, annualCostOfFunds: 0.1, termDays: 90, platformCAC: 70000, platformVariableCost: 20000, platformFeeRate: 0.04, incrementalNewCustomers: 1, refundRate: 0 }
test('health, ready, error DTOs reject contradictions', () => {
  s.healthSchema.parse({ service: 'economics', status: 'alive' })
  s.readySchema.parse({ service: 'economics', ready: true, dependencies: [] })
  assert.equal(s.readySchema.safeParse({ service: 'chain-indexer', ready: true, dependencies: [{ name: 'rpc', ok: false, reason: 'UNAVAILABLE' }] }).success, false)
  assert.equal(s.dependencySchema.safeParse({ name: 'rpc', ok: true, reason: 'NOT_CONFIGURED' }).success, false)
  s.errorSchema.parse({ error: { code: 'WRITE_DISABLED', message: 'Disabled' } })
})
test('IDs, uint256, pagination reject unsafe and invalid values', () => {
  for (const value of [-1, 1, '01', '-1', '1.5', 'invalid', String(2n ** 256n)]) assert.equal(s.uint.safeParse(value).success, false)
  assert.equal(s.entityId.safeParse('0').success, false)
  assert.equal(s.pageQuery.parse({}).limit, 50)
  assert.equal(s.pageQuery.safeParse({ limit: 101 }).success, false)
})
test('catalog packages retain demo provenance and two policies', () => {
  const common = { title: 'Test only', termsVersion: '1.0.1', termsHash: hash, source: 'DEMO_FIXTURE', label: 'MINH HỌA', priceTokenUnits: '1000', tokenDecimals: 18 }
  const pt = { ...common, id: 'pt-10', type: 'PER_SESSION', sessions: 10, businessDurationDays: null }
  const time = { ...common, id: 'time-90', type: 'TIME_ACCESS', sessions: null, businessDurationDays: 90 }
  s.packagesResponse.parse({ packages: [pt, time] })
  assert.equal(s.packagesResponse.safeParse({ packages: [pt, pt] }).success, false)
  assert.equal(s.packageSchema.safeParse({ ...pt, source: 'VERIFIED_PARTNER' }).success, false)
})
test('evidence and future signed envelope validate shape without authorizing writes', () => {
  s.evidenceResponse.parse({ items: [evidence], nextCursor: null })
  const request = { evidence: { ...evidence, source: 'SIGNED_UPLOAD' }, signer: address, signature: '0x' + '1'.repeat(130), nonce: hash, expiresAt: '1', chainId: 43113, contractAddress: address, domain: 'localhost', action: 'CREATE_EVIDENCE', payloadHash: hash }
  s.evidenceRequest.parse(request)
  assert.equal(s.evidenceRequest.safeParse({ ...request, nonce: undefined }).success, false)
  assert.equal(s.evidenceRequest.safeParse({ ...request, chainId: 1 }).success, false)
  assert.equal(s.evidenceSchema.safeParse({ ...evidence, externalUrl: 'javascript:alert(1)' }).success, false)
})
test('chain projection/event/sync DTOs carry identity and stale provenance', () => {
  const agreement = { meta, agreementId: '1', buyer: address, merchant: address, policy: 'PER_SESSION', state: 'OPEN', termsHash: hash, startAt: '0', endAt: '0', challengeWindow: '0', sessionsFinalized: 0, positiveRefundSlots: 0, sessionsConsumed: 0, liveClaims: '0', challengedSessionClaimId: '0' }
  for (const key of ['deposited', 'earnedFinalized', 'gymWithdrawn', 'refundAuthorized', 'buyerRefunded', 'remainingLocked', 'withdrawable', 'refundable', 'disputedLocked', 'unallocated']) agreement[key] = '0'
  s.agreementResponse.parse(agreement)
  const event = { chainId: 43113, contractAddress: address, agreementId: '1', txHash: hash, logIndex: 0, blockNumber: '12', blockHash: hash, transactionIndex: 0, topics: [hash], data: '0x', confirmations: '1', removed: false }
  s.eventsResponse.parse({ meta, items: [event], nextCursor: null })
  assert.equal(s.eventSchema.safeParse({ ...event, logIndex: -1 }).success, false)
  assert.equal(s.projectionMeta.safeParse({ ...meta, isStale: undefined }).success, false)
  s.syncResponse.parse({ chainId: 43113, contractAddress: null, deploymentBlock: null, lastIndexedBlock: null, chainTip: null, lag: null, isStale: true, replayState: 'NOT_STARTED', lastError: 'SYNC_NOT_IMPLEMENTED' })
})
test('economics allows losses, requires assumptions and four distinct scenarios', () => {
  s.scenarioRequest.parse(scenario)
  const response = { label: 'MINH HỌA', currency: 'VND', assumptions: scenario, scenarios: ['A', 'B', 'C', 'D'].map(model => ({ model, gymIncrementalContribution: 0, cashGap: 0, platformUnitMargin: -30000 })) }
  s.scenarioResponse.parse(response)
  assert.equal(s.scenarioRequest.safeParse({ ...scenario, refundRate: 2 }).success, false)
  assert.equal(s.scenarioResponse.safeParse({ ...response, scenarios: Array(4).fill(response.scenarios[0]) }).success, false)
})
