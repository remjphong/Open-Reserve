// Keccak-256 (Ethereum padding), used only for verifying the deployed Vault runtime.
// No signing, private keys, or transaction construction.
const MASK = (1n << 64n) - 1n
const rotation = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14]
const rounds = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
]
function rotate(x: bigint, n: number): bigint {
  return n === 0 ? x : ((x << BigInt(n)) | (x >> BigInt(64 - n))) & MASK
}
function permute(a: bigint[]): void {
  for (const rc of rounds) {
    const c = Array.from({ length: 5 }, (_, x) => a[x]! ^ a[x + 5]! ^ a[x + 10]! ^ a[x + 15]! ^ a[x + 20]!)
    for (let x = 0; x < 5; x++) {
      const d = c[(x + 4) % 5]! ^ rotate(c[(x + 1) % 5]!, 1)
      for (let y = 0; y < 5; y++) a[x + 5 * y] = a[x + 5 * y]! ^ d
    }
    const b = Array<bigint>(25).fill(0n)
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) {
      const p = x + 5 * y
      b[y + 5 * ((2 * x + 3 * y) % 5)] = rotate(a[p]!, rotation[p]!)
    }
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) {
      a[x + 5 * y] = b[x + 5 * y]! ^ ((~b[(x + 1) % 5 + 5 * y]!) & b[(x + 2) % 5 + 5 * y]!)
    }
    a[0] = a[0]! ^ rc
  }
}
export function keccak256(bytes: Uint8Array): `0x${string}` {
  const input = [...bytes, 0x01]
  while (input.length % 136 !== 135) input.push(0)
  input.push(0x80)
  const state = Array<bigint>(25).fill(0n)
  for (let offset = 0; offset < input.length; offset += 136) {
    for (let lane = 0; lane < 17; lane++) {
      let value = 0n
      for (let i = 0; i < 8; i++) value |= BigInt(input[offset + lane * 8 + i]!) << BigInt(i * 8)
      state[lane] = state[lane]! ^ value
    }
    permute(state)
  }
  const result: number[] = []
  for (let lane = 0; lane < 4; lane++) for (let i = 0; i < 8; i++) {
    result.push(Number((state[lane]! >> BigInt(i * 8)) & 255n))
  }
  return `0x${Buffer.from(result).toString('hex')}`
}
export function hexBytes(value: string): Uint8Array {
  if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) throw new Error('INVALID_HEX')
  return Buffer.from(value.slice(2), 'hex')
}
