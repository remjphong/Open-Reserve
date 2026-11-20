import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { encodeFunctionData } from 'viem'
import { reserveVaultAbi } from '@openreserve/contracts-sdk'
import { classifyPtBalances, ptAgreementId, verifyWallet1PtReport, wallet1PtReport } from '../src/lib/customer-pt-proof.ts'

const buyer = '0x124C7DE92Df945477cAEbdC6745756C4B29e7b7B'
const merchant = '0xA337FCeC5f9508C3Ab5E10aE571610E167548878'
const vault = '0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad'
const hash32 = '0x' + '12'.repeat(32)
const context = {
  chainId: 43113, vault, buyer, merchant, pinnedBlock: 61380000n,
}
const ledger = {
  deposited: 1003n, earnedFinalized: 100n, gymWithdrawn: 100n, buyerRefunded: 0n,
  remainingLocked: 903n, withdrawable: 0n, refundable: 0n,
  disputedLocked: 0n, unallocated: 903n, refundAuthorized: 0n,
}
function reader(override = () => ({})) {
  let index = 0
  return async hash => {
    const item = wallet1PtReport[index++]
    assert.equal(hash, item.hash)
    const args = index === 1 ? [1n, hash32, hash32]
      : index === 2 || index === 3 ? [1n, 1n] : [1n]
    const input = encodeFunctionData({ abi: reserveVaultAbi, functionName: item.method, args })
    return {
      receipt: {
        transactionHash: hash, status: 'success', blockNumber: item.block, blockHash: hash32, to: vault,
      },
      transaction: {
        from: item.role === 'buyer' ? buyer : merchant, to: vault, input,
      },
      canonicalBlockHash: hash32,
      ...override(index, item),
    }
  }
}

test('PT base units conservation does not turn remaining 903 into refundable', () => {
  const state = classifyPtBalances(ledger)
  assert.equal(state.valid, true)
  assert.equal(state.canClaimRefund, false)
  assert.equal(state.earnedUnwithdrawn, 0n)
  assert.equal(state.authorizedUnclaimed, 0n)
  assert.equal(ledger.remainingLocked, 903n)
  assert.equal(ledger.refundable, 0n)
  assert.equal(ledger.earnedFinalized, ledger.gymWithdrawn)
  assert.notEqual(ledger.remainingLocked, ledger.refundable)
})

test('Vault authorized refund is withdrawable only by buyer; rejected inconsistent ledger', () => {
  const valid = classifyPtBalances({ ...ledger, refundAuthorized: 50n, refundable: 50n, unallocated: 853n })
  assert.equal(valid.canClaimRefund, true)
  assert.equal(classifyPtBalances({ ...ledger, refundable: 903n }).valid, false)
  assert.equal(classifyPtBalances({ ...ledger, remainingLocked: 1003n }).valid, false)
  assert.equal(classifyPtBalances({ ...ledger, gymWithdrawn: 101n }).valid, false)
})

test('four Wallet1-reported PT tx structurally match read-only Fuji receipts', async () => {
  assert.equal(ptAgreementId, 1n)
  assert.equal(wallet1PtReport.length, 4)
  assert.equal(wallet1PtReport[3].hash,
    '0x4b3f87cb99bc297fb8a57779fbc50c6c3e1f32fc7d0a6a5dc71dae5c84392273')
  assert.deepEqual(await verifyWallet1PtReport(context, reader()),
    { status: 'RPC_RECEIPTS_MATCHED', checked: 4 })
})

test('wrong chain, pre-transaction snapshot or failed RPC cannot verify', async () => {
  assert.equal((await verifyWallet1PtReport({ ...context, chainId: 31337 }, reader())).status, 'NOT_VERIFIED')
  assert.equal((await verifyWallet1PtReport({ ...context, pinnedBlock: 61370000n }, reader())).checked, 0)
  const fail = async () => { throw new Error('RPC rate limit') }
  assert.deepEqual(await verifyWallet1PtReport(context, fail), {
    status: 'NOT_VERIFIED', checked: 0,
    reason: 'RPC missing, changed or mismatched PT receipt/transaction.',
  })
})

test('mismatched signer/target/status/canonical block/calldata must fail closed', async () => {
  const defects = [
    () => ({ transaction: { from: buyer, to: vault,
      input: encodeFunctionData({ abi: reserveVaultAbi, functionName: 'claimEarned', args: [1n] }) } }),
    (index, item) => index === 2 ? { receipt: { transactionHash: item.hash, status: 'reverted',
      blockNumber: item.block, blockHash: hash32, to: vault } } : {},
    () => ({ canonicalBlockHash: '0x' + 'ff'.repeat(32) }),
    () => ({ receipt: { transactionHash: wallet1PtReport[0].hash,
      status: 'success', blockNumber: 61373562n, blockHash: hash32, to: buyer } }),
  ]
  for (const defect of defects) {
    assert.equal((await verifyWallet1PtReport(context, reader(defect))).status, 'NOT_VERIFIED')
  }
})

test('D19-01 UI has direct known-PT route, Vault monetary source and explicit reported provenance', () => {
  const customer = readFileSync(new URL('../src/portals/Customer.tsx', import.meta.url), 'utf8')
  assert.match(customer, /href="\/customer\/passes\/1"/)
  assert.match(customer, /readSharedAgreement\(session, id\)/)
  assert.match(customer, /classifyPtBalances/)
  assert.match(customer, /VAULT_READ_CONTRACT/)
  assert.match(customer, /WALLET1_REPORTED_RECEIPTS_VERIFIED/)
  assert.match(customer, /RPC_RECEIPTS_MATCHED|proof\.status/)
  assert.match(customer, /on\?\.\('disconnect', disconnected\)/)
  assert.match(customer, /Không tự động xác nhận số dư/)
  assert.doesNotMatch(customer, /903.*được duyệt hoàn/)
})
