import test from 'node:test'
import assert from 'node:assert/strict'
import { keccak256 } from '../dist/domain/keccak.js'
import { events, FUJI, parseVaultLog, parseFinancialView, encodeIdCall, CALL_GET_AGREEMENT } from '../dist/domain/protocol.js'

import { openingLog, mockView, account, gym, hashWord } from './fixtures.mjs'

test('Keccak-256 Ethereum padding matches standard event hash', () => {
  assert.equal(keccak256(new TextEncoder().encode('Transfer(address,address,uint256)')),
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef')
  assert.equal(Object.keys(events).length,14)
})
test('parse known indexed Vault AgreementOpened; reject forged contract/ABI/block', () => {
  const raw = openingLog()
  const actual = parseVaultLog(raw, FUJI.deploymentBlock, FUJI.deploymentBlock)
  assert.equal(actual.agreementId,'1')
  assert.equal(actual.eventName,'AgreementOpened')
  assert.equal(actual.opened.deposited,'1003')
  assert.equal(actual.opened.buyer,account)
  assert.equal(actual.opened.merchant,gym)
  assert.throws(()=>parseVaultLog({...raw,address:'0x'+'44'.repeat(20)},FUJI.deploymentBlock,FUJI.deploymentBlock),/WRONG_CONTRACT/)
  assert.throws(()=>parseVaultLog({...raw,topics:[...raw.topics.slice(0,3)]},FUJI.deploymentBlock,FUJI.deploymentBlock),/INVALID_LOG_ABI/)
  assert.throws(()=>parseVaultLog({...raw,removed:true},FUJI.deploymentBlock,FUJI.deploymentBlock),/REMOVED_LOG/)
  assert.throws(()=>parseVaultLog(raw,FUJI.deploymentBlock+1n,FUJI.deploymentBlock+2n),/INVALID_LOG_IDENTITY/)
})
test('manual view decode enforces Vault conservation, data length and state', () => {
  const [a,b] = mockView()
  const parsed = parseFinancialView(a,b,'1')
  assert.equal(parsed.deposited,'1003')
  assert.equal(parsed.remainingLocked,'1003')
  assert.equal(parsed.withdrawable,'0')
  assert.equal(parsed.sessionsConsumed,0)
  assert.equal(encodeIdCall(CALL_GET_AGREEMENT,'1'), CALL_GET_AGREEMENT+hashWord(1))
  assert.throws(()=>parseFinancialView(a,b.slice(0,-64),'1'),/INVALID_VAULT_VIEW/)
  const wrong = '0x' + [1002,0,0,0,1003].map(hashWord).join('')
  assert.throws(()=>parseFinancialView(a,wrong,'1'),/VAULT_INVARIANT_MISMATCH/)
})
