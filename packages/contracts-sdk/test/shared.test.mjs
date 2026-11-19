import test from 'node:test'
import assert from 'node:assert/strict'
import { queryKeys, classifyVaultRole } from '../dist/index.js'

const vault = '0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad'
const buyer = '0x124C7DE92Df945477cAEbdC6745756C4B29e7b7B'
const merchant = '0xA337FCeC5f9508C3Ab5E10aE571610E167548878'
const resolver = '0x9eded45c48255039861d4d801Eb4287521A98019'

test('same agreement has stable portal-independent keys', () => {
  const first = queryKeys.agreement(43113, vault, 1n)
  const second = queryKeys.agreement(43113, vault.toLowerCase(), 1n)
  assert.deepEqual(first, second)
  assert.notDeepEqual(first, queryKeys.balances(43113, vault, 1n))
  assert.notDeepEqual(first, queryKeys.agreement(31337, vault, 1n))
})

test('invalid agreement IDs fail closed', () => {
  assert.throws(() => queryKeys.agreement(43113, vault, 0n))
  assert.throws(() => queryKeys.events(43113, vault, -1n))
  assert.throws(() => queryKeys.agreement(43113, vault, 2n ** 256n))
})

test('wallet role is resolved by address, not browser profile name', () => {
  assert.equal(classifyVaultRole(buyer, buyer, merchant, resolver), 'buyer')
  assert.equal(classifyVaultRole(merchant, buyer, merchant, resolver), 'merchant')
  assert.equal(classifyVaultRole(resolver, buyer, merchant, resolver), 'resolver')
  assert.equal(classifyVaultRole(vault, buyer, merchant, resolver), 'observer')
  assert.equal(classifyVaultRole(buyer.toLowerCase(), buyer, merchant, resolver), 'buyer')
})
