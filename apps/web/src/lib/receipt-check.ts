import type { ReceiptPhase } from '@openreserve/contracts-sdk'

export type VerifiedReceipt = {
  transactionHash: `0x${string}`
  status: 'success' | 'reverted'
  blockNumber: bigint
}

type ReadIdentity = { account: string; chainId: number; vault: string }
type FreshReadIdentity = ReadIdentity & { headBlock: bigint }

/** Prevent a wallet or RPC change from being mistaken for refreshed agreement data. */
export function assertFreshReadContext(
  before: ReadIdentity,
  after: FreshReadIdentity,
  receiptBlock: bigint,
): void {
  const equalAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
  if (!equalAddress(before.account, after.account) ||
      !equalAddress(before.vault, after.vault) ||
      before.chainId !== after.chainId ||
      after.headBlock < receiptBlock) {
    throw new Error('Wallet, chain or RPC head changed after receipt.')
  }
}

/**
 * Receipt-only helper with injected reads for independent negative tests.
 * This helper cannot sign or broadcast a transaction.
 * A verified receipt stays CONFIRMED even if the subsequent refresh fails;
 * callers must handle snapshot=undefined and refreshError explicitly.
 */
export async function confirmReceiptAndRefresh<
  TReceipt extends VerifiedReceipt,
  TSnapshot,
>({
  hash, waitForReceipt, refresh, onPhase,
}: {
  hash: `0x${string}`
  waitForReceipt: () => Promise<TReceipt>
  refresh: (receipt: TReceipt) => Promise<TSnapshot>
  onPhase?: (phase: ReceiptPhase) => void
}): Promise<{
  receipt: TReceipt
  snapshot: TSnapshot | undefined
  refreshError: string | undefined
}> {
  onPhase?.('PENDING')
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    onPhase?.('ERROR')
    throw new Error('Invalid transaction hash.')
  }

  let receipt: TReceipt
  try {
    receipt = await waitForReceipt()
  } catch {
    onPhase?.('ERROR')
    throw new Error('Receipt not verified; inspect transaction before retrying · ' + hash)
  }

  if (!receipt || !/^0x[0-9a-fA-F]{64}$/.test(receipt.transactionHash) ||
      receipt.transactionHash.toLowerCase() !== hash.toLowerCase() ||
      typeof receipt.blockNumber !== 'bigint' || receipt.blockNumber < 0n) {
    onPhase?.('ERROR')
    throw new Error('Receipt hash or block mismatched; inspect transaction.')
  }
  if (receipt.status !== 'success') {
    onPhase?.('ERROR')
    throw new Error('Transaction was not successful · ' + hash)
  }

  onPhase?.('CONFIRMED')
  try {
    return { receipt, snapshot: await refresh(receipt), refreshError: undefined }
  } catch (error) {
    return {
      receipt,
      snapshot: undefined,
      refreshError: error instanceof Error ? error.message : 'Refresh failed after confirmed receipt.',
    }
  }
}
