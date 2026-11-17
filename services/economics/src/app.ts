import Fastify from 'fastify'
import type { Dependency } from '@openreserve/api-contracts'
import { errorSchema, scenarioRequestV2, scenarioResponseV2 } from '@openreserve/api-contracts'
import { loadConfig, type Config } from './config.js'
import { checkDependencies } from './domain/readiness.js'
import { compareScenariosV2 } from './domain/scenarios-v2.js'
import { registerHealth } from './routes/health.js'

export function buildApp(config: Config = loadConfig(), probe = () : Promise<Dependency[]> => checkDependencies(config), logger = false) {
  const app = Fastify({ logger, bodyLimit: 16384 })
  registerHealth(app, probe)
  // Preserve the existing v1 compatibility response while the acceptance amendment is reviewed.
  const routes = [["POST", "/v1/scenarios/compare"]] as const
  for (const [method, url] of routes) {
    app.route({ method, url, handler: async (_request, reply) => reply.code(501).send(errorSchema.parse({
      error: { code: 'NOT_IMPLEMENTED', message: 'Unavailable in D16-09; no operation performed.' }
    })) })
  }
  app.post('/v2/scenarios/compare', async (request, reply) => {
    const input = scenarioRequestV2.safeParse(request.body)
    if (!input.success) return reply.code(400).send(errorSchema.parse({
      error: { code: 'INVALID_REQUEST', message: 'Input must match the v2 scenario request schema.' },
    }))
    return scenarioResponseV2.parse(compareScenariosV2(input.data))
  })
  return app
}
