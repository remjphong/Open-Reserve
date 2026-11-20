import test from 'node:test'
import assert from 'node:assert/strict'
import { PgStore } from '../dist/domain/store.js'
import { FUJI, parseVaultLog } from '../dist/domain/protocol.js'
import { openingLog } from './fixtures.mjs'

const allow = process.env.D18_10_TEST_DATABASE_URL && process.env.D18_10_ALLOW_TEST_DB_WRITES === '1'
test('OPTIONAL isolated chain_db/chain_user integration: replay, unique events, persisted checkpoint', { skip: allow ? false : 'NOT_RUN: isolated PostgreSQL and explicit test-write opt-in not configured' }, async()=>{
  const url=process.env.D18_10_TEST_DATABASE_URL
  const store=new PgStore(url)
  try {
    await store.initialize()
    const initial=await store.checkpoint()
    assert.equal(initial,null,'Run this test ONLY against an empty disposable chain_db database')
    const raw=openingLog(), block=FUJI.deploymentBlock
    const parsed=parseVaultLog(raw,block,block)
    await store.applyWindow(block,block,raw.blockHash,[parsed])
    await store.applyWindow(block,block,raw.blockHash,[parsed])
    assert.equal((await store.events('1',0,100)).items.length,1)
    assert.equal((await store.checkpoint()).height,block)
  } finally {await store.close()}
  const restart=new PgStore(url)
  try {
    await restart.initialize()
    const raw=openingLog(), block=FUJI.deploymentBlock
    await restart.applyWindow(block,block,raw.blockHash,[parseVaultLog(raw,block,block)])
    assert.equal((await restart.events('1',0,100)).items.length,1)
    assert.equal((await restart.checkpoint()).height,block)
  } finally { await restart.close() }
})
