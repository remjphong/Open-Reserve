import { getAddress, isAddress, keccak256, zeroAddress, type Hash } from 'viem'
import {
  approvedTermsHash, assertVerifiedFujiDeployment,
  classifyVaultRole, queryKeys, verifiedFujiDeployment,
  type ReceiptPhase,
} from '@openreserve/contracts-sdk'
import {
  readPass, sameAddress, walletSession, type Session,
} from './customer-chain'
import { readIndexedActivity } from './indexer-client'
import { confirmReceiptAndRefresh, assertFreshReadContext } from './receipt-check'

function verifiedAddress(value: string | undefined, label: string) {
  if (!value || !isAddress(value) || value.toLowerCase() === zeroAddress) {
    throw new Error('NOT_VERIFIED · Chưa cấu hình địa chỉ ' + label + ' từ deployment evidence.')
  }
  return getAddress(value)
}

/**
 * The Vault is authoritative for all amounts.
 * The indexer is used only for activity and freshness metadata.
 * No signing is performed.
 */
export async function readSharedAgreement(
  session: Session,
  agreementId: bigint,
) {
  if (agreementId < 1n || agreementId >= 2n ** 256n) {
    throw new Error('Mã hợp đồng không hợp lệ.')
  }

  const expectedToken = session.chain.id === 43113
    ? verifiedFujiDeployment.token
    : verifiedAddress(import.meta.env.VITE_VERIFIED_TOKEN_ADDRESS, 'Token')
  const expectedResolver = session.chain.id === 43113
    ? verifiedFujiDeployment.resolver
    : verifiedAddress(import.meta.env.VITE_VERIFIED_RESOLVER_ADDRESS, 'Resolver')

  const [pass, token, resolver, runtimeCode] = await Promise.all([
    readPass(session, agreementId),
    session.publicClient.readContract({
      ...session.read, functionName: 'token',
    }),
    session.publicClient.readContract({
      ...session.read, functionName: 'resolver',
    }),
    session.publicClient.getCode({
      address: session.vault,
      blockNumber: session.head.number,
    }),
  ])

  if (!sameAddress(token, expectedToken) ||
      !sameAddress(resolver, expectedResolver)) {
    throw new Error('NOT_VERIFIED · Token hoặc Resolver không khớp deployment evidence.')
  }

  if (session.chain.id === 43113) {
    if (!runtimeCode) {
      throw new Error('NOT_VERIFIED · Fuji Vault runtime missing.')
    }

    assertVerifiedFujiDeployment({
      chainId: session.chain.id,
      vault: session.vault,
      token,
      resolver,
      deploymentBlock: session.fromBlock,
      runtimeCodeHash: keccak256(runtimeCode),
    })
  }

  if (pass.agreement.termsHash.toLowerCase() !== approvedTermsHash.toLowerCase()) {
    throw new Error('NOT_VERIFIED · Agreement sử dụng terms hash chưa được duyệt.')
  }

  const [remainingLocked, withdrawable, refundable, disputedLocked, unallocated] = pass.balances

  const ledger = {
    deposited: pass.agreement.deposited,
    earnedFinalized: pass.agreement.earnedFinalized,
    gymWithdrawn: pass.agreement.gymWithdrawn,
    refundAuthorized: pass.agreement.refundAuthorized,
    buyerRefunded: pass.agreement.buyerRefunded,
    remainingLocked,
    withdrawable,
    refundable,
    disputedLocked,
    unallocated,
  }

  const activity = await readIndexedActivity({
    chainId: session.chain.id,
    vault: session.vault,
    headBlock: session.head.number,
  }, agreementId, import.meta.env.VITE_INDEXER_BASE_URL)

  return {
    agreementId,
    chainId: session.chain.id,
    vault: session.vault,
    blockNumber: session.head.number,
    account: session.account,
    role: classifyVaultRole(
      session.account, pass.agreement.buyer,
      pass.agreement.merchant, resolver,
    ),
    source: 'VAULT_READ_CONTRACT' as const,
    queryKey: queryKeys.agreement(session.chain.id, session.vault, agreementId),
    balanceQueryKey: queryKeys.balances(session.chain.id, session.vault, agreementId),
    activityQueryKey: queryKeys.events(session.chain.id, session.vault, agreementId),
    agreement: pass.agreement,
    balances: pass.balances,
    ledger,
    claims: pass.claims,
    activity,
  }
}

/**
 * A confirmed receipt is required before refreshing; the refreshed block
 * must not precede its inclusion block. Refresh failure remains explicit.
 * No wallet signing or transaction submission occurs in this helper.
 */
export async function refreshAfterConfirmedReceipt(
  session: Session,
  agreementId: bigint,
  hash: Hash,
  onPhase?: (phase: ReceiptPhase) => void,
) {
  return confirmReceiptAndRefresh({
    hash,
    onPhase,
    waitForReceipt: () => session.publicClient.waitForTransactionReceipt({
      hash, timeout: 90000,
    }),
    refresh: async receipt => {
      const fresh = await walletSession()
      assertFreshReadContext(
        { account: session.account, chainId: session.chain.id, vault: session.vault },
        {
          account: fresh.account,
          chainId: fresh.chain.id,
          vault: fresh.vault,
          headBlock: fresh.head.number,
        },
        receipt.blockNumber,
      )
      return readSharedAgreement(fresh, agreementId)
    },
  })
}
