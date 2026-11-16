export function loadConfig(env = process.env) {
  const port = Number(env.PORT ?? 3002)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
  return { host: env.HOST ?? '127.0.0.1', port, databaseUrl: env.DATABASE_URL, rpcUrl: env.RPC_URL, chainId: Number(env.CHAIN_ID ?? 43113) }
}
export type Config = ReturnType<typeof loadConfig>
