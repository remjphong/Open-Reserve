import { classifyPtBalances, wallet1PtReport, type FinancialView } from './customer-pt-proof'

/**
 * Accepted report provenance only, NOT a substitute for a new RPC read.
 * D18-05 TX1 was accepted from Owner-provided cast receipt/getBalances evidence
 * and reviewed by Wallet2. No TX2/TX3/refund attestation is included here.
 */
export const wallet2TimeDepositReport = {
  chainId: 43113,
  agreementId: 2n,
  policy: 1,
  hash: '0xdb4c9d91f1895c88e719cb1062db8a61cd096c00e5bf75e58b70bf389808ae85',
  block: 61380299n,
  amount: 900n, // historical deposit only; NEVER a current Vault balance
  startAt: 1795182500n,
  endAt: 1795182770n,
  challengeWindow: 60n,
  provenance: 'USER_PROVIDED_CAST_RECEIPT_AND_RPC_STATE + WALLET2_REPORTED_VERIFIED',
} as const

export const gymKnownEvidence = {
  1: {
    policy: 0,
    label: 'PT · Agreement #1',
    provenance: 'WALLET1_REPORTED_RECEIPTS_VERIFIED',
    reportedTx: wallet1PtReport,
  },
  2: {
    policy: 1,
    label: 'TIME_ACCESS · Agreement #2',
    provenance: wallet2TimeDepositReport.provenance,
    reportedTx: [{ step: 'Nạp TIME_ACCESS', method: 'openAgreement', role: 'buyer',
      hash: wallet2TimeDepositReport.hash, block: wallet2TimeDepositReport.block }],
  },
} as const

export function knownGymAgreement(id: bigint, policy: number) {
  if (id !== 1n && id !== 2n) return { status: 'OTHER' as const }
  const expected = id === 1n ? gymKnownEvidence[1] : gymKnownEvidence[2]
  if (expected.policy !== policy) return { status: 'POLICY_MISMATCH' as const }
  return { status: 'KNOWN' as const, evidence: expected }
}

/**
 * Verifies the relationship of financial getters at the pinned current block.
 * Historical reported PT amounts are only a comparator, never live fallbacks.
 */
export function assessGymLedger(id: bigint, policy: number, ledger: FinancialView) {
  const source = knownGymAgreement(id, policy)
  const conserved = classifyPtBalances(ledger)
  const valid = conserved.valid && source.status !== 'POLICY_MISMATCH' &&
    ledger.withdrawable <= ledger.remainingLocked &&
    ledger.refundable <= ledger.remainingLocked &&
    ledger.disputedLocked + ledger.withdrawable + ledger.refundable <= ledger.remainingLocked
  const ptMatchesReportedSnapshot = source.status === 'KNOWN' && id === 1n
    ? ledger.deposited === 1003n && ledger.earnedFinalized === 100n &&
      ledger.gymWithdrawn === 100n && ledger.remainingLocked === 903n
    : undefined
  return {
    valid, source,
    ptMatchesReportedSnapshot,
    buyerMayClaimRefund: valid && ledger.refundable > 0n,
    merchantMayClaimEarned: valid && ledger.withdrawable > 0n,
  }
}
