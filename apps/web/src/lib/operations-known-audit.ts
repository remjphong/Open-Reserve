import { approvedTermsHash, verifiedFujiDeployment } from '@openreserve/contracts-sdk'

/**
 * Reviewed reference identities for known Fuji agreements.
 * These are cross-portal identity checks, NOT sources of current monetary amounts.
 * Only readSharedAgreement/pinned Vault getter values may supply balances.
 */
export const knownOperations = [
  { id: 1n, policy: 0, label: 'PT · Agreement #1' },
  { id: 2n, policy: 1, label: 'TIME_ACCESS · Agreement #2' },
] as const

export const reviewedParties = {
  buyer: '0x124C7DE92Df945477cAEbdC6745756C4B29e7b7B',
  merchant: '0xA337FCeC5f9508C3Ab5E10aE571610E167548878',
} as const

export const reviewedTimeTx1 = {
  agreementId: 2n,
  hash: '0xdb4c9d91f1895c88e719cb1062db8a61cd096c00e5bf75e58b70bf389808ae85',
  blockNumber: 61380299n,
  deposited: 900n,
  startAt: 1795182500n,
  endAt: 1795182770n,
  challengeWindow: 60n,
  provenance: 'USER_PROVIDED_CAST_RECEIPT_AND_RPC_STATE + WALLET2_REPORTED_VERIFIED',
} as const

export type KnownOperationsSnapshot = {
  agreementId: bigint
  chainId: number
  vault: string
  blockNumber: bigint
  source: string
  agreement: {
    buyer: string; merchant: string; termsHash: string; policy: number
    deposited: bigint; earnedFinalized: bigint; gymWithdrawn: bigint
    refundAuthorized: bigint; buyerRefunded: bigint
    startAt: bigint; endAt: bigint; challengeWindow: bigint
  }
  ledger: {
    deposited: bigint; earnedFinalized: bigint; gymWithdrawn: bigint
    refundAuthorized: bigint; buyerRefunded: bigint
    remainingLocked: bigint; withdrawable: bigint; refundable: bigint
    disputedLocked: bigint; unallocated: bigint
  }
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
export type KnownOperationsAudit =
  | { status: 'IDENTITY_AND_LEDGER_MATCHED'; source: 'VAULT_READ_CONTRACT'; id: bigint;
      timeTx1IdentityMatched: boolean | undefined }
  | { status: 'NOT_VERIFIED'; reason: 'UNKNOWN_ID' | 'SOURCE_OR_CHAIN_MISMATCH' |
      'PARTY_OR_TERMS_MISMATCH' | 'POLICY_OR_TIME_TX1_MISMATCH' | 'LEDGER_MISMATCH' }

/**
 * This validates a single pinned shared Vault snapshot for use by any portal.
 * It does not claim separately observed simultaneous Buyer/Merchant/Resolver
 * browser sessions or complete indexed activity.
 */
export function auditKnownOperationsSnapshot(s: KnownOperationsSnapshot): KnownOperationsAudit {
  const known = knownOperations.find(x => x.id === s.agreementId)
  if (!known) return { status: 'NOT_VERIFIED', reason: 'UNKNOWN_ID' }
  if (s.chainId !== verifiedFujiDeployment.chainId ||
      !same(s.vault, verifiedFujiDeployment.vault) ||
      s.blockNumber < verifiedFujiDeployment.deploymentBlock ||
      s.source !== 'VAULT_READ_CONTRACT') {
    return { status: 'NOT_VERIFIED', reason: 'SOURCE_OR_CHAIN_MISMATCH' }
  }
  const a = s.agreement
  const l = s.ledger
  if (!same(a.buyer, reviewedParties.buyer) ||
      !same(a.merchant, reviewedParties.merchant) ||
      !same(a.termsHash, approvedTermsHash)) {
    return { status: 'NOT_VERIFIED', reason: 'PARTY_OR_TERMS_MISMATCH' }
  }
  if (a.policy !== known.policy ||
      (s.agreementId === reviewedTimeTx1.agreementId &&
        (a.deposited !== reviewedTimeTx1.deposited ||
          a.startAt !== reviewedTimeTx1.startAt ||
          a.endAt !== reviewedTimeTx1.endAt ||
          a.challengeWindow !== reviewedTimeTx1.challengeWindow))) {
    return { status: 'NOT_VERIFIED', reason: 'POLICY_OR_TIME_TX1_MISMATCH' }
  }
  const monetary = [
    l.deposited, l.earnedFinalized, l.gymWithdrawn, l.refundAuthorized,
    l.buyerRefunded, l.remainingLocked, l.withdrawable, l.refundable,
    l.disputedLocked, l.unallocated,
  ]
  if (monetary.some(v => v < 0n) ||
      a.deposited !== l.deposited ||
      a.earnedFinalized !== l.earnedFinalized ||
      a.gymWithdrawn !== l.gymWithdrawn ||
      a.refundAuthorized !== l.refundAuthorized ||
      a.buyerRefunded !== l.buyerRefunded ||
      l.gymWithdrawn > l.earnedFinalized ||
      l.buyerRefunded > l.refundAuthorized ||
      l.earnedFinalized + l.refundAuthorized > l.deposited ||
      l.gymWithdrawn + l.buyerRefunded > l.deposited ||
      l.remainingLocked !== l.deposited - l.gymWithdrawn - l.buyerRefunded ||
      l.withdrawable !== l.earnedFinalized - l.gymWithdrawn ||
      l.refundable !== l.refundAuthorized - l.buyerRefunded ||
      l.unallocated !== l.deposited - l.earnedFinalized - l.refundAuthorized ||
      l.disputedLocked > l.remainingLocked) {
    return { status: 'NOT_VERIFIED', reason: 'LEDGER_MISMATCH' }
  }
  return {
    status: 'IDENTITY_AND_LEDGER_MATCHED',
    source: 'VAULT_READ_CONTRACT',
    id: s.agreementId,
    timeTx1IdentityMatched: s.agreementId === reviewedTimeTx1.agreementId ? true : undefined,
  }
}

/** All links navigate to known IDs, not inferred results of a full historical scan. */
export function knownPortalPaths(id: bigint) {
  if (id !== 1n && id !== 2n) return
  return {
    customer: '/customer/passes/' + id,
    gym: '/gym/agreements/' + id,
    operations: '/operations/agreements/' + id,
    claim: '/operations/disputes/' + id + '?claimId=1',
  }
}
