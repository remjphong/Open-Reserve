import { FUJI, assertRuntime, numberFromHex, parseVaultLog, type RecordedLog, encodeIdCall, CALL_GET_AGREEMENT, CALL_GET_BALANCES, parseFinancialView } from './protocol.js'

export type ChainTip = { number: bigint; hash: string }
export interface ChainReader {
  assertIdentity(): Promise<void>
  tip(): Promise<bigint>
  block(number: bigint): Promise<ChainTip>
  logs(from: bigint, to: bigint): Promise<RecordedLog[]>
  financial(id: string): Promise<ReturnType<typeof parseFinancialView>>
}

export class FujiRpc implements ChainReader {
  constructor(private readonly endpoint: string) {
    const parsed = new URL(endpoint)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('INVALID_RPC_URL')
  }
  private async call(method: string, params: unknown[]): Promise<unknown> {
    const res = await fetch(this.endpoint, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(12000) })
    if (!res.ok) throw new Error('RPC_HTTP_ERROR')
    const raw: unknown = await res.json()
    if (!raw || typeof raw !== 'object') throw new Error('RPC_INVALID_JSON')
    const payload = raw as Record<string, unknown>
    if (payload.jsonrpc !== '2.0' || payload.id !== 1 || payload.error || !Object.hasOwn(payload, 'result')) throw new Error('RPC_INVALID_ENVELOPE')
    return payload.result
  }
  async assertIdentity(): Promise<void> {
    if (numberFromHex(await this.call('eth_chainId', [])) !== BigInt(FUJI.chainId)) throw new Error('WRONG_CHAIN')
    const code = await this.call('eth_getCode', [FUJI.vault, 'latest'])
    if (typeof code !== 'string') throw new Error('RPC_INVALID_CODE')
    assertRuntime(code)
    const receipt = await this.call('eth_getTransactionReceipt', [FUJI.deploymentTx])
    if (!receipt || typeof receipt !== 'object') throw new Error('DEPLOY_RECEIPT_MISSING')
    const item = receipt as Record<string, unknown>
    if (typeof item.contractAddress !== 'string' || item.contractAddress.toLowerCase() !== FUJI.vault.toLowerCase() ||
      numberFromHex(item.blockNumber) !== FUJI.deploymentBlock || numberFromHex(item.status) !== 1n ||
      typeof item.transactionHash !== 'string' || item.transactionHash.toLowerCase() !== FUJI.deploymentTx) throw new Error('WRONG_DEPLOYMENT')
  }
  async tip(): Promise<bigint> { return numberFromHex(await this.call('eth_blockNumber', [])) }
  async block(number: bigint): Promise<ChainTip> {
    const value = await this.call('eth_getBlockByNumber', [`0x${number.toString(16)}`, false])
    if (!value || typeof value !== 'object') throw new Error('RPC_BLOCK_MISSING')
    const block = value as Record<string, unknown>
    if (numberFromHex(block.number) !== number || typeof block.hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(block.hash)) throw new Error('RPC_BLOCK_INCONSISTENT')
    return { number, hash: block.hash.toLowerCase() }
  }
  async logs(from: bigint, to: bigint): Promise<RecordedLog[]> {
    if (from > to || to - from >= 100n) throw new Error('LOG_RANGE_EXCEEDS_RPC_LIMIT')
    const value = await this.call('eth_getLogs', [{ address: FUJI.vault, fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}` }])
    if (!Array.isArray(value)) throw new Error('RPC_LOGS_NOT_ARRAY')
    if (value.length > 20000) throw new Error('RPC_LOG_WINDOW_TOO_LARGE')
    const parsed = value.map(log => parseVaultLog(log, from, to))
    const seen = new Set<string>()
    for (const log of parsed) {
      const key = `${log.txHash}:${log.logIndex}`
      if (seen.has(key)) throw new Error('RPC_DUPLICATE_LOG')
      seen.add(key)
    }
    return parsed.sort((a, b) => Number(BigInt(a.blockNumber) - BigInt(b.blockNumber)) || a.transactionIndex - b.transactionIndex || a.logIndex - b.logIndex)
  }
  async financial(id: string): Promise<ReturnType<typeof parseFinancialView>> {
    await this.assertIdentity() // fail closed if the RPC/network changed since last polling tick
    // Pin both getters to a single observed canonical height. Independent 'latest'
    // reads can cross a finalization/withdrawal boundary and invent a mixed ledger.
    const anchor = await this.block(await this.tip())
    if (anchor.number < FUJI.deploymentBlock) throw new Error('FINANCIAL_BLOCK_BEFORE_DEPLOYMENT')
    const blockTag = `0x${anchor.number.toString(16)}`
    const [agreement, balances] = await Promise.all([
      this.call('eth_call', [{ to: FUJI.vault, data: encodeIdCall(CALL_GET_AGREEMENT, id) }, blockTag]),
      this.call('eth_call', [{ to: FUJI.vault, data: encodeIdCall(CALL_GET_BALANCES, id) }, blockTag]),
    ])
    // The number must still identify the same canonical block after both reads.
    // Fail closed on a reorg, RPC inconsistency or invalid canonical response.
    const canonicalAfter = await this.block(anchor.number)
    if (canonicalAfter.hash !== anchor.hash) throw new Error('FINANCIAL_BLOCK_REORG')
    if (typeof agreement !== 'string' || typeof balances !== 'string') throw new Error('RPC_INVALID_VAULT_VIEW')
    return parseFinancialView(agreement, balances, id)
  }
}
