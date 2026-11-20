export function loadConfig(env = process.env) {
  const port = Number(env.PORT ?? 3002)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  const chainId = Number(env.CHAIN_ID ?? 43113)
  if (!Number.isInteger(chainId) || ![31337, 43113].includes(chainId)) throw new Error('Invalid CHAIN_ID')
  const maxWindows = Number(env.INDEXER_WINDOWS_PER_POLL ?? 8)
  if (!Number.isInteger(maxWindows) || maxWindows < 1 || maxWindows > 100) throw new Error('Invalid INDEXER_WINDOWS_PER_POLL')
  const pollMs = Number(env.INDEXER_POLL_MS ?? 5000)
  if (!Number.isInteger(pollMs) || pollMs < 1000 || pollMs > 120000) throw new Error('Invalid INDEXER_POLL_MS')
  return { host: env.HOST ?? '127.0.0.1', port, databaseUrl: env.DATABASE_URL, rpcUrl: env.RPC_URL, chainId, maxWindows, pollMs }
}
export type Config = ReturnType<typeof loadConfig>
