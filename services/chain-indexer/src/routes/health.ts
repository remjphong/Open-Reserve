import type { FastifyInstance } from 'fastify'
import { healthSchema, readySchema, type Dependency } from '@openreserve/api-contracts'

export function registerHealth(app: FastifyInstance, probe: () => Promise<Dependency[]>) {
  app.get('/health', async () => healthSchema.parse({ service: 'chain-indexer', status: 'alive' }))
  app.get('/ready', async (_request, reply) => {
    const dependencies = await probe()
    const result = readySchema.parse({ service: 'chain-indexer', ready: dependencies.every(d => d.ok), dependencies })
    return reply.code(result.ready ? 200 : 503).send(result)
  })
}
