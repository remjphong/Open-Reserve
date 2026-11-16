import { AgreementReceipt } from '../design-system/receipt'
import { agreement as a } from '../demo/agreement'
import { DisabledAction, MoneyBreakdown, MoneyFigure, StatusPill } from '../design-system/portal'

export function Operations({ path }: { path: string }) {
  const audit = path.startsWith('/operations/agreements')
  return <>
    <div className="section-title section-actions title-row"><div>
      <div className="breadcrumb">Vận hành / {audit ? 'Sổ cái' : 'Phản đối'}</div>
      <h1>{audit ? `Sổ cái ${a.id}` : `Hồ sơ ${a.claim}`}</h1>
      <p>Hợp đồng {a.id} · {a.packageName}</p></div><StatusPill warning>Đang xem xét</StatusPill></div>
    <dl className="overview card">
      <div><dt>Vault đang giữ</dt><dd><MoneyFigure value={a.locked} variant="money-large" /></dd><span className="caption">Số dư còn lại của hợp đồng.</span></div>
      <div><dt>Phạm vi phản đối</dt><dd><MoneyFigure value={a.disputed} variant="money-large" /></dd><span className="caption">Chỉ liên quan đến PT-04.</span></div>
      <div><dt>Đã được duyệt hoàn</dt><dd><MoneyFigure value={a.refundable} variant="money-large" /></dd><span className="caption">Chưa có quyết định hoàn.</span></div>
    </dl>
    <div className="grid ops-grid">
      <section id="ledger" className="card card-pad work-detail"><div className="card-head"><div><h2>Sổ cái hợp đồng</h2>
        <p className="caption">Số liệu mẫu · Indexer và block Fuji chưa kết nối.</p></div></div>
        <MoneyBreakdown rows={[[ 'Đã nạp', a.deposited ], [ 'Gym đã rút', a.withdrawn ], [ 'Gym có thể rút', a.withdrawable ], [ 'Vault đang giữ', a.locked ], [ 'Đã được duyệt hoàn', a.refundable ]]} />
        <div className="action-area" id="evidence"><h3>Bằng chứng PT-04</h3><p className="caption">Nhật ký ghi nhận và phản đối là dữ liệu mẫu. Chưa có hash trên Fuji.</p></div>
      </section>
      <section className="card card-pad work-action action-card"><h2>Xem xét phản đối</h2><p className="caption">Vai trò phân xử mô phỏng</p>
        <div className="role-note">Phạm vi mẫu: 100 MRES thuộc PT-04. Quyết định cần đúng claim, căn cứ và ví phân xử được hợp đồng cấp quyền.</div>
        <DisabledAction id="resolver-sign" reason="Ví phân xử chưa kết nối. Chưa thể ghi quyết định.">Ghi quyết định</DisabledAction>
        <a className="inline-link" href="#evidence">Xem bằng chứng mẫu</a>
      </section>
      <AgreementReceipt />
    </div>
  </>
}
