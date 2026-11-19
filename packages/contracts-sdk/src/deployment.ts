/**
 * Fuji identity established by accepted D18-02 Stage B evidence.
 * Source: proofs/d18-02-preflight/stage-b-review.md
 *
 * These constants are historical deployment identity,
 * NOT proof that the current RPC is healthy or synchronized.
 */
export const verifiedFujiDeployment = {
  chainId: 43113,
  vault: '0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad',
  token: '0x13562Ac0Ff647Bae830e1179FF1Fc976aBCe66A9',
  resolver: '0x9eded45c48255039861d4d801Eb4287521A98019',
  deploymentBlock: 61240386n,
  runtimeCodeHash:
    '0xec6e91428e146d4e97b0eed09cf4afbdd701c95a64ca8b6b2a696102242db366',
  receipt:
    '0x120617c50873b2393289c5f292c065a060d565b99f0fc8707d82071cfb179451',
  evidence: 'proofs/d18-02-preflight/stage-b-review.md',
} as const

type ObservedFujiDeployment = {
  chainId: number
  vault: string
  token: string
  resolver: string
  deploymentBlock: bigint
  runtimeCodeHash: string
}

export function assertVerifiedFujiDeployment(
  observed: ObservedFujiDeployment,
): void {
  const expected = verifiedFujiDeployment

  const same = (a: string, b: string) =>
    a.toLowerCase() === b.toLowerCase()

  if (
    observed.chainId !== expected.chainId ||
    observed.deploymentBlock !== expected.deploymentBlock ||
    !same(observed.vault, expected.vault) ||
    !same(observed.token, expected.token) ||
    !same(observed.resolver, expected.resolver) ||
    !same(observed.runtimeCodeHash, expected.runtimeCodeHash)
  ) {
    throw new Error('NOT_VERIFIED: Fuji deployment identity mismatch')
  }
}
