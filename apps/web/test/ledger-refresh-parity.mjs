/**
 * D18-07 independent Fuji read-only refresh evidence.
 * Does NOT invoke browser wallets, sign, or broadcast transactions.
 * Reads before and after from pinned Fuji blocks; three actor views after
 * refresh must hash identically for the same agreement and block.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createPublicClient, http, keccak256 } from 'viem'
import { avalancheFuji } from 'viem/chains'
import {
  reserveVaultAbi, approvedTermsHash, verifiedFujiDeployment,
  classifyVaultRole, queryKeys,
} from '@openreserve/contracts-sdk'

const id = 1n
const proof = verifiedFujiDeployment
const rpc = 'https://api.avax-test.network/ext/bc/C/rpc'
const client = createPublicClient({
  chain: avalancheFuji,
  cacheTime: 0,
  transport: http(rpc, { timeout: 15000, retryCount: 0 }),
})

const money = (agreement, balances) => {
  const [remainingLocked, withdrawable, refundable, disputedLocked, unallocated] = balances
  return {
    deposited: agreement.deposited.toString(),
    earnedFinalized: agreement.earnedFinalized.toString(),
    gymWithdrawn: agreement.gymWithdrawn.toString(),
    refundAuthorized: agreement.refundAuthorized.toString(),
    buyerRefunded: agreement.buyerRefunded.toString(),
    remainingLocked: remainingLocked.toString(),
    withdrawable: withdrawable.toString(),
    refundable: refundable.toString(),
    disputedLocked: disputedLocked.toString(),
    unallocated: unallocated.toString(),
  }
}

async function pinnedSnapshot(blockNumber) {
  const read = { address: proof.vault, abi: reserveVaultAbi, blockNumber }
  const [agreement, balances] = await Promise.all([
    client.readContract({ ...read, functionName: 'getAgreement', args: [id] }),
    client.readContract({ ...read, functionName: 'getBalances', args: [id] }),
  ])
  assert.equal(agreement.termsHash.toLowerCase(), approvedTermsHash.toLowerCase())
  return { agreement, ledger: money(agreement, balances) }
}

try {
  assert.equal(await client.getChainId(), 43113)
  const initial = await client.getBlock()
  assert.ok(initial.number >= proof.deploymentBlock)
  const initialSnapshot = await pinnedSnapshot(initial.number)

  let refreshed = initial
  for (let attempt = 0; attempt < 6 && refreshed.number <= initial.number; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1300))
    refreshed = await client.getBlock()
  }
  assert.ok(refreshed.number > initial.number, 'RPC head did not advance; refresh unverified')
  assert.notEqual(refreshed.hash, initial.hash, 'Refreshed block hash did not change')

  const read = { address: proof.vault, abi: reserveVaultAbi, blockNumber: refreshed.number }
  const [token, resolver, code] = await Promise.all([
    client.readContract({ ...read, functionName: 'token' }),
    client.readContract({ ...read, functionName: 'resolver' }),
    client.getCode({ address: proof.vault, blockNumber: refreshed.number }),
  ])
  assert.equal(token.toLowerCase(), proof.token.toLowerCase())
  assert.equal(resolver.toLowerCase(), proof.resolver.toLowerCase())
  assert.ok(code && code !== '0x', 'Vault code missing')
  assert.equal(keccak256(code).toLowerCase(), proof.runtimeCodeHash.toLowerCase())

  const baseline = await pinnedSnapshot(refreshed.number)
  const parties = [
    ['Customer', baseline.agreement.buyer, 'buyer'],
    ['Gym', baseline.agreement.merchant, 'merchant'],
    ['Operations', resolver, 'resolver'],
  ]

  const digests = new Set()
  const keys = new Set()
  for (const [name, account, expectedRole] of parties) {
    const observed = await pinnedSnapshot(refreshed.number)
    assert.equal(classifyVaultRole(
      account, observed.agreement.buyer, observed.agreement.merchant, resolver,
    ), expectedRole)
    const digest = createHash('sha256').update(JSON.stringify(observed.ledger)).digest('hex')
    const key = JSON.stringify(queryKeys.agreement(43113, proof.vault, id))
    digests.add(digest)
    keys.add(key)
    console.log(`${name}_ROLE: ${expectedRole}`)
    console.log(`${name}_LEDGER_SHA256: ${digest}`)
  }
  assert.equal(digests.size, 1)
  assert.equal(keys.size, 1)

  console.log('AGREEMENT_ID:', id.toString())
  console.log('PRE_REFRESH_BLOCK:', initial.number.toString())
  console.log('PRE_REFRESH_HASH:', initial.hash)
  console.log('POST_REFRESH_BLOCK:', refreshed.number.toString())
  console.log('POST_REFRESH_HASH:', refreshed.hash)
  console.log('PRE_REFRESH_LEDGER:', JSON.stringify(initialSnapshot.ledger))
  console.log('POST_REFRESH_LEDGER:', JSON.stringify(baseline.ledger))
  console.log('LEDGER_SOURCE: VAULT_READ_CONTRACT')
  console.log('THREE_ROLE_POST_REFRESH_PARITY: PASS')
  console.log('NO_CHAIN_WRITE: TRUE')
} catch (error) {
  console.error('THREE_ROLE_POST_REFRESH_PARITY: NOT_VERIFIED')
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
