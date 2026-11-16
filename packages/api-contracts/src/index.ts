import { z } from 'zod'

export const serviceName = z.enum(['catalog-evidence', 'chain-indexer', 'economics'])
export const uint = z.string().max(78).regex(/^(0|[1-9][0-9]*)$/).refine(v => /^[0-9]{1,78}$/.test(v) && BigInt(v) < 2n ** 256n, 'invalid uint256')
export const entityId = uint.refine(v => v !== '0', 'ID starts at 1')
export const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/)
export const hash = z.string().regex(/^0x[0-9a-fA-F]{64}$/)
export const chainId = z.union([z.literal(31337), z.literal(43113)])
export const healthSchema = z.strictObject({ service: serviceName, status: z.literal('alive') })
export const dependencySchema = z.strictObject({
  name: z.enum(['database', 'rpc', 'sync']), ok: z.boolean(),
  reason: z.enum(['OK', 'NOT_CONFIGURED', 'UNAVAILABLE', 'WRONG_DATABASE', 'WRONG_CHAIN', 'SYNC_NOT_IMPLEMENTED']),
}).refine(v => v.ok === (v.reason === 'OK'), 'reason must agree with ok')
export const readySchema = z.strictObject({
  service: serviceName, ready: z.boolean(), dependencies: z.array(dependencySchema),
}).refine(v => v.ready === v.dependencies.every(d => d.ok), 'readiness must agree with dependency checks')
  .refine(v => {
    const expected = { 'catalog-evidence': ['database'], 'chain-indexer': ['database', 'rpc', 'sync'], economics: [] }[v.service]
    return expected.length === v.dependencies.length && expected.every(name => v.dependencies.some(d => d.name === name))
  }, 'all required checks must be reported')
export const errorSchema = z.strictObject({ error: z.strictObject({
  code: z.enum(['NOT_IMPLEMENTED', 'WRITE_DISABLED', 'INVALID_REQUEST', 'NOT_FOUND', 'DEPENDENCY_UNAVAILABLE', 'UNAUTHORIZED', 'FORBIDDEN', 'REPLAY', 'RATE_LIMITED', 'INTERNAL_ERROR']),
  message: z.string().min(1),
}) })
export const idParams = z.strictObject({ id: entityId })
export const pageQuery = z.strictObject({ cursor: z.string().max(512).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) })
export const policy = z.enum(['PER_SESSION', 'TIME_ACCESS'])
export const packageSchema = z.strictObject({
  id: z.enum(['pt-10', 'time-90']), type: policy, title: z.string().min(1),
  termsVersion: z.literal('1.0.1'), termsHash: hash,
  source: z.literal('DEMO_FIXTURE'), label: z.literal('MINH HỌA'),
  priceTokenUnits: uint, tokenDecimals: z.literal(18), sessions: z.union([z.literal(10), z.null()]),
  businessDurationDays: z.union([z.literal(90), z.null()]),
}).refine(p => p.type === 'PER_SESSION' ? p.id === 'pt-10' && p.sessions === 10 && p.businessDurationDays === null : p.id === 'time-90' && p.sessions === null && p.businessDurationDays === 90)
export const packagesResponse = z.strictObject({ packages: z.array(packageSchema).length(2) }).refine(v => new Set(v.packages.map(p => p.id)).size === 2)
export const evidenceSchema = z.strictObject({
  agreementId: entityId, claimId: entityId, evidenceHash: hash,
  source: z.enum(['DEMO_FIXTURE', 'SIGNED_UPLOAD']), description: z.string().min(1).max(4000),
  externalUrl: z.url().refine(v => new URL(v).protocol === 'https:').nullable(),
})
export const evidenceResponse = z.strictObject({ items: z.array(evidenceSchema), nextCursor: z.string().nullable() })
// Future signed envelope contract. This is a shape, NOT a verifier or permission grant.
export const evidenceUploadSchema = evidenceSchema.extend({ source: z.literal('SIGNED_UPLOAD') })
export const evidenceRequest = z.strictObject({
  evidence: evidenceUploadSchema, signer: address, signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
  nonce: hash, expiresAt: uint, chainId: z.literal(43113), contractAddress: address,
  domain: z.string().min(1).max(255), action: z.literal('CREATE_EVIDENCE'), payloadHash: hash,
})
export const projectionMeta = z.strictObject({
  chainId, contractAddress: address, lastIndexedBlock: uint, isStale: z.boolean(),
  indexedAt: z.iso.datetime(), source: z.literal('CHAIN_READ_MODEL'),
})
export const agreementResponse = z.strictObject({
  meta: projectionMeta, agreementId: entityId, buyer: address, merchant: address,
  policy, state: z.enum(['OPEN', 'TERMINATED']), termsHash: hash,
  startAt: uint, endAt: uint, challengeWindow: uint,
  sessionsFinalized: z.number().int().min(0).max(10), positiveRefundSlots: z.number().int().min(0).max(10),
  sessionsConsumed: z.number().int().min(0).max(10), liveClaims: uint, challengedSessionClaimId: uint,
  deposited: uint, earnedFinalized: uint, gymWithdrawn: uint, refundAuthorized: uint, buyerRefunded: uint,
  remainingLocked: uint, withdrawable: uint, refundable: uint, disputedLocked: uint, unallocated: uint,
})
export const eventSchema = z.strictObject({
  chainId, contractAddress: address, agreementId: entityId, txHash: hash, logIndex: z.number().int().nonnegative(),
  blockNumber: uint, blockHash: hash, transactionIndex: z.number().int().nonnegative(),
  topics: z.array(hash).min(1).max(4), data: z.string().regex(/^0x([0-9a-fA-F]{2})*$/),
  confirmations: uint, removed: z.boolean(),
})
export const eventsResponse = z.strictObject({ meta: projectionMeta, items: z.array(eventSchema), nextCursor: z.string().nullable() })
export const syncResponse = z.strictObject({
  chainId, contractAddress: address.nullable(), deploymentBlock: uint.nullable(), lastIndexedBlock: uint.nullable(),
  chainTip: uint.nullable(), lag: uint.nullable(), isStale: z.boolean(),
  replayState: z.enum(['NOT_STARTED', 'REPLAYING', 'IDLE']), lastError: z.string().nullable(),
})
const nonnegative = z.number().finite().nonnegative()
const fraction = z.number().finite().min(0).max(1)
export const scenarioRequest = z.strictObject({
  label: z.literal('MINH HỌA'), currency: z.literal('VND'), price: nonnegative, variableGymCost: nonnegative,
  annualCostOfFunds: fraction, termDays: z.number().int().positive().max(3650),
  platformCAC: nonnegative, platformVariableCost: nonnegative, platformFeeRate: fraction,
  incrementalNewCustomers: z.number().int().nonnegative(), refundRate: fraction,
})
export const scenarioResponse = z.strictObject({ label: z.literal('MINH HỌA'), currency: z.literal('VND'),
  assumptions: scenarioRequest, scenarios: z.array(z.strictObject({
    model: z.enum(['A', 'B', 'C', 'D']), gymIncrementalContribution: z.number().finite(),
    cashGap: z.number().finite(), platformUnitMargin: z.number().finite(),
  })).length(4),
}).refine(v => new Set(v.scenarios.map(s => s.model)).size === 4)
export type PackagesResponse = z.infer<typeof packagesResponse>
export type EvidenceRequest = z.infer<typeof evidenceRequest>
export type EvidenceResponse = z.infer<typeof evidenceResponse>
export type EventsResponse = z.infer<typeof eventsResponse>
export type ApiError = z.infer<typeof errorSchema>
export type Health = z.infer<typeof healthSchema>
export type Readiness = z.infer<typeof readySchema>
export type Dependency = z.infer<typeof dependencySchema>
export type Package = z.infer<typeof packageSchema>
export type Evidence = z.infer<typeof evidenceSchema>
export type AgreementProjection = z.infer<typeof agreementResponse>
export type ChainEvent = z.infer<typeof eventSchema>
export type SyncStatus = z.infer<typeof syncResponse>
export type ScenarioInput = z.infer<typeof scenarioRequest>
export type ScenarioComparison = z.infer<typeof scenarioResponse>
