import { useEffect, useRef, useState, type ReactNode } from 'react'
import { zeroHash } from 'viem'
import { approvedTermsHash } from '@openreserve/contracts-sdk'
import { ClaimEvidenceReview } from './ClaimEvidenceReview'
import { CustomerPreview } from './CustomerPreview'
import { EmptyState, ErrorState, Icon, LoadingSkeleton, OverviewCard, PortalPage } from '../design-system/portal'
import { readSharedAgreement } from '../lib/shared-ledger'
import {
  classifyPtBalances, ptAgreementId, verifyWallet1PtReport, wallet1PtReport,
  type FinancialView, type PtProofResult,
} from '../lib/customer-pt-proof'
import {
  checkoutState, deployment, errorMessage, listPasses, parseId, provider, purchase,
  readPass, runBuyerAction, sameAddress, walletSession, type Session,
} from '../lib/customer-chain'

const packages = [
  { id: 'pt-10', name: 'PT cá nhân · 10 buổi', policy: 0, price: '1003', description: 'Quyền dùng 10 buổi PT. Gym ghi nhận từng buổi đã cung cấp.' },
  { id: 'time-90', name: 'Tập không giới hạn · 90 ngày', policy: 1, price: '900', description: 'Quyền vào phòng tập trong 90 ngày. Giá trị dịch vụ tính theo thời gian đủ điều kiện.' },
] as const
const passRoot = '/customer/passes'
const claimStates = ['Chưa có', 'Chờ xử lý', 'Đã xác nhận', 'Đã phản đối', 'Đã chốt', 'Đã phân xử', 'Đã hủy']
const token = (amount: bigint) => amount.toLocaleString('vi-VN') + ' đơn vị nhỏ nhất của MRES'
const fixture = 'MINH HỌA · DEMO_FIXTURE'
const termsUrl = 'https://github.com/remjphong/Open-Reserve/blob/0f3dadac5bef8814433843b4356af026181eb0b7/docs/product-and-terms-v1.0.1-proposed.md'
type Package = typeof packages[number]

export function isCustomerRoute(path: string) {
  return path === '/customer' || path === passRoot ||
    /^\/customer\/(packages|checkout)\/(pt-10|time-90)$/.test(path) ||
    /^\/customer\/passes\/(?:OR-024(?:\/evidence)?|[0-9]+(?:\/dispute)?)$/.test(path)
}

function Page({ title, children }: { title: string; children: ReactNode }) {
  return <PortalPage title={title} breadcrumb="Khách hàng">{children}</PortalPage>
}

function Card({ children }: { children: ReactNode }) {
  return <section className="card card-pad customer-flow-card">{children}</section>
}

function Button({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button type="button" className="button button-primary" disabled={disabled} onClick={onClick}>{children}</button>
}

function useWallet<T>(load: (session: Session) => Promise<T>) {
  const [value, setValue] = useState<{ session: Session; data: T }>()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const version = useRef(0)
  async function refresh(connect = false) {
    const request = ++version.current
    setValue(undefined)
    setLoading(true)
    setMessage('')
    try {
      const session = await walletSession(connect)
      const data = await load(session)
      if (request === version.current) setValue({ session, data })
    } catch (error) {
      if (request === version.current) setMessage(errorMessage(error))
    } finally {
      if (request === version.current) setLoading(false)
    }
  }
  useEffect(() => {
    const injected = provider()
    const changed = () => void refresh()
    const disconnected = () => {
      ++version.current
      setValue(undefined)
      setLoading(false)
      setMessage('Mất kết nối ví. Không hiển thị số dư cũ; hãy kết nối lại để xác minh.')
    }
    injected?.on?.('accountsChanged', changed)
    injected?.on?.('chainChanged', changed)
    injected?.on?.('disconnect', disconnected)
    changed()
    return () => {
      ++version.current
      injected?.removeListener?.('accountsChanged', changed)
      injected?.removeListener?.('chainChanged', changed)
      injected?.removeListener?.('disconnect', disconnected)
    }
  }, [])
  return { value, loading, message, refresh }
}

function walletControls<T>({ loading, message, refresh, value }: ReturnType<typeof useWallet<T>>) {
  const session = value?.session
  return {
    loading, message, refresh,
    identity: session ? `Ví ${session.account} · ${session.chain.name} · Block ${session.head.number}` : '',
  }
}

function WalletControls({ loading, message, refresh, identity, busy }: {
  loading: boolean; message: string; refresh: (connect?: boolean) => Promise<void>; identity: string; busy?: boolean
}) {
  return <>
    {loading && <LoadingSkeleton />}
    {message && <ErrorState>{message}</ErrorState>}
    {identity && <p className="caption customer-wrap">{identity}</p>}
    {deployment && <Button disabled={loading || busy} onClick={() => void refresh(!identity)}>
      {identity ? 'Làm mới dữ liệu Vault' : 'Kết nối ví / thử lại'}
    </Button>}
  </>
}

function useTransaction() {
  const locked = useRef(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [failure, setFailure] = useState('')
  async function run(action: (progress: (text: string) => void) => Promise<string>) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setFailure('')
    setStatus('')
    try { setStatus(await action(setStatus)) }
    catch (error) { setStatus(''); setFailure(errorMessage(error)) }
    finally { locked.current = false; setBusy(false) }
  }
  return { busy, run, feedback: <div aria-live="polite" className="customer-wrap">
    {status && <p>{status}</p>}{failure && <ErrorState>{failure}</ErrorState>}
  </div> }
}

function PackageDetail({ pack }: { pack: Package }) {
  return <Page title={pack.name}><Card>
    <p className="caption">{fixture}</p>
    <p>{pack.description}</p>
    {pack.policy === 1 && <p>Hợp đồng trên Fuji dùng 270 giây với 60 giây để phản đối đề nghị.</p>}
    <p>Giá thử nghiệm {token(BigInt(pack.price))}. Vault giữ token và chỉ chuyển theo điều kiện hợp đồng.</p>
    <p>Điều khoản 1.0.1. Số token còn trong Vault và số được duyệt hoàn được hiển thị riêng.</p>
    <a className="button button-primary" href={'/customer/checkout/' + pack.id}>Tiếp tục đến thanh toán</a>
  </Card></Page>
}

function Checkout({ pack }: { pack: Package }) {
  const state = useWallet(checkoutState)
  const transaction = useTransaction()
  const [terms, setTerms] = useState(false)
  const [opened, setOpened] = useState(false)
  const [pass, setPass] = useState<bigint>()
  const balance = state.value?.data
  const merchant = state.value?.session.merchant
  const disabled = !balance || !terms || !merchant || transaction.busy || opened || balance.gas === 0n || balance.balance < BigInt(pack.price)
  async function pay(type: 'approve' | 'deposit') {
    await transaction.run(async progress => {
      const fresh = await walletSession()
      if (!state.value || !sameAddress(fresh.account, state.value.session.account)) throw new Error('Ví đã thay đổi. Hãy đọc lại dữ liệu trước khi ký.')
      const outcome = await purchase(fresh, type, pack.policy, BigInt(pack.price), progress)
      if (type === 'deposit') {
        setOpened(true)
        setPass(outcome.id)
      }
      await state.refresh()
      return (type === 'approve' ? 'Đã xác nhận cấp hạn mức' : 'Đã xác nhận giao dịch nạp') + ' · ' + outcome.receipt.transactionHash
    })
  }
  return <Page title="Thanh toán thử nghiệm"><div className="grid customer-grid">
    <Card><h2>{pack.name}</h2><p className="caption">{fixture}</p>
      <p>{pack.description}</p><p className="money">{token(BigInt(pack.price))}</p>
      {pack.policy === 1 && <p>Quyền sử dụng dự kiến 90 ngày. Fuji chạy 270 giây. Gói bắt đầu khoảng 2 phút sau block dùng để chuẩn bị giao dịch.</p>}
      <p className="caption customer-wrap"><a href={termsUrl} className="inline-link" target="_blank" rel="noreferrer">Đọc điều khoản 1.0.1</a><br />{approvedTermsHash}</p>
      <label className="customer-check"><input type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)} />
        Tôi đồng ý điều khoản 1.0.1 và sử dụng MRES thử nghiệm.</label>
    </Card>
    <Card><h2>Ví và giao dịch</h2><WalletControls {...walletControls(state)} busy={transaction.busy} />
      {state.value && !merchant && <p>Chưa cấu hình địa chỉ gym cho gói thử nghiệm.</p>}
      {balance && <>
        <p>Số dư {token(balance.balance)} · Hạn mức {token(balance.allowance)}</p>
        {balance.gas === 0n && <p>Thiếu token mạng để trả phí gas.</p>}
        {balance.balance < BigInt(pack.price) && <p>Ví chưa đủ MRES để mua gói.</p>}
        {balance.allowance < BigInt(pack.price)
          ? <Button disabled={disabled} onClick={() => void pay('approve')}>Cấp hạn mức MRES</Button>
          : <Button disabled={disabled} onClick={() => void pay('deposit')}>Nạp vào Vault</Button>}
      </>}
      {transaction.feedback}
      <a className="inline-link" href={pass ? passRoot + '/' + pass : passRoot}>{pass ? 'Mở gói vừa mua' : 'Xem các gói của tôi'}</a>
    </Card>
  </div></Page>
}

function Passes() {
  const state = useWallet(listPasses)
  return <Page title="Các gói của tôi"><Card>
    <WalletControls {...walletControls(state)} />
    <p className="caption">Lịch sử theo ví dùng quét AgreementOpened; nếu RPC giới hạn log, không được kết luận không có hợp đồng.</p>
    <a className="inline-link" href="/customer/passes/1">Đọc trực tiếp Agreement #1 PT trên Fuji (không cần quét lịch sử)</a>
    {state.value && (state.value.data.length
      ? <ul>{state.value.data.map(log => <li key={String(log.args.agreementId)}><a className="inline-link" href={passRoot + '/' + log.args.agreementId}>
        Hợp đồng #{String(log.args.agreementId)} · {log.args.policy === 0 ? 'PT 10 buổi' : 'Tập không giới hạn'}
      </a></li>)}</ul>
      : <EmptyState title="Chưa có gói">Ví này chưa mở hợp đồng trên Vault đang kết nối.</EmptyState>)}
    {!deployment && <a className="inline-link" href={passRoot + '/OR-024'}>Xem gói mẫu OR-024 · {fixture}</a>}
  </Card></Page>
}


function CustomerFinancialLedger({ ledger }: { ledger: FinancialView }) {
  const result = classifyPtBalances(ledger)
  return <div className="customer-claim">
    <h3>Phân tách dòng tiền (đơn vị nhỏ nhất MRES)</h3>
    <dl className="money-list">
      {([
        ['Tổng đã nạp', ledger.deposited],
        ['Gym đã hưởng (earnedFinalized)', ledger.earnedFinalized],
        ['Gym đã thực rút (gymWithdrawn)', ledger.gymWithdrawn],
        ['Buyer đã nhận hoàn', ledger.buyerRefunded],
        ['Khoản còn chưa phân bổ', ledger.unallocated],
      ] as const).map(([label, value]) => <div key={label}>
        <dt>{label}</dt><dd className="customer-wrap">{token(value)}</dd>
      </div>)}
    </dl>
    <p className="caption">{result.valid
      ? 'VAULT_LEDGER_CONSISTENT · Không cộng chồng earned, withdrawn, withdrawable và locked.'
      : 'LEDGER_MISMATCH · Đọc lại block và không suy ra quyền hoàn.'}</p>
    <p className="caption">Phân biệt: earned là giá trị đã chốt; withdrawn là số Gym đã nhận;
      withdrawable là số Gym có thể nhận tiếp; refundable chỉ là khoản Buyer đã được duyệt và chưa nhận.</p>
  </div>
}

function PtProofPanel({ session, buyer, merchant }: {
  session: Session; buyer: string; merchant: string
}) {
  const [checking, setChecking] = useState(false)
  const [proof, setProof] = useState<PtProofResult>()
  const generation = useRef(0)
  useEffect(() => () => { ++generation.current }, [session])
  async function check() {
    if (checking) return
    const current = ++generation.current
    setChecking(true)
    setProof(undefined)
    const result = await verifyWallet1PtReport({
      chainId: session.chain.id, vault: session.vault, buyer, merchant,
      pinnedBlock: session.head.number,
    }, async hash => {
      const receipt = await session.publicClient.getTransactionReceipt({ hash })
      const transaction = await session.publicClient.getTransaction({ hash })
      const block = await session.publicClient.getBlock({ blockNumber: receipt.blockNumber })
      return {
        receipt: {
          transactionHash: receipt.transactionHash, status: receipt.status,
          blockNumber: receipt.blockNumber, blockHash: receipt.blockHash, to: receipt.to,
        },
        transaction: { from: transaction.from, to: transaction.to, input: transaction.input },
        canonicalBlockHash: block.hash,
      }
    })
    const [account] = await session.wallet.getAddresses().catch(() => [undefined])
    const chainId = await session.wallet.getChainId().catch(() => -1)
    if (current === generation.current) {
      setProof(account && sameAddress(account, session.account) && chainId === session.chain.id
        ? result : { status: 'NOT_VERIFIED', checked: result.checked,
            reason: 'Wallet session changed during receipt verification.' })
      setChecking(false)
    }
  }
  return <Card>
    <h2>Bốn giao dịch PT #1 · theo hồ sơ Wallet 1</h2>
    <p className="caption">WALLET1_REPORTED_RECEIPTS_VERIFIED · Đây là báo cáo lịch sử từ Wallet 1,
      chưa phải kiểm chứng RPC mới của trình duyệt này. Không xác nhận buổi tập thực tế.</p>
    <ol className="customer-pt-receipts">
      {wallet1PtReport.map(item => <li key={item.hash} className="customer-wrap">
        <strong>{item.step}</strong> · block {item.block.toString()}
        <p className="caption"><a className="inline-link" href={'https://testnet.snowtrace.io/tx/' + item.hash}
          target="_blank" rel="noopener noreferrer">{item.hash}</a></p>
      </li>)}
    </ol>
    <button type="button" className="button" disabled={checking} onClick={() => void check()}>
      {checking ? 'Đang đọc receipt, transaction và block…' : 'Đối chiếu 4 receipt trực tiếp qua RPC (chỉ đọc)'}
    </button>
    {proof && <p role="status" className="customer-wrap">{proof.status} · {proof.checked}/4 receipt
      {proof.reason ? ' · ' + proof.reason :
        ' · Đúng Vault/Buyer/Merchant/calldata và block theo RPC tại snapshot; không chứng minh buổi tập đã xảy ra.'}
    </p>}
  </Card>
}

function Pass({ agreementId, dispute }: { agreementId: string; dispute: boolean }) {
  const id = BigInt(agreementId)
  type PassData = Awaited<ReturnType<typeof readPass>> |
    Awaited<ReturnType<typeof readSharedAgreement>>
  const state = useWallet<PassData>(session => session.chain.id === 43113
    ? readSharedAgreement(session, id) : readPass(session, id))
  const transaction = useTransaction()
  const [evidence, setEvidence] = useState('')
  const { session, data } = state.value ?? {}
  const isBuyer = Boolean(session && data && sameAddress(session.account, data.agreement.buyer))
  const evidenceHash = /^0x[0-9a-f]{64}$/i.test(evidence) && evidence.toLowerCase() !== zeroHash
    ? evidence as `0x${string}` : undefined
  async function act(intent: Parameters<typeof runBuyerAction>[1]) {
    await transaction.run(async progress => {
      const fresh = await walletSession()
      if (!session || !sameAddress(fresh.account, session.account)) throw new Error('Ví đã thay đổi. Hãy đọc lại dữ liệu trước khi ký.')
      const receipt = await runBuyerAction(fresh, intent, progress)
      await state.refresh()
      return 'Đã xác nhận · ' + receipt.transactionHash
    })
  }
  const mismatch = data && 'ledger' in data && !classifyPtBalances(data.ledger).valid
  const source = (
    <Card><WalletControls {...walletControls(state)} busy={transaction.busy} />
      {data && 'activity' in data && <div className="customer-wrap">
        <p className="caption">Nguồn số tiền: VAULT_READ_CONTRACT · Fuji 43113 · block {data.blockNumber.toString()}
          {' · '}Indexer: {data.activity.status}
          {data.activity.reason && <> · {data.activity.reason}</>}</p>
        <p className="caption">{data.activity.status !== 'FRESH' && 'Lịch sử hoạt động chưa tải đầy đủ. '}Indexer chỉ cung cấp lịch sử tham khảo; không được coi dữ liệu thiếu là danh sách trống đã xác minh.</p>
      </div>}
      <p><a className="inline-link" href={dispute ? passRoot + '/' + id : passRoot}>{dispute ? 'Về chi tiết gói' : 'Về danh sách gói'}</a></p>
      {!isBuyer && data && <p>Hãy chọn ví người mua của gói này rồi làm mới để xem quyền lợi.</p>}
    </Card>
  )
  return <Page title={dispute ? 'Phản đối đề nghị' : 'Gói của tôi · #' + id}>
    {mismatch && <ErrorState>LEDGER_MISMATCH · Sổ cái chưa khớp. Hãy làm mới dữ liệu Vault.</ErrorState>}
    {data && session && isBuyer && !mismatch && <div className="customer-pass-grid">
      {'ledger' in data && <section className="or-receipt">
        <h2>{data.agreement.policy === 0 ? '10 buổi tập cùng huấn luyện viên' : 'Gói tập theo thời gian'}</h2>
        {data.agreement.policy === 0
          ? <figure><img alt="" src={new URL('../openreserve-ui/assets/gym.webp', import.meta.url).href} /><figcaption>Ảnh minh họa phòng tập</figcaption></figure>
          : <p>Mô phỏng Fuji 270 giây. Giá trị được ghi nhận theo thời gian đủ điều kiện.</p>}
        <p>{data.agreement.policy === 0 ? 'Bạn đã nhận lại' : 'Đã chốt cho phòng tập'}
          <strong className="or-result">{(data.agreement.policy === 0 ? data.ledger.buyerRefunded : data.ledger.earnedFinalized).toLocaleString('vi-VN')}</strong>
          đơn vị cơ sở của mock MRES (18 chữ số thập phân)</p>
        {id === ptAgreementId && data.agreement.policy === 0 && data.blockNumber >= 61401275n && data.ledger.buyerRefunded > 0n &&
          <p>Theo biên nhận lịch sử, bạn đề nghị kết thúc gói và phòng tập đã đồng ý.
            {' '}<a className="inline-link" href="https://testnet.snowtrace.io/tx/0xc378c67bd40cb1795dda3b4049c78d7ff0ce3645a3bef2c90c6878f342cc6b3c"><Icon name="receipt" />Biên nhận hoàn khi kết thúc gói ↗</a>
          </p>}
        <dl className="money-list">{([
          ['Bạn đã nạp', data.ledger.deposited],
          ['Phòng tập đã nhận', data.ledger.gymWithdrawn],
          ['Còn có thể nhận hoàn', data.ledger.refundable],
        ] as const).map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{amount.toLocaleString('vi-VN')}</dd></div>)}</dl>
        {id === ptAgreementId && data.agreement.policy === 0 &&
          <a className="inline-link" href="#pt-receipts"><Icon name="receipt" />Xem biên nhận buổi PT</a>}
        <p className="caption">Vault · Fuji thử nghiệm · block {String(data.blockNumber)}. Việc cung cấp dịch vụ ngoài đời chưa được xác minh.</p>
      </section>}
      <Card>
        <h2>{data.agreement.policy === 0 ? 'PT 10 buổi' : 'Tập không giới hạn'}</h2>
        {data.agreement.policy === 0
          ? <p>{data.agreement.sessionsFinalized} buổi đã chốt · {data.agreement.positiveRefundSlots} suất đã dùng để hoàn theo buổi (tách riêng khoản hoàn khi kết thúc gói) · {data.agreement.liveClaims.toString()} đề nghị đang mở</p>
          : <p>Thời gian trên chuỗi {new Date(Number(data.agreement.startAt) * 1000).toLocaleString('vi-VN')} – {new Date(Number(data.agreement.endAt) * 1000).toLocaleString('vi-VN')}</p>}
        <h3>Đề nghị ghi nhận</h3>
        {!data.claims && <ErrorState>Chưa đọc được nhật ký đề nghị từ RPC.</ErrorState>}
        {data.claims?.length === 0 && <EmptyState title="Chưa có đề nghị">Gym chưa gửi đề nghị cho hợp đồng này.</EmptyState>}
        {dispute && <label className="customer-field">Hash bằng chứng phản đối
          <input value={evidence} onChange={event => setEvidence(event.target.value)} placeholder="0x…" />
        </label>}
        {data.claims?.map(({ claimId, claim }) => {
          const open = data.agreement.state === 1
          const pt = data.agreement.policy === 0
          const challengeable = open && claim.state === 1 && (pt
            ? data.agreement.challengedSessionClaimId === 0n : session.head.timestamp < claim.challengeEndsAt)
          return <article key={String(claimId)} className="customer-claim">
            <p><strong>#{String(claimId)} · {claimStates[claim.state]}</strong></p>
            {!pt && <p>Hạn phản đối {new Date(Number(claim.challengeEndsAt) * 1000).toLocaleString('vi-VN')}</p>}
            <p className="caption customer-wrap">Hash ghi trên Vault · {claim.evidenceHash}</p>
            {dispute && challengeable && <Button disabled={!isBuyer || transaction.busy || !evidenceHash}
              onClick={() => { if (evidenceHash) void act({ type: 'challengeClaim', id, claimId, hash: evidenceHash }) }}>Gửi phản đối</Button>}
            {!dispute && isBuyer && open && pt && [1, 3].includes(claim.state) &&
              <ClaimEvidenceReview key={session.account + ':' + session.vault + ':' + claim.evidenceHash + ':' + claim.state}
                agreement={agreementId} claim={String(claimId)} hash={claim.evidenceHash} busy={transaction.busy}
                onConfirm={() => void act({ type: 'confirmSession', id, claimId })} />}
          </article>
        })}
        {!dispute && <a className="inline-link" href={passRoot + '/' + id + '/dispute'}>Xem tùy chọn phản đối</a>}
      </Card>
      <div className="customer-pass-financial">
      <Card><h2>Số dư theo Vault</h2><dl className="money-list">
        {['Đang được Vault giữ', 'Gym có thể rút', 'Còn có thể nhận hoàn', 'Đang tranh chấp'].map((label, index) =>
          <div key={label}><dt>{label}</dt><dd className="money">{token(data.balances[index])}</dd></div>)}
      </dl>
        {data && 'ledger' in data && <CustomerFinancialLedger ledger={data.ledger} />}
        <p className="caption">Số dư còn trong Vault KHÔNG tự động là tiền được duyệt hoàn;
          chỉ trường refundable khác 0 từ Vault mới mở quyền nhận hoàn.</p>
        {data.balances[2] > 0n && <Button disabled={!isBuyer || transaction.busy ||
            ('ledger' in data && !classifyPtBalances(data.ledger).canClaimRefund)}
          onClick={() => void act({ type: 'claimRefund', id })}>Nhận token được duyệt hoàn</Button>}
      </Card>
      </div>
        {id === ptAgreementId && session.chain.id === 43113 && 'ledger' in data &&
          <div id="pt-receipts" className="customer-pass-proof">
            <PtProofPanel key={session.account + ':' + session.head.hash}
              session={session} buyer={data.agreement.buyer} merchant={data.agreement.merchant} />
          </div>}
    </div>}
    {transaction.feedback}
    {isBuyer && !mismatch ? <details className="or-source"><summary>Nguồn dữ liệu và đối chiếu ví</summary>{source}</details> : source}
  </Page>
}

export function Customer({ path }: { path: string }) {
  if (path === '/customer') return <Page title="Chọn gói tập">
    <p className="caption customer-catalog-note">{fixture} · Thanh toán bằng token thử nghiệm.</p>
    <Card><h2>Theo dõi Agreement #1 đã có trên Fuji</h2>
      <p>Ví Buyer có thể đọc sổ cái và bốn giao dịch PT do Wallet 1 báo cáo.
        Số dư chỉ được hiển thị sau khi kiểm tra Vault tại block được ghim.</p>
      <p className="caption">WALLET1_REPORTED_VERIFIED · Không tự động xác nhận số dư hiện tại hay quyền hoàn tiền.</p>
      <a className="inline-link" href="/customer/passes/1">Mở quyền lợi và lịch sử PT #1</a>
    </Card>
    <div className="grid customer-package-grid">{packages.map(pack => <OverviewCard key={pack.id} title={pack.name}
      href={'/customer/packages/' + pack.id} link="Xem quyền lợi và điều kiện">
      <p>{pack.description}</p><p className="money">{token(BigInt(pack.price))}</p>
    </OverviewCard>)}</div>
  </Page>
  if (path === passRoot) return <Passes />
  if (path.startsWith(passRoot + '/OR-024')) return <><p className="caption">{fixture} · Gói mẫu D16</p><CustomerPreview path={path} /></>
  const [, , section, entity, action] = path.split('/')
  const pack = packages.find(item => item.id === entity)
  if (section === 'packages' && pack) return <PackageDetail pack={pack} />
  if (section === 'checkout' && pack) return <Checkout pack={pack} />
  const id = parseId(entity)
  return id ? <Pass key={entity} agreementId={entity} dispute={action === 'dispute'} /> : <Page title="Mã hợp đồng không hợp lệ">
    <a className="inline-link" href={passRoot}>Về danh sách gói</a>
  </Page>
}
