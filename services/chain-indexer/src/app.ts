import Fastify from 'fastify'
import type { Dependency } from '@openreserve/api-contracts'
import { errorSchema } from '@openreserve/api-contracts'
import { loadConfig, type Config } from './config.js'
import { checkDependencies } from './domain/readiness.js'
import { registerHealth } from './routes/health.js'

export function buildApp(config: Config = loadConfig(), probe = () : Promise<Dependency[]> => checkDependencies(config), logger = false) {
  const app = Fastify({ logger, bodyLimit: 16384 })
  registerHealth(app, probe)
  // No business handlers or writes until their own checkpoint and authorization tests.
  const routes = [["GET", "/v1/agreements/:id"], ["GET", "/v1/agreements/:id/events"], ["GET", "/v1/sync"]] as const
  for (const [method, url] of routes) {
    app.route({ method, url, handler: async (_request, reply) => reply.code(501).send(errorSchema.parse({
      error: { code: 'NOT_IMPLEMENTED', message: 'Unavailable in D16-09; no operation performed.' }
    })) })
  }
  return app
}
