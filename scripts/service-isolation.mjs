import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import assert from 'node:assert/strict'
import { healthSchema, readySchema } from '../packages/api-contracts/dist/index.js'

const specs = [['catalog-evidence', 3001], ['chain-indexer', 3002], ['economics', 3003]]
const children = new Map()
async function http(name, port, route) {
  const response = await fetch(`http://127.0.0.1:${port}${route}`, { signal: AbortSignal.timeout(4000) })
  const body = await response.json()
  console.log(JSON.stringify({ service: name, pid: children.get(name)?.pid, route, status: response.status, body }))
  if (route === '/health') { assert.equal(response.status, 200); healthSchema.parse(body); assert.equal(body.service, name) }
  else {
    const readiness = readySchema.parse(body)
    assert.equal(readiness.service, name)
    assert.equal(response.status, name === 'economics' ? 200 : 503)
    if (name === 'chain-indexer') {
      assert.equal(readiness.ready, false)
      assert.deepEqual(readiness.dependencies.find(dependency => dependency.name === 'sync'), {
        name: 'sync', ok: false, reason: 'SYNC_NOT_IMPLEMENTED',
      })
    }
  }
}
async function start([name, port]) {
  // Explicitly unset dependencies to make the test reproducible on developer machines.
  const env = { ...process.env, HOST: '127.0.0.1', PORT: String(port), DATABASE_URL: '', RPC_URL: '' }
  const child = spawn(process.execPath, [`services/${name}/dist/server.js`], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  children.set(name, child)
  child.stdout.on('data', data => process.stdout.write(`[${name}] ${data}`))
  child.stderr.on('data', data => process.stderr.write(`[${name}] ${data}`))
  console.log(`START node services/${name}/dist/server.js PORT=${port} PID=${child.pid}`)
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`${name} exited: ${child.exitCode}`)
    try { await http(name, port, '/health'); return } catch { await delay(50) }
  }
  throw new Error(`${name} startup timeout`)
}
async function stop([name, port]) {
  const child = children.get(name)
  const exited = once(child, 'exit')
  child.kill('SIGTERM')
  const [code, signal] = await Promise.race([exited, delay(5000, undefined, { ref: false }).then(() => { throw new Error(`${name} shutdown timeout`) })])
  console.log(`STOP ${name} PID=${child.pid} exit=${code} signal=${signal}`)
  assert.equal(code, 0)
  children.delete(name)
  await assert.rejects(fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1000) }))
}
try {
  for (const [, port] of specs) {
    await assert.rejects(fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1000) }))
  }
  // Each starts alone with both peers absent.
  for (const spec of specs) { await start(spec); await http(...spec, '/ready'); await stop(spec) }
  for (const spec of specs) await start(spec)
  for (const target of specs) {
    const peers = specs.filter(s => s !== target)
    const before = peers.map(([name]) => children.get(name).pid)
    await stop(target)
    for (const peer of peers) { await http(...peer, '/health'); await http(...peer, '/ready') }
    await start(target)
    assert.deepEqual(peers.map(([name]) => children.get(name).pid), before)
    for (const peer of peers) await http(...peer, '/health')
    console.log(`PASS stop/restart ${target[0]}: peer PIDs unchanged ${before.join(',')}`)
  }
  console.log('PASS 3 standalone startups, 3 stop/restart cycles, HTTP schemas and peer PID isolation; no financial E2E claim')
} finally {
  for (const spec of specs) if (children.has(spec[0])) await stop(spec)
}
