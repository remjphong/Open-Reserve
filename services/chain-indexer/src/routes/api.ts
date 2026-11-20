import type { FastifyInstance } from 'fastify'
import { errorSchema, idParams, pageQuery, syncResponse } from '@openreserve/api-contracts'
import { FUJI } from '../domain/protocol.js'
import type { Indexer } from '../domain/indexer.js'

function invalid(reason: string) {
  return errorSchema.parse({ error: { code: 'INVALID_REQUEST', message: reason } })
}
function dependency() {
  return errorSchema.parse({ error: { code: 'DEPENDENCY_UNAVAILABLE', message: 'Indexer unavailable or not verified; try direct Fuji read for financial state.' } })
}
function absent() {
  return errorSchema.parse({ error: { code: 'NOT_FOUND', message: 'Agreement not found in fully verified indexed history.' } })
}
function readCursor(value: string | undefined, id: string): number {
  if (!value) return 0
  if (value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('INVALID_CURSOR')
  const raw: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
  if (!raw || typeof raw !== 'object') throw new Error('INVALID_CURSOR')
  const fields = raw as Record<string, unknown>
  if (fields.id !== id || !Number.isSafeInteger(fields.offset) || (fields.offset as number) < 0 || (fields.offset as number) > 1_000_000) throw new Error('INVALID_CURSOR')
  return fields.offset as number
}
export function registerApi(app: FastifyInstance, runtime: Indexer | undefined) {
  app.get('/v1/sync', async (_req, reply) => {
    if (!runtime) return reply.code(503).send(syncResponse.parse({
      chainId: FUJI.chainId, contractAddress: null, deploymentBlock: FUJI.deploymentBlock.toString(),
      lastIndexedBlock: null, chainTip: null, lag: null, isStale: true,
      replayState: 'NOT_STARTED', lastError: 'NOT_CONFIGURED',
    }))
    const { payload, code } = runtime.getSync()
    return reply.code(code).send(payload)
  })
  app.get('/v1/agreements/:id', async (req, reply) => {
    const result = idParams.safeParse(req.params)
    if (!result.success) return reply.code(400).send(invalid('Invalid positive agreement ID.'))
    if (!runtime) return reply.code(503).send(dependency())
    try {
      const item = await runtime.agreement(result.data.id)
      return item ? reply.code(200).send(item) : reply.code(404).send(absent())
    } catch { return reply.code(503).send(dependency()) }
  })
  app.get('/v1/agreements/:id/events', async (req, reply) => {
    const id = idParams.safeParse(req.params)
    const page = pageQuery.safeParse(req.query)
    if (!id.success || !page.success) return reply.code(400).send(invalid('Invalid agreement ID or page query.'))
    let offset: number
    try { offset = readCursor(page.data.cursor, id.data.id) }
    catch { return reply.code(400).send(invalid('Invalid event page cursor.')) }
    if (!runtime) return reply.code(503).send(dependency())
    try {
      const result = await runtime.events(id.data.id, offset, page.data.limit)
      return result ? reply.code(200).send(result) : reply.code(404).send(absent())
    } catch { return reply.code(503).send(dependency()) }
  })
}
