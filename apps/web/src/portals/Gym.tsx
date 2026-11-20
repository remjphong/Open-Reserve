import { useEffect, useRef, useState, type ReactNode } from 'react'
import { agreement as fixtureAgreement } from '../demo/agreement'
import { DisabledAction, EmptyState, ErrorState, LoadingSkeleton, MoneyFigure, PortalPage } from '../design-system/portal'
import { deployment, errorMessage, provider, sameAddress, walletSession, type Session } from '../lib/customer-chain'
import { readSharedAgreement } from '../lib/shared-ledger'
import {
  GYM_CHAIN_WRITES_ENABLED, discoverMerchantAgreements, readDirectGymAgreement, parseGymRoute, simulateGymIntent,
  verifyGymDeployment, type GymIntent, type GymRoute,
} from '../lib/gym-chain'

const DEMO = 'MINH HỌA · DEMO_FIXTURE — không phải dữ liệu Fuji'
const statuses = ['Chưa có', 'Chờ xác nhận', 'Đã được xác nhận', 'Đang tranh chấp', 'Đã chốt', 'Đã phân xử', 'Đã hủy']
const baseUnits = (value: bigint) => value.toLocaleString('vi-VN') + ' đơn vị nhỏ nhất MRES (không phải VNĐ)'
const short = (value: bigint) => value.toString()
const fLink = '/gym/agreements/OR-024'

type SharedData = Awaited<ReturnType<typeof readSharedAgreement>>
type GymSnapshot = {
  session: Session
  headBlock: bigint
  // Present ONLY after every AgreementOpened window succeeds.
  agreements?: Array<{ id: bigint; data: SharedData }>
  // Independently verified ID; never evidence of complete merchant history.
  direct?: { id: bigint; data: SharedData }
  routeKey: string
}

type GymControl = {
  snapshot?: GymSnapshot
  verifiedIdentity?: { session: Session; routeKey: string }
  loading: boolean
  error: string
  refresh: (connect?: boolean) => Promise<void>
}

const routeKey = (route: GymRoute) => route.page + ':' + (route.id?.toString() ?? '')
const isDirectRoute = (route: GymRoute) =>
  route.id !== undefined && (route.page === 'detail' || route.page === 'claim' || route.page === 'payouts')

// Only error class and numeric code are exposed. Never show raw RPC payloads.
function safeGymReadFault(cause: unknown): string {
  const parts: string[] = []
  const seen = new Set<object>()
  let current: unknown = cause
  while (current && typeof current === 'object' && parts.length < 5 && !seen.has(current)) {
    seen.add(current)
    const item = current as { name?: unknown; code?: unknown; cause?: unknown }
    const name = typeof item.name === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(item.name)
      ? item.name : 'Error'
    const code = typeof item.code === 'number' && Number.isInteger(item.code)
      ? ':' + item.code : ''
    parts.push(name + code)
    current = item.cause
  }
  return parts.join('/') || 'UnknownError'
}

function useGymData(route: GymRoute): GymControl {
  const [snapshot, setSnapshot] = useState<GymSnapshot>()
  const [verifiedIdentity, setVerifiedIdentity] = useState<GymControl['verifiedIdentity']>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const version = useRef(0)
  // The last EIP-1193 event is a constraint, not merely a refresh trigger.
  // null means an invalid/empty payload; undefined means no event has set a constraint.
  const walletEventFence = useRef<{ account?: string | null; chainId?: number | null; disconnected: boolean }>({ disconnected: false })
  const walletIdentity = useRef<{ account: string; chainId: number } | undefined>(undefined)
  const checkVersion = useRef(0)
  const [checkingWallet, setCheckingWallet] = useState(false)
  async function refresh(connect = false) {
    let step = 'WALLET_SESSION'
    const request = ++version.current
    const fence = walletEventFence.current
    ++checkVersion.current
    walletIdentity.current = undefined
    setCheckingWallet(false)
    setSnapshot(undefined)
    setVerifiedIdentity(undefined) // Invalidate on refresh/account/chain changes.
    setError('')
    setLoading(true)
    try {
      if (fence.disconnected && !connect) throw new Error('Ví chưa kết nối. Hãy kết nối lại để xác minh.')
      const session = await walletSession(connect)
      if (request !== version.current || fence !== walletEventFence.current) return
      // A wallet may temporarily return its OLD session after emitting a NEW event.
      // Never trust the old session over the event payload.
      if (!connect || !fence.disconnected) {
        if (fence.account !== undefined && (!fence.account || !sameAddress(session.account, fence.account))) {
          throw new Error('Tài khoản ví chưa đồng bộ với accountsChanged.')
        }
        if (fence.chainId !== undefined && (fence.chainId === null || session.chain.id !== fence.chainId)) {
          throw new Error('Mạng ví chưa đồng bộ với chainChanged.')
        }
      }
      if (isDirectRoute(route)) {
        step = 'DIRECT_ID_VAULT_READ'
        const verified = await readDirectGymAgreement(session, route.id, readSharedAgreement)
        if (request === version.current && fence === walletEventFence.current) {
          if (connect && fence.disconnected) walletEventFence.current = {
            account: session.account, chainId: session.chain.id, disconnected: false,
          }
          walletIdentity.current = { account: session.account, chainId: session.chain.id }
          setSnapshot({ session, headBlock: verified.headBlock,
            direct: { id: verified.id, data: verified.data }, routeKey: routeKey(route) })
        }
      } else {
        step = 'VERIFY_DEPLOYMENT'
        await verifyGymDeployment(session)
        if (request === version.current && fence === walletEventFence.current) {
          if (connect && fence.disconnected) walletEventFence.current = {
            account: session.account, chainId: session.chain.id, disconnected: false,
          }
          walletIdentity.current = { account: session.account, chainId: session.chain.id }
          setVerifiedIdentity({ session, routeKey: routeKey(route) })
        }
        step = 'MERCHANT_LOG_DISCOVERY'
        const { agreements, headBlock } = await discoverMerchantAgreements(session, readSharedAgreement)
        if (request === version.current && (!fence.disconnected || !connect) &&
            (fence === walletEventFence.current || (connect && !walletEventFence.current.disconnected))) {
          setSnapshot({ session, agreements, headBlock, routeKey: routeKey(route) })
        }
      }
    } catch (cause) {
      if (request === version.current) setError('GYM_READ_FAIL · STEP=' + step +
        ' · CAUSE=' + safeGymReadFault(cause) + ' · ' + errorMessage(cause))
    } finally {
      if (request === version.current) setLoading(false)
    }
  }
  useEffect(() => {
    const injected = provider()
    const changed = (autoRefresh = true) => {
      ++version.current // Discard pending reads for the previous wallet.
      ++checkVersion.current
      walletIdentity.current = undefined
      setCheckingWallet(false)
      setSnapshot(undefined)
      setVerifiedIdentity(undefined)
      if (route.page === 'not-found' || (route.page === 'claim' && !route.id)) {
        setError('NOT_VERIFIED · Đường dẫn hoặc agreement ID không hợp lệ.')
        setLoading(false)
      } else if (autoRefresh && !walletEventFence.current.disconnected) void refresh(false)
      else {
        setError('GYM_READ_FAIL · STEP=WALLET_SESSION · Ví chưa kết nối. Hãy kết nối lại.')
        setLoading(false)
      }
    }
    const onAccountsChanged = (accounts: unknown) => {
      const account = Array.isArray(accounts) && typeof accounts[0] === 'string' && accounts[0]
        ? accounts[0] : null
      walletEventFence.current = { ...walletEventFence.current,
        account, disconnected: walletEventFence.current.disconnected || !account }
      changed(Boolean(account) && !walletEventFence.current.disconnected)
    }
    const onChainChanged = (chainId: unknown) => {
      const parsed = typeof chainId === 'string' && /^0x[0-9a-f]+$/i.test(chainId)
        ? Number(BigInt(chainId)) : null
      walletEventFence.current = { ...walletEventFence.current,
        chainId: parsed !== null && Number.isSafeInteger(parsed) ? parsed : null }
      changed(!walletEventFence.current.disconnected)
    }
    const onDisconnect = () => {
      walletEventFence.current = { ...walletEventFence.current, disconnected: true }
      changed(false) // No automatic session recovery, even if the provider returns stale accounts.
    }

    // Events are primary; foreground checks cover wallets that skip events.
    const checkActiveWallet = (mask: boolean) => {
      if (document.visibilityState !== 'visible') return
      const expected = walletIdentity.current
      if (!expected) return
      if (!injected) { changed(); return }

      const check = ++checkVersion.current
      if (mask) setCheckingWallet(true)

      const timeout = window.setTimeout(() => {
        if (check === checkVersion.current) changed()
      }, 5000)

      void Promise.all([
        injected.request({ method: 'eth_chainId' }),
        injected.request({ method: 'eth_accounts' }),
      ]).then(([chainId, accounts]) => {
        if (check !== checkVersion.current) return

        const actualChain = typeof chainId === 'string' && /^0x[0-9a-f]+$/i.test(chainId)
          ? Number(BigInt(chainId)) : NaN
        const account = Array.isArray(accounts) && typeof accounts[0] === 'string'
          ? accounts[0] : undefined

        if (actualChain !== expected.chainId ||
            !account || !sameAddress(account, expected.account)) {
          changed()
        } else {
          setCheckingWallet(false)
        }
      }).catch(() => {
        if (check === checkVersion.current) changed()
      }).finally(() => window.clearTimeout(timeout))
    }

    const foreground = () => checkActiveWallet(true)
    const visible = () => {
      if (document.visibilityState === 'visible') foreground()
    }
    const periodic = window.setInterval(() => checkActiveWallet(false), 8000)

    injected?.on?.('accountsChanged', onAccountsChanged)
    injected?.on?.('chainChanged', onChainChanged)
    injected?.on?.('disconnect', onDisconnect)
    window.addEventListener('focus', foreground)
    window.addEventListener('pageshow', foreground)
    document.addEventListener('visibilitychange', visible)

    changed()

    return () => {
      ++version.current
      ++checkVersion.current
      walletIdentity.current = undefined
      window.clearInterval(periodic)
      window.removeEventListener('focus', foreground)
      window.removeEventListener('pageshow', foreground)
      document.removeEventListener('visibilitychange', visible)
      injected?.removeListener?.('accountsChanged', onAccountsChanged)
      injected?.removeListener?.('chainChanged', onChainChanged)
      injected?.removeListener?.('disconnect', onDisconnect)
    }
  }, [route.page, route.id])
  return { snapshot: !checkingWallet && snapshot?.routeKey === routeKey(route) ? snapshot : undefined,
    verifiedIdentity: !checkingWallet && verifiedIdentity?.routeKey === routeKey(route) ? verifiedIdentity : undefined,
    loading: loading || checkingWallet, error: checkingWallet ? '' : error, refresh }
}

function Card({ children }: { children: ReactNode }) {
  return <section className="card card-pad customer-flow-card">{children}</section>
}
function GymLink({ id, children }: { id: bigint; children: ReactNode }) {
  return <a className="inline-link customer-wrap" href={'/gym/agreements/' + id}>{children}</a>
}
function VaultLabel({ item }: { item: SharedData }) {
  return <p className="caption customer-wrap">NGUỒN TIỀN: VAULT_READ_CONTRACT · Fuji block {short(item.blockNumber)}
    {' · '}Indexer activity: {item.activity.status}{item.activity.reason && ' · ' + item.activity.reason}
  </p>
}
function WalletPanel({ state }: { state: GymControl }) {
  const session = state.snapshot?.session
  return <Card>
    <h2>Ví chủ gym · Fuji</h2>
    {session ? <p className="caption customer-wrap">Đã đọc ví {session.account} · chain {session.chain.id} · block {short(state.snapshot!.headBlock)}
      {' · '}Hash {session.head.hash ?? 'NOT_VERIFIED'}
      {state.snapshot?.direct ? ' · VERIFIED_DIRECT_ID_ONLY' : ' · VERIFIED_FULL_DISCOVERY'}</p>
      : <p className="caption">Đọc agreement ID trực tiếp không phụ thuộc quét danh sách; danh sách merchant chỉ được xác minh nếu toàn bộ log đã đọc thành công.</p>}
    {!session && state.verifiedIdentity && <p className="caption customer-wrap">
      Đã đọc địa chỉ ví {state.verifiedIdentity.session.account} · chain {state.verifiedIdentity.session.chain.id}
      {' · '}VAULT_VERIFIED · MERCHANT_HISTORY_NOT_VERIFIED.
      Chưa xác minh danh sách hợp đồng, quyền merchant theo từng agreement hoặc số tiền tổng hợp.
    </p>}
    {state.loading && <LoadingSkeleton />}
    {state.error && <ErrorState>{state.error} — Không hiển thị danh sách rỗng đã xác minh khi đọc lỗi.</ErrorState>}
    {deployment && <button type="button" className="button button-primary" disabled={state.loading}
      onClick={() => void state.refresh(!session && !state.verifiedIdentity)}>{session
        ? (state.snapshot?.direct ? 'Làm mới agreement ID' : 'Làm mới Vault và log')
        : state.verifiedIdentity ? 'Thử lại quét lịch sử (Vault đã xác minh)' : 'Kết nối ví merchant / thử lại'}</button>}
    {!deployment && <p className="caption">NOT_VERIFIED · Chưa cấu hình Vault. Không có dữ liệu on-chain.</p>}
    <p className="caption">Quyền ký phải thuộc địa chỉ merchant trong từng agreement. Nhân viên chỉ xem DEMO_FIXTURE; không có tài khoản nhân viên xác thực.</p>
    <p><a className="inline-link" href="/gym/agreements/1">Đọc trực tiếp Agreement #1 từ Vault (không quét lịch sử)</a></p>
    <a className="inline-link" href={fLink}>Xem hợp đồng minh họa tách biệt</a>
  </Card>
}

function Ledger({ item }: { item: SharedData }) {
  const rows = [
    ['Đã nạp', item.ledger.deposited],
    ['Giá trị đã chốt', item.ledger.earnedFinalized],
    ['Đã rút', item.ledger.gymWithdrawn],
    ['Gym có thể rút', item.ledger.withdrawable],
    ['Vault còn giữ', item.ledger.remainingLocked],
    ['Đang tranh chấp, vẫn khóa', item.ledger.disputedLocked],
    ['Được duyệt hoàn cho buyer', item.ledger.refundable],
    ['Chưa phân bổ', item.ledger.unallocated],
  ] as const
  return <Card><h2>Sổ cái do Vault xác nhận</h2><VaultLabel item={item} />
    <dl className="money-list">{rows.map(([label, value]) =>
      <div key={label} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 24rem), 1fr))', gap: 4 }}>
        <dt style={{ minWidth: 0 }}>{label}</dt>
        <dd className="money customer-wrap" style={{ minWidth: 0, maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'right' }}>{baseUnits(value)}</dd>
      </div>)}</dl>
    <p className="caption">Pending/challenged không được cộng vào withdrawable. MRES là token thử nghiệm, không phải VNĐ.</p>
  </Card>
}

function Simulate({ session, intent, title }: {
  session: Session; intent?: GymIntent; title: string
}) {
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')
  const locked = useRef(false)
  async function preview() {
    if (!intent || locked.current) return
    locked.current = true
    setChecking(true)
    setMessage('')
    try {
      const fresh = await walletSession()
      if (!sameAddress(fresh.account, session.account) ||
          fresh.chain.id !== session.chain.id || !sameAddress(fresh.vault, session.vault)) {
        throw new Error('Ví hoặc Vault đã thay đổi; tải lại trước khi simulate.')
      }
      await simulateGymIntent(fresh, intent)
      setMessage('SIMULATION_PASS · Điều kiện phù hợp tại block đọc. CHƯA ký, CHƯA gửi Fuji, CHƯA có receipt.')
    } catch (cause) {
      setMessage('SIMULATION_FAILED · ' + errorMessage(cause))
    } finally {
      locked.current = false
      setChecking(false)
    }
  }
  return <div className="customer-flow-card">
    <button type="button" className="button button-primary" disabled={!intent || checking}
      onClick={() => void preview()}>{checking ? 'Đang mô phỏng…' : 'Kiểm tra điều kiện (không ký)'}</button>
    <DisabledAction id={'gym-write-' + title.replace(/\W/g, '-')}
      reason="FUJI_WRITE_BLOCKED · Chưa có Owner GO, Wallet 1/Reviewer 2 gate. Chỉ kiểm tra đọc/mô phỏng; không ký hoặc gửi giao dịch.">
      {title} — chưa kích hoạt
    </DisabledAction>
    {message && <p role="status" className="caption customer-wrap">{message}</p>}
    <p className="caption">Signing enabled: {String(GYM_CHAIN_WRITES_ENABLED)}. Không có TX receipt mới từ bước này.</p>
  </div>
}

function AgreementList({ entries, headBlock }: { entries: NonNullable<GymSnapshot['agreements']>; headBlock: bigint }) {
  return <PortalPage breadcrumb="Phòng gym / Hợp đồng" title="Danh sách hợp đồng">
    <Card><p className="caption">Đã yêu cầu log AgreementOpened cho từng khoảng block từ deployment đến block {short(headBlock)}. Chỉ hiển thị merchant khớp Vault.</p>
      {entries.length === 0 ? <EmptyState title="Chưa có hợp đồng cho ví này">Mọi khoảng truy vấn đã trả kết quả, nhưng RPC chưa trả hợp đồng merchant; tính đầy đủ phụ thuộc RPC.</EmptyState>
        : <ul>{entries.map(({ id, data }) => <li key={short(id)}><GymLink id={id}>Hợp đồng #{short(id)}</GymLink>
          {' · '}{data.agreement.policy === 0 ? 'PT 10 buổi' : 'TIME_ACCESS'}
          {' · '}Có thể rút: {baseUnits(data.ledger.withdrawable)}</li>)}</ul>}
    </Card>
  </PortalPage>
}

function ClaimForm({ id, item, session }: { id: bigint; item: SharedData; session: Session }) {
  const [sessionId, setSessionId] = useState('')
  const [evidenceHash, setEvidenceHash] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const hex32 = (value: string): value is `0x${string}` => /^0x[0-9a-fA-F]{64}$/.test(value) && !/^0x0{64}$/i.test(value)
  const policy = item.agreement.policy
  const validTimes = /^(0|[1-9][0-9]*)$/.test(from) && /^(0|[1-9][0-9]*)$/.test(to)
  const intent: GymIntent | undefined = policy === 0
    ? hex32(sessionId) && hex32(evidenceHash)
      ? { type: 'proposeSession', agreementId: id, sessionId, evidenceHash } : undefined
    : hex32(evidenceHash) && validTimes
      ? { type: 'proposeTime', agreementId: id, from: BigInt(from), to: BigInt(to), evidenceHash } : undefined
  return <Card><h2>Tạo đề nghị · {policy === 0 ? 'Buổi PT' : 'TIME_ACCESS'}</h2>
    <VaultLabel item={item} />
    <p>Đề nghị mới chỉ ở trạng thái chờ. Không phải tiền đã chốt hoặc có thể rút.</p>
    {item.agreement.state !== 1 && <ErrorState>Hợp đồng không còn OPEN.</ErrorState>}
    {policy === 0 && <label className="customer-field">Session ID (bytes32 hex, không trùng)
      <input value={sessionId} onChange={event => setSessionId(event.target.value)} placeholder="0x… (32 byte)" /></label>}
    {policy === 1 && <>
      <p className="caption">Dùng Unix giây; khoảng [from,to) phải nằm trong [{short(item.agreement.startAt)},{short(item.agreement.endAt)}) và đã trôi qua.</p>
      <label className="customer-field">Từ (Unix giây)<input value={from} onChange={event => setFrom(event.target.value)} inputMode="numeric" /></label>
      <label className="customer-field">Đến (Unix giây)<input value={to} onChange={event => setTo(event.target.value)} inputMode="numeric" /></label>
    </>}
    <label className="customer-field">Hash bằng chứng (bytes32; không lưu dữ liệu bằng chứng ở đây)
      <input value={evidenceHash} onChange={event => setEvidenceHash(event.target.value)} placeholder="0x…" /></label>
    <Simulate session={session} intent={item.agreement.state === 1 ? intent : undefined} title="Gửi đề nghị" />
  </Card>
}

function ClaimHistory({ id, item, session }: { id: bigint; item: SharedData; session: Session }) {
  return <Card><h2>Đề nghị và trạng thái</h2>
    {!item.claims ? <ErrorState>Đọc claim logs chưa hoàn tất. Không coi là không có đề nghị.</ErrorState>
      : item.claims.length === 0 ? <EmptyState title="Chưa có đề nghị">Vault chưa ghi nhận ClaimProposed.</EmptyState>
        : item.claims.map(({ claimId, claim }) => {
          const canFinalize = item.agreement.state === 1 &&
            (item.agreement.policy === 0
              ? claim.state === 2 && item.agreement.challengedSessionClaimId === 0n
              : claim.state === 1 && session.head.timestamp >= claim.challengeEndsAt)
          return <article key={short(claimId)} className="customer-claim">
            <p><strong>Claim #{short(claimId)} · {statuses[claim.state] ?? 'Không xác định'}</strong></p>
            <p className="caption customer-wrap">Evidence hash: {claim.evidenceHash}
              {item.agreement.policy === 1 && ' · Challenge end: ' + short(claim.challengeEndsAt)}</p>
            {canFinalize ? <Simulate session={session}
              intent={{ type: 'finalizeClaim', agreementId: id, claimId }} title="Chốt đề nghị" />
              : <p className="caption">Chưa đủ điều kiện finalize · không mở thao tác.</p>}
          </article>
        })}
  </Card>
}

function Payouts({ entries, session, onlyId }: { entries: NonNullable<GymSnapshot['agreements']>; session: Session; onlyId?: bigint }) {
  const selected = onlyId ? entries.filter(item => item.id === onlyId) : entries
  return <PortalPage breadcrumb="Phòng gym / Giải ngân" title="Khoản đã chốt có thể rút">
    {selected.length === 0 && <Card><EmptyState title="Chưa tìm thấy hợp đồng">Danh sách chỉ gồm hợp đồng đã xác minh quyền merchant.</EmptyState></Card>}
    {selected.map(({ id, data }) => <div key={short(id)}>
      <Card><h2>Hợp đồng #{short(id)}</h2><VaultLabel item={data} />
        <p><strong>Có thể rút: {baseUnits(data.ledger.withdrawable)}</strong></p>
        <p>Đã chốt: {baseUnits(data.ledger.earnedFinalized)} · Đang tranh chấp: {baseUnits(data.ledger.disputedLocked)}</p>
        <Simulate session={session} title="Rút khoản earned"
          intent={data.ledger.withdrawable > 0n ? { type: 'claimEarned', agreementId: id } : undefined} />
        <GymLink id={id}>Mở hợp đồng #{short(id)}</GymLink>
      </Card>
    </div>)}
  </PortalPage>
}

function Fixture() {
  const a = fixtureAgreement
  return <PortalPage breadcrumb="Phòng gym / Hợp đồng mẫu" title={'Minh họa ' + a.id}>
    <Card><p><strong>{DEMO}</strong></p>
      <p>{a.packageName} · {a.id} · {a.claim} bị phản đối theo kịch bản mẫu.</p>
      <p>Đã nạp: <MoneyFigure value={a.deposited} /> · Đã chốt: <MoneyFigure value={a.settled} />
        {' · '}Có thể rút: <MoneyFigure value={a.withdrawable} /></p>
      <DisabledAction id="fixture-sign" reason="DEMO_FIXTURE không có agreement ID trên Fuji; không thể gửi giao dịch.">
        Không thể rút tiền từ dữ liệu mẫu
      </DisabledAction>
      <a className="inline-link" href="/gym">Quay lại Gym Fuji</a>
    </Card>
  </PortalPage>
}

function LiveGym({ route }: { route: GymRoute }) {
  const state = useGymData(route)
  const snap = state.snapshot
  const target = snap && route.id ? (snap.direct?.id === route.id ? snap.direct
    : snap.agreements?.find(entry => entry.id === route.id)) : undefined
  return <>
    <WalletPanel state={state} />
    {!snap && <Card><p className="caption">READ_STATUS: {state.loading ? 'LOADING' : state.verifiedIdentity ? 'MERCHANT_HISTORY_NOT_VERIFIED' : 'NOT_VERIFIED'} · Không sử dụng số dư demo thay cho dữ liệu RPC.</p></Card>}
    {snap?.direct && <Card><ErrorState>INCOMPLETE_LOG_READ · Danh sách hợp đồng merchant chưa được quét đầy đủ.
      Chỉ Agreement #{short(snap.direct.id)} đã được xác minh trực tiếp từ Vault tại block {short(snap.headBlock)}.
      Không suy ra danh sách đầy đủ hoặc không có các hợp đồng khác.</ErrorState></Card>}
    {snap && (route.page === 'overview' && snap.agreements ? <PortalPage breadcrumb="Phòng gym / Tổng quan" title="Tổng quan hợp đồng Fuji">
      <Card><p>Hợp đồng được xác minh quyền merchant: {snap.agreements.length}. Block đã ghim: {short(snap.headBlock)}</p>
        <p>Tổng có thể rút (từ Vault): {baseUnits(snap.agreements.reduce((sum, item) => sum + item.data.ledger.withdrawable, 0n))}</p>
        <a className="inline-link" href="/gym/agreements">Xem danh sách hợp đồng</a>
      </Card>
    </PortalPage> : route.page === 'agreements' && snap.agreements ? <AgreementList entries={snap.agreements} headBlock={snap.headBlock} />
      : route.page === 'payouts' ? <Payouts entries={snap.agreements ?? (snap.direct ? [snap.direct] : [])}
          session={snap.session} onlyId={route.id} />
        : route.page === 'detail' || route.page === 'claim' ? target
          ? <PortalPage breadcrumb="Phòng gym / Hợp đồng" title={'Hợp đồng #' + short(target.id)}>
            <Card><p>Loại: {target.data.agreement.policy === 0 ? 'PT 10 buổi' : 'TIME_ACCESS'} · Trạng thái: {target.data.agreement.state}</p>
              <p className="caption customer-wrap">Buyer: {target.data.agreement.buyer} · Merchant: {target.data.agreement.merchant}</p>
              <p><a className="inline-link" href={'/gym/claims/new?agreementId=' + short(target.id)}>Tạo đề nghị</a>
                {' · '}<a className="inline-link" href={'/gym/payouts?agreementId=' + short(target.id)}>Giải ngân</a></p>
            </Card>
            <Ledger item={target.data} />
            {route.page === 'claim' && <ClaimForm id={target.id} item={target.data} session={snap.session} />}
            <ClaimHistory id={target.id} item={target.data} session={snap.session} />
          </PortalPage>
          : <Card><ErrorState>Không tìm thấy hợp đồng merchant #{route.id?.toString() ?? '?'}. Không thể xem hoặc gửi thao tác.</ErrorState></Card>
          : <Card><ErrorState>{route.reason ?? 'Không tìm thấy đường dẫn.'}</ErrorState></Card>)}
    {route.page === 'claim' && !route.id && <Card><ErrorState>{route.reason ?? 'Thiếu mã hợp đồng.'}</ErrorState>
      <a className="inline-link" href="/gym/agreements">Chọn hợp đồng</a></Card>}
    {route.page === 'not-found' && <Card><ErrorState>{route.reason ?? 'Không tìm thấy trang.'}</ErrorState></Card>}
  </>
}

export function Gym({ path }: { path: string }) {
  const route = parseGymRoute(path, window.location.search)
  return route.page === 'fixture' ? <Fixture /> : <LiveGym route={route} />
}
