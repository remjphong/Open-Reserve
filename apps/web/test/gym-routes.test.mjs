import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseGymRoute } from '../src/lib/gym-chain.ts'

const src = name => readFileSync(new URL(name, import.meta.url), 'utf8')

test('five planned Gym entry routes map to their correct page', () => {
  assert.deepEqual(parseGymRoute('/gym'), { page: 'overview' })
  assert.deepEqual(parseGymRoute('/gym/agreements'), { page: 'agreements' })
  assert.deepEqual(parseGymRoute('/gym/agreements/1'), { page: 'detail', id: 1n })
  assert.deepEqual(parseGymRoute('/gym/claims/new', '?agreementId=1'), { page: 'claim', id: 1n })
  assert.deepEqual(parseGymRoute('/gym/payouts'), { page: 'payouts', id: undefined })
})

test('invalid IDs fail closed and fixture is explicitly isolated', () => {
  assert.equal(parseGymRoute('/gym/agreements/0').page, 'not-found')
  assert.equal(parseGymRoute('/gym/agreements/-1').page, 'not-found')
  assert.equal(parseGymRoute('/gym/agreements/1/dispute').page, 'not-found')
  assert.equal(parseGymRoute('/gym/claims/new').reason.includes('Chọn hợp đồng'), true)
  assert.equal(parseGymRoute('/gym/payouts', '?agreementId=bad').page, 'not-found')
  assert.equal(parseGymRoute('/gym/agreements/OR-024').page, 'fixture')
  assert.equal(parseGymRoute('/gym/agreements/OR-025').page, 'not-found')
})

test('Gym UI wiring is read-only, with explicit data provenance and no dead primary routes', () => {
  const gym = src('../src/portals/Gym.tsx')
  const main = src('../src/main.tsx')
  const shell = src('../src/design-system/portal.tsx')
  assert.match(main, /parseGymRoute\(path, window\.location\.search\)/)
  assert.match(main, /href: '\/gym\/agreements'/)
  assert.match(gym, /readSharedAgreement/)
  assert.match(gym, /INCOMPLETE_LOG_READ|discoverMerchantAgreements/)
  assert.match(gym, /DEMO_FIXTURE/)
  assert.match(gym, /VAULT_READ_CONTRACT/)
  assert.match(gym, /Không hiển thị danh sách rỗng đã xác minh/)
  assert.match(gym, /FUJI_WRITE_BLOCKED/)
  assert.match(shell, /FUJI READ ONLY/)
  assert.doesNotMatch(gym, /\.writeContract\s*\(/)
})
// D18-08 EIP1193 mock closure — executes the actual useGymData listener extracted from Gym.tsx.
// React hook scheduler and EIP-1193 wallet are isolated test doubles; NO browser/chain writes.
// D18_08_EIP1193_MOCK_START
const eipRequire = (await import('node:module')).createRequire(import.meta.url)
const eipVM = await import('node:vm')
const eipTS = eipRequire('typescript')
const EIP_MERCHANT='0xA337FCeC5f9508C3Ab5E10aE571610E167548878'
const EIP_OTHER='0x124C7DE92Df945477cAEbdC6745756C4B29e7b7B'
function createEipGymHookHarness(page) {
  const gym=readFileSync(new URL('../src/portals/Gym.tsx', import.meta.url),'utf8')
  const begin=gym.indexOf('type GymControl =')
  const end=gym.indexOf('\nfunction Card(',begin)
  assert.ok(begin>=0&&end>begin,'Cannot locate Gym hook')
  const extracted=gym.slice(begin,end)+'\n;(globalThis as any).__testHook = useGymData;'
  const {outputText,diagnostics}=eipTS.transpileModule(extracted,{fileName:'Gym-hook.ts',reportDiagnostics:true, compilerOptions:{target:eipTS.ScriptTarget.ES2022,module:eipTS.ModuleKind.None}})
  assert.equal(diagnostics.length,0,'Unexpected transpile diagnostics')
  let cursor=0
  const slots=[]
  let scheduledEffect
  let cleanupEffect
  const providerEvents=new Map(),windowEvents=new Map(),documentEvents=new Map(),timeouts=new Map(),intervals=new Map()
  let nextTimer=0
  let held
  let reads=0
  const wallet={account:EIP_MERCHANT,chainId:43113,
    on(name,handler){if(!providerEvents.has(name))providerEvents.set(name,new Set());providerEvents.get(name).add(handler)},
    removeListener(name,handler){providerEvents.get(name)?.delete(handler)},
    emit(name,value){for(const fn of providerEvents.get(name)??[]) fn(value)},
    request({method}){if(method==='eth_chainId') return Promise.resolve('0x'+this.chainId.toString(16));if(method==='eth_accounts') return Promise.resolve(this.account?[this.account]:[]);throw new Error('UNEXPECTED_PROVIDER_METHOD '+method)} }
  const add=(events,name,fn)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(fn)}
  const rm=(events,name,fn)=>events.get(name)?.delete(fn)
  const mockWindow={
    addEventListener:(name,fn)=>add(windowEvents,name,fn),
    removeEventListener:(name,fn)=>rm(windowEvents,name,fn),
    setInterval:(fn)=>{const id=++nextTimer;intervals.set(id,fn);return id},
    clearInterval:(id)=>intervals.delete(id),
    setTimeout:(fn)=>{const id=++nextTimer;timeouts.set(id,fn);return id},
    clearTimeout:(id)=>timeouts.delete(id),
  }
  const mockDocument={visibilityState:'visible',addEventListener:(name,fn)=>add(documentEvents,name,fn),removeEventListener:(name,fn)=>rm(documentEvents,name,fn)}
  const mockUseState=init=>{const idx=cursor++;if(!(idx in slots))slots[idx]={value:init};return [slots[idx].value,next=>{slots[idx].value=typeof next==='function'?next(slots[idx].value):next}]}
  const mockUseRef=init=>{const idx=cursor++;if(!(idx in slots))slots[idx]={value:{current:init}};return slots[idx].value}
  const mockUseEffect=effect=>{const idx=cursor++;if(!(idx in slots)){slots[idx]={value:{}};scheduledEffect=effect}}
  const env={
    useState:mockUseState,useRef:mockUseRef,useEffect:mockUseEffect,
    window:mockWindow,document:mockDocument,provider:()=>wallet,
    walletSession:async()=>{if(!wallet.account)throw Error('Ví chưa kết nối.'); if(wallet.chainId!==43113)throw Error('Sai mạng.');return {account:wallet.account,chain:{id:wallet.chainId},head:{hash:'0xmock'},vault:'0xmock'}},
    verifyGymDeployment:async()=>true,
    discoverMerchantAgreements:async()=>{throw Error('INCOMPLETE_LOG_READ')},
    readDirectGymAgreement:async(s,id)=>{reads++;if(held){const p=held.promise;held=undefined;return p};if(s.account.toLowerCase()!==EIP_MERCHANT.toLowerCase())throw Error('WRONG_EIP_MERCHANT');return {headBlock:613n,id,data:{marker:reads}}},
    readSharedAgreement:()=>{},sameAddress:(a,b)=>a.toLowerCase()===b.toLowerCase(),
    errorMessage:e=>e instanceof Error?e.message:String(e),
  }
  eipVM.runInNewContext(outputText,env,{timeout:1000})
  const route=page==='detail'?{page:'detail',id:1n}:{page:'overview'}
  function view(){cursor=0; const result=env.__testHook(route);if(scheduledEffect){const effect=scheduledEffect;scheduledEffect=undefined;cleanupEffect=effect()}return result}
  const delay=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve))}
  return {wallet,view,delay,emit:(name,value)=>wallet.emit(name,value),foreground:()=>{for(const fn of windowEvents.get('focus')??[]) fn()},
    periodic:()=>{for(const fn of intervals.values())fn()},
    holdRead:()=>{let resolve;const promise=new Promise(done=>resolve=done);held={promise};return resolve},
    unmount:()=>{if(cleanupEffect){const fn=cleanupEffect;cleanupEffect=undefined;fn()}},
    listenerCounts:()=>({provider:[...providerEvents.values()].reduce((n,handlers)=>n+handlers.size,0),window:[...windowEvents.values()].reduce((n,handlers)=>n+handlers.size,0),document:[...documentEvents.values()].reduce((n,handlers)=>n+handlers.size,0),intervals:intervals.size}),
    get reads(){return reads},
  }
}
test('D18-08 EIP-1193 chainChanged: wrong Fuji chain clears Vault verified and prevents recovery until Fuji',async()=>{
  const h=createEipGymHookHarness('overview');h.view();await h.delay();assert.ok(h.view().verifiedIdentity);assert.match(h.view().error,/INCOMPLETE_LOG_READ/)
  h.wallet.chainId=11155111;h.emit('chainChanged','0xaa36a7');assert.equal(h.view().verifiedIdentity,undefined,'stale status after event');await h.delay();assert.equal(h.view().verifiedIdentity,undefined);assert.match(h.view().error,/Sai mạng/)
  h.wallet.chainId=43113;h.emit('chainChanged','0xa869');await h.delay();assert.equal(h.view().verifiedIdentity?.session?.chain?.id,43113)
})
test('D18-08 EIP-1193 accountsChanged: wrong merchant invalidates verified agreement and cannot reappear',async()=>{
  const h=createEipGymHookHarness('detail');h.view();await h.delay();assert.ok(h.view().snapshot?.direct);assert.equal(h.view().snapshot?.session.account,EIP_MERCHANT)
  h.wallet.account=EIP_OTHER;h.emit('accountsChanged',[EIP_OTHER]);assert.equal(h.view().snapshot,undefined,'stale agreement after account event');await h.delay();assert.equal(h.view().snapshot,undefined);assert.match(h.view().error,/WRONG_EIP_MERCHANT/)
  h.wallet.account=EIP_MERCHANT;h.emit('accountsChanged',[EIP_MERCHANT]);await h.delay();assert.ok(h.view().snapshot?.direct);assert.equal(h.view().snapshot?.session.account,EIP_MERCHANT)
})
test('D18-08 EIP-1193 disconnect: verified Vault disappears without browser reload',async()=>{
  const h=createEipGymHookHarness('overview');h.view();await h.delay();assert.ok(h.view().verifiedIdentity)
  h.wallet.account=undefined;h.emit('disconnect',{code:4900});assert.equal(h.view().verifiedIdentity,undefined);await h.delay();assert.equal(h.view().verifiedIdentity,undefined);assert.match(h.view().error,/Ví chưa kết nối/)
})
test('D18-08 Core missed chainChanged: focus reads eth_chainId and masks stale verification',async()=>{
  const h=createEipGymHookHarness('overview');h.view();await h.delay();assert.ok(h.view().verifiedIdentity)
  h.wallet.chainId=11155111;h.foreground();assert.equal(h.view().verifiedIdentity,undefined,'must mask on focus while checking');await h.delay();assert.equal(h.view().verifiedIdentity,undefined);assert.match(h.view().error,/Sai mạng/)
})
test('D18-08 pending agreement refresh cannot resurrect stale account/chain after chainChanged',async()=>{
  const h=createEipGymHookHarness('detail');h.view();await h.delay();assert.ok(h.view().snapshot?.direct)
  const release=h.holdRead();const pending=h.view().refresh();await h.delay();assert.equal(h.view().snapshot,undefined)
  h.wallet.chainId=11155111;h.emit('chainChanged','0xaa36a7');await h.delay();release({headBlock:613n,id:1n,data:{marker:'STALE'}});await pending;await h.delay()
  assert.equal(h.view().snapshot,undefined,'outdated response resurrected verified agreement');assert.match(h.view().error,/Sai mạng/)
})

// D18_08_EIP1193_MOCK_END

// D18-08 Reviewer 2 P1 — adversarial EIP-1193 payload / stale provider regressions.
// These tests exercise the actual useGymData hook through createEipGymHookHarness.
// They MUST be RED against SHA f1f82b1b... and turn GREEN only after an authorized fix.
// D18_08_P1_STALE_PROVIDER_NEGATIVE_START

test('P1 accountsChanged payload must fence stale eth_accounts re-verification', async () => {
  const h = createEipGymHookHarness('detail')
  h.view()
  await h.delay()
  assert.ok(h.view().snapshot?.direct, 'precondition: verified direct agreement')
  // Provider emitted a different account, but walletSession still sees old merchant.
  h.emit('accountsChanged', [EIP_OTHER])
  assert.equal(h.view().snapshot, undefined, 'must invalidate synchronously')
  await h.delay()
  assert.equal(h.view().snapshot, undefined, 'must not reverify old merchant against newer event')
  assert.equal(h.view().verifiedIdentity, undefined)
})

test('P1 chainChanged payload must fence stale Fuji RPC/session re-verification', async () => {
  const h = createEipGymHookHarness('overview')
  h.view()
  await h.delay()
  assert.ok(h.view().verifiedIdentity, 'precondition: Fuji Vault verified')
  // Event says Sepolia while eth_chainId / walletSession still report Fuji.
  h.emit('chainChanged', '0xaa36a7')
  assert.equal(h.view().verifiedIdentity, undefined, 'must invalidate synchronously')
  await h.delay()
  assert.equal(h.view().verifiedIdentity, undefined, 'must not reverify Fuji against Sepolia event')
  assert.equal(h.view().snapshot, undefined)
})

test('P1 disconnect must latch fail-closed despite stale walletSession', async () => {
  const h = createEipGymHookHarness('overview')
  h.view()
  await h.delay()
  assert.ok(h.view().verifiedIdentity, 'precondition: Fuji Vault verified')
  // Disconnect event has arrived but old session is still readable from Core.
  h.emit('disconnect', { code: 4900 })
  assert.equal(h.view().verifiedIdentity, undefined, 'must invalidate synchronously')
  await h.delay()
  assert.equal(h.view().verifiedIdentity, undefined, 'must not auto-reverify after disconnect')
  assert.equal(h.view().snapshot, undefined)
  h.foreground()
  await h.delay()
  assert.equal(h.view().verifiedIdentity, undefined, 'focus must not undo disconnect latch')
})
// D18_08_P1_STALE_PROVIDER_NEGATIVE_END

// D18_08_P1_LIFECYCLE_START
test('P1 disconnect requires explicit user reconnection and valid proof',async()=>{
  const h=createEipGymHookHarness('overview');h.view();await h.delay();assert.ok(h.view().verifiedIdentity)
  h.emit('disconnect',{code:4900});await h.delay();assert.equal(h.view().verifiedIdentity,undefined)
  // The wallet still returns a stale prior session. No auto reverify on focus.
  h.foreground();await h.delay();assert.equal(h.view().verifiedIdentity,undefined)
  // User explicitly requests connection; a fresh session may now be accepted.
  await h.view().refresh(true);await h.delay();assert.ok(h.view().verifiedIdentity,'user reconnection should be supported')
})
test('P1 unmount removes listeners and blocks late read results',async()=>{
  const h=createEipGymHookHarness('detail');h.view();await h.delay();assert.ok(h.view().snapshot?.direct)
  const release=h.holdRead();const pending=h.view().refresh();await h.delay()
  assert.ok(h.listenerCounts().provider>=3)
  h.unmount();assert.deepEqual(h.listenerCounts(),{provider:0,window:0,document:0,intervals:0})
  release({headBlock:613n,id:1n,data:{marker:'STALE_AFTER_UNMOUNT'}});await pending;await h.delay()
  assert.equal(h.view().snapshot,undefined,'late result should remain discarded')
})
test('P1 invalid chain event payload is not treated as Fuji',async()=>{
 const h=createEipGymHookHarness('overview');h.view();await h.delay();assert.ok(h.view().verifiedIdentity)
 h.emit('chainChanged','not-a-chain');await h.delay();assert.equal(h.view().verifiedIdentity,undefined)
})
// D18_08_P1_LIFECYCLE_END
