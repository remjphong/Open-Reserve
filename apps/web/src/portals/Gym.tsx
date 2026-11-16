import { AgreementReceipt } from '../design-system/receipt'
import { agreement as a } from '../demo/agreement'
import { DisabledAction, MoneyFigure, StatusPill, PortalPage, OverviewCard } from '../design-system/portal'

export function Gym({ path }: { path: string }) {
  if (path === '/gym' || path === '/gym/agreements') {
    const list = path === '/gym/agreements'
    return <PortalPage breadcrumb={list ? 'Phòng gym / Hợp đồng' : 'Phòng gym / Tổng quan'}
      title={list ? 'Danh sách hợp đồng' : 'Tổng quan phòng gym'}>
      <OverviewCard title={list ? 'Hợp đồng đang sử dụng' : 'Hợp đồng cần theo dõi'}
        href={`/gym/agreements/${a.id}`} link={`Mở hợp đồng ${a.id}`}>
        <p>{a.packageName} · {a.id}</p><p className="caption">Buổi {a.claim} đang bị phản đối.</p>
      </OverviewCard>
    </PortalPage>
  }
  if (path === '/gym/payouts') return <PortalPage breadcrumb="Phòng gym / Giải ngân" title="Giải ngân">
    <section className="card card-pad action-card">
      <h2>Khoản có thể rút theo hợp đồng</h2><p>{a.id} · <MoneyFigure value={a.withdrawable} /></p>
      <p className="caption">Khoản tranh chấp <MoneyFigure value={a.disputed} /> vẫn khóa.</p>
      <DisabledAction id="payout-sign" reason="Chỉ ví chủ gym được ký. Bản demo chưa kết nối ví.">Rút {a.withdrawable} MRES</DisabledAction>
    </section>
  </PortalPage>
  return <>
    <div className="section-title"><div className="breadcrumb">Phòng gym / Hợp đồng</div>
      <h1>{`Hợp đồng ${a.id}`}</h1><p>{a.packageName} · Theo dõi đề nghị và khoản có thể rút.</p></div>
    <dl className="overview card">
      {([['Đã chốt cho gym', a.settled, 'Ba buổi được khách xác nhận.'], ['Gym có thể rút', a.withdrawable, 'Phần đã chốt và chưa rút.'], ['Đang tranh chấp', a.disputed, 'Phần đang khóa cho buổi PT-04.']] as const).map(([label, value, hint]) =>
        <div key={label}><dt>{label}</dt><dd><MoneyFigure value={value} variant="money-large" /></dd><span className="caption">{hint}</span></div>,
      )}
    </dl>
    <div className="grid gym-grid">
      <section className="card card-pad work-detail"><div className="card-head"><div><h2>Đề nghị ghi nhận buổi tập</h2><p className="caption">Hợp đồng {a.id} · Đơn vị MRES · Đã rút 200, Vault đang giữ 800.</p></div></div>
        <table className="table"><thead><tr><th scope="col">Buổi PT</th><th scope="col">Trạng thái</th><th className="numeric" scope="col">Giá trị</th></tr></thead>
          <tbody>{[['PT-04', 'Bị phản đối'], ['PT-03', 'Đã chốt'], ['PT-02', 'Đã rút'], ['PT-01', 'Đã rút']].map(([id, status]) =>
            <tr key={id}><th scope="row">{id}</th><td><StatusPill warning={id === 'PT-04'}>{status}</StatusPill></td><td className="numeric"><MoneyFigure value={100} /></td></tr>,
          )}</tbody></table>
      </section>
      <section className="card card-pad work-action action-card"><h2>Rút phần đã chốt</h2>
        <p>Khoản tranh chấp vẫn khóa. Khoản có thể rút là phần đã chốt và chưa rút.</p>
        <DisabledAction id="gym-sign" reason="Chỉ ví chủ gym được ký. Bản demo chưa kết nối ví.">Rút 100 MRES</DisabledAction>
        <p className="caption">Nhân viên xem ở chế độ chỉ đọc.</p>
      </section>
      <AgreementReceipt />
    </div>
  </>
}
