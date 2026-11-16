import { agreement as a } from '../demo/agreement'
import { Icon, MoneyFigure } from './portal'

export function AgreementReceipt() {
  return <section className="card card-pad work-proof" id="receipt">
    <div className="card-head"><div><h2>Biên nhận nạp</h2><p className="caption">Mẫu trình bày biên nhận</p></div><Icon name="receipt" /></div>
    <dl className="receipt">
      <div><dt>Hợp đồng</dt><dd>{a.id}</dd></div>
      <div><dt>Token đã nạp</dt><dd><MoneyFigure value={a.deposited} /></dd></div>
      <div><dt>Điều khoản</dt><dd>{a.terms}</dd></div>
      <div><dt>Giao dịch Fuji</dt><dd>Chưa có trong bản demo.</dd></div>
    </dl>
  </section>
}
