import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  isVerifiedResolver, parseOperationsId, parseOperationsRoute, readOperationsEvidence,
} from '../src/lib/operations-chain.ts'

const hex = '0x' + 'a1'.repeat(32)
const row = (overrides = {}) => ({
  agreementId: '1', claimId: '1', evidenceHash: hex,
  source: 'DEMO_FIXTURE', description: 'Minh họa: buổi tập mẫu',
  externalUrl: 'https://example.org/evidence', ...overrides,
})
const reply = (value, status = 200) => async () =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })

test('D18-09 numeric Operations routes are positive-only, fixture isolated', () => {
  assert.deepEqual(parseOperationsRoute('/operations'), { page: 'overview' })
  assert.deepEqual(parseOperationsRoute('/operations/agreements'), { page: 'agreements' })
  assert.deepEqual(parseOperationsRoute('/operations/disputes'), { page: 'disputes' })
  assert.deepEqual(parseOperationsRoute('/operations/agreements/1'), { page: 'detail', id: 1n })
  assert.deepEqual(parseOperationsRoute('/operations/disputes/1', '?claimId=1'),
    { page: 'claim', id: 1n, claimId: 1n })
  assert.deepEqual(parseOperationsRoute('/operations/disputes/2'),
    { page: 'claim', id: 2n, claimId: undefined })
  assert.equal(parseOperationsRoute('/operations/agreements/OR-024').page, 'fixture-agreement')
  assert.equal(parseOperationsRoute('/operations/disputes/PT-04').page, 'fixture-dispute')
  for (const path of ['/operations/agreements/0', '/operations/disputes/-1',
    '/operations/agreements/OR-025', '/operations/disputes/PT-05',
    '/operations/disputes/1/more', '/operations/unknown']) {
    assert.equal(parseOperationsRoute(path).page, 'not-found', path)
  }
  assert.equal(parseOperationsRoute('/operations/disputes/1', '?claimId=0').page, 'not-found')
  assert.equal(parseOperationsRoute('/operations/disputes/1', '?claimId=abc').page, 'not-found')
  assert.equal(parseOperationsId('1'), 1n)
  assert.equal(parseOperationsId('0'), undefined)
  assert.equal(parseOperationsId('1'.repeat(79)), undefined)
  assert.equal(parseOperationsId((2n ** 256n).toString()), undefined)
})

test('route and wallet role cannot grant resolver writes', () => {
  const session = { chain: { id: 43113 } }
  assert.equal(isVerifiedResolver(session, 'resolver'), true)
  assert.equal(isVerifiedResolver(session, 'merchant'), false)
  assert.equal(isVerifiedResolver(session, 'buyer'), false)
  assert.equal(isVerifiedResolver({ chain: { id: 31337 } }, 'resolver'), false)
})

test('Catalog evidence must match agreement/claim/hash; matched fixture stays DEMO_FIXTURE', async () => {
  const mock = reply({ items: [row({ claimId: '2' }), row()], nextCursor: null })
  const found = await readOperationsEvidence(1n, 1n, hex, mock)
  assert.deepEqual(found, { status: 'MATCHED', source: 'DEMO_FIXTURE',
    description: 'Minh họa: buổi tập mẫu', externalUrl: 'https://example.org/evidence' })
  const mismatch = await readOperationsEvidence(1n, 1n, hex,
    reply({ items: [row({ evidenceHash: '0x' + 'dd'.repeat(32) })], nextCursor: null }))
  assert.deepEqual(mismatch, { status: 'NOT_FOUND' })
})

test('Catalog metadata URL schemes and claimed signature source are not proof of attendance', async () => {
  const found = await readOperationsEvidence(1n, 1n, hex,
    reply({ items: [row({ source: 'SIGNED_UPLOAD', externalUrl: 'javascript:alert(1)' })], nextCursor: null }))
  assert.deepEqual(found, { status: 'MATCHED', source: 'SIGNED_UPLOAD', description: 'Minh họa: buổi tập mẫu',
    externalUrl: undefined })
})

test('Catalog outages/malformed data never become VERIFIED_EMPTY', async () => {
  assert.deepEqual(await readOperationsEvidence(1n, 1n, hex, reply({}, 503)), { status: 'UNAVAILABLE' })
  assert.deepEqual(await readOperationsEvidence(1n, 1n, hex, reply({ items: 'bad', nextCursor: null })),
    { status: 'UNAVAILABLE' })
  assert.deepEqual(await readOperationsEvidence(1n, 1n, 'bad', reply({ items: [], nextCursor: null })),
    { status: 'UNAVAILABLE' })
  const offline = async () => { throw new Error('connection refused') }
  assert.deepEqual(await readOperationsEvidence(1n, 1n, hex, offline), { status: 'UNAVAILABLE' })
})

test('truncated or cycling pagination must report INCOMPLETE rather than missing', async () => {
  const cursor = 'YWJj'
  assert.deepEqual(await readOperationsEvidence(1n, 1n, hex,
    reply({ items: [], nextCursor: 'bad==cursor' })), { status: 'INCOMPLETE' })
  assert.deepEqual(await readOperationsEvidence(1n, 1n, hex,
    reply({ items: [], nextCursor: cursor })), { status: 'INCOMPLETE' })
  assert.deepEqual(await readOperationsEvidence(1n, 1n, hex,
    reply({ items: [], nextCursor: null })), { status: 'NOT_FOUND' })
})

test('Operations uses pinned Vault authority, Indexer advisory and no chain writes', () => {
  const ops = readFileSync(new URL('../src/portals/Operations.tsx', import.meta.url), 'utf8')
  const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')
  assert.match(ops, /readSharedAgreement\(session, route\.id\)/)
  assert.match(ops, /VAULT_READ_CONTRACT/)
  assert.match(ops, /label: 'Nhật ký Indexer',[^\n]+value: indexerStatusLabels\[activity\.status\], code: activity\.status/)
  assert.match(ops, /disputedLocked/)
  assert.match(ops, /readOperationsEvidence/)
  assert.match(ops, /DEMO_FIXTURE/)
  assert.match(ops, /revision\.current/)
  assert.doesNotMatch(ops, /\.writeContract\s*\(|\.simulateContract\s*\(/)
  assert.match(main, /parseOperationsRoute\(path, window\.location\.search\)/)
  assert.match(main, /href: '\/operations\/agreements\/1'/)
  assert.doesNotMatch(main, /href: '\/operations\/agreements\/OR-024'/)
})
