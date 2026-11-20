import { hexBytes, keccak256 } from './keccak.js'

// These signatures are taken from the frozen IReserveVault ABI. Changing the ABI is OUT OF SCOPE.
export const FUJI = {
  chainId: 43113,
  vault: '0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad',
  deploymentBlock: 61240386n,
  deploymentTx: '0x120617c50873b2393289c5f292c065a060d565b99f0fc8707d82071cfb179451',
  runtimeHash: '0xec6e91428e146d4e97b0eed09cf4afbdd701c95a64ca8b6b2a696102242db366',
} as const
export const events = {
  AgreementOpened: ['0x4d3e8c0b546a5422c82ec85ad7d38d800a835f9ebcfab93d4d897f836f9e00ac', 4, 6],
  AgreementTerminated: ['0xde60f30a34f756f9838f8587f2d569484fc77939f508b5e386c07d4052d016e2', 4, 3],
  ClaimChallenged: ['0x0ddaecc7f39739a67cfe737891ae5a80c8f83888f5d539a7bdebf23fa4dd79d8', 3, 1],
  ClaimFinalized: ['0x2f03b90e78bc85fa1d0e02d978b87c9954cc7acb65394991d8ba57a5853bcfd1', 3, 1],
  ClaimProposed: ['0xd19b059bd904a7199bd695f5fe1f319d1d61000c3920ead31806b8580cce7163', 4, 6],
  ClaimResolved: ['0x7c5d12fc3b27cd4fd9765efe62a5b5f0aad73aa81f527b2a183393ed7449fc1b', 4, 4],
  EarnedClaimed: ['0x7cdc1c08dd9e56b91b64a7e2a81160f58efde8c2d73a6d0497fad7b3d9c41f1e', 3, 1],
  RefundClaimed: ['0xf3f402280ef0a7905e124aa621b65eaeb2725c343e8b36d398ed78c29daf285c', 3, 1],
  SessionConfirmed: ['0x41e7038338bc3e7f274aea7176ab3993f89a629897ca347d52db7cfc14d3bc33', 3, 0],
  SessionProposalCancelled: ['0xde9b4e946da61b0e0a350ec0179144d60fe24edfd300d803fb6ac61971e40272', 4, 1],
  TerminationCancelled: ['0xcfb914aa6cb15caedb358dc3bde4a88e970bbdc99f855956ffce9aa4250e23e1', 3, 0],
  TerminationDisputed: ['0x81a9c9cc30d84abd171a7af1c680f57227ce235259169f3c9a6c00cd0d0955f4', 3, 1],
  TerminationProposed: ['0x24651a3c02a93289749a449096862e97fe21c0a8b523af4f7c9bf11201948f94', 4, 2],
  TerminationRefundAuthorized: ['0xcea2f91ce206842b28942f9a9dca3e072081ec1980818b9cfdb83920f5e0d838', 4, 3],
} as const
export type EventName = keyof typeof events
const signatureToEvent = new Map<string, EventName>(Object.entries(events).map(([name, [signature]]): [string, EventName] => [signature.toLowerCase(), name as EventName]))
export const HEX32 = /^0x[0-9a-fA-F]{64}$/
export const ADDRESS = /^0x[0-9a-fA-F]{40}$/
const MAX_UINT = (1n << 256n) - 1n
export function numberFromHex(value: unknown): bigint {
  if (typeof value !== 'string' || !/^0x(?:0|[0-9a-fA-F]+)$/.test(value)) throw new Error('INVALID_RPC_HEX')
  return BigInt(value)
}
export function wordAt(data: string, index: number): bigint {
  if (!/^0x(?:[0-9a-fA-F]{64})*$/.test(data)) throw new Error('INVALID_ABI_DATA')
  const word = data.slice(2 + index * 64, 2 + (index + 1) * 64)
  if (word.length !== 64) throw new Error('INVALID_ABI_LENGTH')
  return BigInt(`0x${word}`)
}
function wordHexAt(data: string, index: number): string {
  return `0x${wordAt(data, index).toString(16).padStart(64, '0')}`
}
function addressWord(value: bigint): string {
  if (value >> 160n) throw new Error('INVALID_ABI_ADDRESS')
  return `0x${value.toString(16).padStart(40, '0')}`
}
function u64(value: bigint): bigint {
  if (value < 0n || value >= (1n << 64n)) throw new Error('INVALID_ABI_UINT64')
  return value
}
function narrow(value: bigint, bits: number): number {
  if (value < 0n || value >= (1n << BigInt(bits))) throw new Error('INVALID_ABI_UINT')
  return Number(value)
}
function decimalId(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,77}$/.test(value) || BigInt(value) > MAX_UINT) throw new Error('INVALID_AGREEMENT_ID')
  return value
}
export { decimalId }
export type RecordedLog = {
  chainId: 43113; contractAddress: string; agreementId: string; eventName: EventName;
  txHash: string; logIndex: number; blockNumber: string; blockHash: string;
  transactionIndex: number; topics: string[]; data: string; removed: false;
  opened?: { buyer: string; merchant: string; policy: 'PER_SESSION' | 'TIME_ACCESS'; termsHash: string;
    startAt: string; endAt: string; challengeWindow: string; deposited: string }
}
export function parseVaultLog(value: unknown, from: bigint, to: bigint): RecordedLog {
  if (!value || typeof value !== 'object') throw new Error('INVALID_LOG')
  const log = value as Record<string, unknown>
  if (typeof log.address !== 'string' || log.address.toLowerCase() !== FUJI.vault.toLowerCase()) throw new Error('WRONG_CONTRACT')
  if (!Array.isArray(log.topics) || log.topics.length < 2 || !log.topics.every(t => typeof t === 'string' && HEX32.test(t))) throw new Error('INVALID_LOG_TOPICS')
  const name = signatureToEvent.get((log.topics[0] as string).toLowerCase())
  if (!name) throw new Error('UNKNOWN_VAULT_EVENT')
  const [_, expectedTopics, expectedDataWords] = events[name]
  if (log.topics.length !== expectedTopics || typeof log.data !== 'string' || !/^0x(?:[0-9a-fA-F]{64})*$/.test(log.data) || log.data.length !== 2 + 64 * expectedDataWords) throw new Error('INVALID_LOG_ABI')
  const block = numberFromHex(log.blockNumber)
  if (block < from || block > to || !HEX32.test(String(log.blockHash)) || !HEX32.test(String(log.transactionHash))) throw new Error('INVALID_LOG_IDENTITY')
  if (log.removed === true) throw new Error('REMOVED_LOG')
  const li = numberFromHex(log.logIndex), ti = numberFromHex(log.transactionIndex)
  if (li > BigInt(Number.MAX_SAFE_INTEGER) || ti > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('INVALID_LOG_INDEX')
  const id = wordAt(log.topics[1] as string, 0)
  if (id === 0n) throw new Error('INVALID_AGREEMENT_ID')
  const result: RecordedLog = {
    chainId: FUJI.chainId, contractAddress: FUJI.vault, agreementId: id.toString(), eventName: name,
    txHash: String(log.transactionHash).toLowerCase(), logIndex: Number(li), blockNumber: block.toString(),
    blockHash: String(log.blockHash).toLowerCase(), transactionIndex: Number(ti),
    topics: (log.topics as string[]).map(x => x.toLowerCase()), data: log.data.toLowerCase(), removed: false,
  }
  if (name === 'AgreementOpened') {
    const buyer = wordAt(result.topics[2]!, 0), merchant = wordAt(result.topics[3]!, 0)
    const policy = wordAt(result.data, 0)
    if (policy !== 0n && policy !== 1n) throw new Error('INVALID_POLICY')
    result.opened = {
      buyer: addressWord(buyer), merchant: addressWord(merchant), policy: policy === 0n ? 'PER_SESSION' : 'TIME_ACCESS',
      deposited: wordAt(result.data, 1).toString(), termsHash: wordHexAt(result.data, 2),
      startAt: u64(wordAt(result.data, 3)).toString(),
      endAt: u64(wordAt(result.data, 4)).toString(),
      challengeWindow: u64(wordAt(result.data, 5)).toString(),
    }
  }
  return result
}
export const CALL_GET_AGREEMENT = '0x4f9f6fe6' as const
export const CALL_GET_BALANCES = '0x490adbaf' as const
export function encodeIdCall(selector: string, id: string): string {
  return selector + BigInt(decimalId(id)).toString(16).padStart(64, '0')
}
export function parseFinancialView(agreementData: string, balancesData: string, agreementId: string) {
  if (typeof agreementData !== 'string' || agreementData.length !== 2 + 19 * 64 || typeof balancesData !== 'string' || balancesData.length !== 2 + 5 * 64) throw new Error('INVALID_VAULT_VIEW')
  const a = Array.from({ length: 19 }, (_, i) => wordAt(agreementData, i))
  const b = Array.from({ length: 5 }, (_, i) => wordAt(balancesData, i))
  const [buyer, merchant, policy, state, terms, startAt, endAt, challengeWindow, challengedSessionClaimId, sessionsFinalized, positiveRefundSlots, sessionsConsumed, liveClaims, deposited, earnedFinalized, gymWithdrawn, refundAuthorized, buyerRefunded, disputedLocked] = a as bigint[]
  if (policy !== 0n && policy !== 1n || (state !== 1n && state !== 2n) || narrow(sessionsFinalized!, 8) > 10 || narrow(positiveRefundSlots!, 8) > 10 || narrow(sessionsConsumed!, 8) > 10) throw new Error('INVALID_VAULT_STATE')
  if (disputedLocked !== b[3]) throw new Error('VAULT_BALANCE_MISMATCH')
  if (deposited! !== gymWithdrawn! + buyerRefunded! + b[0]!) throw new Error('VAULT_INVARIANT_MISMATCH')
  return {
    agreementId: decimalId(agreementId), buyer: addressWord(buyer!), merchant: addressWord(merchant!),
    policy: policy === 0n ? 'PER_SESSION' : 'TIME_ACCESS', state: state === 1n ? 'OPEN' : 'TERMINATED',
    termsHash: `0x${terms!.toString(16).padStart(64, '0')}`,
    startAt: startAt!.toString(), endAt: endAt!.toString(), challengeWindow: challengeWindow!.toString(),
    sessionsFinalized: Number(sessionsFinalized), positiveRefundSlots: Number(positiveRefundSlots), sessionsConsumed: Number(sessionsConsumed),
    liveClaims: liveClaims!.toString(), challengedSessionClaimId: challengedSessionClaimId!.toString(),
    deposited: deposited!.toString(), earnedFinalized: earnedFinalized!.toString(), gymWithdrawn: gymWithdrawn!.toString(),
    refundAuthorized: refundAuthorized!.toString(), buyerRefunded: buyerRefunded!.toString(),
    remainingLocked: b[0]!.toString(), withdrawable: b[1]!.toString(), refundable: b[2]!.toString(),
    disputedLocked: b[3]!.toString(), unallocated: b[4]!.toString(),
  }
}
export function assertRuntime(code: string): void {
  if (code === '0x' || !/^0x(?:[0-9a-fA-F]{2})+$/.test(code)) throw new Error('VAULT_CODE_MISSING')
  if (keccak256(hexBytes(code)).toLowerCase() !== FUJI.runtimeHash.toLowerCase()) throw new Error('VAULT_RUNTIME_MISMATCH')
}
