import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  assessGymLedger, knownGymAgreement, gymKnownEvidence, matchesWallet2TimeAgreement, wallet2TimeDepositReport,
} from '../src/lib/gym-known-evidence.ts'
import { wallet1PtReport } from '../src/lib/customer-pt-proof.ts'

const pt = {
  deposited: 1003n, earnedFinalized: 100n, gymWithdrawn: 100n,
  refundAuthorized: 0n, buyerRefunded: 0n, remainingLocked: 903n,
  withdrawable: 0n, refundable: 0n, disputedLocked: 0n, unallocated: 903n,
}
const timeDeposit = {
  deposited: 900n, earnedFinalized: 0n, gymWithdrawn: 0n,
  refundAuthorized: 0n, buyerRefunded: 0n, remainingLocked: 900n,
  withdrawable: 0n, refundable: 0n, disputedLocked: 0n, unallocated: 900n,
}

test('D19-02 knows only PT #1 and TIME_ACCESS #2; wrong policy must fail closed', () => {
  assert.equal(knownGymAgreement(1n, 0).status, 'KNOWN')
  assert.equal(knownGymAgreement(2n, 1).status, 'KNOWN')
  assert.equal(knownGymAgreement(1n, 1).status, 'POLICY_MISMATCH')
  assert.equal(knownGymAgreement(2n, 0).status, 'POLICY_MISMATCH')
  assert.equal(knownGymAgreement(3n, 0).status, 'OTHER')
  assert.equal(assessGymLedger(1n, 1, pt).valid, false)
  assert.equal(assessGymLedger(2n, 0, timeDeposit).valid, false)
})

test('PT #1 reported snapshot is not financial authority; only getter values qualify', () => {
  const initial = assessGymLedger(1n, 0, pt)
  assert.equal(initial.valid, true)
  assert.equal(initial.ptMatchesReportedSnapshot, true)
  assert.equal(initial.merchantMayClaimEarned, false)
  assert.equal(initial.buyerMayClaimRefund, false)
  assert.equal(pt.remainingLocked, 903n)
  assert.equal(pt.refundable, 0n)
  assert.equal(wallet1PtReport.length, 4)
  assert.equal(gymKnownEvidence[1].reportedTx[3].method, 'claimEarned')

  // A later valid claim/authorization legitimately changes the live ledger,
  // without invalidating historic Wallet1 receipts or restoring old numbers.
  const changed = { ...pt, earnedFinalized: 200n, withdrawable: 100n, unallocated: 803n }
  const refreshed = assessGymLedger(1n, 0, changed)
  assert.equal(refreshed.valid, true)
  assert.equal(refreshed.ptMatchesReportedSnapshot, false)
  assert.equal(refreshed.merchantMayClaimEarned, true)
})

test('TIME_ACCESS #2 only has reported TX1 deposit; no earned/withdrawn/refund receipt', () => {
  assert.equal(wallet2TimeDepositReport.hash,
    '0xdb4c9d91f1895c88e719cb1062db8a61cd096c00e5bf75e58b70bf389808ae85')
  assert.equal(wallet2TimeDepositReport.block, 61380299n)
  assert.equal(wallet2TimeDepositReport.amount, 900n)
  assert.equal(wallet2TimeDepositReport.endAt - wallet2TimeDepositReport.startAt, 270n)
  assert.equal(wallet2TimeDepositReport.challengeWindow, 60n)
  assert.equal(gymKnownEvidence[2].reportedTx.length, 1)
  assert.equal(gymKnownEvidence[2].reportedTx[0].method, 'openAgreement')
  assert.match(wallet2TimeDepositReport.provenance, /WALLET2_REPORTED_VERIFIED/)
  const status = assessGymLedger(2n, 1, timeDeposit)
  assert.equal(status.valid, true)
  assert.equal(status.merchantMayClaimEarned, false)
  assert.equal(status.buyerMayClaimRefund, false)
  assert.equal(status.ptMatchesReportedSnapshot, undefined)
})

test('TIME #2 receipt report is associated only with exact pinned Vault agreement identity', () => {
  const agreement = {
    policy: 1, deposited: 900n, startAt: 1795182500n, endAt: 1795182770n,
    challengeWindow: 60n,
    buyer: '0x124C7DE92Df945477cAEbdC6745756C4B29e7b7B',
    merchant: '0xA337FCeC5f9508C3Ab5E10aE571610E167548878',
  }
  assert.equal(matchesWallet2TimeAgreement(agreement), true)
  for (const override of [
    { policy: 0 }, { deposited: 899n }, { startAt: 1795182501n },
    { endAt: 1795182771n }, { challengeWindow: 59n },
    { buyer: agreement.merchant }, { merchant: agreement.buyer },
  ]) assert.equal(matchesWallet2TimeAgreement({ ...agreement, ...override }), false)
})

test('Independent Vault getter mismatch fails closed: no false withdrawable/refund eligibility', () => {
  for (const corrupt of [
    { ...pt, remainingLocked: 1003n },
    { ...pt, withdrawable: 100n },
    { ...pt, refundable: 903n },
    { ...pt, disputedLocked: 904n },
    { ...pt, unallocated: 904n },
    { ...pt, earnedFinalized: 99n },
    { ...pt, gymWithdrawn: 101n },
  ]) {
    const audit = assessGymLedger(1n, 0, corrupt)
    assert.equal(audit.valid, false)
    assert.equal(audit.merchantMayClaimEarned, false)
    assert.equal(audit.buyerMayClaimRefund, false)
  }
})

test('Gym UI preserves pinned Vault, errors and read-only merchant signing fence', () => {
  const gym = readFileSync(new URL('../src/portals/Gym.tsx', import.meta.url), 'utf8')
  const lib = readFileSync(new URL('../src/lib/gym-chain.ts', import.meta.url), 'utf8')
  assert.match(gym, /readDirectGymAgreement\(session, route\.id, readSharedAgreement\)/)
  assert.match(gym, /href="\/gym\/agreements\/1"/)
  assert.match(gym, /href="\/gym\/agreements\/2"/)
  assert.match(gym, /WALLET1|source\.provenance/)
  assert.match(gym, /USER_PROVIDED|wallet2TimeDepositReport/)
  assert.match(gym, /matchesWallet2TimeAgreement/)
  assert.match(gym, /VAULT_READ_CONTRACT/)
  assert.match(gym, /VAULT_LEDGER_CONSISTENT/)
  assert.match(gym, /CURRENT_PT_STATE_DIFFERS_FROM_REPORTED_SNAPSHOT/)
  assert.match(gym, /Không hiển thị danh sách rỗng đã xác minh/)
  assert.match(gym, /INCOMPLETE_LOG_READ/)
  assert.match(gym, /FUJI_WRITE_BLOCKED/)
  assert.doesNotMatch(gym, /\.writeContract\s*\(/)
  assert.match(lib, /GYM_CHAIN_WRITES_ENABLED\s*=\s*false/)
})
