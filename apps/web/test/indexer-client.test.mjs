import test from 'node:test'
import assert from 'node:assert/strict'
import { readIndexedActivity, parseIndexedActivity } from '../src/lib/indexer-client.ts'

const vault = '0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad'
const ctx = { chainId: 43113, vault, headBlock: 100n }
const hash = '0x' + 'ab'.repeat(32)
const blockHash = '0x' + 'cd'.repeat(32)
const valid = () => ({
  meta: { chainId: 43113, contractAddress: vault, lastIndexedBlock: '100',
    isStale: false, indexedAt: '2026-11-19T10:00:00Z', source: 'CHAIN_READ_MODEL' },
  items: [{ chainId: 43113, contractAddress: vault, agreementId: '1',
    txHash: hash, blockNumber: '100', blockHash, transactionIndex: 0,
    logIndex: 0, topics: [hash], data: '0x', confirmations: '1', removed: false }],
  nextCursor: null,
})
const respond = (body, status = 200) => async () => new Response(
  JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } },
)
const get = (body, status = 200) => readIndexedActivity(ctx, 1n, 'https://indexer.example', respond(body, status))

test('fresh, stale, and excessive indexer head are distinct', () => {
  assert.equal(parseIndexedActivity(valid(), ctx, 1n).status, 'FRESH')
  const lag = valid(); lag.meta.lastIndexedBlock = '99'; lag.items = []
  assert.equal(parseIndexedActivity(lag, ctx, 1n).status, 'STALE')
  const flagged = valid(); flagged.meta.isStale = true
  assert.equal(parseIndexedActivity(flagged, ctx, 1n).status, 'STALE')
  const future = valid(); future.meta.lastIndexedBlock = '101'
  assert.equal(parseIndexedActivity(future, ctx, 1n).status, 'INVALID_RESPONSE')
})

test('missing config, 501, 503, and fetch failure never masquerade as empty success', async () => {
  assert.equal((await readIndexedActivity(ctx, 1n, undefined)).status, 'NOT_CONFIGURED')
  assert.equal((await get({}, 501)).status, 'NOT_IMPLEMENTED')
  assert.equal((await get({}, 503)).status, 'DOWN')
  assert.equal((await readIndexedActivity(ctx, 1n, 'https://indexer.example', async () => {
    throw new Error('offline')
  })).status, 'DOWN')
  assert.equal((await get(valid())).status, 'FRESH')
})

test('wrong chain, vault, agreement, malformed events, and duplicate logs fail closed', () => {
  const wrongChain = valid(); wrongChain.meta.chainId = 31337
  assert.equal(parseIndexedActivity(wrongChain, ctx, 1n).status, 'INVALID_RESPONSE')
  const wrongVault = valid(); wrongVault.meta.contractAddress = '0x' + '0'.repeat(40)
  assert.equal(parseIndexedActivity(wrongVault, ctx, 1n).status, 'INVALID_RESPONSE')
  const wrongAgreement = valid(); wrongAgreement.items[0].agreementId = '2'
  assert.equal(parseIndexedActivity(wrongAgreement, ctx, 1n).status, 'INVALID_RESPONSE')
  const wrongEventChain = valid(); wrongEventChain.items[0].chainId = 31337
  assert.equal(parseIndexedActivity(wrongEventChain, ctx, 1n).status, 'INVALID_RESPONSE')
  const duplicate = valid(); duplicate.items.push({ ...duplicate.items[0] })
  assert.equal(parseIndexedActivity(duplicate, ctx, 1n).status, 'INVALID_RESPONSE')
  const malformed = valid(); malformed.items[0].data = '0x0'
  assert.equal(parseIndexedActivity(malformed, ctx, 1n).status, 'INVALID_RESPONSE')
})

test('invalid response and invalid URL are not confused with indexer downtime', async () => {
  assert.equal((await get({})).status, 'INVALID_RESPONSE')
  assert.equal((await readIndexedActivity(ctx, 1n, 'file:///tmp', respond(valid()))).status, 'INVALID_RESPONSE')
  assert.equal((await readIndexedActivity(ctx, 1n, 'not-an-url', respond(valid()))).status, 'INVALID_RESPONSE')
  assert.equal((await readIndexedActivity(ctx, 0n, 'https://indexer.example', respond(valid()))).status, 'INVALID_RESPONSE')
})
