import { createRoot } from 'react-dom/client'
import { AppShell, EmptyState, SampleStates } from './design-system/portal'
import type { NavItem, Role } from './design-system/portal'
import { Customer, isCustomerRoute } from './portals/Customer'
import { Gym } from './portals/Gym'
import { parseGymRoute } from './lib/gym-chain'
import { Operations } from './portals/Operations'
import './style.css'

const navigation: Record<Role, NavItem[]> = {
  customer: [{ href: '/customer', label: 'Tổng quan', icon: 'layout-dashboard' }, { href: '/customer/passes', label: 'Gói của tôi', icon: 'layers' }],
  gym: [{ href: '/gym', label: 'Tổng quan', icon: 'layout-dashboard' }, { href: '/gym/agreements', label: 'Hợp đồng', icon: 'clipboard-list' }, { href: '/gym/payouts', label: 'Giải ngân', icon: 'wallet' }],
  operations: [{ href: '/operations', label: 'Tổng quan', icon: 'layout-dashboard' }, { href: '/operations/agreements/OR-024', label: 'Sổ cái', icon: 'clipboard-list' }, { href: '/operations/disputes/PT-04', label: 'Phản đối', icon: 'scale' }],
}
const views = { customer: Customer, gym: Gym, operations: Operations }
const labels = { customer: 'Khách hàng', gym: 'Phòng gym', operations: 'Vận hành' }
const path = window.location.pathname.replace(/\/+$/, '') || '/'
const role = (Object.keys(views) as Role[]).find(key => path === '/' + key || path.startsWith('/' + key + '/'))
const known = role && (navigation[role].some(item => item.href === path) ||
  isCustomerRoute(path) ||
  (role === 'gym' && parseGymRoute(path, window.location.search).page !== 'not-found') ||
  path === '/operations/agreements' || path === '/operations/disputes')
const View = role ? views[role] : null

createRoot(document.getElementById('root')!).render(
  role && View ? <AppShell role={role} path={path} items={navigation[role]}>
    {known ? <><View path={path} />{role !== 'customer' && <SampleStates />}</> : <div className="section-title">
      <h1>Không tìm thấy trang</h1><EmptyState title="Đường dẫn này chưa có trong bản demo"><a href={'/' + role}>Về tổng quan {labels[role]}</a></EmptyState>
    </div>}
  </AppShell> : <main className="container"><h1>{path === '/' ? 'OpenReserve' : 'Không tìm thấy trang'}</h1>
    <p className="section-title">Chọn portal để xem dữ liệu minh họa.</p>
    <div className="portal-links">{(Object.keys(labels) as Role[]).map(key =>
      <a className="button" key={key} href={'/' + key}>{labels[key]}</a>,
    )}</div></main>,
)
