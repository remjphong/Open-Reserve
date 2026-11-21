import type { ReactNode } from 'react'
import { iconPaths } from './icons'

const roles = {
  customer: { label: 'Khách hàng', wallet: 'Ví khách' },
  gym: { label: 'Phòng gym', wallet: 'Ví chủ gym' },
  operations: { label: 'Vận hành', wallet: 'Ví phân xử' },
}
export type Role = keyof typeof roles
export type NavItem = { href: string; label: string; icon: keyof typeof iconPaths }

export function Icon({ name }: { name: keyof typeof iconPaths }) {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: iconPaths[name] }} />
}

export function MoneyFigure({ value, variant = '' }: { value: number; variant?: string }) {
  return <span className={`money ${variant}`}>{value.toLocaleString('vi-VN')} <small>MRES</small></span>
}

export function StatusPill({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return <span className={`status ${warning ? 'status-warn' : ''}`}>
    <Icon name={warning ? 'circle-alert' : 'check'} />{children}
  </span>
}

export function WalletIdentity({ role }: { role: Role }) {
  return <span className="wallet" style={role === 'gym' ? { minWidth: 0, whiteSpace: 'normal' } : undefined}><Icon name="wallet" />
    <span style={role === 'gym' ? { minWidth: 0, overflowWrap: 'anywhere' } : undefined}><span className="wallet-label">{roles[role].wallet} · </span>
      {role === 'gym' ? 'Trạng thái xác minh ở trang Gym' : role === 'operations' ?
        'Xác minh ví ở trang sổ cái' : 'Chưa kết nối'}</span>
  </span>
}

export function RoleNavigation({ items, path, label, style }: {
  items: NavItem[]; path: string; label: string; style: string
}) {
  const active = [...items].sort((a, b) => b.href.length - a.href.length)
    .find(item => path === item.href || path.startsWith(item.href + '/') || (item.href.split('/').length > 3 && item.href.split('/').slice(0, -1).join('/') === path))
  return <nav className={style} aria-label={`Điều hướng ${label}`}>
    {items.map(item => <a key={item.href} href={item.href} aria-current={active === item ? 'page' : undefined}>
      {style === 'sidebar-nav' && <Icon name={item.icon} />}{item.label}
    </a>)}
  </nav>
}

function Brand({ home }: { home: string }) {
  return <a className="brand" href={home}>
    <img width="32" height="32" alt="" src={new URL('../openreserve-ui/assets/brand.svg', import.meta.url).href} />OpenReserve
  </a>
}

export function AppShell({ role, path, items, children }: {
  role: Role; path: string; items: NavItem[]; children: ReactNode
}) {
  const { label } = roles[role]
  const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const internalArrival = entry?.type !== 'reload' && document.referrer.startsWith(location.origin + '/')
  const home = '/' + role
  const nav = (style: string) => <RoleNavigation items={items} path={path} label={label} style={style} />
  const content = <>
    <header className={internalArrival ? 'header or-page-arrival' : 'header'}>
      <Brand home={home} />
      {role === 'customer' ? nav('top-nav') : <strong className="role-name">{label}</strong>}
      {role !== 'customer' && <WalletIdentity role={role} />}
    </header>
    {nav('mobile-nav')}
    <main id="main" className={'container or-' + role} tabIndex={-1}>
      {role === 'operations' && <div className="notice"><Icon name="info" /><span>
        <strong>FUJI READ ONLY — ĐỐI CHIẾU TẠI TỪNG TRANG</strong>{' '}
        Số dư chỉ được hiển thị sau khi trang xác minh Vault; hồ sơ OR-024 và PT-04 là DEMO_FIXTURE riêng.
        Không có chức năng ký hoặc gửi giao dịch từ Operations.</span></div>}
      {role === 'gym' && <div className="notice"><Icon name="info" /><span><strong>FUJI READ ONLY — GỬI GIAO DỊCH ĐANG KHÓA</strong>{' '}
        Số dư thật chỉ có sau khi xác minh Vault và ví merchant. Hợp đồng OR-024 được gắn nhãn DEMO_FIXTURE riêng.</span></div>}
      {children}
    </main>
  </>
  return <>
    <a className="skip" href="#main">Đi tới nội dung</a>
    {role === 'customer' ? content : <div className="workspace"><aside className="sidebar">
      <div><p className="sidebar-title">{label}</p>{nav('sidebar-nav')}</div>
      <p className="sidebar-footer caption">Môi trường thử nghiệm · Avalanche Fuji</p>
    </aside><div>{content}</div></div>}
  </>
}

export function MoneyBreakdown({ rows }: { rows: readonly (readonly [string, number])[] }) {
  return <dl className="money-list">{rows.map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd><MoneyFigure value={value} /></dd></div>,
  )}</dl>
}

export function DisabledAction({ children, id, reason }: { children: ReactNode; id: string; reason: string }) {
  return <><button type="button" disabled aria-describedby={id} className="button button-primary button-wide">{children}</button>
    <p className="caption disabled-copy" id={id}>{reason}</p></>
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <section className="state-example"><h3>{title}</h3><p>{children}</p></section>
}
export function LoadingSkeleton() {
  return <section className="state-example"><h3>Đang tải dữ liệu…</h3><div className="skeleton" aria-hidden="true" /></section>
}
export function ErrorState({ children }: { children: ReactNode }) {
  return <section className="state-example error"><h3>Chưa tải được dữ liệu</h3><p>{children}</p></section>
}

export function SampleStates() {
  return <details className="states card"><summary>Xem mẫu trạng thái</summary><div className="states-grid">
    <EmptyState title="Chưa có dữ liệu">Chưa có bản ghi phù hợp với ví.</EmptyState>
    <LoadingSkeleton />
    <ErrorState>Kiểm tra kết nối trước khi thử tải lại.</ErrorState>
  </div></details>
}

export function PortalPage({ breadcrumb, title, children, back }: {
  breadcrumb: string; title: string; children: ReactNode; back?: { href: string; label: string }
}) {
  return <>
    <div className="section-title"><div className="breadcrumb">{breadcrumb}</div><div className="or-title-row">
      {back && <a className="or-action or-icon-action or-back" href={back.href} aria-label={back.label} title={back.label}><Icon name="arrow-right" /></a>}
      <h1>{title}</h1></div></div>
    {children}
  </>
}

export function OverviewCard({ title, children, href, link }: {
  title: string; children: ReactNode; href: string; link: string
}) {
  return <section className="card card-pad">
    <div className="card-head"><h2>{title}</h2></div>
    {children}
    <a className="inline-link" href={href}>{link} <Icon name="arrow-right" /></a>
  </section>
}
