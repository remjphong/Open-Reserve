import {
  createPublicClient, createWalletClient, custom, decodeEventLog, erc20Abi, getAddress, isAddress,
  zeroAddress, type EIP1193Provider,
} from 'viem'
import { avalancheFuji, foundry } from 'viem/chains'
import { approvedTermsHash, assertTimeProfile, reserveVaultAbi, timeProfiles } from '@openreserve/contracts-sdk'

const chains = { 31337: foundry, 43113: avalancheFuji } as const
const opened = reserveVaultAbi.find(item => item.type === 'event' && item.name === 'AgreementOpened')!
const proposed = reserveVaultAbi.find(item => item.type === 'event' && item.name === 'ClaimProposed')!

function configuration() {
  const chainId = Number(import.meta.env.VITE_VAULT_CHAIN_ID)
  const vault = import.meta.env.VITE_VAULT_ADDRESS ?? ''
  const merchant = import.meta.env.VITE_MERCHANT_ADDRESS ?? ''
  const block = import.meta.env.VITE_VAULT_DEPLOYMENT_BLOCK ?? ''
  if ((chainId !== 31337 && chainId !== 43113) || !isAddress(vault) || vault === zeroAddress ||
      !/^(0|[1-9][0-9]*)$/.test(block)) return
  return {
    chain: chains[chainId], vault: getAddress(vault), fromBlock: BigInt(block),
    merchant: isAddress(merchant) && merchant !== zeroAddress ? getAddress(merchant) : undefined,
  }
}

export const deployment = configuration()
export const provider = () => (window as Window & { ethereum?: EIP1193Provider }).ethereum
export const sameAddress = (left: string, right: string) => left.toLowerCase() === right.toLowerCase()
export function parseId(value: string) {
  return /^[1-9][0-9]{0,77}$/.test(value) && BigInt(value) < 2n ** 256n ? BigInt(value) : undefined
}

export async function walletSession(connect = false) {
  const injected = provider()
  if (!deployment) throw new Error('NOT_VERIFIED · Chưa cấu hình Vault thử nghiệm.')
  if (!injected) throw new Error('Chưa phát hiện ví trình duyệt.')
  const { chain, vault, fromBlock, merchant } = deployment
  const transport = custom(injected, { retryCount: 0 })
  const publicClient = createPublicClient({ chain, transport, cacheTime: 0 })
  const wallet = createWalletClient({ chain, transport })
  const [account] = connect ? await wallet.requestAddresses() : await wallet.getAddresses()
  if (!account) throw new Error('Ví chưa kết nối.')
  if (await wallet.getChainId() !== chain.id) throw new Error('Sai mạng. Hãy chuyển ví sang ' + chain.name + '.')
  const head = await publicClient.getBlock()
  const age = BigInt(Math.floor(Date.now() / 1000)) - head.timestamp
  if (head.number < fromBlock || age > 120n) throw new Error('Dữ liệu RPC đã cũ. Hãy kiểm tra mạng và làm mới.')
  if (!await publicClient.getCode({ address: vault, blockNumber: head.number })) {
    throw new Error('Không tìm thấy Vault tại địa chỉ cấu hình.')
  }
  const read = { address: vault, abi: reserveVaultAbi, blockNumber: head.number } as const
  const [duration, challengeWindow, termsHash] = await publicClient.readContract({ ...read, functionName: 'timeAccessConfig' })
  assertTimeProfile(chain.id, { duration, challengeWindow, termsHash })
  return { chain, vault, merchant, fromBlock, head, read, account, publicClient, wallet }
}

export type Session = Awaited<ReturnType<typeof walletSession>>
export async function checkoutState(session: Session) {
  const { publicClient, read, account, vault } = session
  const token = await publicClient.readContract({ ...read, functionName: 'token' })
  const tokenRead = { address: token, abi: erc20Abi, blockNumber: read.blockNumber } as const
  const [balance, allowance, gas, resolver] = await Promise.all([
    publicClient.readContract({ ...tokenRead, functionName: 'balanceOf', args: [account] }),
    publicClient.readContract({ ...tokenRead, functionName: 'allowance', args: [account, vault] }),
    publicClient.getBalance({ address: account, blockNumber: read.blockNumber }),
    publicClient.readContract({ ...read, functionName: 'resolver' }),
  ])
  return { token, balance, allowance, gas, resolver }
}
export async function listPasses({ publicClient, vault, account, fromBlock, head }: Session) {
  return publicClient.getLogs({ address: vault, event: opened, args: { buyer: account }, fromBlock, toBlock: head.number, strict: true })
}
export async function readPass({ publicClient, read, vault, fromBlock, head }: Session, id: bigint) {
  const [agreement, balances, claims] = await Promise.all([
    publicClient.readContract({ ...read, functionName: 'getAgreement', args: [id] }),
    publicClient.readContract({ ...read, functionName: 'getBalances', args: [id] }),
    publicClient.getLogs({ address: vault, event: proposed, args: { agreementId: id }, fromBlock, toBlock: head.number, strict: true })
      .then(logs => Promise.all(logs.map(async ({ args: { claimId } }) => ({
        claimId, claim: await publicClient.readContract({ ...read, functionName: 'getClaim', args: [id, claimId] }),
      }))))
      .catch(() => undefined),
  ])
  return { agreement, balances, claims }
}

const actions = {
  confirmSession: { functionName: 'confirmSession' },
  challengeClaim: { functionName: 'challengeClaim' },
  claimRefund: { functionName: 'claimRefund' },
} as const
export type BuyerAction = keyof typeof actions
type Progress = (status: string) => void
type BuyerIntent = { type: 'claimRefund'; id: bigint }
  | { type: 'confirmSession'; id: bigint; claimId: bigint }
  | { type: 'challengeClaim'; id: bigint; claimId: bigint; hash: `0x${string}` }

async function submit(session: Session, progress: Progress, sign: () => Promise<`0x${string}`>) {
  const { account, wallet, chain, publicClient } = session
  const [current] = await wallet.getAddresses()
  if (!current || !sameAddress(current, account) || await wallet.getChainId() !== chain.id) {
    throw new Error('Ví hoặc mạng đã thay đổi. Hãy làm mới trước khi ký.')
  }
  progress('Đang chờ bạn ký trong ví…')
  const hash = await sign()
  progress('Đang chờ biên nhận · ' + hash)
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 90000 })
    .catch(() => { throw new Error('Chưa đọc được biên nhận. Kiểm tra giao dịch trong ví · ' + hash) })
  if (receipt.transactionHash !== hash) throw new Error('Giao dịch đã bị thay thế. Kiểm tra lịch sử trong ví.')
  if (receipt.status !== 'success') throw new Error('Giao dịch đã thất bại · ' + hash)
  return receipt
}

export async function purchase(session: Session, type: 'approve' | 'deposit', policy: 0 | 1, amount: bigint, progress: Progress) {
  const { account, vault, chain, publicClient, wallet, merchant, head } = session
  const { token, balance, allowance, gas, resolver } = await checkoutState(session)
  if (!merchant || [resolver, account, vault].some(address => sameAddress(merchant, address)) ||
      sameAddress(account, resolver)) throw new Error('Ví khách hoặc địa chỉ gym không hợp lệ.')
  if (gas === 0n) throw new Error('Thiếu token mạng để trả phí gas.')
  if (balance < amount) throw new Error('Không đủ MRES trong ví.')
  if (type === 'approve') {
    const { request } = await publicClient.simulateContract({
      address: token, abi: erc20Abi, functionName: 'approve', args: [vault, amount], account,
    })
    return { receipt: await submit(session, progress, () => wallet.writeContract(request)) }
  }
  if (allowance < amount) throw new Error('Hạn mức MRES chưa đủ. Hãy cấp quyền trước.')
  const { duration, challengeWindow } = timeProfiles[chain.id]
  // Give the buyer time to review the wallet request. The Vault validates the start at inclusion.
  const start = policy === 1 ? head.timestamp + 120n : 0n
  const { request } = await publicClient.simulateContract({
    address: vault, abi: reserveVaultAbi, functionName: 'openAgreement', account,
    args: [merchant, policy, amount, approvedTermsHash, start, policy === 1 ? start + duration : 0n,
      policy === 1 ? challengeWindow : 0n],
  })
  const receipt = await submit(session, progress, () => wallet.writeContract(request))
  for (const log of receipt.logs) {
    if (!sameAddress(log.address, vault)) continue
    try {
      const event = decodeEventLog({ abi: [opened], topics: log.topics, data: log.data, strict: true })
      if (sameAddress(event.args.buyer, account) && sameAddress(event.args.merchant, merchant) &&
          event.args.policy === policy && event.args.amount === amount && event.args.termsHash === approvedTermsHash) {
        return { receipt, id: event.args.agreementId }
      }
    } catch { /* unrelated log */ }
  }
  throw new Error('Giao dịch có biên nhận nhưng thiếu sự kiện mở gói. Kiểm tra ví trước khi thử lại · ' + receipt.transactionHash)
}

export async function runBuyerAction(session: Session, intent: BuyerIntent, progress: Progress) {
  const { account, read, publicClient, wallet } = session
  const common = { address: read.address, abi: read.abi, account } as const
  const agreement = await publicClient.readContract({ ...read, functionName: 'getAgreement', args: [intent.id] })
  if (!sameAddress(agreement.buyer, account)) throw new Error('Chỉ ví người mua trong Vault được ký.')
  if (await publicClient.getBalance({ address: account }) === 0n) throw new Error('Thiếu token mạng để trả phí gas.')
  if (intent.type === 'claimRefund') {
    const [, , refundable] = await publicClient.readContract({ ...read, functionName: 'getBalances', args: [intent.id] })
    if (!refundable) throw new Error('Chưa có token được duyệt hoàn.')
    const { request } = await publicClient.simulateContract({ ...common, ...actions.claimRefund, args: [intent.id] })
    return submit(session, progress, () => wallet.writeContract(request))
  }
  const claim = await publicClient.readContract({ ...read, functionName: 'getClaim', args: [intent.id, intent.claimId] })
  if (agreement.state !== 1 || (intent.type === 'confirmSession'
    ? agreement.policy !== 0 || ![1, 3].includes(claim.state)
    : claim.state !== 1 || (agreement.policy === 0
      ? agreement.challengedSessionClaimId !== 0n : session.head.timestamp >= claim.challengeEndsAt))) {
    throw new Error('Trạng thái hợp đồng hoặc đề nghị đã thay đổi.')
  }
  if (intent.type === 'confirmSession') {
    const { request } = await publicClient.simulateContract({
      ...common, ...actions.confirmSession, args: [intent.id, intent.claimId],
    })
    return submit(session, progress, () => wallet.writeContract(request))
  }
  const { request } = await publicClient.simulateContract({
    ...common, ...actions.challengeClaim, args: [intent.id, intent.claimId, intent.hash],
  })
  return submit(session, progress, () => wallet.writeContract(request))
}

export function errorMessage(error: unknown) {
  for (let current: unknown = error; current && typeof current === 'object';) {
    const details = current as { code?: number; name?: string; cause?: unknown }
    if (details.code === 4001 || details.name === 'UserRejectedRequestError') return 'Bạn đã từ chối yêu cầu trong ví.'
    if (details.name === 'InsufficientFundsError') return 'Ví không đủ token mạng để trả phí gas.'
    if (details.name === 'ContractFunctionRevertedError') return 'Vault từ chối thao tác. Hãy làm mới và kiểm tra điều kiện.'
    current = details.cause
  }
  if (error instanceof Error && error.constructor === Error) return error.message
  return 'Không đọc được dữ liệu RPC hoặc giao dịch chưa gửi được. Hãy kiểm tra ví và thử lại.'
}
