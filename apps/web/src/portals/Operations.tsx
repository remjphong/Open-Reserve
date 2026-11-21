import './gym-ops-d22.css'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AgreementReceipt } from '../design-system/receipt'
import { agreementParties, indexerStatusLabels, MetadataList } from '../design-system/metadata'
import { agreement as fixture } from '../demo/agreement'
import {
  DisabledAction, EmptyState, ErrorState, Icon, LoadingSkeleton, MoneyBreakdown, PortalPage,
} from '../design-system/portal'
import { errorMessage, provider, sameAddress, walletSession, type Session } from '../lib/customer-chain'
import { readSharedAgreement } from '../lib/shared-ledger'
import {
  auditKnownOperationsSnapshot, knownOperations, knownPortalPaths, reviewedTimeTx1,
} from '../lib/operations-known-audit'
import {
  isVerifiedResolver, parseOperationsRoute, readOperationsEvidence,
  type EvidenceResult, type OperationsRoute,
} from '../lib/operations-chain'

type LiveRoute = Extract<OperationsRoute, { page: 'detail' | 'claim' }>
type Shared = Awaited<ReturnType<typeof readSharedAgreement>>
type OpsClaim = { state: number; evidenceHash: string; amount: bigint; awardedToBuyer: bigint;
  awardedToGym: bigint; challengeEndsAt: bigint }
type OpsValue = { session: Session; data: Shared; claim?: OpsClaim; claimError?: string; routeKey: string }
const base = (amount: bigint) => amount.toLocaleString('vi-VN') + ' đơn vị nhỏ nhất MRES (không phải VNĐ)'
const claimStates = ['Không có', 'Đã đề xuất', 'Đã xác nhận', 'Đang phản đối', 'Đã chốt', 'Đã phân xử', 'Đã hủy']
const fixtureLabel = 'MINH HỌA · DEMO_FIXTURE · KHÔNG PHẢI DỮ LIỆU FUJI'
const actorLabels = { buyer: 'Người mua', merchant: 'Phòng tập', resolver: 'Bên phân xử', observer: 'Người quan sát' } as const

function Section({ children }: { children: ReactNode }) {
  return <section className="card card-pad customer-flow-card">{children}</section>
}

function AgreementPortalLinks({ id, paths }: { id: string; paths: NonNullable<ReturnType<typeof knownPortalPaths>> }) {
  return <nav className="or-actions ops-d22-portal-actions" aria-label={'Đối chiếu hợp đồng #' + id}>
    <a className="or-action" href={paths.customer}><Icon name="person" />Khách hàng</a>
    <a className="or-action" href={paths.gym}><Icon name="storefront" />Phòng tập</a>
    <a className="or-action" href={paths.operations}><Icon name="scale" />Vận hành</a>
  </nav>
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
    <p className="caption ops-d22-browse-note">Các lối vào dưới đây tra theo ID. Danh sách này không đại diện cho toàn bộ lịch sử hợp đồng hoặc phản đối.</p>
    <div className="ops-d22-registers">
      {page !== 'disputes' && <section className="ops-d22-register" aria-labelledby="ops-register-ledger">
        <h2 id="ops-register-ledger"><Icon name="record" />Sổ cái Vault</h2>
        <p className="caption">Đọc số dư trực tiếp trên Fuji tại một block được ghim.</p>
        <ul>
          {knownOperations.map(known => <li key={known.id.toString()}>
            <a className="inline-link" href={knownPortalPaths(known.id)!.operations}>
              {known.label} <Icon name="arrow-right" />
            </a>
          </li>)}
        </ul>
      </section>}
      {page !== 'agreements' && <section className="ops-d22-register" aria-labelledby="ops-register-claims">
        <h2 id="ops-register-claims"><Icon name="scale" />Hồ sơ phản đối</h2>
        <p className="caption">Claim #1 là ID cần đối chiếu. Chưa xác nhận trạng thái hoặc quyền giải ngân.</p>
        <ul>
          {knownOperations.map(known => <li key={known.id.toString()}>
            <a className="inline-link" href={knownPortalPaths(known.id)!.claim}>
              {known.label} · Claim #1 <Icon name="arrow-right" />
            </a>
          </li>)}
        </ul>
      </section>}
    </div>
    <Section>
      <h2>Cùng Vault · ba portal</h2>
      <p className="caption">Điều hướng tới cùng Agreement ID trên Customer, Gym và Operations.
        Đây là liên kết đối chiếu, KHÔNG phải bằng chứng đã đăng nhập đủ ba ví.</p>
      {knownOperations.map(known => <div className="ops-d22-cross-row" key={'cross-' + known.id.toString()}>
        <strong>{known.label}</strong>
        <AgreementPortalLinks id={known.id.toString()} paths={knownPortalPaths(known.id)!} />
      </div>)}
    </Section>
    <Section>
      <p className="caption">{fixtureLabel}</p>
      <div className="ops-d22-links">
        <a className="inline-link" href="/operations/agreements/OR-024">Xem sổ cái mẫu</a>
        <a className="inline-link" href="/operations/disputes/PT-04">Xem phản đối mẫu</a>
      </div>
    </Section>
  </PortalPage>
}

function useLiveData(route: LiveRoute) {
  const [value, setValue] = useState<OpsValue>()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const revision = useRef(0)
  const routeKey = route.page + ':' + route.id.toString() + ':' + (route.page === 'claim' ? route.claimId?.toString() ?? '' : '')

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
      if (current === revision.current) setValue({ session, data, claim, claimError, routeKey })
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

  return { value: value?.routeKey === routeKey ? value : undefined, loading, message, refresh }
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
    <MetadataList label="Tham chiếu bằng chứng" fields={[
      { label: 'Hash bằng chứng trên Vault', icon: 'record', value: <code>{hash}</code> },
    ]} />
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
  const audited = auditKnownOperationsSnapshot(data)
  return <Section>
    <h2>Số dư tài chính · Vault</h2>
    <MetadataList label="Nguồn sổ cái" fields={[
      { label: 'Nguồn số dư', icon: 'record', value: 'Vault trên Avalanche Fuji', code: 'VAULT_READ_CONTRACT' },
      { label: 'Hợp đồng', icon: 'file-text', value: '#' + data.agreementId.toString() },
      { label: 'Mã mạng', value: data.chainId },
      { label: 'Block đọc dữ liệu', icon: 'layers', value: data.blockNumber.toString() },
      { label: 'Địa chỉ Vault', value: <code>{data.vault}</code> },
    ]} />
    {audited.status !== 'IDENTITY_AND_LEDGER_MATCHED' ? <>
      <ErrorState>NOT_VERIFIED · {audited.reason} — Không hiển thị tiền hoặc suy ra quyền lợi
        khi danh tính agreement, terms hoặc I1/getter không khớp.</ErrorState>
    </> : <>
      <p className="caption">SHARED_VAULT_IDENTITY_AND_GETTERS_MATCHED · Kiểm tra một
        pinned Vault snapshot dùng chung ở cấp mã nguồn, CHƯA xác minh ba phiên ví trình duyệt.</p>
      <dl className="money-list">
        {([
          ['Đã nạp (deposited)', a.deposited], ['Đã chốt (earnedFinalized)', a.earnedFinalized],
          ['Gym đã thực rút (gymWithdrawn)', a.gymWithdrawn],
          ['Gym có thể rút (withdrawable)', a.withdrawable],
          ['Buyer đã nhận hoàn (buyerRefunded)', a.buyerRefunded],
          ['Đã duyệt hoàn (refundAuthorized)', a.refundAuthorized],
          ['Được duyệt hoàn, chưa nhận (refundable)', a.refundable],
          ['Vault còn giữ (remainingLocked)', a.remainingLocked],
          ['Đang khóa vì tranh chấp (disputedLocked)', a.disputedLocked],
          ['Chưa phân bổ (unallocated)', a.unallocated],
        ] as const).map(([label, amount]) => <div key={label}><dt>{label}</dt>
          <dd className="customer-wrap">{base(amount)}</dd></div>)}
      </dl>
      <p className="caption">I1 + DERIVED GETTERS PASS · deposited = gymWithdrawn + buyerRefunded
        + remainingLocked; withdrawable = earnedFinalized - gymWithdrawn;
        refundable = refundAuthorized - buyerRefunded.</p>
      <p className="caption">Đang khóa không đồng nghĩa được hoàn. Đã chốt không đồng nghĩa đã rút.
        disputedLocked không phải withdrawable; tiền chỉ được duyệt hoàn khi refundable từ Vault {'>'} 0.</p>
      <MetadataList label="Các bên và điều khoản" fields={[
        ...agreementParties(data.agreement),
        { label: 'Chính sách', icon: 'file-text', value: data.agreement.policy === 0 ? 'Theo buổi tập' : 'Theo thời gian',
          code: data.agreement.policy === 0 ? 'PER_SESSION' : 'TIME_ACCESS' },
        { label: 'Hash điều khoản', value: <code>{data.agreement.termsHash}</code> },
      ]} />
    </>}
  </Section>
}

const receiptTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh',
})

function KnownDeposit({ data }: { data: Shared }) {
  if (data.agreementId !== reviewedTimeTx1.agreementId) return null
  const audited = auditKnownOperationsSnapshot(data)
  return <Section>
    <h2>Biên nhận nạp · Hợp đồng #2</h2>
    {audited.status !== 'IDENTITY_AND_LEDGER_MATCHED' ? <ErrorState>
      TIME_TX1_IDENTITY_NOT_VERIFIED · Không gắn hồ sơ TX1 với Agreement #2 khi metadata
      hoặc nguồn Vault không khớp.</ErrorState> : <>
      <p className="caption">Giao dịch mở gói theo thời gian, theo hồ sơ Wallet 2.</p>
      <MetadataList label="Giao dịch nạp được báo cáo" fields={[
        { label: 'Số tiền đã nạp', icon: 'wallet', value: base(reviewedTimeTx1.deposited) },
        { label: 'Block ghi nhận', icon: 'layers', value: reviewedTimeTx1.blockNumber.toString() },
        { label: 'Bắt đầu (UTC+7)', icon: 'clock', value: receiptTime.format(Number(reviewedTimeTx1.startAt) * 1000) },
        { label: 'Kết thúc (UTC+7)', icon: 'clock', value: receiptTime.format(Number(reviewedTimeTx1.endAt) * 1000) },
        { label: 'Thời gian phản đối', icon: 'scale', value: reviewedTimeTx1.challengeWindow.toString() + ' giây' },
      ]} />
      <a className="or-action" target="_blank" rel="noopener noreferrer"
        href={'https://build.avax.network/explorer/fuji/c-chain/tx/' + reviewedTimeTx1.hash}>
        <Icon name="receipt" />Xem biên nhận nạp trên Fuji</a>
      <details className="d22-receipt-source">
        <summary>Nguồn và phạm vi biên nhận</summary>
        <p className="caption customer-wrap"><code>{reviewedTimeTx1.provenance}</code></p>
        <p className="caption">Trang dùng biên nhận đã báo cáo, chưa tra cứu lại bằng RPC.
          Hồ sơ này chỉ ghi nhận giao dịch nạp, chưa chứng minh việc chốt đề nghị, rút tiền hay hoàn tiền.</p>
      </details>
    </>}
  </Section>
}

function OtherPortalLinks({ id }: { id: bigint }) {
  const paths = knownPortalPaths(id)
  if (!paths) return null
  return <Section>
    <h2>Đối chiếu hợp đồng #{id.toString()}</h2>
    <p className="caption">Để so sánh tại cùng block, kết nối đúng ví ở từng portal.</p>
    <AgreementPortalLinks id={id.toString()} paths={paths} />
  </Section>
}

function Activity({ data }: { data: Shared }) {
  const activity = data.activity
  const canShow = activity.status === 'FRESH' || activity.status === 'STALE'
  return <Section>
    <h2>Nhật ký giao dịch · Chain Indexer</h2>
    <MetadataList label="Trạng thái nhật ký" fields={[
      { label: 'Nhật ký Indexer', icon: 'history', value: indexerStatusLabels[activity.status], code: activity.status },
      { label: 'Block Indexer gần nhất', value: activity.lastIndexedBlock?.toString() ?? 'Chưa xác minh' },
      { label: 'Block Vault đọc dữ liệu', icon: 'layers', value: data.blockNumber.toString() },
    ]} />
    {activity.status !== 'FRESH' && <ErrorState>Lịch sử hoạt động chưa tải đầy đủ. {activity.reason ??
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
  const audited = snap ? auditKnownOperationsSnapshot(snap.data) : undefined
  const accepted = audited?.status === 'IDENTITY_AND_LEDGER_MATCHED'
  const role = snap ? snap.data.role : 'unverified'
  const resolver = snap ? isVerifiedResolver(snap.session, role) : false
  return <PortalPage breadcrumb="Vận hành / Fuji / Read-only" title={
    route.page === 'detail' ? 'Sổ cái Agreement #' + id : 'Hồ sơ claim · Agreement #' + id
  }>
    {route.page === 'claim' && <section className="ops-d22-case">
      <p>Hợp đồng #{id}{route.claimId && ' · Hồ sơ #' + route.claimId.toString()}</p>
      <h2>{accepted && snap ? snap.data.agreement.policy === 0 ? 'Ghi nhận buổi PT' :
        'Ghi nhận quyền tập theo thời gian' : 'Xác minh hồ sơ'}</h2>
      {accepted && snap && route.claimId && snap.claim ? <>
        <p><strong>{snap.claim.state === 4 ? 'Đã chốt theo quy tắc · FINALIZED' :
          claimStates[snap.claim.state] ?? 'Trạng thái chưa xác định'}</strong></p>
        <small>Phân bổ của hồ sơ · đơn vị cơ sở của mock MRES</small>
        <dl className="ops-d22-amounts">
          <div><dt>Cho phòng tập</dt><dd>{snap.claim.awardedToGym.toLocaleString('vi-VN')}</dd></div>
          <div><dt>Cho người mua</dt><dd>{snap.claim.awardedToBuyer.toLocaleString('vi-VN')}</dd></div>
        </dl>
        {snap.data.agreement.policy === 0 && snap.data.ledger.buyerRefunded > 0n && <p>
          Người mua đã nhận hoàn {base(snap.data.ledger.buyerRefunded)} trên toàn hợp đồng.
          Khoản hoàn khi kết thúc hợp đồng được đối soát riêng với phân bổ của hồ sơ này.</p>}
        <small>Đọc từ Vault tại block {snap.data.blockNumber.toString()} · Chỉ đọc</small>
        <details><summary>Chứng cứ và điều khoản của hồ sơ</summary>
          <p>Giá trị đề nghị: {base(snap.claim.amount)} · Hết hạn phản đối (Unix): {snap.claim.challengeEndsAt.toString()}</p>
          <p>Hash ghi nhận cam kết về tài liệu. Việc tập luyện hoặc mở cửa cần chứng cứ thực tế.</p>
          <EvidencePanel key={snap.claim.evidenceHash} agreementId={route.id} claimId={route.claimId} hash={snap.claim.evidenceHash} />
        </details>
      </> : <p>{state.loading ? 'Đang đọc Vault…' : snap?.claimError ?? 'Chưa xác minh được hồ sơ tại Vault.'}
        {!route.claimId && <a href={'/operations/disputes/' + id + '?claimId=1'}>Kiểm tra hồ sơ #1</a>}</p>}
    </section>}
    <Section>
      <h2>Đối chiếu Vault theo Agreement ID</h2>
      <p className="caption">Đọc trực tiếp ID, không phụ thuộc danh sách Indexer và không xác nhận full historical sync.</p>
      {state.loading && <LoadingSkeleton />}
      {state.message && <ErrorState>{state.message}</ErrorState>}
      {snap && <MetadataList label="Ví và quyền truy cập" fields={[
        { label: 'Ví đang kết nối', icon: 'wallet', value: <code>{snap.session.account}</code> },
        { label: 'Vai trò trên Vault', value: actorLabels[snap.data.role] },
        { label: 'Đối chiếu ví phân xử', icon: 'scale', value: resolver ? 'Trùng địa chỉ phân xử' : 'Chưa xác minh vai trò phân xử',
          code: resolver ? 'RESOLVER_ADDRESS_MATCHED' : 'READ_ONLY_VIEWER' },
        { label: 'Quyền truy cập', value: 'Chỉ đọc', code: 'READ_ONLY' },
        { label: 'Hash block', icon: 'layers', value: snap.session.head.hash ? <code>{snap.session.head.hash}</code> : 'Chưa xác minh' },
      ]} />}
      <button type="button" className="button button-primary" disabled={state.loading}
        onClick={() => void state.refresh(!snap)}>
        {snap ? 'Làm mới xác minh' : 'Kết nối ví / đọc lại Vault'}
      </button>
      {!snap && <p className="caption">NOT_VERIFIED · Không hiển thị tiền minh họa khi ví hoặc Vault không đọc được.</p>}
    </Section>
    {snap && <>
      {accepted && <Activity data={snap.data} />}
      <Ledger data={snap.data} />
      <OtherPortalLinks id={route.id} />
      <KnownDeposit data={snap.data} />
      {!accepted && <ErrorState>NOT_VERIFIED · Claim, Indexer và số dư không được
        suy ra từ agreement có metadata/getter không khớp.</ErrorState>}

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
  if (route.page === 'detail' || route.page === 'claim') return <Live route={route} />
  return <PortalPage breadcrumb="Vận hành" title="Không tìm thấy trang">
    <EmptyState title="Đường dẫn không tồn tại">Không có dữ liệu cho đường dẫn này.</EmptyState>
  </PortalPage>
}
