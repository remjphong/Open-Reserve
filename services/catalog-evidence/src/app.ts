import Fastify from 'fastify'
import type { Dependency } from '@openreserve/api-contracts'
import { loadConfig, type Config } from './config.js'
import { checkDependencies } from './domain/readiness.js'
import { registerCatalog } from './routes/catalog.js'
import { registerHealth } from './routes/health.js'

export function buildApp(config: Config = loadConfig(), probe = () : Promise<Dependency[]> => checkDependencies(config), logger = false) {
  const app = Fastify({ logger, bodyLimit: 16384 })
  registerHealth(app, probe)
  registerCatalog(app, config)
  return app
}
