import { decodeEventLog, decodeFunctionData, isAddress, keccak256, zeroHash } from 'viem'
import type { Hash, Transaction, TransactionReceipt } from 'viem'
import {
  approvedTermsHash, assertVerifiedFujiDeployment, classifyVaultRole,
  reserveVaultAbi, verifiedFujiDeployment,
} from '@openreserve/contracts-sdk'
import type { Session } from './customer-chain'

const openedEvent = reserveVaultAbi.find(item => item.type === 'event' && item.name === 'AgreementOpened')!
const MAX_UINT64 = (1n << 64n) - 1n
const MAX_UINT256 = (1n << 256n) - 1n
const LOG_RANGE = 100n // Fuji public RPC accepts at most 100 inclusive blocks per getLogs request.
const LOG_WINDOW_TIMEOUT_MS = 12_000
const LOG_SCAN_TIMEOUT_MS = 60_000
const LOG_MAX_WINDOWS = 1_000n
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
const sameHex = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
const bytes32 = (value: string): value is Hash => /^0x[0-9a-fA-F]{64}$/.test(value) && value.toLowerCase() !== zeroHash

export const GYM_CHAIN_WRITES_ENABLED = false as boolean
export type GymIntent =
  | { type: 'proposeSession'; agreementId: bigint; sessionId: Hash; evidenceHash: Hash }
  | { type: 'proposeTime'; agreementId: bigint; from: bigint; to: bigint; evidenceHash: Hash }
  | { type: 'finalizeClaim'; agreementId: bigint; claimId: bigint }
  | { type: 'claimEarned'; agreementId: bigint }

export type GymPage = 'overview' | 'agreements' | 'detail' | 'claim' | 'payouts' | 'fixture' | 'not-found'
export type GymRoute = { page: GymPage; id?: bigint; reason?: string }

export function parseGymId(value: string | null | undefined): bigint | undefined {
  if (!value || !/^[1-9][0-9]{0,77}$/.test(value)) return
  const id = BigInt(value)
  return id <= MAX_UINT256 ? id : undefined
}

export function parseGymRoute(path: string, search = ''): GymRoute {
  if (path === '/gym') return { page: 'overview' }
  if (path === '/gym/agreements') return { page: 'agreements' }
  if (path === '/gym/agreements/OR-024') return { page: 'fixture' }
  const detail = /^\/gym\/agreements\/([^/]+)$/.exec(path)
  if (detail) {
    const id = parseGymId(detail[1])
    return id ? { page: 'detail', id } : { page: 'not-found', reason: 'Mã hợp đồng không hợp lệ.' }
  }
  const searchId = parseGymId(new URLSearchParams(search).get('agreementId'))
  if (path === '/gym/claims/new') return searchId
    ? { page: 'claim', id: searchId }
    : { page: 'claim', reason: 'Chọn hợp đồng hợp lệ trước khi tạo đề nghị.' }
  if (path === '/gym/payouts') {
    const params = new URLSearchParams(search)
    if (params.has('agreementId') && !searchId) {
      return { page: 'not-found', reason: 'Mã hợp đồng để giải ngân không hợp lệ.' }
    }
    return { page: 'payouts', id: searchId }
  }
  return { page: 'not-found', reason: 'Đường dẫn Gym không tồn tại.' }
}

/** Only the merchant for a particular Vault agreement may attempt a Gym action. */
export function assertGymMerchant(account: string, merchant: string, chainId: number): void {
  if (chainId !== 43113 || !isAddress(account) || !isAddress(merchant) || !same(account, merchant)) {
    throw new Error('UNAUTHORIZED · Cần đúng ví chủ gym trên Fuji.')
  }
}

/** Confirms actual deployed Vault runtime, not just a browser route or a configured wallet name. */
export async function verifyGymDeployment(session: Session): Promise<void> {
  if (session.chain.id !== 43113 || !same(session.vault, verifiedFujiDeployment.vault)) {
    throw new Error('NOT_VERIFIED · Chỉ hỗ trợ Vault Fuji đã được nghiệm thu.')
  }
  const [token, resolver, code] = await Promise.all([
    session.publicClient.readContract({ ...session.read, functionName: 'token' }),
    session.publicClient.readContract({ ...session.read, functionName: 'resolver' }),
    session.publicClient.getCode({ address: session.vault, blockNumber: session.head.number }),
  ])
  if (!code) throw new Error('NOT_VERIFIED · Không tìm thấy mã Vault tại block đã ghim.')
  assertVerifiedFujiDeployment({
    chainId: session.chain.id, vault: session.vault, token, resolver,
    deploymentBlock: session.fromBlock, runtimeCodeHash: keccak256(code),
  })
}

type AgreementRecord = {
  agreement: { buyer: string; merchant: string; termsHash: string; policy: number; state: number }
}

/** Read a single bounded 100-block window, without RPC retries or signing.
 * A timeout may leave the provider's underlying request in flight; its result is
 * intentionally ignored, and no partially collected history can be returned.
 */
export async function readMerchantLogWindow(
  session: Session, from: bigint, to: bigint, timeoutMs = LOG_WINDOW_TIMEOUT_MS,
) {
  if (from < session.fromBlock || to > session.head.number || to < from ||
      to - from + 1n > LOG_RANGE ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > LOG_WINDOW_TIMEOUT_MS) {
    throw new Error('INCOMPLETE_LOG_READ · Khoảng block hoặc timeout không hợp lệ.')
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const logs = await Promise.race([
      session.publicClient.getLogs({
        address: session.vault, event: openedEvent, args: { merchant: session.account },
        fromBlock: from, toBlock: to, strict: true,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('LOG_WINDOW_TIMEOUT')), timeoutMs)
      }),
    ])
    if (!Array.isArray(logs)) throw new Error('LOG_WINDOW_MALFORMED')
    return logs
  } catch {
    throw new Error('INCOMPLETE_LOG_READ · Không thể xác minh toàn bộ nhật ký hợp đồng Gym.')
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * Every pinned block window must return successfully before a verified list is shown.
 * A failing/malformed or partial scan is an error, never an empty agreement list.
 * The total scan is time- and request-bounded; refusing an oversized history
 * preserves NOT_VERIFIED instead of presenting an unverified empty list.
 */
export async function discoverMerchantAgreements<T extends AgreementRecord>(
  session: Session,
  readAgreement: (session: Session, id: bigint) => Promise<T>,
): Promise<{ headBlock: bigint; agreements: Array<{ id: bigint; data: T }> }> {
  if (session.chain.id !== 43113 || !isAddress(session.account) ||
      !same(session.vault, verifiedFujiDeployment.vault) ||
      session.fromBlock !== verifiedFujiDeployment.deploymentBlock ||
      session.fromBlock > session.head.number) {
    throw new Error('NOT_VERIFIED · Sai mạng hoặc khoảng block của Vault.')
  }
  const requiredWindows = (session.head.number - session.fromBlock) / LOG_RANGE + 1n
  if (requiredWindows > LOG_MAX_WINDOWS) {
    throw new Error('INCOMPLETE_LOG_READ · Lịch sử vượt giới hạn số truy vấn cho phép.')
  }
  const scanDeadline = Date.now() + LOG_SCAN_TIMEOUT_MS
  const ids: bigint[] = []
  const seen = new Set<string>()
  let nextFrom = session.fromBlock
  for (let from = session.fromBlock; from <= session.head.number; from += LOG_RANGE) {
    const to = from + LOG_RANGE - 1n < session.head.number ? from + LOG_RANGE - 1n : session.head.number
    if (from !== nextFrom) throw new Error('INCOMPLETE_LOG_READ · Khoảng block bị gián đoạn.')
    const remainingMs = scanDeadline - Date.now()
    if (remainingMs <= 0) throw new Error('INCOMPLETE_LOG_READ · Quá thời gian đọc toàn bộ lịch sử.')
    const logs = await readMerchantLogWindow(session, from, to, Math.min(LOG_WINDOW_TIMEOUT_MS, remainingMs))
    for (const log of logs) {
      const args = 'args' in log ? log.args : undefined
      if (!args || !('agreementId' in args) || typeof args.agreementId !== 'bigint' ||
          !('merchant' in args) || typeof args.merchant !== 'string' ||
          !same(args.merchant, session.account) ||
          !('address' in log) || typeof log.address !== 'string' ||
          !same(log.address, session.vault) ||
          typeof log.blockNumber !== 'bigint' || log.blockNumber < from || log.blockNumber > to ||
          ('removed' in log && log.removed === true) ||
          args.agreementId < 1n || args.agreementId > MAX_UINT256) {
        throw new Error('INVALID_MERCHANT_LOG · Không thể xác minh nguồn log.')
      }
      const key = args.agreementId.toString()
      if (seen.has(key)) throw new Error('DUPLICATE_MERCHANT_LOG · Nhật ký hợp đồng bị trùng.')
      seen.add(key)
      ids.push(args.agreementId)
    }
    nextFrom = to + 1n
  }
  if (nextFrom !== session.head.number + 1n) {
    throw new Error('INCOMPLETE_LOG_READ · Lịch sử chưa được quét đầy đủ.')
  }
  const agreements = await Promise.all(ids.map(async id => {
    const data = await readAgreement(session, id)
    if (!same(data.agreement.merchant, session.account) ||
        data.agreement.termsHash.toLowerCase() !== approvedTermsHash.toLowerCase() ||
        classifyVaultRole(session.account, data.agreement.buyer as `0x${string}`,
          data.agreement.merchant as `0x${string}`, verifiedFujiDeployment.resolver) !== 'merchant') {
      throw new Error('NOT_VERIFIED · Log không khớp chủ sở hữu hoặc terms trên Vault.')
    }
    return { id, data }
  }))
  return { headBlock: session.head.number, agreements }
}

/**
 * Read a single Vault agreement at one pinned block without merchant-history
 * discovery. The direct record NEVER certifies a complete merchant list.
 * The optional verifier is only for deterministic isolated unit tests;
 * production calls use verifyGymDeployment and the accepted Fuji hash.
 */
type DirectAgreementRecord = AgreementRecord & {
  agreementId: bigint; chainId: number; vault: string; blockNumber: bigint;
  account: string; role: string; source: string
}
export async function readDirectGymAgreement<T extends DirectAgreementRecord>(
  session: Session, id: bigint | undefined,
  readAgreement: (session: Session, id: bigint) => Promise<T>,
  verifyDeployment: (session: Session) => Promise<void> = verifyGymDeployment,
): Promise<{ id: bigint; headBlock: bigint; data: T }> {
  if (typeof id !== 'bigint' || id < 1n || id > MAX_UINT256) {
    throw new Error('NOT_VERIFIED · Mã hợp đồng không hợp lệ.')
  }
  if (session.chain.id !== 43113 || !isAddress(session.account) ||
      !same(session.vault, verifiedFujiDeployment.vault) ||
      session.fromBlock !== verifiedFujiDeployment.deploymentBlock ||
      session.head.number < session.fromBlock ||
      (session.merchant !== undefined && !same(session.account, session.merchant))) {
    throw new Error('NOT_VERIFIED · Sai chain, Vault hoặc ví merchant cấu hình.')
  }
  await verifyDeployment(session)
  const data = await readAgreement(session, id)
  if (data.agreementId !== id || data.chainId !== session.chain.id ||
      data.blockNumber !== session.head.number || !same(data.vault, session.vault) ||
      !same(data.account, session.account) || data.source !== 'VAULT_READ_CONTRACT' ||
      data.role !== 'merchant' || !isAddress(data.agreement.buyer) ||
      !isAddress(data.agreement.merchant) ||
      !same(data.agreement.merchant, session.account) ||
      data.agreement.termsHash.toLowerCase() !== approvedTermsHash.toLowerCase() ||
      classifyVaultRole(session.account, data.agreement.buyer as `0x${string}`,
        data.agreement.merchant as `0x${string}`, verifiedFujiDeployment.resolver) !== 'merchant') {
    throw new Error('NOT_VERIFIED · Agreement ID, merchant, terms hoặc nguồn Vault không khớp.')
  }
  return { id, headBlock: session.head.number, data }
}

export function validateGymIntent(intent: GymIntent): void {
  if (intent.agreementId < 1n || intent.agreementId > MAX_UINT256) {
    throw new Error('Mã hợp đồng không hợp lệ.')
  }
  if (intent.type === 'proposeSession') {
    if (!bytes32(intent.sessionId) || !bytes32(intent.evidenceHash)) {
      throw new Error('Cần session ID và evidence hash 32-byte khác zero.')
    }
  } else if (intent.type === 'proposeTime') {
    if (!bytes32(intent.evidenceHash) || intent.from < 0n || intent.to > MAX_UINT64 ||
        intent.from >= intent.to) {
      throw new Error('Khoảng thời gian hoặc evidence hash không hợp lệ.')
    }
  } else if (intent.type === 'finalizeClaim') {
    if (intent.claimId < 1n || intent.claimId > MAX_UINT256) throw new Error('Claim ID không hợp lệ.')
  }
}

export function checkGymActionState(intent: GymIntent, agreement: {
  policy: number; state: number; merchant: string; challengedSessionClaimId: bigint;
  sessionsConsumed: number; liveClaims: bigint; startAt: bigint; endAt: bigint
}, balances: readonly bigint[], headTime: bigint, claim?: { state: number; challengeEndsAt: bigint }): void {
  validateGymIntent(intent)
  if (intent.type === 'claimEarned') {
    if ((balances[1] ?? 0n) <= 0n) throw new Error('Vault chưa có khoản earned có thể rút.')
    return
  }
  if (agreement.state !== 1) throw new Error('Hợp đồng không ở trạng thái OPEN.')
  if (intent.type === 'proposeSession') {
    if (agreement.policy !== 0 || BigInt(agreement.sessionsConsumed) + agreement.liveClaims >= 10n) {
      throw new Error('Gói không phải PT hoặc không còn suất đề xuất.')
    }
  } else if (intent.type === 'proposeTime') {
    if (agreement.policy !== 1 || intent.from < agreement.startAt || intent.to > agreement.endAt ||
        intent.to > headTime) {
      throw new Error('TIME_ACCESS phải thuộc thời hạn và đã trôi qua.')
    }
  } else if (intent.type === 'finalizeClaim') {
    if (!claim || (agreement.policy === 0
      ? claim.state !== 2 || agreement.challengedSessionClaimId !== 0n
      : agreement.policy !== 1 || claim.state !== 1 || headTime < claim.challengeEndsAt)) {
      throw new Error('Claim chưa đủ điều kiện finalize hoặc đang tranh chấp.')
    }
  }
}

/** Simulates against pinned RPC state only. Never asks the wallet to sign or sends a transaction. */
export async function simulateGymIntent(session: Session, intent: GymIntent): Promise<void> {
  validateGymIntent(intent)
  await verifyGymDeployment(session)
  const [agreement, balances, termination] = await Promise.all([
    session.publicClient.readContract({ ...session.read, functionName: 'getAgreement', args: [intent.agreementId] }),
    session.publicClient.readContract({ ...session.read, functionName: 'getBalances', args: [intent.agreementId] }),
    session.publicClient.readContract({ ...session.read, functionName: 'getActiveTerminationId', args: [intent.agreementId] }),
  ])
  assertGymMerchant(session.account, agreement.merchant, session.chain.id)
  if (termination !== 0n && (intent.type === 'proposeSession' || intent.type === 'proposeTime')) {
    throw new Error('Có đề nghị chấm dứt đang mở; chưa thể tạo claim.')
  }
  const claim = intent.type === 'finalizeClaim'
    ? await session.publicClient.readContract({ ...session.read, functionName: 'getClaim',
      args: [intent.agreementId, intent.claimId] }) : undefined
  checkGymActionState(intent, agreement, balances, session.head.timestamp, claim)
  if ((await session.publicClient.getBalance({ address: session.account, blockNumber: session.head.number })) === 0n) {
    throw new Error('Ví chủ gym thiếu AVAX testnet để trả gas.')
  }
  const common = { address: session.vault, abi: reserveVaultAbi, account: session.account,
    blockNumber: session.head.number } as const
  switch (intent.type) {
    case 'proposeSession':
      await session.publicClient.simulateContract({ ...common, functionName: 'proposeSession',
        args: [intent.agreementId, intent.sessionId, intent.evidenceHash] }); break
    case 'proposeTime':
      await session.publicClient.simulateContract({ ...common, functionName: 'proposeTime',
        args: [intent.agreementId, intent.from, intent.to, intent.evidenceHash] }); break
    case 'finalizeClaim':
      await session.publicClient.simulateContract({ ...common, functionName: 'finalizeClaim',
        args: [intent.agreementId, intent.claimId] }); break
    case 'claimEarned':
      await session.publicClient.simulateContract({ ...common, functionName: 'claimEarned',
        args: [intent.agreementId] }); break
  }
}

export function refuseGymBroadcast(): never {
  throw new Error('FUJI_WRITE_BLOCKED · Cần Owner GO, Wallet 1 và Reviewer 2 trước khi kích hoạt ký/gửi.')
}

export type GymVerifiedEvent = { name: string; claimId?: bigint; amount?: bigint }

/** Receipt success alone is not proof: verify transaction to/from/input and Vault event. */
export function verifyGymBusinessReceipt(
  hash: Hash, vault: string, merchant: string, intent: GymIntent,
  receipt: TransactionReceipt, tx: Transaction,
): GymVerifiedEvent {
  validateGymIntent(intent)
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash) || !same(receipt.transactionHash, hash) ||
      !same(tx.hash, hash) || receipt.status !== 'success' ||
      typeof receipt.blockNumber !== 'bigint' || receipt.blockNumber < 0n ||
      !tx.to || !same(tx.to, vault) || !same(tx.from, merchant)) {
    throw new Error('RECEIPT_MISMATCH · Hash, status, from/to hoặc block không khớp.')
  }
  let decoded: ReturnType<typeof decodeFunctionData>
  try { decoded = decodeFunctionData({ abi: reserveVaultAbi, data: tx.input }) }
  catch { throw new Error('TRANSACTION_MISMATCH · Không đọc được lời gọi Vault.') }
  if (decoded.functionName !== intent.type || !decoded.args ||
      BigInt(decoded.args[0] as bigint) !== intent.agreementId) {
    throw new Error('TRANSACTION_MISMATCH · Sai hàm hoặc agreement ID.')
  }
  if (intent.type === 'proposeSession' &&
      (!sameHex(decoded.args[1] as string, intent.sessionId) || !sameHex(decoded.args[2] as string, intent.evidenceHash)) ||
      intent.type === 'proposeTime' &&
      (decoded.args[1] !== intent.from || decoded.args[2] !== intent.to || !sameHex(decoded.args[3] as string, intent.evidenceHash)) ||
      intent.type === 'finalizeClaim' && decoded.args[1] !== intent.claimId ||
      intent.type === 'claimEarned' && decoded.args.length !== 1) {
    throw new Error('TRANSACTION_MISMATCH · Tham số giao dịch không khớp.')
  }
  const expectedEvent = intent.type === 'claimEarned' ? 'EarnedClaimed'
    : intent.type === 'finalizeClaim' ? 'ClaimFinalized' : 'ClaimProposed'
  for (const log of receipt.logs) {
    if (!same(log.address, vault)) continue
    try {
      const event = decodeEventLog({ abi: reserveVaultAbi, topics: log.topics, data: log.data, strict: true })
      if (event.eventName !== expectedEvent || !('agreementId' in event.args) ||
          event.args.agreementId !== intent.agreementId) continue
      if (intent.type === 'proposeSession' || intent.type === 'proposeTime') {
        if (event.eventName !== 'ClaimProposed' || !('claimId' in event.args) ||
            !('sessionId' in event.args) || !('evidenceHash' in event.args) ||
            !('from' in event.args) || !('to' in event.args) ||
            typeof event.args.claimId !== 'bigint' || event.args.claimId < 1n ||
            !sameHex(event.args.evidenceHash as string, intent.evidenceHash)) continue
        if (intent.type === 'proposeSession' &&
            (!sameHex(event.args.sessionId as string, intent.sessionId) || event.args.from !== 0n || event.args.to !== 0n)) continue
        if (intent.type === 'proposeTime' &&
            (!sameHex(event.args.sessionId as string, zeroHash) || event.args.from !== intent.from || event.args.to !== intent.to)) continue
        return { name: expectedEvent, claimId: event.args.claimId }
      }
      if (intent.type === 'finalizeClaim') {
        if (event.eventName !== 'ClaimFinalized' || !('claimId' in event.args) ||
            event.args.claimId !== intent.claimId) continue
        return { name: expectedEvent }
      }
      if (event.eventName === 'EarnedClaimed' && 'merchant' in event.args &&
          'amount' in event.args && typeof event.args.merchant === 'string' &&
          same(event.args.merchant, merchant) && typeof event.args.amount === 'bigint' &&
          event.args.amount > 0n) return { name: expectedEvent, amount: event.args.amount }
    } catch { /* Ignore unrelated or malformed logs; never call them business proof. */ }
  }
  throw new Error('EVENT_MISMATCH · Receipt thành công nhưng thiếu sự kiện Vault đúng nghiệp vụ.')
}

/** For separately authorized transaction evidence only: still no signing/broadcast. */
export async function verifyExistingGymHashAndRefresh<T>(args: {
  hash: Hash
  vault: string
  merchant: string
  before: { account: string; chainId: number; vault: string }
  intent: GymIntent
  waitForReceipt: () => Promise<TransactionReceipt>
  getTransaction: () => Promise<Transaction>
  refresh: () => Promise<{ account: string; chainId: number; vault: string; headBlock: bigint; data: T }>
}): Promise<{ verified: GymVerifiedEvent; data?: T; refreshError?: string }> {
  if (args.before.chainId !== 43113 || !same(args.vault, verifiedFujiDeployment.vault) ||
      !same(args.before.vault, args.vault) || !same(args.before.account, args.merchant)) {
    throw new Error('NOT_VERIFIED · Transaction evidence requires accepted Fuji Vault and merchant identity.')
  }
  const receipt = await args.waitForReceipt()
  const tx = await args.getTransaction()
  const verified = verifyGymBusinessReceipt(args.hash, args.vault, args.merchant, args.intent, receipt, tx)
  try {
    const fresh = await args.refresh()
    // Same fail-closed identity/head rule as D18-07 receipt-check; kept here to
    // support Node strip-types unit tests without extensionless runtime imports.
    if (!same(args.before.account, fresh.account) ||
        !same(args.before.vault, fresh.vault) ||
        args.before.chainId !== fresh.chainId || fresh.headBlock < receipt.blockNumber) {
      throw new Error('Wallet, chain or RPC head changed after receipt.')
    }
    return { verified, data: fresh.data }
  } catch (error) {
    return { verified, refreshError: error instanceof Error ? error.message : 'Không thể làm mới Vault.' }
  }
}
