import Fastify from 'fastify'
import type { Dependency } from '@openreserve/api-contracts'
import { loadConfig, type Config } from './config.js'
import { checkDependencies } from './domain/readiness.js'
import { Indexer } from './domain/indexer.js'
import { registerHealth } from './routes/health.js'
import { registerApi } from './routes/api.js'

// The last parameter is an injectable fixture seam for isolated HTTP tests, not a new service.
export function buildApp(config: Config = loadConfig(), probe?: () => Promise<Dependency[]>, logger = false, injectedIndexer?: Indexer) {
  const app = Fastify({ logger, bodyLimit: 16384 })
  const runtime = injectedIndexer ?? Indexer.fromConfig(config)
  registerHealth(app, probe ?? (() => checkDependencies(config, runtime?.ready ?? false)))
  registerApi(app, runtime)
  if (!injectedIndexer && runtime) {
    app.addHook('onListen', () => { void runtime.start() })
    app.addHook('onClose', async () => { await runtime.stop() })
  }
  return app
}
