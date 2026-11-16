import { AgreementReceipt } from '../design-system/receipt'
import { agreement as a } from '../demo/agreement'
import { DisabledAction, MoneyBreakdown, StatusPill, Icon, PortalPage, OverviewCard } from '../design-system/portal'

const pass = '/customer/passes/OR-024'
export function Customer({ path }: { path: string }) {
  if (path === '/customer' || path === '/customer/passes') {
    const list = path === '/customer/passes'
    return <PortalPage breadcrumb={list ? 'Khách hàng / Gói của tôi' : 'Khách hàng / Tổng quan'}
      title={list ? 'Các gói của tôi' : 'Tổng quan khách hàng'}>
      <OverviewCard title={list ? 'Gói đang sử dụng' : 'Gói tập hiện tại'} href={pass} link="Mở gói PT 10 buổi">
        <p>{a.packageName} · {a.id} · {a.sessions}/{a.totalSessions} buổi đã chốt</p>
      </OverviewCard>
    </PortalPage>
  }
  const evidence = path === pass + '/evidence'
  return <>
    <div className="section-title"><div className="breadcrumb">Khách hàng / Gói của tôi{evidence && ' / Bằng chứng'}</div>
      <h1>{evidence ? 'Bằng chứng buổi PT-04' : 'Gói tập của tôi'}</h1>
      <p>{evidence ? 'Đọc hồ sơ trước khi xác nhận.' : 'Theo dõi các buổi tập và khoản token còn trong Vault.'}</p>
    </div>
    <div className="grid customer-grid">
      <div className="customer-main">
        <section className="card pass">
          <div className="section-actions"><div><p className="caption">Gói theo buổi · {a.id}</p><h2>{a.packageName}</h2></div><StatusPill>Đang sử dụng</StatusPill></div>
          <div className="entitlement"><strong>{a.sessions} / {a.totalSessions} buổi đã chốt</strong></div>
          <div className="segments" aria-hidden="true">{Array.from({ length: a.totalSessions }, (_, i) =>
            <i key={i} className={i < a.sessions ? 'settled' : i === a.sessions ? 'contested' : ''} />,
          )}</div>
          <p className="caption entitlement-note">Trong 7 buổi chưa chốt có 1 buổi đang bị phản đối.</p>
        </section>
        <section className="card card-pad customer-history"><div className="card-head"><h2>{evidence ? 'Nhật ký buổi tập' : 'Lịch sử gói'}</h2><StatusPill warning>Bị phản đối</StatusPill></div>
          {evidence ? <><p>Gym gửi đề nghị ghi nhận buổi PT-04. Khách đã gửi phản đối.</p>
            <p className="caption">Nguồn: hồ sơ minh họa. Chưa có hash bằng chứng trên Fuji.</p>
            <a className="inline-link" href={pass}>Quay lại gói PT</a></> :
            <ol className="timeline">
              <li><span className="timeline-dot warn"><Icon name="circle-alert" /></span><strong>Bạn đã phản đối buổi PT-04</strong><p className="caption">Chưa có khoản hoàn được duyệt.</p></li>
              <li><span className="timeline-dot"><Icon name="check" /></span><strong>Buổi PT-03 đã chốt</strong><p className="caption">Gym có thể rút thêm 100 MRES.</p></li>
            </ol>}
        </section>
      </div>
      <div className="customer-side"><section className="card card-pad customer-action"><div className="card-head"><h2>Token của hợp đồng</h2><Icon name="wallet" /></div>
        <MoneyBreakdown rows={[[ 'Đã nạp', a.deposited ], [ 'Đang được Vault giữ', a.locked ], [ 'Đã được duyệt hoàn', a.refundable ]]} />
        <div className="action-area"><h3>Buổi PT đang bị phản đối</h3>
          <p className="caption">Xác nhận buổi này sẽ chốt phần token của buổi cho gym.</p>
          {evidence ? <DisabledAction id="buyer-sign" reason="Ví khách chưa kết nối. Bản demo không ký giao dịch.">Xác nhận buổi PT</DisabledAction>
            : <a className="button button-primary button-wide" href={pass + '/evidence'}>Xem bằng chứng trước <Icon name="arrow-right" /></a>}
        </div>
      </section><AgreementReceipt /></div>
    </div>
  </>
}
