import { decodeFunctionData } from 'viem'
import { reserveVaultAbi } from '@openreserve/contracts-sdk'

/**
 * Source: State Log D18-04, WALLET1_REPORTED_RECEIPTS_VERIFIED.
 * These static hashes are a handoff, NOT live RPC verification on their own.
 * Keep their provenance visible until a user-driven strict read-only check.
 */
export const ptAgreementId = 1n
export const wallet1PtReport = [
  { step: 'Gym đề xuất phiên PT', method: 'proposeSession', role: 'merchant',
    hash: '0x9dcca6c5feda36ef151fa5a7ad5cc9d3e59785432260a2182814989f18eeb01b', block: 61373562n },
  { step: 'Buyer xác nhận phiên PT', method: 'confirmSession', role: 'buyer',
    hash: '0xf90b5d3c9e24827600e3102e1afc36ed1b55889f45ce106ffbeb8eab179f106f', block: 61374892n },
  { step: 'Chốt quyền hưởng của Gym', method: 'finalizeClaim', role: 'either',
    hash: '0xd84107f90027f7e90e3c61bdc74dceb9bc018625c8c291ec7a6973b807488ac5', block: 61375443n },
  { step: 'Gym nhận doanh thu đã chốt', method: 'claimEarned', role: 'merchant',
    hash: '0x4b3f87cb99bc297fb8a57779fbc50c6c3e1f32fc7d0a6a5dc71dae5c84392273', block: 61376149n },
] as const

export type FinancialView = {
  deposited: bigint
  earnedFinalized: bigint
  gymWithdrawn: bigint
  buyerRefunded: bigint
  remainingLocked: bigint
  withdrawable: bigint
  refundable: bigint
  disputedLocked: bigint
  unallocated: bigint
  refundAuthorized: bigint
}

/** A remaining reserve is not a legal or contractual right to refund. */
export function classifyPtBalances(view: FinancialView) {
  const conserved = view.deposited === view.gymWithdrawn + view.buyerRefunded + view.remainingLocked
  const earnedUnwithdrawn = view.earnedFinalized >= view.gymWithdrawn
    ? view.earnedFinalized - view.gymWithdrawn : undefined
  const authorizedUnclaimed = view.refundAuthorized >= view.buyerRefunded
    ? view.refundAuthorized - view.buyerRefunded : undefined
  const valid = conserved && earnedUnwithdrawn !== undefined && authorizedUnclaimed !== undefined &&
    earnedUnwithdrawn === view.withdrawable && authorizedUnclaimed === view.refundable &&
    view.disputedLocked <= view.remainingLocked && view.unallocated <= view.remainingLocked
  return { valid, conserved, earnedUnwithdrawn, authorizedUnclaimed,
    canClaimRefund: valid && view.refundable > 0n }
}

export type ChainReceipt = {
  transactionHash: string
  status: 'success' | 'reverted'
  blockNumber: bigint
  blockHash: string
  to: string | null
}
export type ChainTransaction = { from: string; to: string | null; input: `0x${string}` }
export type ReceiptObservation = {
  receipt: ChainReceipt; transaction: ChainTransaction; canonicalBlockHash: string
}
export type ReceiptReader = (hash: `0x${string}`) => Promise<ReceiptObservation>
export type PtProofResult = {
  status: 'RPC_RECEIPTS_MATCHED' | 'NOT_VERIFIED'
  reason?: string
  checked: number
}

/**
 * Fail closed for changed roles, reorgs, calldata, or incomplete RPC replies.
 * This proves tx shape and successful inclusion at pinned block only;
 * it cannot establish service attendance or consent outside the chain.
 */
export async function verifyWallet1PtReport(
  context: { chainId: number; vault: string; buyer: string; merchant: string; pinnedBlock: bigint },
  read: ReceiptReader,
): Promise<PtProofResult> {
  if (context.chainId !== 43113 || context.pinnedBlock < wallet1PtReport[3].block) {
    return { status: 'NOT_VERIFIED', reason: 'Wrong chain or pinned head precedes reported PT transactions.', checked: 0 }
  }
  let checked = 0
  try {
    for (const item of wallet1PtReport) {
      const observed = await read(item.hash)
      const { receipt, transaction } = observed
      const same = (a: string | null, b: string) =>
        typeof a === 'string' && a.toLowerCase() === b.toLowerCase()
      if (!same(receipt.transactionHash, item.hash) || receipt.status !== 'success' ||
          receipt.blockNumber !== item.block || receipt.blockNumber > context.pinnedBlock ||
          !same(receipt.to, context.vault) || !same(transaction.to, context.vault) ||
          !same(receipt.blockHash, observed.canonicalBlockHash)) {
        throw new Error('Transaction identity, status, pinned inclusion or canonical block mismatch.')
      }
      const roleCorrect = item.role === 'buyer' ? same(transaction.from, context.buyer)
        : item.role === 'merchant' ? same(transaction.from, context.merchant)
          : same(transaction.from, context.buyer) || same(transaction.from, context.merchant)
      if (!roleCorrect) throw new Error('Signer does not match the agreement role.')
      const call = decodeFunctionData({ abi: reserveVaultAbi, data: transaction.input })
      if (call.functionName !== item.method || !call.args || call.args[0] !== ptAgreementId) {
        throw new Error('Calldata does not match approved Agreement #1 operation.')
      }
      checked++
    }
    return { status: 'RPC_RECEIPTS_MATCHED', checked }
  } catch {
    return { status: 'NOT_VERIFIED', reason: 'RPC missing, changed or mismatched PT receipt/transaction.', checked }
  }
}
