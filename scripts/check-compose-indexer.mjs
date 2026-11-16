import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Read the resolved Compose model without running Docker or printing environment values.
const compose = JSON.parse(readFileSync(0, 'utf8'))
const healthcheck = compose.services?.['chain-indexer']?.healthcheck
assert.ok(healthcheck && !healthcheck.disable, 'Chain Indexer healthcheck must be enabled')
const [mode, executable, flag, command, ...extra] = healthcheck.test ?? []
assert.deepEqual([mode, executable, flag, ...extra], ['CMD', 'node', '-e'])
const endpoint = command?.match(/^fetch\((['"])([^'"]+)\1\)/)?.[2]
assert.equal(endpoint, 'http://127.0.0.1:3002/health', 'Chain Indexer must probe process liveness')
console.log(`PASS Chain Indexer Compose healthcheck targets ${endpoint}`)
