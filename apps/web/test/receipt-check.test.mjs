import test from 'node:test'
import assert from 'node:assert/strict'
import { confirmReceiptAndRefresh, assertFreshReadContext } from '../src/lib/receipt-check.ts'

const hash = '0x' + '12'.repeat(32)
const other = '0x' + '34'.repeat(32)
const valid = () => ({ transactionHash: hash, status: 'success', blockNumber: 100n })

function setup(receipt = valid(), failure) {
  const phases = []
  let waitCalls = 0
  let refreshCalls = 0
  const task = confirmReceiptAndRefresh({
    hash,
    waitForReceipt: async () => {
      waitCalls++
      if (failure === 'wait') throw new Error('RPC unavailable')
      return receipt
    },
    refresh: async () => {
      refreshCalls++
      if (failure === 'refresh') throw new Error('RPC head stale')
      return { ledger: { remainingLocked: 1003n }, blockNumber: 101n }
    },
    onPhase: phase => phases.push(phase),
  })
  return { task, phases, counts: () => [waitCalls, refreshCalls] }
}

test('receipt rejected by RPC: ERROR and zero refresh attempts', async () => {
  const { task, phases, counts } = setup(valid(), 'wait')
  await assert.rejects(task, /Receipt not verified/)
  assert.deepEqual(phases, ['PENDING', 'ERROR'])
  assert.deepEqual(counts(), [1, 0])
})

test('reverted receipt: ERROR and zero refresh attempts', async () => {
  const { task, phases, counts } = setup({ ...valid(), status: 'reverted' })
  await assert.rejects(task, /not successful/)
  assert.deepEqual(phases, ['PENDING', 'ERROR'])
  assert.deepEqual(counts(), [1, 0])
})

test('mismatched transaction hash: ERROR and zero refresh attempts', async () => {
  const { task, phases, counts } = setup({ ...valid(), transactionHash: other })
  await assert.rejects(task, /hash or block mismatched/)
  assert.deepEqual(phases, ['PENDING', 'ERROR'])
  assert.deepEqual(counts(), [1, 0])
})

test('malformed receipt block: ERROR, never refreshes', async () => {
  const { task, phases, counts } = setup({ ...valid(), blockNumber: undefined })
  await assert.rejects(task, /hash or block mismatched/)
  assert.deepEqual(phases, ['PENDING', 'ERROR'])
  assert.deepEqual(counts(), [1, 0])
})

test('successful receipt refreshes once and returns a new ledger snapshot', async () => {
  const { task, phases, counts } = setup()
  const out = await task
  assert.equal(out.receipt.transactionHash, hash)
  assert.equal(out.snapshot.blockNumber, 101n)
  assert.equal(out.snapshot.ledger.remainingLocked, 1003n)
  assert.equal(out.refreshError, undefined)
  assert.deepEqual(phases, ['PENDING', 'CONFIRMED'])
  assert.deepEqual(counts(), [1, 1])
})

test('refresh failure cannot masquerade as successful fresh data', async () => {
  const { task, phases, counts } = setup(valid(), 'refresh')
  const out = await task
  assert.equal(out.receipt.transactionHash, hash)
  assert.equal(out.snapshot, undefined)
  assert.match(out.refreshError, /RPC head stale/)
  assert.deepEqual(phases, ['PENDING', 'CONFIRMED'])
  assert.deepEqual(counts(), [1, 1])
})

test('wrong wallet, vault, chain, or stale RPC head fail context assertion', () => {
  const before = { account: '0xAAA', chainId: 43113, vault: '0xBBB' }
  const current = { ...before, headBlock: 101n }
  assert.doesNotThrow(() => assertFreshReadContext(before, current, 100n))
  for (const delta of [
    { account: '0xCCC' }, { vault: '0xDDD' },
    { chainId: 31337 }, { headBlock: 99n },
  ]) {
    assert.throws(() => assertFreshReadContext(before, { ...current, ...delta }, 100n))
  }
})
