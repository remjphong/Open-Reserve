import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { rpc, checkDependencies } from '../dist/domain/readiness.js'
import { FujiRpc } from '../dist/domain/rpc-client.js'
import { loadConfig } from '../dist/config.js'
import { FUJI } from '../dist/domain/protocol.js'

test('RPC probe checks real JSON-RPC chain ID, not self-reported config',async t=>{
  let result='0xa869'
  const server=createServer((_,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({jsonrpc:'2.0',id:1,result}))})
  await new Promise(r=>server.listen(0,'127.0.0.1',r))
  t.after(()=>{server.closeAllConnections();server.close()})
  const url=`http://127.0.0.1:${server.address().port}`
  assert.equal((await rpc(url,43113)).reason,'OK')
  result='0x1';assert.equal((await rpc(url,43113)).reason,'WRONG_CHAIN')
  result='garbage';assert.equal((await rpc(url,43113)).reason,'UNAVAILABLE')
  assert.equal((await checkDependencies(loadConfig({}))).at(-1).reason,'UNAVAILABLE')
})
test('Fuji RPC refuses wrong chain before log scanning',async t=>{
  const methods=[]
  const server=createServer(async(req,res)=>{
    let data='';for await(const chunk of req)data+=chunk
    const query=JSON.parse(data);methods.push(query.method)
    res.setHeader('content-type','application/json');res.end(JSON.stringify({jsonrpc:'2.0',id:1,result:'0x1'}))
  })
  await new Promise(r=>server.listen(0,'127.0.0.1',r))
  t.after(()=>{server.closeAllConnections();server.close()})
  const client=new FujiRpc(`http://127.0.0.1:${server.address().port}`)
  await assert.rejects(client.assertIdentity(),/WRONG_CHAIN/)
  assert.deepEqual(methods,['eth_chainId'])
  await assert.rejects(client.logs(FUJI.deploymentBlock,FUJI.deploymentBlock+100n),/LOG_RANGE_EXCEEDS_RPC_LIMIT/)
})
