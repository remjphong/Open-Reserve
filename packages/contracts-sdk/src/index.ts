import { reserveVaultAbi } from './abi.js'
export { reserveVaultAbi, interfaceSha256 } from './abi.js'
export const supportedChainIds = [31337, 43113] as const
export type SupportedChainId = typeof supportedChainIds[number]
export type Address = `0x${string}`
export type Hash = `0x${string}`
export type AgreementId = bigint
export const termsVersion = '1.0.1' as const
export const approvedTermsHash = '0x32f8c0afbc8e0cabce1cd940791651b578630150fdef727c3cf53cd27144d0d8' as const
export const tokenDecimals = 18 as const
export const timeProfiles = {
  31337: { duration: 7776000n, challengeWindow: 86400n },
  43113: { duration: 270n, challengeWindow: 60n },
} as const
// No default deployment addresses: only a verified deployment receipt can supply these.
export type Deployment = { chainId: SupportedChainId; contractAddress: Address; deploymentBlock: bigint }
export const readOnlyVaultAbi = reserveVaultAbi.filter(item =>
  item.type === 'function' && item.stateMutability === 'view')
export type ReadFunction = typeof readOnlyVaultAbi[number]['name']
export function assertTimeProfile(chainId: SupportedChainId, config: { duration: bigint; challengeWindow: bigint; termsHash: Hash }): void {
  const expected = timeProfiles[chainId]
  if (!expected || config.duration !== expected.duration || config.challengeWindow !== expected.challengeWindow || config.termsHash !== approvedTermsHash) {
    throw new Error('Unapproved Vault configuration')
  }
}

// Tuple types derived from the generated ABI, so field changes cannot drift silently.
type Primitive<T extends string> = T extends 'address' ? Address : T extends 'bool' ? boolean : T extends `uint${string}` ? bigint : Hash
type AbiTuple<T extends readonly { name: string; type: string }[]> = { [C in T[number] as C['name']]: Primitive<C['type']> }
type FunctionNamed<N extends string> = Extract<typeof reserveVaultAbi[number], { type: 'function'; name: N }>
export type Agreement = AbiTuple<FunctionNamed<'getAgreement'>['outputs'][0]['components']>
export type Claim = AbiTuple<FunctionNamed<'getClaim'>['outputs'][0]['components']>
export type Termination = AbiTuple<FunctionNamed<'getTermination'>['outputs'][0]['components']>
export type Balances = AbiTuple<FunctionNamed<'getBalances'>['outputs']>
