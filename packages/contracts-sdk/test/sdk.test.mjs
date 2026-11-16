import test from 'node:test'
import assert from 'node:assert/strict'
import { readOnlyVaultAbi, reserveVaultAbi, approvedTermsHash, timeProfiles, assertTimeProfile } from '../dist/index.js'

test('read-only surface includes no transaction methods', () => {
  assert.equal(reserveVaultAbi.filter(v => v.type === 'function').length, 23)
  assert.ok(reserveVaultAbi.some(v => v.name === 'SessionProposalCancelled'))
  assert.ok(readOnlyVaultAbi.length > 0)
  assert.ok(readOnlyVaultAbi.every(v => v.type === 'function' && v.stateMutability === 'view'))
  assert.ok(!readOnlyVaultAbi.some(v => v.name === 'claimRefund'))
})
test('immutable profiles and approved terms fail closed on mismatch', () => {
  for (const chainId of [31337, 43113]) {
    const config = { ...timeProfiles[chainId], termsHash: approvedTermsHash }
    assert.doesNotThrow(() => assertTimeProfile(chainId, config))
    assert.throws(() => assertTimeProfile(chainId, { ...config, challengeWindow: 1n }))
    assert.throws(() => assertTimeProfile(chainId, { ...config, termsHash: '0x00' }))
  }
  assert.throws(() => assertTimeProfile(1, {}))
})
