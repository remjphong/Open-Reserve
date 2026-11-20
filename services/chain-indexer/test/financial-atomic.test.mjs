import test from 'node:test'
import assert from 'node:assert/strict'
import { FujiRpc } from '../dist/domain/rpc-client.js'
import { FUJI, parseFinancialView } from '../dist/domain/protocol.js'
import { mockView, hashWord } from './fixtures.mjs'

// Regression: two individually valid block states must never be cross-matched.
test('all five financial getters match agreement fields; reject mixed-block and underflows', () => {
  const [originalAgreement, originalBalances] = mockView()
  const encode = words => '0x' + words.map(hashWord).join('')
  const unpack = raw => Array.from({ length: (raw.length - 2) / 64 }, (_, i) => BigInt('0x' + raw.slice(2 + i * 64, 2 + (i + 1) * 64)))
  const atNPlusOne = unpack(originalAgreement)
  atNPlusOne[14] = 100n // earnedFinalized, before: 0
  const earnedAgreement = encode(atNPlusOne)
  const earnedBalances = encode([1003, 100, 0, 0, 903])
  assert.equal(parseFinancialView(earnedAgreement, earnedBalances, '1').withdrawable, '100')
  assert.throws(() => parseFinancialView(earnedAgreement, originalBalances, '1'), /VAULT_INVARIANT_MISMATCH/)
  for (const index of [0, 1, 2, 4]) {
    const wrong = [1003n, 100n, 0n, 0n, 903n]
    wrong[index] += 1n
    assert.throws(() => parseFinancialView(earnedAgreement, encode(wrong), '1'), /VAULT_INVARIANT_MISMATCH/)
  }
  assert.throws(() => parseFinancialView(earnedAgreement, encode([1003, 100, 0, 1, 903]), '1'), /VAULT_BALANCE_MISMATCH/)

  // Valid independent refund authorization and buyer refund accounting.
  const afterRefund = [...atNPlusOne]
  afterRefund[16] = 40n // refundAuthorized
  afterRefund[17] = 10n // buyerRefunded
  const refundBalances = encode([993, 100, 30, 0, 863])
  assert.equal(parseFinancialView(encode(afterRefund), refundBalances, '1').refundable, '30')
  afterRefund[17] = 41n // would underflow refundable
  assert.throws(() => parseFinancialView(encode(afterRefund), refundBalances, '1'), /VAULT_INVARIANT_MISMATCH/)
  afterRefund[17] = 10n
  afterRefund[15] = 101n // gymWithdrawn exceeds earnedFinalized
  assert.throws(() => parseFinancialView(encode(afterRefund), refundBalances, '1'), /VAULT_INVARIANT_MISMATCH/)
  afterRefund[15] = 0n
  afterRefund[14] = 1000n // earned + refund authorized > deposited
  afterRefund[16] = 40n
  // 1000+40 still fits deposit=1003? No: it exceeds and must fail.
  assert.throws(() => parseFinancialView(encode(afterRefund), refundBalances, '1'), /VAULT_INVARIANT_MISMATCH/)
})

// No live network: the signer/runtime guard is an explicit stub; all block,
// eth_call and canonical-state requests exercise the real FujiRpc.financial.
test('financial() pins both getters to one checked block even when latest advances', async () => {
  const { mockView } = await import('./fixtures.mjs')
  const client = new FujiRpc('http://127.0.0.1:1')
  const [agreementAtN, balancesAtN] = mockView()
  const calls = []
  const n = FUJI.deploymentBlock + 50n
  const tag = '0x' + n.toString(16)
  const hash = '0x' + 'ab'.repeat(32)
  let latest = n
  let identityChecks = 0
  client.assertIdentity = async () => { identityChecks++ }
  client.call = async (method, params) => {
    calls.push({ method, params })
    if (method === 'eth_blockNumber') return '0x' + n.toString(16)
    if (method === 'eth_getBlockByNumber') return { number: tag, hash }
    if (method === 'eth_call') {
      assert.equal(params[1], tag, 'Independent latest calls are forbidden')
      latest += 1n // simulate a new tip between the getter requests
      return params[0].data.startsWith('0x4f9f6fe6') ? agreementAtN : balancesAtN
    }
    throw new Error('UNEXPECTED_RPC_METHOD')
  }
  const result = await client.financial('1')
  assert.equal(result.deposited, '1003')
  assert.equal(result.withdrawable, '0')
  assert.equal(identityChecks, 1)
  assert.ok(latest > n)
  assert.equal(calls.filter(item => item.method === 'eth_call').length, 2)
  assert.equal(calls.filter(item => item.method === 'eth_getBlockByNumber').length, 2)
  assert.ok(calls.filter(item => item.method === 'eth_call').every(item => item.params[1] === tag))
})

test('financial() rejects canonical block reorg, malformed block and cross-block balances', async () => {
  const { mockView, hashWord } = await import('./fixtures.mjs')
  const [agreement, balances] = mockView()
  const n = FUJI.deploymentBlock + 50n
  const tag = '0x' + n.toString(16)
  const initialHash = '0x' + 'ab'.repeat(32)
  const reorgHash = '0x' + 'cd'.repeat(32)
  function mockClient({ changedHash = false, badBlockNumber = false, mixedBalance = false } = {}) {
    const client = new FujiRpc('http://127.0.0.1:1')
    let reads = 0
    client.assertIdentity = async () => {}
    client.call = async (method, params) => {
      if (method === 'eth_blockNumber') return tag
      if (method === 'eth_getBlockByNumber') {
        reads++
        return { number: badBlockNumber ? '0x1' : tag, hash: changedHash && reads === 2 ? reorgHash : initialHash }
      }
      if (method === 'eth_call') {
        assert.equal(params[1], tag)
        // Before state: earned=0, after state: earned=100.
        // Return an older getBalances with a newer getAgreement.
        if (params[0].data.startsWith('0x4f9f6fe6')) {
          const words = Array.from({ length: 19 }, (_, i) => BigInt('0x' + agreement.slice(2 + i * 64, 2 + (i + 1) * 64)))
          words[14] = 100n
          return mixedBalance ? '0x' + words.map(hashWord).join('') : agreement
        }
        return balances
      }
      throw new Error('UNEXPECTED_RPC_METHOD')
    }
    return client
  }
  await assert.rejects(mockClient({ changedHash: true }).financial('1'), /FINANCIAL_BLOCK_REORG/)
  await assert.rejects(mockClient({ badBlockNumber: true }).financial('1'), /RPC_BLOCK_INCONSISTENT/)
  await assert.rejects(mockClient({ mixedBalance: true }).financial('1'), /VAULT_INVARIANT_MISMATCH/)
})
