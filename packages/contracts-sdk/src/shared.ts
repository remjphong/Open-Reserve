import type { Address, SupportedChainId } from './index.js'

export type VaultActorRole = 'buyer' | 'merchant' | 'resolver' | 'observer'
export type ReceiptPhase = 'IDLE' | 'PENDING' | 'CONFIRMED' | 'ERROR'

export type IndexerActivityStatus =
  | 'NOT_CONFIGURED'
  | 'NOT_IMPLEMENTED'
  | 'FRESH'
  | 'STALE'
  | 'DOWN'
  | 'INVALID_RESPONSE'

function checkedId(id: bigint): string {
  if (id < 1n || id >= 2n ** 256n) {
    throw new Error('Invalid agreement ID')
  }
  return id.toString()
}

function prefix(chainId: SupportedChainId, vault: Address) {
  return ['vault', chainId, vault.toLowerCase()] as const
}

export const queryKeys = {
  agreement: (chainId: SupportedChainId, vault: Address, id: bigint) =>
    [...prefix(chainId, vault), 'agreement', checkedId(id)] as const,

  balances: (chainId: SupportedChainId, vault: Address, id: bigint) =>
    [...prefix(chainId, vault), 'balances', checkedId(id)] as const,

  events: (chainId: SupportedChainId, vault: Address, id: bigint) =>
    [...prefix(chainId, vault), 'events', checkedId(id)] as const,

  sync: (chainId: SupportedChainId, vault: Address) =>
    [...prefix(chainId, vault), 'sync'] as const,
}

export function classifyVaultRole(
  account: Address,
  buyer: Address,
  merchant: Address,
  resolver: Address,
): VaultActorRole {
  const selected = account.toLowerCase()
  if (selected === buyer.toLowerCase()) return 'buyer'
  if (selected === merchant.toLowerCase()) return 'merchant'
  if (selected === resolver.toLowerCase()) return 'resolver'
  return 'observer'
}
