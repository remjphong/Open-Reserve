import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash, randomBytes } from 'node:crypto'
import pg from 'pg'
import { errorSchema, evidenceResponse, packagesResponse } from '@openreserve/api-contracts'
import { buildApp } from '../dist/app.js'

const databaseUrl = process.env.D17_TEST_CATALOG_DATABASE_URL
const digest = text => '0x' + createHash('sha256').update(text).digest('hex')

test('catalog PostgreSQL: fixtures, scoped evidence, pagination, disabled writes and storage loss', {
  skip: !databaseUrl && 'Set D17_TEST_CATALOG_DATABASE_URL for a disposable catalog_db',
}, async t => {
  const app = buildApp({ databaseUrl })
  t.after(() => app.close())
  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()
  t.after(() => client.end())
  const { rows: [identity] } = await client.query('SELECT current_database() AS db, current_user AS role')
  assert.deepEqual(identity, { db: 'catalog_db', role: 'catalog_user' })
  assert.equal((await app.inject('/ready')).statusCode, 200)

  const catalog = await app.inject('/v1/packages')
  assert.equal(catalog.statusCode, 200)
  const { packages } = packagesResponse.parse(catalog.json())
  assert.deepEqual(packages.map(p => [p.id, p.priceTokenUnits]), [['pt-10', '1003'], ['time-90', '900']])
  for (const entry of packages) {
    assert.equal(entry.source, 'DEMO_FIXTURE')
    assert.equal(entry.termsHash, '0x32f8c0afbc8e0cabce1cd940791651b578630150fdef727c3cf53cd27144d0d8')
  }

  const migration = await readFile(new URL('../migrations/001-evidence-records.sql', import.meta.url), 'utf8')
  await client.query(migration)
  await client.query(migration)
  const id = BigInt('0x01' + randomBytes(16).toString('hex')).toString()
  const otherId = (BigInt(id) + 1n).toString()
  try {
    for (const [agreement, claim, description] of [
      [id, 1, 'Disposable pagination fixture one'],
      [otherId, 1, 'Disposable fixture for a different agreement'],
      [id, 2, 'Disposable pagination fixture two'],
    ]) {
      await client.query(
        'INSERT INTO public.evidence_records (agreement_id, claim_id, evidence_hash, source, description) VALUES ($1, $2, $3, $4, $5)',
        [agreement, claim, digest(description), 'DEMO_FIXTURE', description],
      )
    }
    const first = await app.inject('/v1/agreements/' + id + '/evidence?limit=1')
    assert.equal(first.statusCode, 200)
    const page = evidenceResponse.parse(first.json())
    assert.equal(page.items.length, 1)
    assert.equal(page.items[0].source, 'DEMO_FIXTURE')
    assert.equal(page.items[0].evidenceHash, digest('Disposable pagination fixture one'))
    assert.ok(page.nextCursor)
    const tail = await app.inject('/v1/agreements/' + id + '/evidence?limit=1&cursor=' + page.nextCursor)
    assert.equal(tail.statusCode, 200)
    const last = evidenceResponse.parse(tail.json())
    assert.deepEqual(last.items.map(record => record.claimId), ['2'])
    assert.equal(last.nextCursor, null)

    const wrongAgreement = await app.inject('/v1/agreements/' + otherId + '/evidence?cursor=' + page.nextCursor)
    assert.equal(wrongAgreement.statusCode, 400)
    const missing = await app.inject('/v1/agreements/' + (BigInt(id) + 2n) + '/evidence')
    assert.equal(missing.statusCode, 200)
    assert.deepEqual(evidenceResponse.parse(missing.json()), { items: [], nextCursor: null })

    const posted = await app.inject({ method: 'POST', url: '/v1/evidence', payload: page.items[0] })
    assert.equal(posted.statusCode, 501)
    assert.equal(errorSchema.parse(posted.json()).error.code, 'WRITE_DISABLED')
    const result = await client.query('SELECT count(*)::int AS count FROM public.evidence_records WHERE agreement_id = $1', [id])
    assert.equal(result.rows[0].count, 2)
  } finally {
    await client.query('DELETE FROM public.evidence_records WHERE agreement_id IN ($1, $2)', [id, otherId])
  }

  const unreachable = new URL(databaseUrl)
  unreachable.port = '1'
  const degraded = buildApp({ databaseUrl: unreachable.href })
  t.after(() => degraded.close())
  assert.equal((await degraded.inject('/health')).statusCode, 200)
  assert.equal((await degraded.inject('/ready')).statusCode, 503)
  for (const url of ['/v1/packages', '/v1/agreements/1/evidence']) {
    const response = await degraded.inject(url)
    assert.equal(response.statusCode, 503)
    assert.equal(errorSchema.parse(response.json()).error.code, 'DEPENDENCY_UNAVAILABLE')
  }
})
