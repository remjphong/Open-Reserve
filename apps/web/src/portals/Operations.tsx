import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AgreementReceipt } from '../design-system/receipt'
import { agreement as fixture } from '../demo/agreement'
import {
  DisabledAction, EmptyState, ErrorState, LoadingSkeleton, MoneyBreakdown,
  OverviewCard, PortalPage,
} from '../design-system/portal'
import { errorMessage, provider, sameAddress, walletSession, type Session } from '../lib/customer-chain'
import { readSharedAgreement } from '../lib/shared-ledger'
import {
  isVerifiedResolver, parseOperationsRoute, readOperationsEvidence,
  type EvidenceResult, type OperationsRoute,
} from '../lib/operations-chain'

type LiveRoute = Extract<OperationsRoute, { page: 'detail' | 'claim' }>
type Shared = Awaited<ReturnType<typeof readSharedAgreement>>
type OpsClaim = { state: number; evidenceHash: string; amount: bigint; awardedToBuyer: bigint;
  awardedToGym: bigint; challengeEndsAt: bigint }
type OpsValue = { session: Session; data: Shared; claim?: OpsClaim; claimError?: string }
const base = (amount: bigint) => amount.toLocaleString('vi-VN') + ' đơn vị nhỏ nhất MRES (không phải VNĐ)'
const claimStates = ['Không có', 'Đã đề xuất', 'Đã xác nhận', 'Đang phản đối', 'Đã chốt', 'Đã phân xử', 'Đã hủy']
const fixtureLabel = 'MINH HỌA · DEMO_FIXTURE · KHÔNG PHẢI DỮ LIỆU FUJI'

function Section({ children }: { children: ReactNode }) {
  return <section className="card card-pad customer-flow-card">{children}</section>
}

function Fixture({ dispute }: { dispute: boolean }) {
  return <PortalPage breadcrumb="Vận hành / Mẫu minh họa"
    title={dispute ? 'Hồ sơ mẫu PT-04' : 'Sổ cái mẫu OR-024'}>
    <Section>
      <p className="caption">{fixtureLabel}</p>
      <p>Chỉ là ví dụ thiết kế để minh họa trạng thái. Không liên quan Agreement #1 trên Fuji.</p>
      <MoneyBreakdown rows={[
        ['Đã nạp (mẫu)', fixture.deposited], ['Gym đã rút (mẫu)', fixture.withdrawn],
        ['Vault giữ (mẫu)', fixture.locked], ['Tranh chấp (mẫu)', fixture.disputed],
      ]} />
      <DisabledAction id="ops-fixture-write" reason="Không thể phân xử hoặc giải ngân từ dữ liệu minh họa.">
        Ghi quyết định (không khả dụng)
      </DisabledAction>
      <AgreementReceipt />
      <a className="inline-link" href="/operations/agreements/1">Xem Agreement #1 từ Vault</a>
    </Section>
  </PortalPage>
}

function Browse({ page }: { page: 'overview' | 'agreements' | 'disputes' }) {
  const title = page === 'overview' ? 'Tổng quan vận hành' :
    page === 'agreements' ? 'Sổ cái theo Agreement ID' : 'Theo dõi phản đối'
  return <PortalPage breadcrumb="Vận hành / Fuji — chỉ đọc" title={title}>
    <p className="caption">Không quét toàn bộ lịch sử, không suy ra số hợp đồng hoặc số tranh chấp từ danh sách đang hiển thị.</p>
    <div className="grid">
      {page !== 'disputes' && <OverviewCard title="Agreement #1 · Fuji" href="/operations/agreements/1"
        link="Kiểm toán sổ cái từ Vault">
        <p>Đọc trực tiếp trạng thái Vault khi có ví trên đúng mạng. Chưa hiển thị tiền khi chưa xác minh.</p>
      </OverviewCard>}
      {page !== 'agreements' && <OverviewCard title="Phản đối / đề nghị #1" href="/operations/disputes/1?claimId=1"
        link="Đọc trạng thái claim cụ thể">
        <p>Đọc claim ID trực tiếp, không coi đó là danh sách tranh chấp đầy đủ.</p>
      </OverviewCard>}
    </div>
    <Section>
      <p className="caption">{fixtureLabel}</p>
      <a className="inline-link" href="/operations/agreements/OR-024">Xem sổ cái mẫu</a>
      {' · '}<a className="inline-link" href="/operations/disputes/PT-04">Xem phản đối mẫu</a>
    </Section>
  </PortalPage>
}

function useLiveData(route: LiveRoute) {
  const [value, setValue] = useState<OpsValue>()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const revision = useRef(0)
  const routeKey = route.page + ':' + route.id.toString() + ':' + (route.claimId?.toString() ?? '')

  async function refresh(connect = false) {
    const current = ++revision.current
    setValue(undefined)
    setMessage('')
    setLoading(true)
    try {
      const session = await walletSession(connect)
      if (session.chain.id !== 43113) throw new Error('NOT_VERIFIED · Operations chỉ đọc Fuji 43113.')
      const data = await readSharedAgreement(session, route.id)
      let claim: OpsClaim | undefined
      let claimError: string | undefined
      if (route.page === 'claim' && route.claimId) {
        try {
          const result = await session.publicClient.readContract({
            ...session.read, functionName: 'getClaim', args: [route.id, route.claimId],
          })
          if (result.state === 0) throw new Error('Claim ID chưa tồn tại tại block đã ghim.')
          claim = result
        } catch { claimError = 'Không thể xác minh claim ID này tại block đã ghim.' }
      }
      const accounts = await session.wallet.getAddresses()
      const chainId = await session.wallet.getChainId()
      if (accounts.length === 0 || !sameAddress(accounts[0], session.account) || chainId !== 43113) {
        throw new Error('Ví hoặc mạng đã thay đổi trong khi đọc. Hãy kết nối lại.')
      }
      if (current === revision.current) setValue({ session, data, claim, claimError })
    } catch (error) {
      if (current === revision.current) setMessage(errorMessage(error))
    } finally {
      if (current === revision.current) setLoading(false)
    }
  }

  useEffect(() => {
    const injected = provider()
    // Fail closed on wallet events; never let an old async read resurrect on-chain balances.
    const changed = () => {
      ++revision.current
      setValue(undefined)
      setLoading(false)
      setMessage('Ví hoặc mạng vừa thay đổi. Kết nối lại để xác minh ở block mới.')
    }
    injected?.on?.('accountsChanged', changed)
    injected?.on?.('chainChanged', changed)
    injected?.on?.('disconnect', changed)
    void refresh()
    return () => {
      ++revision.current
      injected?.removeListener?.('accountsChanged', changed)
      injected?.removeListener?.('chainChanged', changed)
      injected?.removeListener?.('disconnect', changed)
    }
  }, [routeKey])

  return { value, loading, message, refresh }
}

function EvidencePanel({ agreementId, claimId, hash }: { agreementId: bigint; claimId: bigint; hash: string }) {
  const [result, setResult] = useState<EvidenceResult>()
  const [loading, setLoading] = useState(false)
  const counter = useRef(0)
  useEffect(() => () => { ++counter.current }, [agreementId, claimId, hash])
  async function check() {
    const id = ++counter.current
    setLoading(true)
    setResult(undefined)
    try {
      const data = await readOperationsEvidence(agreementId, claimId, hash)
      if (id === counter.current) setResult(data)
    } finally {
      if (id === counter.current) setLoading(false)
    }
  }
  return <Section>
    <h3>Đối chiếu evidenceHash với Catalog</h3>
    <p className="caption customer-wrap">Hash tham chiếu trên Vault: {hash}</p>
    <button type="button" className="button" disabled={loading} onClick={() => void check()}>
      {loading ? 'Đang đọc Catalog…' : 'Kiểm tra bằng chứng · chỉ đọc'}
    </button>
    {result?.status === 'MATCHED' && <>
      <p className="caption">CATALOG_MATCHED_HASH · {result.source} — Không chứng minh buổi tập đã diễn ra.</p>
      <p className="customer-wrap">{result.description}</p>
      {result.externalUrl && <a className="inline-link" href={result.externalUrl} target="_blank"
        rel="noopener noreferrer">Mở tài liệu nguồn</a>}
    </>}
    {result?.status === 'NOT_FOUND' && <p>Không tìm thấy metadata có hash khớp trong các trang đã xác minh; chỉ Vault hash là nguồn on-chain.</p>}
    {result?.status === 'INCOMPLETE' && <ErrorState>INCOMPLETE_EVIDENCE_READ · Không thể kết luận hồ sơ không tồn tại.</ErrorState>}
    {result?.status === 'UNAVAILABLE' && <ErrorState>CATALOG_UNAVAILABLE · Không thể kết luận hồ sơ không tồn tại.</ErrorState>}
  </Section>
}

function Ledger({ data }: { data: Shared }) {
  const a = data.ledger
  const invariant = a.deposited === a.gymWithdrawn + a.buyerRefunded + a.remainingLocked
  return <Section>
    <h2>Số dư tài chính · Vault</h2>
    <p className="caption customer-wrap">VAULT_READ_CONTRACT · Fuji chain {data.chainId} · Agreement #{data.agreementId.toString()}
      {' · '}Block {data.blockNumber.toString()} · {data.vault}</p>
    <dl className="money-list">
      {([
        ['Đã nạp', a.deposited], ['Đã chốt earned', a.earnedFinalized],
        ['Gym đã rút', a.gymWithdrawn], ['Gym có thể rút', a.withdrawable],
        ['Buyer đã nhận hoàn', a.buyerRefunded], ['Được duyệt hoàn, chưa nhận', a.refundable],
        ['Vault còn khóa', a.remainingLocked], ['Đang khóa vì tranh chấp', a.disputedLocked],
        ['Chưa phân bổ', a.unallocated],
      ] as const).map(([label, amount]) => <div key={label}><dt>{label}</dt>
        <dd className="customer-wrap">{base(amount)}</dd></div>)}
    </dl>
    <p className="caption">{invariant ? 'I1 LOCAL CHECK PASS' : 'I1 MISMATCH — KHÔNG NGHIỆM THU'}
      {' · '}deposited = gymWithdrawn + buyerRefunded + remainingLocked.</p>
    <p className="caption">Đang khóa không đồng nghĩa được hoàn; disputedLocked không phải withdrawable.</p>
    <p>Buyer: <span className="customer-wrap">{data.agreement.buyer}</span></p>
    <p>Merchant: <span className="customer-wrap">{data.agreement.merchant}</span></p>
    <p>Policy: {data.agreement.policy === 0 ? 'PER_SESSION' : 'TIME_ACCESS'} · Terms: {data.agreement.termsHash}</p>
  </Section>
}

function Activity({ data }: { data: Shared }) {
  const activity = data.activity
  const canShow = activity.status === 'FRESH' || activity.status === 'STALE'
  return <Section>
    <h2>Nhật ký giao dịch · Chain Indexer</h2>
    <p className="caption">INDEXER_ACTIVITY={activity.status} · LAST_INDEXED_BLOCK=
      {activity.lastIndexedBlock?.toString() ?? 'NOT_VERIFIED'} · VAULT_HEAD={data.blockNumber.toString()}</p>
    {activity.status !== 'FRESH' && <ErrorState>{activity.reason ??
      'Indexer có thể thiếu lịch sử hoặc chậm; không kết luận danh sách rỗng hay đồng bộ đầy đủ.'}</ErrorState>}
    {canShow && activity.items.length > 0 && <ul>
      {activity.items.map(event => <li key={event.txHash + ':' + event.logIndex} className="customer-wrap">
        Block {event.blockNumber.toString()} · log #{event.logIndex}
        {' · '}<a href={'https://testnet.snowtrace.io/tx/' + event.txHash} target="_blank"
          rel="noopener noreferrer">{event.txHash}</a>
      </li>)}
    </ul>}
    {canShow && activity.items.length === 0 && <p>Không có sự kiện trong trang trả về; không xác nhận toàn bộ lịch sử trống.</p>}
    {activity.nextCursor && <p className="caption">Còn trang nhật ký tiếp theo — trang hiện tại không đầy đủ.</p>}
    <p className="caption">Nhật ký chỉ để tham khảo; tiền và quyền quyết định từ Vault đọc trực tiếp tại một block.</p>
  </Section>
}

function Live({ route }: { route: LiveRoute }) {
  const state = useLiveData(route)
  const snap = state.value
  const id = route.id.toString()
  const role = snap ? snap.data.role : 'unverified'
  const resolver = snap ? isVerifiedResolver(snap.session, role) : false
  return <PortalPage breadcrumb="Vận hành / Fuji / Read-only" title={
    route.page === 'detail' ? 'Sổ cái Agreement #' + id : 'Hồ sơ claim · Agreement #' + id
  }>
    <Section>
      <h2>Đối chiếu Vault theo Agreement ID</h2>
      <p className="caption">Đọc trực tiếp ID, không phụ thuộc danh sách Indexer và không xác nhận full historical sync.</p>
      {state.loading && <LoadingSkeleton />}
      {state.message && <ErrorState>{state.message}</ErrorState>}
      {snap && <p className="caption customer-wrap">CONNECTED_ACCOUNT={snap.session.account}
        {' · '}ROLE={role} · {resolver ? 'RESOLVER_ADDRESS_MATCHED · READ_ONLY' : 'READ_ONLY_VIEWER'}
        {' · '}Block hash {snap.session.head.hash ?? 'NOT_VERIFIED'}</p>}
      <button type="button" className="button button-primary" disabled={state.loading}
        onClick={() => void state.refresh(!snap)}>
        {snap ? 'Làm mới xác minh' : 'Kết nối ví / đọc lại Vault'}
      </button>
      {!snap && <p className="caption">NOT_VERIFIED · Không hiển thị tiền minh họa khi ví hoặc Vault không đọc được.</p>}
    </Section>
    {snap && <>
      <Ledger data={snap.data} />
      {route.page === 'claim' && <Section>
        <h2>Trạng thái tranh chấp / claim</h2>
        <p>Vault disputedLocked tại block: {base(snap.data.ledger.disputedLocked)}</p>
        {route.claimId ? <>
          <p>Claim ID được yêu cầu: #{route.claimId.toString()}</p>
          {snap.claim ? <>
            <p>Trạng thái claim: {claimStates[snap.claim.state] ?? 'UNKNOWN'} ({snap.claim.state})</p>
            <p>Số tiền claim: {base(snap.claim.amount)} · awardedToBuyer: {base(snap.claim.awardedToBuyer)}
              {' · '}awardedToGym: {base(snap.claim.awardedToGym)}</p>
            <p>Challenge window end: {snap.claim.challengeEndsAt.toString()} (Unix seconds)</p>
            <EvidencePanel agreementId={route.id} claimId={route.claimId} hash={snap.claim.evidenceHash} />
          </> : <ErrorState>{snap.claimError ?? 'CLAIM_NOT_VERIFIED'}</ErrorState>}
        </> : <p>Chọn claim ID cụ thể, ví dụ <a className="inline-link"
          href={'/operations/disputes/' + id + '?claimId=1'}>đề nghị #1</a>.
          Chưa xác minh danh sách claim đầy đủ.</p>}
      </Section>}
      <Activity data={snap.data} />
      <Section>
        <h2>Ranh giới quyền Resolver</h2>
        <p>{resolver ? 'Địa chỉ ví đang kết nối trùng resolver của Vault.' :
          'Ví hiện tại không chứng minh quyền resolver. Chế độ quan sát vẫn chỉ đọc.'}</p>
        <DisabledAction id="ops-resolver-disabled" reason={
          'Worker 4 không ký hoặc gửi giao dịch. Quyết định phân xử chỉ thực hiện qua Wallet 2 và Owner ONE_TX_GO.'
        }>Ghi quyết định (khóa)</DisabledAction>
        <p className="caption">Không có API nào được phép lấy tiền từ Vault hoặc tự phê duyệt hoàn.</p>
      </Section>
    </>}
    <a className="inline-link" href={'/operations/' +
      (route.page === 'detail' ? 'disputes/' : 'agreements/') + id}>
      {route.page === 'detail' ? 'Xem claim của agreement' : 'Về sổ cái Vault'}
    </a>
  </PortalPage>
}

export function Operations({ path }: { path: string }) {
  const route = parseOperationsRoute(path, window.location.search)
  if (route.page === 'fixture-agreement') return <Fixture dispute={false} />
  if (route.page === 'fixture-dispute') return <Fixture dispute />
  if (route.page === 'not-found') return <PortalPage breadcrumb="Vận hành" title="Không tìm thấy trang">
    <EmptyState title="Agreement/claim không hợp lệ">{route.reason ?? 'Đường dẫn không tồn tại.'}</EmptyState>
  </PortalPage>
  if (route.page === 'overview' || route.page === 'agreements' || route.page === 'disputes') {
    return <Browse page={route.page} />
  }
  return <Live route={route} />
}
