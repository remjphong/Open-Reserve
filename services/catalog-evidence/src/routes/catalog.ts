import type { FastifyInstance, FastifyReply } from 'fastify'
import { errorSchema, evidenceResponse, idParams, packagesResponse, pageQuery, type Evidence } from '@openreserve/api-contracts'
import type { Config } from '../config.js'
import { withCatalogDatabase } from '../domain/readiness.js'

const fixture = {
  source: 'DEMO_FIXTURE',
  label: 'MINH HỌA',
  termsVersion: '1.0.1',
  termsHash: '0x32f8c0afbc8e0cabce1cd940791651b578630150fdef727c3cf53cd27144d0d8',
  tokenDecimals: 18,
} as const

const packages = packagesResponse.parse({ packages: [
  { ...fixture, id: 'pt-10', type: 'PER_SESSION', title: 'Gói PT cá nhân · 10 buổi tập',
    priceTokenUnits: '1003', sessions: 10, businessDurationDays: null },
  { ...fixture, id: 'time-90', type: 'TIME_ACCESS', title: 'Gói tập không giới hạn · quyền vào phòng tập 90 ngày',
    priceTokenUnits: '900', sessions: null, businessDurationDays: 90 },
] })

function fail(reply: FastifyReply, status: number, code: 'INVALID_REQUEST' | 'WRITE_DISABLED' | 'DEPENDENCY_UNAVAILABLE' | 'INTERNAL_ERROR', message: string) {
  return reply.code(status).send(errorSchema.parse({ error: { code, message } }))
}

function cursorPosition(cursor: string, id: string) {
  const decoded = Buffer.from(cursor, 'base64url')
  if (decoded.toString('base64url') !== cursor) return
  const [agreementId, position, ...extra] = decoded.toString('utf8').split(':')
  if (agreementId !== id || extra.length || !/^[1-9][0-9]{0,18}$/.test(position) ||
      BigInt(position) > 9223372036854775807n) return
  return position
}

export function registerCatalog(app: FastifyInstance, config: Config) {
  app.get('/v1/packages', async (request, reply) => {
    if (Object.keys(request.query as object).length) return fail(reply, 400, 'INVALID_REQUEST', 'This endpoint has no query parameters.')
    const result = await withCatalogDatabase(config.databaseUrl, async () => packages)
    if (!result.ok) return fail(reply, 503, 'DEPENDENCY_UNAVAILABLE', 'Catalog database unavailable.')
    return result.value
  })

  app.get('/v1/agreements/:id/evidence', async (request, reply) => {
    const params = idParams.safeParse(request.params)
    const query = pageQuery.safeParse(request.query)
    if (!params.success || !query.success) return fail(reply, 400, 'INVALID_REQUEST', 'Invalid agreement ID or page parameters.')
    const { id } = params.data
    const { cursor, limit } = query.data
    const position = cursor === undefined ? '0' : cursorPosition(cursor, id)
    if (position === undefined) return fail(reply, 400, 'INVALID_REQUEST', 'Invalid cursor for this agreement.')

    const result = await withCatalogDatabase(config.databaseUrl, async client => {
      const { rows } = await client.query<Evidence & { recordId: string }>(`
        SELECT record_id::text AS "recordId", trunc(agreement_id)::text AS "agreementId", trunc(claim_id)::text AS "claimId",
               evidence_hash AS "evidenceHash", source, description, external_url AS "externalUrl"
        FROM public.evidence_records
        WHERE agreement_id = $1 AND record_id > $2
        ORDER BY record_id ASC
        LIMIT $3
      `, [id, position, limit + 1])
      return rows
    })
    if (!result.ok) return fail(reply, 503, 'DEPENDENCY_UNAVAILABLE', 'Evidence storage unavailable.')
    const page = result.value.slice(0, limit)
    const items = page.map(({ recordId: _recordId, ...record }) => record)
    const nextCursor = result.value.length > limit
      ? Buffer.from(id + ':' + page[page.length - 1].recordId, 'utf8').toString('base64url')
      : null
    const response = evidenceResponse.safeParse({ items, nextCursor })
    if (!response.success) return fail(reply, 500, 'INTERNAL_ERROR', 'Stored evidence does not match the response schema.')
    return response.data
  })

  app.post('/v1/evidence', async (_request, reply) =>
    fail(reply, 501, 'WRITE_DISABLED', 'Signed evidence writes are disabled.'))
}
