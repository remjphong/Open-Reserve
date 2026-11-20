/** D18-10 authorized read-only Fuji smoke. No signer, private key, or sendTransaction. */
import assert from 'node:assert/strict'
import { agreementResponse, eventsResponse, syncResponse } from '@openreserve/api-contracts'
import { FUJI, encodeIdCall, CALL_GET_BALANCES, numberFromHex, wordAt } from '../dist/domain/protocol.js'

const api = process.env.D18_10_INDEXER_BASE_URL ?? 'http://127.0.0.1:3002'
const rpcUrl = process.env.FUJI_RPC_URL ?? process.env.RPC_URL
if (!rpcUrl) { console.error('HOLD=FUJI_RPC_URL_NOT_CONFIGURED'); process.exit(2) }
async function get(path) {
  const response=await fetch(new URL(path,api),{signal:AbortSignal.timeout(12000)})
  const body=await response.json()
  if (!response.ok) throw Error(`INDEXER_HTTP_${response.status}`)
  return body
}
let rpcId=0
async function rpc(method,params) {
  const id=++rpcId
  const response=await fetch(rpcUrl,{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id,method,params}),signal:AbortSignal.timeout(12000)})
  if(!response.ok)throw Error('FUJI_RPC_HTTP_FAILURE')
  const payload=await response.json()
  if(payload.id!==id||payload.jsonrpc!=='2.0'||payload.error||payload.result===undefined)throw Error('FUJI_RPC_INVALID')
  return payload.result
}
try {
  const [syncRaw,agreementRaw,eventsRaw]=await Promise.all([
    get('/v1/sync'),get('/v1/agreements/1'),get('/v1/agreements/1/events?limit=100')])
  const sync=syncResponse.parse(syncRaw),agreement=agreementResponse.parse(agreementRaw),history=eventsResponse.parse(eventsRaw)
  assert.equal(sync.chainId,43113)
  assert.equal(sync.contractAddress?.toLowerCase(),FUJI.vault.toLowerCase())
  assert.equal(sync.isStale,false)
  assert.equal(agreement.meta.isStale,false)
  assert.equal(history.meta.isStale,false)
  assert.equal(agreement.meta.lastIndexedBlock,sync.lastIndexedBlock)
  assert.equal(numberFromHex(await rpc('eth_chainId',[])),43113n)
  const opened=history.items.find(item=>item.topics[0]?.toLowerCase()==='0x4d3e8c0b546a5422c82ec85ad7d38d800a835f9ebcfab93d4d897f836f9e00ac')
  assert.ok(opened,'No verified AgreementOpened in returned history')
  assert.equal(opened.agreementId,'1')
  const receipt=await rpc('eth_getTransactionReceipt',[opened.txHash])
  assert.equal(receipt?.blockHash?.toLowerCase(),opened.blockHash.toLowerCase())
  assert.ok(receipt?.logs?.some(log=>
    numberFromHex(log.logIndex)===BigInt(opened.logIndex) &&
    log.transactionHash?.toLowerCase()===opened.txHash.toLowerCase() &&
    log.address?.toLowerCase()===FUJI.vault.toLowerCase()),'Event not found in authoritative receipt')
  const balances=await rpc('eth_call',[{to:FUJI.vault,data:encodeIdCall(CALL_GET_BALANCES,'1')},'latest'])
  const money=['remainingLocked','withdrawable','refundable','disputedLocked','unallocated']
  money.forEach((key,i)=>assert.equal(wordAt(balances,i).toString(),agreement[key],`${key} mismatches eth_call`))
  console.log(`FUJI_READONLY_SMOKE=PASS`)
  console.log(`CHAIN_ID=${sync.chainId}`)
  console.log(`AGREEMENT_ID=1`)
  console.log(`OPENED_TX_HASH=${opened.txHash}`)
  console.log(`OPENED_LOG_INDEX=${opened.logIndex}`)
  console.log(`INDEXED_EVENTS_PAGE_COUNT=${history.items.length}`)
  console.log(`LAST_INDEXED_BLOCK=${sync.lastIndexedBlock}`)
  console.log(`CHAIN_TIP=${sync.chainTip}`)
  console.log(`LAG=${sync.lag}`)
  console.log(`LEDGER_SOURCE=LIVE_VAULT_ETH_CALL`)
  console.log(`AMOUNTS_BASE_UNITS=${money.map(key=>key+':'+agreement[key]).join(',')}`)
  console.log('FUJI_SIGNING=NONE')
} catch (error) {
  const safe=error instanceof Error ? error.message : 'UNKNOWN'
  console.error(`HOLD=FUJI_SMOKE_NOT_VERIFIED`)
  console.error(`REASON=${safe.slice(0,180)}`)
  process.exitCode=2
}
