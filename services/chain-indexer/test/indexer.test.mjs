import test from 'node:test'
import assert from 'node:assert/strict'
import { Indexer } from '../dist/domain/indexer.js'
import { FUJI, parseVaultLog } from '../dist/domain/protocol.js'
import { openingLog, mockView } from './fixtures.mjs'
import { parseFinancialView } from '../dist/domain/protocol.js'

class MemoryStore {
  cp=null; values=new Map(); opened=new Map(); writes=0
  async initialize() {}
  async checkpoint() { return this.cp }
  async close() {}
  async applyWindow(from,to,hash,logs) {
    this.writes++
    for(const [id,ev] of this.values) if(BigInt(ev.blockNumber)>=from && BigInt(ev.blockNumber)<=to) this.values.delete(id)
    for(const ev of logs) this.values.set(`${ev.chainId}:${ev.txHash}:${ev.logIndex}`,ev)
    this.opened.clear()
    for(const ev of this.values.values()) if(ev.opened) this.opened.set(ev.agreementId,ev)
    if(!this.cp || to>=this.cp.height) this.cp={height:to,hash,indexedAt:'2026-11-20T00:00:00.000Z'}
  }
  async projection(id) {
    const ev=this.opened.get(id)
    return ev ? {agreementId:id,opened:ev.opened,openingBlock:ev.blockNumber,indexedAt:'2026-11-20T00:00:00.000Z'} : null
  }
  async events(id,offset,limit) {
    const items=[...this.values.values()].filter(ev=>ev.agreementId===id)
    return {items:items.slice(offset,offset+limit).map(({opened,...item})=>item),hasNext:items.length>offset+limit}
  }
}
class FakeReader {
  constructor() { this.fail=false;this.invalid=false;this.count=0 }
  async assertIdentity() { if(this.invalid) throw Error('WRONG_CHAIN') }
  async tip() { return FUJI.deploymentBlock+10n }
  async block(number) { return {number,hash:'0x'+'44'.repeat(32)} }
  async logs(from,to) {
    this.count++
    if(this.fail) throw Error('RPC_LOGS_NOT_ARRAY')
    return from<=FUJI.deploymentBlock && to>=FUJI.deploymentBlock
      ? [parseVaultLog(openingLog(),from,to)] : []
  }
  async financial(id) {
    const [a,b]=mockView()
    return parseFinancialView(a,b,id)
  }
}
test('checkpoint replay and restart preserve exactly one event and authority from live view', async () => {
  const db=new MemoryStore(),rpc=new FakeReader()
  const first=new Indexer(rpc,db,5,5000)
  await first.syncBatch()
  assert.equal(db.values.size,1)
  assert.equal(first.getSync().code,200)
  assert.equal(first.getSync().payload.lastIndexedBlock,(FUJI.deploymentBlock+8n).toString())
  assert.equal((await first.agreement('1')).deposited,'1003')
  assert.equal((await first.events('1',0,100)).items.length,1)
  await first.syncBatch()
  assert.equal(db.values.size,1)
  const restarted=new Indexer(new FakeReader(),db,5,5000)
  await restarted.syncBatch()
  assert.equal(db.values.size,1)
  assert.equal((await restarted.events('1',0,100)).items.length,1)
  await restarted.stop()
})
test('wrong chain and incomplete log windows fail closed; no fabricated verified empty', async () => {
  const db=new MemoryStore(),rpc=new FakeReader()
  rpc.invalid=true
  const indexer=new Indexer(rpc,db,2,5000)
  await indexer.tick()
  assert.equal(indexer.getSync().code,503)
  assert.equal(indexer.getSync().payload.lastError,'WRONG_CHAIN')
  assert.equal(db.values.size,0)
  rpc.invalid=false; rpc.fail=true
  await indexer.tick()
  assert.equal(indexer.getSync().code,503)
  assert.equal(indexer.getSync().payload.lastError,'RPC_LOGS_NOT_ARRAY')
  assert.equal(db.values.size,0)
  await indexer.stop()
})
