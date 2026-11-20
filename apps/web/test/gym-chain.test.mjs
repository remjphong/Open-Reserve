import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData } from 'viem'
import { approvedTermsHash, reserveVaultAbi } from '@openreserve/contracts-sdk'
import {
  GYM_CHAIN_WRITES_ENABLED, assertGymMerchant, checkGymActionState,
  discoverMerchantAgreements, readDirectGymAgreement, parseGymId, parseGymRoute, readMerchantLogWindow, refuseGymBroadcast,
  validateGymIntent, verifyExistingGymHashAndRefresh, verifyGymBusinessReceipt,
} from '../src/lib/gym-chain.ts'

const merchant = '0x111cFcD0F11ca1a11368B1a2Bd1D57c2815F0e23'
const buyer = '0x124c7de0000000000000000000000000000e7b7b'
const vault = '0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad'
const hash = `0x${'ab'.repeat(32)}`
const different = `0x${'cd'.repeat(32)}`
const sessionId = `0x${'11'.repeat(32)}`
const evidenceHash = `0x${'22'.repeat(32)}`
const pt = { type: 'proposeSession', agreementId: 1n, sessionId, evidenceHash }
const time = { type: 'proposeTime', agreementId: 1n, from: 110n, to: 120n, evidenceHash }
const final = { type: 'finalizeClaim', agreementId: 1n, claimId: 3n }
const earned = { type: 'claimEarned', agreementId: 1n }
const agreement = { policy: 0, state: 1, merchant, sessionsConsumed: 0, liveClaims: 0n,
  challengedSessionClaimId: 0n, startAt: 100n, endAt: 200n }
const balances = [1003n, 100n, 0n, 0n, 903n]

function eventLog(eventName, indexed, values) {
  const event = reserveVaultAbi.find(x => x.type === 'event' && x.name === eventName)
  return {
    address: vault,
    topics: encodeEventTopics({ abi: reserveVaultAbi, eventName, args: indexed }),
    data: encodeAbiParameters(event.inputs.filter(x => !x.indexed), values),
  }
}
function proof(intent, eventName, indexed, values) {
  const inputs = intent.type === 'proposeSession'
    ? [intent.agreementId, intent.sessionId, intent.evidenceHash]
    : intent.type === 'proposeTime' ? [intent.agreementId, intent.from, intent.to, intent.evidenceHash]
      : intent.type === 'finalizeClaim' ? [intent.agreementId, intent.claimId] : [intent.agreementId]
  const tx = { hash, from: merchant, to: vault,
    input: encodeFunctionData({ abi: reserveVaultAbi, functionName: intent.type, args: inputs }) }
  const receipt = { transactionHash: hash, status: 'success', blockNumber: 102n,
    logs: [eventLog(eventName, indexed, values)] }
  return { tx, receipt }
}
const ptProof = () => proof(pt, 'ClaimProposed',
  { agreementId: 1n, claimId: 3n, sessionId }, [evidenceHash, 0n, 0n, 100n, 0n, 0n])

test('D18-08 write gate is structurally blocked with no wallet.writeContract path', () => {
  assert.equal(GYM_CHAIN_WRITES_ENABLED, false)
  assert.throws(() => refuseGymBroadcast(), /FUJI_WRITE_BLOCKED/)
  const code = readFileSync(new URL('../src/lib/gym-chain.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(code, /\.writeContract\s*\(/)
})

test('strict agreement ID, merchant chain identity and 32-byte hashes', () => {
  assert.equal(parseGymId('1'), 1n)
  for (const id of ['0', '-1', '+1', '1a', '1.0', '0x1', '01', '9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999']) {
    assert.equal(parseGymId(id), undefined)
  }
  assert.doesNotThrow(() => assertGymMerchant(merchant, merchant.toLowerCase(), 43113))
  assert.throws(() => assertGymMerchant(buyer, merchant, 43113), /UNAUTHORIZED/)
  assert.throws(() => assertGymMerchant(merchant, merchant, 31337), /UNAUTHORIZED/)
  for (const bad of [`0x${'0'.repeat(64)}`, '0x01', '0x' + 'gg'.repeat(32)]) {
    assert.throws(() => validateGymIntent({ ...pt, evidenceHash: bad }), /evidence hash/)
  }
})

test('PT proposal limit, TIME_ACCESS elapsed interval and payout strictly from withdrawable', () => {
  assert.doesNotThrow(() => checkGymActionState(pt, agreement, balances, 130n))
  assert.throws(() => checkGymActionState(pt, { ...agreement, sessionsConsumed: 9, liveClaims: 1n }, balances, 130n), /suất đề xuất/)
  assert.throws(() => checkGymActionState(time, agreement, balances, 130n), /TIME_ACCESS/)
  assert.doesNotThrow(() => checkGymActionState(time, { ...agreement, policy: 1 }, balances, 130n))
  assert.throws(() => checkGymActionState({ ...time, to: 140n }, { ...agreement, policy: 1 }, balances, 130n), /đã trôi qua/)
  assert.throws(() => checkGymActionState({ ...time, from: 130n, to: 120n }, { ...agreement, policy: 1 }, balances, 140n), /không hợp lệ/)
  assert.throws(() => checkGymActionState(earned, agreement, [100n, 0n], 130n), /chưa có/)
  assert.doesNotThrow(() => checkGymActionState(earned, agreement, balances, 130n))
})

test('finalize requires claim state and elapsed challenge window, never challenged', () => {
  assert.throws(() => checkGymActionState(final, agreement, balances, 140n, { state: 1, challengeEndsAt: 130n }), /chưa đủ/)
  assert.doesNotThrow(() => checkGymActionState(final, agreement, balances, 140n, { state: 2, challengeEndsAt: 130n }))
  assert.throws(() => checkGymActionState(final, { ...agreement, challengedSessionClaimId: 8n }, balances, 140n, { state: 2, challengeEndsAt: 130n }), /tranh chấp/)
  assert.throws(() => checkGymActionState(final, { ...agreement, policy: 1 }, balances, 120n, { state: 1, challengeEndsAt: 130n }), /chưa đủ/)
  assert.doesNotThrow(() => checkGymActionState(final, { ...agreement, policy: 1 }, balances, 130n, { state: 1, challengeEndsAt: 130n }))
})

const START = 61240386n
const makeLog = (agreementId, blockNumber, owner = merchant, address = vault) => ({
  address, blockNumber, args: { agreementId, merchant: owner },
})
const readAgreement = async () => ({ agreement: { ...agreement, buyer, termsHash: approvedTermsHash } })
function logSession(headOffset, getLogs) {
  return { chain: { id: 43113 }, vault, account: merchant, fromBlock: START,
    head: { number: START + BigInt(headOffset) }, publicClient: { getLogs } }
}

test('RPC windows: one block and exactly 100 inclusive blocks', async () => {
  for (const offset of [0, 99]) {
    const requests = []
    const session = logSession(offset, async params => { requests.push(params); return [] })
    const result = await discoverMerchantAgreements(session, readAgreement)
    assert.deepEqual(result.agreements, []) // Verified-empty only after every window succeeded.
    assert.equal(result.headBlock, START + BigInt(offset))
    assert.equal(requests.length, 1)
    assert.equal(requests[0].fromBlock, START)
    assert.equal(requests[0].toBlock, START + BigInt(offset))
    assert.equal(requests[0].address, vault)
    assert.equal(requests[0].event.name, 'AgreementOpened')
    assert.deepEqual(requests[0].args, { merchant })
    assert.equal(requests[0].strict, true)
  }
})

test('RPC windows: 101 splits; consecutive 200 and last partial 205 have no gaps/overlaps', async () => {
  for (const [offset, expected] of [
    [100, [[0, 99], [100, 100]]],
    [199, [[0, 99], [100, 199]]],
    [204, [[0, 99], [100, 199], [200, 204]]],
  ]) {
    const scanned = []
    const result = await discoverMerchantAgreements(logSession(offset, async ({ fromBlock, toBlock }) => {
      scanned.push([Number(fromBlock - START), Number(toBlock - START)])
      assert.ok(toBlock - fromBlock + 1n <= 100n)
      return []
    }), readAgreement)
    assert.deepEqual(scanned, expected)
    assert.deepEqual(result.agreements, [])
  }
})

test('RPC log: merchant topic and Vault address filter, exact matching Agreement #1', async () => {
  const calls = []
  const result = await discoverMerchantAgreements(logSession(100, async params => {
    calls.push(params)
    return params.fromBlock === START ? [makeLog(1n, START + 4n)] : []
  }), readAgreement)
  assert.deepEqual(result.agreements.map(entry => entry.id), [1n])
  assert.equal(calls.length, 2)
  for (const call of calls) {
    assert.equal(call.address, vault)
    assert.deepEqual(call.args, { merchant })
    assert.equal(call.event.name, 'AgreementOpened')
    assert.equal(call.strict, true)
  }
})

test('RPC failure: rejected, rate-limited or missing window never returns verified-empty', async () => {
  for (const error of [new Error('connection failed'), Object.assign(new Error('rate limit'), { code: -32005 })]) {
    let calls = 0
    await assert.rejects(discoverMerchantAgreements(logSession(100, async () => {
      if (++calls === 1) return []
      throw error
    }), readAgreement), /INCOMPLETE_LOG_READ/)
    assert.equal(calls, 2) // No retry, never silently skip second window.
  }
  for (const value of [undefined, null, {}, { result: [] }]) {
    await assert.rejects(discoverMerchantAgreements(logSession(0, async () => value), readAgreement),
      /INCOMPLETE_LOG_READ/)
  }
})

test('RPC timeout is bounded, fails closed, and never retries', async () => {
  let calls = 0
  const session = logSession(0, async () => { calls++; return new Promise(() => {}) })
  await assert.rejects(readMerchantLogWindow(session, START, START, 8), /INCOMPLETE_LOG_READ/)
  assert.equal(calls, 1)
  for (const [from, to, timeout] of [
    [START, START + 100n, 8], [START + 1n, START, 8],
    [START - 1n, START, 8], [START, START, 0], [START, START, 12_001],
  ]) {
    await assert.rejects(readMerchantLogWindow(session, from, to, timeout), /INCOMPLETE_LOG_READ/)
  }
  assert.equal(calls, 1)
})

test('RPC log: duplicates, wrong merchant, wrong Vault, wrong block and removed logs are rejected', async () => {
  const good = makeLog(1n, START)
  const invalid = [
    { ...good, args: { agreementId: 1n, merchant: buyer } },
    { ...good, address: buyer },
    { ...good, blockNumber: START + 100n },
    { ...good, removed: true },
    { ...good, args: { ...good.args, agreementId: 0n } },
    { ...good, args: { ...good.args, agreementId: '1' } },
  ]
  for (const bad of invalid) {
    await assert.rejects(discoverMerchantAgreements(logSession(0, async () => [bad]), readAgreement),
      /INVALID_MERCHANT_LOG/)
  }
  await assert.rejects(discoverMerchantAgreements(logSession(0, async () => [good, good]), readAgreement),
    /DUPLICATE_MERCHANT_LOG/)
  await assert.rejects(discoverMerchantAgreements(logSession(100, async ({ fromBlock }) =>
    [makeLog(1n, fromBlock)]), readAgreement), /DUPLICATE_MERCHANT_LOG/)
})

test('RPC log: merchant and terms on Vault must match, even when event merchant matches', async () => {
  const session = logSession(0, async () => [makeLog(1n, START)])
  await assert.rejects(discoverMerchantAgreements(session, async () => ({
    agreement: { ...agreement, merchant: buyer, buyer, termsHash: approvedTermsHash },
  })), /NOT_VERIFIED/)
  await assert.rejects(discoverMerchantAgreements(session, async () => ({
    agreement: { ...agreement, buyer, termsHash: '0x' + 'ff'.repeat(32) },
  })), /NOT_VERIFIED/)
})

test('RPC log: excessive history is rejected before any request and never called verified-empty', async () => {
  let calls = 0
  await assert.rejects(discoverMerchantAgreements(logSession(100_000, async () => {
    calls++; return []
  }), readAgreement), /INCOMPLETE_LOG_READ/)
  assert.equal(calls, 0)
})

test('verified PT event + transaction input and receipt are required for action-level proof', () => {
  const { tx, receipt } = ptProof()
  assert.deepEqual(verifyGymBusinessReceipt(hash, vault, merchant, pt, receipt, tx),
    { name: 'ClaimProposed', claimId: 3n })
  assert.throws(() => verifyGymBusinessReceipt(hash, vault, merchant, pt, { ...receipt, status: 'reverted' }, tx), /RECEIPT_MISMATCH/)
  assert.throws(() => verifyGymBusinessReceipt(hash, vault, merchant, pt, { ...receipt, transactionHash: different }, tx), /RECEIPT_MISMATCH/)
  assert.throws(() => verifyGymBusinessReceipt(hash, vault, merchant, pt, receipt, { ...tx, from: buyer }), /RECEIPT_MISMATCH/)
  assert.throws(() => verifyGymBusinessReceipt(hash, vault, merchant, pt, receipt, { ...tx, to: buyer }), /RECEIPT_MISMATCH/)
  assert.throws(() => verifyGymBusinessReceipt(hash, vault, merchant, pt, { ...receipt, logs: [] }, tx), /EVENT_MISMATCH/)
  assert.throws(() => verifyGymBusinessReceipt(hash, vault, merchant, pt, { ...receipt, logs: [{ ...receipt.logs[0], address: buyer }] }, tx), /EVENT_MISMATCH/)
  assert.throws(() => verifyGymBusinessReceipt(hash, vault, merchant, { ...pt, agreementId: 2n }, receipt, tx), /TRANSACTION_MISMATCH/)
})

test('TIME_ACCESS, finalize and payout require exact event semantics and amounts', () => {
  const pTime = proof(time, 'ClaimProposed', { agreementId: 1n, claimId: 4n, sessionId: `0x${'00'.repeat(32)}` },
    [evidenceHash, 110n, 120n, 120n, 180n, 12n])
  assert.deepEqual(verifyGymBusinessReceipt(hash, vault, merchant, time, pTime.receipt, pTime.tx),
    { name: 'ClaimProposed', claimId: 4n })
  const pFinal = proof(final, 'ClaimFinalized', { agreementId: 1n, claimId: 3n }, [100n])
  assert.deepEqual(verifyGymBusinessReceipt(hash, vault, merchant, final, pFinal.receipt, pFinal.tx),
    { name: 'ClaimFinalized' })
  const pEarn = proof(earned, 'EarnedClaimed', { agreementId: 1n, merchant }, [100n])
  assert.deepEqual(verifyGymBusinessReceipt(hash, vault, merchant, earned, pEarn.receipt, pEarn.tx),
    { name: 'EarnedClaimed', amount: 100n })
  const wrong = proof(earned, 'EarnedClaimed', { agreementId: 1n, merchant }, [0n])
  assert.throws(() => verifyGymBusinessReceipt(hash, vault, merchant, earned, wrong.receipt, wrong.tx), /EVENT_MISMATCH/)
})

test('refresh happens only after verified business event; failed refresh remains explicit', async () => {
  const { tx, receipt } = ptProof()
  let refreshCount = 0
  const params = { hash, vault, merchant, intent: pt,
    before: { account: merchant, chainId: 43113, vault },
    waitForReceipt: async () => receipt,
    getTransaction: async () => tx,
    refresh: async () => { refreshCount++; return { account: merchant, vault, chainId: 43113,
      headBlock: 103n, data: { amount: 1003n } } },
  }
  const good = await verifyExistingGymHashAndRefresh(params)
  assert.equal(good.data.amount, 1003n)
  assert.equal(refreshCount, 1)
  const bad = await verifyExistingGymHashAndRefresh({ ...params,
    waitForReceipt: async () => ({ ...receipt, logs: [] }),
  }).then(() => false, () => true)
  assert.equal(bad, true)
  assert.equal(refreshCount, 1)
  await assert.rejects(verifyExistingGymHashAndRefresh({ ...params,
    vault: buyer,
  }), /NOT_VERIFIED/)
  const failed = await verifyExistingGymHashAndRefresh({ ...params,
    refresh: async () => { throw new Error('RPC stale') },
  })
  assert.equal(failed.data, undefined)
  assert.match(failed.refreshError, /RPC stale/)
  const stale = await verifyExistingGymHashAndRefresh({ ...params,
    refresh: async () => ({ account: merchant, vault, chainId: 43113, headBlock: 100n, data: {} }),
  })
  assert.match(stale.refreshError, /head changed/)
})

// D18-08 direct-ID fallback. Mock readAgreement models the already verified
// D18-07 readSharedAgreement contract, never a fabricated UI fixture.
const directBase = () => ({
  chain: { id: 43113 }, vault, fromBlock: START,
  account: merchant, merchant, head: { number: START + 20n },
})
const directRecord = (overrides = {}) => ({
  agreementId: 1n, chainId: 43113, vault, blockNumber: START + 20n,
  account: merchant, role: 'merchant', source: 'VAULT_READ_CONTRACT',
  agreement: { ...agreement, buyer, termsHash: approvedTermsHash },
  ledger: { deposited: 1003n, remainingLocked: 1003n, withdrawable: 0n,
    disputedLocked: 0n, refundable: 0n, unallocated: 1003n },
  claims: undefined,
  ...overrides,
})
const acceptedDeployment = async () => {}
const direct = (session = directBase(), id = 1n, record = directRecord(), verify = acceptedDeployment) =>
  readDirectGymAgreement(session, id, async () => record, verify)

test('direct Agreement #1 read succeeds without calling discovery getLogs, with pinned ledger', async () => {
  let calls = 0
  let verified = 0
  const session = { ...directBase(), publicClient: { getLogs: () => {
    throw Error('FULL_DISCOVERY_MUST_NOT_RUN')
  } } }
  const result = await readDirectGymAgreement(session, 1n, async (_session, id) => {
    calls++
    assert.equal(id, 1n)
    return directRecord()
  }, async () => { verified++ })
  assert.equal(verified, 1)
  assert.equal(calls, 1)
  assert.equal(result.id, 1n)
  assert.equal(result.headBlock, START + 20n)
  assert.equal(result.data.ledger.remainingLocked, 1003n)
  assert.equal(result.data.ledger.withdrawable, 0n)
  assert.equal(result.data.claims, undefined) // Claim history NOT_VERIFIED, not fabricated empty.
  assert.equal('agreements' in result, false) // Direct read is not full list verification.
})

test('invalid or missing agreement ID fails before all RPC/read callbacks', async () => {
  let called = false
  for (const invalid of [undefined, null, 0n, -1n, (1n << 256n), '1']) {
    await assert.rejects(readDirectGymAgreement(directBase(), invalid, async () => {
      called = true
      return directRecord()
    }, async () => { called = true }), /NOT_VERIFIED/)
  }
  assert.equal(called, false)
  assert.equal(parseGymRoute('/gym/agreements/0').page, 'not-found')
  assert.equal(parseGymRoute('/gym/claims/new').id, undefined)
})

test('direct ID fails closed on wrong chain, wallet, vault and deployment block', async () => {
  let calls = 0
  const read = async () => { calls++; return directRecord() }
  for (const patch of [
    { chain: { id: 31337 } }, { vault: buyer }, { account: buyer },
    { merchant: buyer }, { fromBlock: START + 1n },
    { head: { number: START - 1n } },
  ]) {
    await assert.rejects(readDirectGymAgreement({ ...directBase(), ...patch }, 1n,
      read, acceptedDeployment), /NOT_VERIFIED/)
  }
  assert.equal(calls, 0)
})

test('direct ID rejects wrong accepted runtime through deployment verifier before reading', async () => {
  let reads = 0
  await assert.rejects(readDirectGymAgreement(directBase(), 1n, async () => {
    reads++
    return directRecord()
  }, async () => { throw Error('NOT_VERIFIED: Fuji deployment identity mismatch') }), /NOT_VERIFIED/)
  assert.equal(reads, 0)
})

test('direct ID rejects incorrect terms, wrong merchant and wrong verified role', async () => {
  for (const data of [
    directRecord({ agreement: { ...agreement, buyer, termsHash: '0x' + 'ff'.repeat(32) } }),
    directRecord({ agreement: { ...agreement, merchant: buyer, buyer, termsHash: approvedTermsHash } }),
    directRecord({ role: 'observer' }),
    directRecord({ source: 'DEMO_FIXTURE' }),
    directRecord({ agreementId: 2n }),
    directRecord({ blockNumber: START + 19n }),
    directRecord({ chainId: 31337 }),
    directRecord({ vault: buyer }),
    directRecord({ account: buyer }),
  ]) await assert.rejects(direct(directBase(), 1n, data), /NOT_VERIFIED/)
})

test('direct read propagates RPC failure and never substitutes a fixture', async () => {
  await assert.rejects(readDirectGymAgreement(directBase(), 1n,
    async () => { throw Error('RPC unavailable') }, acceptedDeployment), /RPC unavailable/)
})

test('partial discovery remains INCOMPLETE even when direct ID is verified', async () => {
  const session = { ...directBase(), head: { number: START + 101n },
    publicClient: { getLogs: async ({ fromBlock }) => {
      if (fromBlock === START) return []
      throw Error('rate limit')
    } } }
  await assert.rejects(discoverMerchantAgreements(session, async () => directRecord()), /INCOMPLETE_LOG_READ/)
  const directSession = { ...session, head: { number: START + 20n } }
  const verified = await direct(directSession)
  assert.equal(verified.id, 1n)
  assert.equal(verified.data.source, 'VAULT_READ_CONTRACT')
  assert.equal('agreements' in verified, false)
})

test('Gym page wiring keeps direct-ID and incomplete full-history state separate', () => {
  const source = readFileSync(new URL('../src/portals/Gym.tsx', import.meta.url), 'utf8')
  assert.match(source, /readDirectGymAgreement\(session, route\.id, readSharedAgreement\)/)
  assert.match(source, /discoverMerchantAgreements\(session, readSharedAgreement\)/)
  assert.match(source, /INCOMPLETE_LOG_READ/)
  assert.match(source, /VERIFIED_DIRECT_ID_ONLY/)
  assert.match(source, /Không suy ra danh sách đầy đủ/)
  assert.match(source, /snap\.agreements \?\?/)
  assert.doesNotMatch(source, /\.writeContract\s*\(/)
  assert.match(source, /GYM_CHAIN_WRITES_ENABLED/)
})

test('direct ID default verifier rejects missing Vault bytecode before agreement RPC', async () => {
  let read = 0
  const session = { ...directBase(), publicClient: {
    readContract: async ({ functionName }) => {
      if (functionName === 'token') return '0x13562Ac0Ff647Bae830e1179FF1Fc976aBCe66A9'
      if (functionName === 'resolver') return '0x9eded45c48255039861d4d801Eb4287521A98019'
      throw Error('unexpected read')
    },
    getCode: async () => undefined,
  } }
  await assert.rejects(readDirectGymAgreement(session, 1n, async () => {
    read++
    return directRecord()
  }), /NOT_VERIFIED/)
  assert.equal(read, 0)
})
