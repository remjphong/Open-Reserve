import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { rpc, checkDependencies } from '../dist/domain/readiness.js'
import { loadConfig } from '../dist/config.js'

test('RPC probe checks actual HTTP chain ID; these are local test responses, not Fuji', async t => {
  let result = '0xa869'
  const server = createServer((req, res) => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ jsonrpc: '2.0', id: 1, result }))
  })
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  t.after(() => { server.closeAllConnections(); server.close() })
  const url = `http://127.0.0.1:${server.address().port}`
  assert.equal((await rpc(url, 43113)).reason, 'OK')
  result = '0x1'; assert.equal((await rpc(url, 43113)).reason, 'WRONG_CHAIN')
  result = 'garbage'; assert.equal((await rpc(url, 43113)).reason, 'UNAVAILABLE')
  assert.equal((await rpc('http://127.0.0.1:1', 43113)).reason, 'UNAVAILABLE')
  assert.equal((await checkDependencies(loadConfig({}))).at(-1).reason, 'SYNC_NOT_IMPLEMENTED')
})
test('RPC timeout is bounded', async t => {
  const server = createServer(() => {})
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  t.after(() => { server.closeAllConnections(); server.close() })
  const start = Date.now()
  assert.equal((await rpc(`http://127.0.0.1:${server.address().port}`, 43113)).reason, 'UNAVAILABLE')
  assert.ok(Date.now() - start < 3000)
})
