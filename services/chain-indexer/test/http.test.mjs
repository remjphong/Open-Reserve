import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../dist/app.js'
import { loadConfig } from '../dist/config.js'
import { healthSchema, readySchema, errorSchema, syncResponse } from '@openreserve/api-contracts'

const config=loadConfig({})
test('health is independent; unconfigured sync is degraded, never verified empty', async t => {
  const app=buildApp(config);t.after(()=>app.close())
  const health=await app.inject('/health')
  assert.equal(health.statusCode,200);healthSchema.parse(health.json())
  const ready=await app.inject('/ready')
  assert.equal(ready.statusCode,503);readySchema.parse(ready.json())
  assert.equal(ready.json().ready,false)
  const sync=await app.inject('/v1/sync')
  assert.equal(sync.statusCode,503)
  assert.equal(syncResponse.parse(sync.json()).lastIndexedBlock,null)
  assert.equal(sync.json().isStale,true)
})
test('unavailable known IDs return 503 and malformed IDs return 400',async t=>{
  const app=buildApp(config);t.after(()=>app.close())
  for(const endpoint of ['/v1/agreements/1','/v1/agreements/1/events']){
    const result=await app.inject(endpoint)
    assert.equal(result.statusCode,503);errorSchema.parse(result.json())
    assert.equal(result.json().error.code,'DEPENDENCY_UNAVAILABLE')
  }
  for(const endpoint of ['/v1/agreements/0','/v1/agreements/0/events','/v1/agreements/1/events?limit=0']){
    const r=await app.inject(endpoint)
    assert.equal(r.statusCode,400);errorSchema.parse(r.json())
  }
  assert.equal((await app.inject('/not-a-route')).statusCode,404)
})
test('readiness reports configured failures without leaking DB password',async t=>{
  const app=buildApp(loadConfig({DATABASE_URL:'postgres://private_user:private_password@127.0.0.1:1/missing'}))
  t.after(()=>app.close())
  const result=await app.inject('/ready')
  assert.equal(result.statusCode,503)
  assert.doesNotMatch(result.body,/private_user|private_password/)
})
test('invalid configuration fails',()=>{
  for(const value of ['0','-1','65536','wrong'])assert.throws(()=>loadConfig({PORT:value}))
  assert.throws(()=>loadConfig({CHAIN_ID:'1'}))
  assert.throws(()=>loadConfig({INDEXER_WINDOWS_PER_POLL:'0'}))
})

test('success APIs obey strict immutable v1 schema (injected indexed read-model fixture)',async t=>{
  const { parseFinancialView, FUJI, events: eventTopics }=await import('../dist/domain/protocol.js')
  const { mockView, openingLog }=await import('./fixtures.mjs')
  const { agreementResponse, eventsResponse }=await import('@openreserve/api-contracts')
  const [a,b]=mockView()
  const meta={chainId:43113,contractAddress:FUJI.vault,lastIndexedBlock:FUJI.deploymentBlock.toString(),
    isStale:false,indexedAt:'2026-11-20T00:00:00.000Z',source:'CHAIN_READ_MODEL'}
  const entry={...parseFinancialView(a,b,'1'),meta}
  const raw=openingLog()
  const event={chainId:43113,contractAddress:FUJI.vault,agreementId:'1',txHash:raw.transactionHash,
    logIndex:1,blockNumber:FUJI.deploymentBlock.toString(),blockHash:raw.blockHash,transactionIndex:0,
    topics:raw.topics,data:raw.data,confirmations:'3',removed:false}
  const mock={getSync:()=>({code:200,payload:{chainId:43113,contractAddress:FUJI.vault,
    deploymentBlock:FUJI.deploymentBlock.toString(),lastIndexedBlock:FUJI.deploymentBlock.toString(),
    chainTip:(FUJI.deploymentBlock+2n).toString(),lag:'2',isStale:false,replayState:'IDLE',lastError:null}}),
    agreement:async()=>entry,events:async()=>({meta,items:[event],nextCursor:null}),ready:true}
  const app=buildApp(config,undefined,false,mock);t.after(()=>app.close())
  const agreement=await app.inject('/v1/agreements/1')
  assert.equal(agreement.statusCode,200);agreementResponse.parse(agreement.json())
  const history=await app.inject('/v1/agreements/1/events?limit=2')
  assert.equal(history.statusCode,200);eventsResponse.parse(history.json())
  assert.equal(history.json().items.length,1)
  const sync=await app.inject('/v1/sync')
  assert.equal(sync.statusCode,200);syncResponse.parse(sync.json())
  assert.equal(sync.json().lastIndexedBlock,FUJI.deploymentBlock.toString())
  const badCursor=await app.inject('/v1/agreements/1/events?cursor=broken!!!')
  assert.equal(badCursor.statusCode,400)
})
