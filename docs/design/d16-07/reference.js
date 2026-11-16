// Static reference. All amounts, timestamps and identifiers are illustrative.
const sample = {
  id: 'OR-024',
  claim: 'PT-04',
  packageName: 'PT 10 buổi',
  terms: 'v1.0.1',
  currency: 'MRES',
  deposit: 1000,
  locked: 800,
  settled: 300,
  withdrawn: 200,
  withdrawable: 100,
  refundable: 0,
  disputed: 100,
  finalizedSessions: 3,
  totalSessions: 10,
};

const roles = {
  customer: {
    label: 'Khách hàng', wallet: 'Ví khách',
    nav: [['#overview', 'Gói của tôi', 'layers'], ['#detail', 'Lịch sử', 'history'], ['#receipt', 'Biên nhận', 'receipt']],
  },
  gym: {
    label: 'Phòng gym', wallet: 'Ví chủ gym',
    nav: [['#overview', 'Tổng quan', 'layout-dashboard'], ['#detail', 'Hợp đồng', 'clipboard-list'], ['#action', 'Giải ngân', 'wallet'], ['#receipt', 'Biên nhận', 'receipt']],
    active: '#detail',
  },
  operations: {
    label: 'Vận hành', wallet: 'Ví phân xử',
    nav: [['#overview', 'Tổng quan', 'layout-dashboard'], ['#detail', 'Sổ cái', 'clipboard-list'], ['#action', 'Phản đối', 'scale'], ['#receipt', 'Biên nhận', 'receipt']],
    active: '#action',
  },
};

const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
const status = (text, tone = '', symbol = 'check') =>
  `<span class="status ${tone && `status-${tone}`}">${icon(symbol)}${text}</span>`;
const money = (amount, variant = '') =>
  `<span class="money ${variant}">${amount.toLocaleString('vi-VN')} <small>${sample.currency}</small></span>`;

function navigation(role, style) {
  const isSidebar = style === 'sidebar-nav';
  return `<nav class="${style}" aria-label="Điều hướng ${role.label}">${role.nav.map(
    ([href, text, symbol]) =>
      `<a href="${href}" ${href === (role.active ?? '#overview') ? 'aria-current="location"' : ''}>${isSidebar ? icon(symbol) : ''}${text}</a>`,
  ).join('')}</nav>`;
}

const brand = (style = '') =>
  `<a class="brand ${style}" href="#main"><span class="brand-mark">${icon('shield-check')}</span>OpenReserve</a>`;
const wallet = (role) =>
  `<div class="wallet">${icon('wallet')}<span><span class="wallet-label">${role.wallet} · </span>Chưa kết nối</span></div>`;
const notice = () =>
  `<div class="notice">${icon('info')}<span><strong>Dữ liệu minh họa</strong> · Bản xem trước, chưa kết nối Fuji.</span></div>`;

function shell(portal, content) {
  const role = roles[portal];
  const customer = portal === 'customer';
  const header = `<header class="header">
    ${customer ? brand() : `${brand('mobile-brand')}<span class="role-name">${role.label}</span>`}
    ${customer ? navigation(role, 'top-nav') : ''}
    ${wallet(role)}
  </header>${navigation(role, 'mobile-nav')}`;
  const body = `<main class="container" id="main" tabindex="-1">${notice()}${content}${stateGallery(portal)}</main>`;
  if (customer) return header + body;
  return `<div class="workspace">
    <aside class="sidebar">
      ${brand()}
      <div><p class="sidebar-title">${role.label}</p>${navigation(role, 'sidebar-nav')}</div>
      <p class="sidebar-footer caption">Avalanche Fuji · mạng thử nghiệm<br>Ảnh mẫu tĩnh, không gửi giao dịch.</p>
    </aside>
    <div>${header}${body}</div>
  </div>`;
}

function moneyList(entries) {
  return `<dl class="money-list">${entries.map(([label, value, style]) =>
    `<div><dt>${label}</dt><dd>${money(value, style)}</dd></div>`).join('')}</dl>`;
}

function overview(entries) {
  return `<dl class="overview card">${entries.map(([label, value, caption, style]) => `
    <div><dt>${label}</dt><dd>${money(value, `money-large ${style ?? ''}`)}</dd><span class="caption">${caption}</span></div>
  `).join('')}</dl>`;
}

const disabledAction = (label, id, reason) => `
  <button class="button button-primary button-wide" type="button" disabled aria-describedby="${id}">${label}</button>
  <p id="${id}" class="caption disabled-copy">${reason}</p>`;

function receipt() {
  return `<section class="card card-pad work-proof" id="receipt" aria-labelledby="receipt-title">
    <div class="card-head">
      <div><h2 id="receipt-title">Biên nhận nạp</h2><p class="caption">Mẫu trình bày biên nhận</p></div>
      ${icon('receipt')}
    </div>
    <dl class="receipt">
      <div><dt>Hợp đồng</dt><dd class="mono">${sample.id}</dd></div>
      <div><dt>Token đã nạp</dt><dd>${money(sample.deposit)}</dd></div>
      <div><dt>Điều khoản</dt><dd>${sample.terms}</dd></div>
      <div><dt>Giao dịch Fuji</dt><dd class="caption">Chưa có trong bản xem trước</dd></div>
    </dl>
  </section>`;
}

function timeline(items) {
  return `<ol class="timeline">${items.map(([title, detail, warning]) => `
    <li>
      <span class="timeline-dot ${warning ? 'warn' : ''}">${icon(warning ? 'circle-alert' : 'check')}</span>
      <strong>${title}</strong><p class="caption">${detail}</p>
    </li>`).join('')}</ol>`;
}

function stateGallery(portal) {
  const object = {customer: 'gói', gym: 'đề nghị', operations: 'bằng chứng'}[portal];
  return `<details class="states card">
    <summary>Xem mẫu trạng thái giao diện</summary>
    <div class="states-grid">
      <div class="state-example"><strong>Chưa có ${object}</strong><p>Thông tin sẽ xuất hiện khi có dữ liệu phù hợp với ví.</p></div>
      <div class="state-example" aria-label="Mẫu đang tải"><strong>Đang tải ${object}…</strong><div class="skeleton" aria-hidden="true"></div></div>
      <div class="state-example error"><strong>Chưa tải được ${object}</strong><p>Kiểm tra kết nối rồi chọn Làm mới.</p></div>
      <div class="state-example"><strong>Giao dịch đã xác nhận · mẫu</strong><p>Ở ứng dụng thật, trạng thái này xuất hiện sau khi nhận biên nhận Fuji.</p></div>
    </div>
  </details>`;
}

function customer() {
  const segments = Array.from({length: sample.totalSessions}, (_, i) =>
    `<i class="${i < sample.finalizedSessions ? 'settled' : i === sample.finalizedSessions ? 'contested' : ''}"></i>`,
  ).join('');
  return `
    <div class="section-title" id="overview">
      <div class="breadcrumb">Khách hàng / Gói của tôi</div>
      <h1>Gói tập của tôi</h1>
      <p>Theo dõi các buổi tập và khoản token còn trong Vault.</p>
    </div>
    <div class="grid customer-grid">
    <div class="customer-main">
      <section class="card pass" aria-labelledby="pass-title">
        <div class="section-actions">
          <div><div class="caption">Gói theo buổi · <span class="mono">${sample.id}</span></div><h2 id="pass-title">${sample.packageName}</h2></div>
          ${status('Đang sử dụng')}
        </div>
        <div class="entitlement"><strong>${sample.finalizedSessions} / ${sample.totalSessions} buổi đã chốt</strong><span class="caption">7 buổi chưa chốt</span></div>
        <div class="segments" aria-hidden="true">${segments}</div>
        <p class="caption entitlement-note">Trong 7 buổi chưa chốt có 1 buổi đang bị phản đối.</p>
      </section>
      <section class="card card-pad customer-history" id="detail" aria-labelledby="customer-history">
        <div class="card-head"><div><h2 id="customer-history">Lịch sử gói</h2><p class="caption">Sự kiện minh họa</p></div>${status('Có phản đối', 'warn', 'circle-alert')}</div>
        ${timeline([
          ['Bạn đã phản đối buổi PT-04', 'Đang chờ xử lý · chưa có khoản hoàn được duyệt.', true],
          ['Buổi PT-03 đã chốt', 'Gym có thể rút thêm 100 MRES.'],
          ['Gym đã rút 200 MRES', 'Toàn bộ phần đã chốt của PT-01 và PT-02.'],
        ])}
      </section>
    </div>
    <div class="customer-side">
      <section class="card card-pad customer-action" id="action" aria-labelledby="customer-funds">
        <div class="card-head"><div><h2 id="customer-funds">Token của hợp đồng</h2><p class="caption">MRES là token thử nghiệm.</p></div>${icon('wallet')}</div>
        ${moneyList([['Đã nạp', sample.deposit], ['Đang được Vault giữ', sample.locked], ['Đã được duyệt hoàn', sample.refundable, 'money-muted']])}
        <div class="action-area">
          <h3>Buổi PT đang bị phản đối</h3>
          <p class="caption">Nếu bạn xác nhận buổi này, phần token của buổi sẽ được chốt cho gym.</p>
          ${disabledAction('Xác nhận buổi PT', 'buyer-disabled', 'Cần ví khách hàng. Bản xem trước không ký giao dịch.')}
          <a class="inline-link" href="#detail">Xem đề nghị ${sample.claim} ${icon('arrow-right')}</a>
        </div>
      </section>
      ${receipt()}
    </div>
    </div>`;
}

function gym() {
  return `
    <div class="section-title section-actions title-row" id="overview">
      <div><div class="breadcrumb">Phòng gym / Hợp đồng</div><h1>Hợp đồng ${sample.id}</h1>
      <p>${sample.packageName} · Theo dõi đề nghị và khoản có thể rút.</p></div>
      ${status('Đang sử dụng')}
    </div>
    ${overview([
      ['Đã chốt cho gym', sample.settled, 'Từ 3 buổi được khách xác nhận.'],
      ['Gym có thể rút', sample.withdrawable, 'Phần đã chốt và chưa rút.', 'money-positive'],
      ['Đang tranh chấp', sample.disputed, 'Buổi PT-04 đang bị phản đối.'],
    ])}
    <div class="grid gym-grid">
      <section class="card card-pad work-detail" id="detail" aria-labelledby="claims-title">
        <div class="card-head"><div><h2 id="claims-title">Đề nghị ghi nhận buổi tập</h2><p class="caption">Hợp đồng theo buổi · Đơn vị MRES</p></div>${icon('clipboard-list')}</div>
        <p class="context-row caption"><span>Đã rút <strong>200 MRES</strong></span><span>Vault còn giữ <strong>800 MRES</strong></span></p>
        <table class="table">
          <thead><tr><th scope="col">Buổi PT</th><th scope="col">Trạng thái</th><th class="numeric" scope="col">Giá trị</th></tr></thead>
          <tbody>
            <tr><th scope="row">${sample.claim}</th><td>${status('Bị phản đối', 'warn', 'circle-alert')}</td><td class="numeric">${money(sample.disputed)}</td></tr>
            <tr><th scope="row">PT-03</th><td>${status('Đã chốt')}</td><td class="numeric">${money(100)}</td></tr>
            <tr><th scope="row">PT-02</th><td>${status('Đã rút', 'muted')}</td><td class="numeric">${money(100)}</td></tr>
            <tr><th scope="row">PT-01</th><td>${status('Đã rút', 'muted')}</td><td class="numeric">${money(100)}</td></tr>
          </tbody>
        </table>
      </section>
      <section class="card card-pad work-action action-card" id="action" aria-labelledby="gym-action">
        <div class="card-head"><div><h2 id="gym-action">Rút phần đã chốt</h2><p class="caption">Chỉ ví chủ gym của hợp đồng được ký.</p></div>${icon('wallet')}</div>
        <p>Khoản đang bị phản đối được giữ riêng. Khoản đã chốt vẫn có thể rút.</p>
        ${disabledAction('Rút 100 MRES', 'gym-disabled', 'Ví chủ gym chưa kết nối. Số tiền là minh họa.')}
        <p class="caption actions-note">Nhân viên có thể xem ở chế độ chỉ đọc.</p>
      </section>
      ${receipt()}
    </div>`;
}

function operations() {
  return `
    <div class="section-title section-actions title-row" id="overview">
      <div><div class="breadcrumb">Vận hành / Phản đối</div><h1>Hồ sơ ${sample.claim}</h1>
      <p>Hợp đồng <span class="mono">${sample.id}</span> · ${sample.packageName}</p></div>
      ${status('Đang xem xét', 'warn', 'clock')}
    </div>
    ${overview([
      ['Vault đang giữ', sample.locked, 'Số dư còn lại của hợp đồng.'],
      ['Phạm vi phản đối', sample.disputed, 'Chỉ liên quan đến buổi PT-04.'],
      ['Đã được duyệt hoàn', sample.refundable, 'Chưa có quyết định hoàn.', 'money-muted'],
    ])}
    <div class="grid ops-grid">
      <section class="card card-pad work-detail" id="detail" aria-labelledby="ledger-title">
        <div class="card-head">
          <div><h2 id="ledger-title">Sổ cái hợp đồng</h2><p class="caption">Số liệu mẫu · Indexer và block Fuji chưa kết nối</p></div>
          ${icon('clipboard-list')}
        </div>
        ${moneyList([['Đã nạp', sample.deposit], ['Đã chốt cho gym', sample.settled], ['Gym đã rút', sample.withdrawn], ['Gym có thể rút', sample.withdrawable, 'money-positive'], ['Vault đang giữ', sample.locked], ['Đã được duyệt hoàn', sample.refundable, 'money-muted']])}
        <div class="action-area" id="evidence">
          <h3>Bằng chứng của buổi PT-04</h3>
          <p class="caption">Nguồn mẫu · chưa có hash bằng chứng trên Fuji.</p>
          ${timeline([
            ['Khách phản đối đề nghị ghi nhận', 'Chưa phát sinh quyền hoàn token.', true],
            ['Gym gửi đề nghị ghi nhận một buổi', 'Nhật ký buổi tập là dữ liệu mẫu.'],
          ])}
        </div>
      </section>
      <section class="card card-pad work-action action-card" id="action" aria-labelledby="ops-action">
        <div class="card-head"><div><h2 id="ops-action">Xem xét phản đối</h2><p class="caption">Vai trò phân xử mô phỏng</p></div>${icon('scale')}</div>
        <div class="role-note">Chỉ xử lý claim được giao. Ví phân xử không có quyền tự rút token.</div>
        ${disabledAction('Ghi quyết định', 'ops-disabled', 'Cần ví phân xử được hợp đồng cấp quyền.')}
        <a class="inline-link" href="#evidence">Xem bằng chứng mẫu ${icon('arrow-right')}</a>
      </section>
      ${receipt()}
    </div>`;
}

const portal = document.body.dataset.portal;
const render = {customer, gym, operations};
document.querySelector('#app').innerHTML = shell(portal, render[portal]());

window.addEventListener('hashchange', () => {
  const current = window.location.hash;
  const links = Array.from(document.querySelectorAll('nav a'));
  if (!links.some(link => link.hash === current)) return;
  for (const link of links) {
    if (link.hash === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
});
