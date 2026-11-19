import test from 'node:test'
import assert from 'node:assert/strict'
import {
  verifiedFujiDeployment,
  assertVerifiedFujiDeployment,
} from '../dist/index.js'

function identity() {
  const {
    chainId, vault, token, resolver,
    deploymentBlock, runtimeCodeHash,
  } = verifiedFujiDeployment

  return {
    chainId, vault, token, resolver,
    deploymentBlock, runtimeCodeHash,
  }
}

test('accepted Fuji deployment identity passes', () => {
  assert.doesNotThrow(() =>
    assertVerifiedFujiDeployment(identity())
  )
})

test('deployment mismatches fail closed', () => {
  const original = identity()
  const invalid = [
    { chainId: 31337 },
    { deploymentBlock: 1n },
    { vault: original.token },
    { token: original.vault },
    { resolver: original.token },
    { runtimeCodeHash: '0x' + '00'.repeat(32) },
  ]

  for (const mutation of invalid) {
    assert.throws(() =>
      assertVerifiedFujiDeployment({
        ...original, ...mutation,
      })
    )
  }
})

test('deployment identity has recorded evidence', () => {
  assert.equal(verifiedFujiDeployment.chainId, 43113)
  assert.equal(verifiedFujiDeployment.deploymentBlock, 61240386n)
  assert.match(verifiedFujiDeployment.evidence, /stage-b-review\.md$/)
  assert.match(verifiedFujiDeployment.receipt, /^0x[0-9a-f]{64}$/)
})
