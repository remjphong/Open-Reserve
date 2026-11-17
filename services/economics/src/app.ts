import Fastify from 'fastify'
import type { Dependency } from '@openreserve/api-contracts'
import { errorSchema, scenarioRequest } from '@openreserve/api-contracts'
import { loadConfig, type Config } from './config.js'
import { checkDependencies } from './domain/readiness.js'
import { registerHealth } from './routes/health.js'

export function buildApp(
  config: Config = loadConfig(), probe = (): Promise<Dependency[]> => checkDependencies(config), logger = false,
) {
  const app = Fastify({ logger, bodyLimit: 16384 })
  registerHealth(app, probe)

  app.post('/v1/scenarios/compare', async (request, reply) => {
    const input = scenarioRequest.safeParse(request.body)
    if (!input.success) return reply.code(400).send(errorSchema.parse({
      error: { code: 'INVALID_REQUEST', message: 'Input must match the v1 scenario request schema.' },
    }))

    return reply.code(501).send(errorSchema.parse({
      error: { code: 'NOT_IMPLEMENTED', message: 'BLOCKED_PENDING_DECISION_RECORD: Approved A/B/C/D calculations are unavailable.' },
    }))
  })
  return app
}
