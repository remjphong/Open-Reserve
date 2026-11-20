import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { approvedTermsHash, verifiedFujiDeployment } from '@openreserve/contracts-sdk'
import {
  auditKnownOperationsSnapshot, knownOperations, knownPortalPaths,
  reviewedParties, reviewedTimeTx1,
} from '../src/lib/operations-known-audit.ts'

const base = {
  agreementId: 1n, chainId: 43113, vault: verifiedFujiDeployment.vault,
  blockNumber: 61380299n, source: 'VAULT_READ_CONTRACT',
  agreement: {
    buyer: reviewedParties.buyer, merchant: reviewedParties.merchant,
    termsHash: approvedTermsHash, policy: 0,
    deposited: 1003n, earnedFinalized: 100n,
    gymWithdrawn: 100n, refundAuthorized: 0n, buyerRefunded: 0n,
    startAt: 0n, endAt: 0n, challengeWindow: 60n,
  },
  ledger: {
    deposited: 1003n, earnedFinalized: 100n, gymWithdrawn: 100n,
    refundAuthorized: 0n, buyerRefunded: 0n, remainingLocked: 903n,
    withdrawable: 0n, refundable: 0n, disputedLocked: 0n, unallocated: 903n,
  },
}
const time = {
  ...base, agreementId: 2n,
  agreement: {
    ...base.agreement, policy: 1, deposited: 900n,
    earnedFinalized: 0n, gymWithdrawn: 0n,
    startAt: reviewedTimeTx1.startAt,
    endAt: reviewedTimeTx1.endAt,
    challengeWindow: reviewedTimeTx1.challengeWindow,
  },
  ledger: {
    deposited: 900n, earnedFinalized: 0n, gymWithdrawn: 0n,
    refundAuthorized: 0n, buyerRefunded: 0n,
    remainingLocked: 900n, withdrawable: 0n,
    refundable: 0n, disputedLocked: 0n, unallocated: 900n,
  },
}

test('D19-03 both known IDs share exact Fuji Vault deployment and immutable roles/terms', () => {
  assert.deepEqual(knownOperations.map(({ id }) => id), [1n, 2n])
  for (const snap of [base, time]) {
    assert.deepEqual(auditKnownOperationsSnapshot(snap), {
      status: 'IDENTITY_AND_LEDGER_MATCHED', source: 'VAULT_READ_CONTRACT',
      id: snap.agreementId,
      timeTx1IdentityMatched: snap.agreementId === 2n ? true : undefined,
    })
  }
  assert.equal(reviewedTimeTx1.hash,
    '0xdb4c9d91f1895c88e719cb1062db8a61cd096c00e5bf75e58b70bf389808ae85')
  assert.match(reviewedTimeTx1.provenance, /WALLET2_REPORTED_VERIFIED/)
})

test('known IDs link into all three existing portal routes, without scan assumptions', () => {
  assert.deepEqual(knownPortalPaths(1n), {
    customer: '/customer/passes/1', gym: '/gym/agreements/1',
    operations: '/operations/agreements/1', claim: '/operations/disputes/1?claimId=1',
  })
  assert.equal(knownPortalPaths(2n)?.operations, '/operations/agreements/2')
  assert.equal(knownPortalPaths(2n)?.gym, '/gym/agreements/2')
  assert.equal(knownPortalPaths(2n)?.customer, '/customer/passes/2')
  assert.equal(knownPortalPaths(3n), undefined)
})

test('wrong RPC source, chain, vault or deployment block may not produce verified financial view', () => {
  const variants = [
    { source: 'INDEXER_CACHE' }, { chainId: 43114 }, { vault: reviewedParties.buyer },
    { blockNumber: verifiedFujiDeployment.deploymentBlock - 1n },
  ]
  for (const variant of variants) {
    assert.deepEqual(auditKnownOperationsSnapshot({ ...base, ...variant }),
      { status: 'NOT_VERIFIED', reason: 'SOURCE_OR_CHAIN_MISMATCH' })
  }
  assert.deepEqual(auditKnownOperationsSnapshot({ ...base, agreementId: 3n }),
    { status: 'NOT_VERIFIED', reason: 'UNKNOWN_ID' })
})

test('wrong buyer, merchant, policy or locked terms fail closed', () => {
  for (const variant of [
    { buyer: reviewedParties.merchant }, { merchant: reviewedParties.buyer },
    { termsHash: '0x' + '00'.repeat(32) },
  ]) assert.deepEqual(auditKnownOperationsSnapshot({
    ...base, agreement: { ...base.agreement, ...variant },
  }), { status: 'NOT_VERIFIED', reason: 'PARTY_OR_TERMS_MISMATCH' })
  for (const variant of [{ policy: 1 }]) {
    assert.deepEqual(auditKnownOperationsSnapshot({
      ...base, agreement: { ...base.agreement, ...variant },
    }), { status: 'NOT_VERIFIED', reason: 'POLICY_OR_TIME_TX1_MISMATCH' })
  }
})

test('TIME_ACCESS #2 TX1 report is attached only to exact on-chain identity and time fields', () => {
  for (const variant of [
    { deposited: 901n }, { startAt: reviewedTimeTx1.startAt + 1n },
    { endAt: reviewedTimeTx1.endAt + 1n },
    { challengeWindow: 61n }, { policy: 0 },
  ]) {
    const res = auditKnownOperationsSnapshot({
      ...time, agreement: { ...time.agreement, ...variant },
    })
    assert.deepEqual(res, { status: 'NOT_VERIFIED', reason: 'POLICY_OR_TIME_TX1_MISMATCH' })
  }
  assert.equal(reviewedTimeTx1.deposited, 900n)
  assert.equal(reviewedTimeTx1.endAt - reviewedTimeTx1.startAt, 270n)
})

test('I1 and derived getter mismatch never show verified money', () => {
  const badLedger = [
    { deposited: 1004n }, { earnedFinalized: 99n },
    { gymWithdrawn: 101n }, { remainingLocked: 1003n },
    { withdrawable: 100n }, { refundable: 903n }, { buyerRefunded: 1n },
    { refundAuthorized: 903n }, { disputedLocked: 904n },
    { unallocated: 904n }, { withdrawable: -1n },
  ]
  for (const item of badLedger) {
    const snapshot = { ...base, ledger: { ...base.ledger, ...item } }
    assert.deepEqual(auditKnownOperationsSnapshot(snapshot),
      { status: 'NOT_VERIFIED', reason: 'LEDGER_MISMATCH' })
  }
})

test('subsequent real Vault state may change without changing historical PT or TIME reference', () => {
  const validChange = {
    ...base,
    agreement: { ...base.agreement, earnedFinalized: 200n },
    ledger: { ...base.ledger, earnedFinalized: 200n, withdrawable: 100n, unallocated: 803n },
  }
  assert.equal(auditKnownOperationsSnapshot(validChange).status, 'IDENTITY_AND_LEDGER_MATCHED')
  const partialEarned = {
    ...time,
    agreement: { ...time.agreement, earnedFinalized: 300n },
    ledger: { ...time.ledger, earnedFinalized: 300n, withdrawable: 300n, unallocated: 600n },
  }
  assert.equal(auditKnownOperationsSnapshot(partialEarned).status, 'IDENTITY_AND_LEDGER_MATCHED')
  // Accepted TX1 report cannot attest this hypothetical future earning or payout.
  assert.equal(reviewedTimeTx1.deposited, 900n)
})

test('Operations has both known routes, indexer degrades, resolver stays read-only', () => {
  const ops = readFileSync(new URL('../src/portals/Operations.tsx', import.meta.url), 'utf8')
  const gym = readFileSync(new URL('../src/portals/Gym.tsx', import.meta.url), 'utf8')
  const customer = readFileSync(new URL('../src/portals/Customer.tsx', import.meta.url), 'utf8')
  const shared = readFileSync(new URL('../src/lib/shared-ledger.ts', import.meta.url), 'utf8')
  assert.match(ops, /knownOperations\.map/)
  assert.match(ops, /knownPortalPaths/)
  assert.match(ops, /readSharedAgreement\(session, route\.id\)/)
  assert.match(gym, /readDirectGymAgreement\(session, route\.id, readSharedAgreement\)/)
  assert.match(customer, /readSharedAgreement\(session, id\)/)
  assert.match(shared, /VAULT_READ_CONTRACT/)
  assert.match(shared, /blockNumber: session\.head\.number/)
  assert.match(ops, /SHARED_VAULT_IDENTITY_AND_GETTERS_MATCHED/)
  assert.match(ops, /TIME_TX1_IDENTITY_NOT_VERIFIED/)
  assert.match(ops, /INDEXER_ACTIVITY=/)
  assert.match(ops, /'STALE'/)
  assert.match(ops, /CATALOG_UNAVAILABLE/)
  assert.match(ops, /I1 \+ DERIVED GETTERS PASS/)
  assert.match(ops, /revision\.current/)
  assert.match(ops, /routeKey/)
  assert.match(ops, /DisabledAction id="ops-resolver-disabled"/)
  assert.doesNotMatch(ops, /\.writeContract\s*\(|\.simulateContract\s*\(/)
  assert.doesNotMatch(ops, /SIGNED_TX2_VERIFIED|FULL_HISTORY_VERIFIED|EARNED_TX2_VERIFIED/)
})
