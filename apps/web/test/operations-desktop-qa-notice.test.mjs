import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('D19-06 Operations app shell does not label a verified Fuji read as unconnected demo', () => {
  const shell = readFileSync(new URL('../src/design-system/portal.tsx', import.meta.url), 'utf8')
  const operations = readFileSync(new URL('../src/portals/Operations.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(shell, /DEMO UI — CHƯA KẾT NỐI/)
  assert.doesNotMatch(shell, /Chưa đọc Fuji hoặc ký giao dịch/)
  assert.match(shell, /FUJI READ ONLY — ĐỐI CHIẾU TẠI TỪNG TRANG/)
  assert.match(shell, /Số dư chỉ được hiển thị sau khi trang xác minh Vault/)
  assert.match(shell, /DEMO_FIXTURE riêng/)
  assert.match(operations, /label: 'Ví đang kết nối',[^\n]+snap\.session\.account/)
  assert.match(operations, /resolver \? 'RESOLVER_ADDRESS_MATCHED' : 'READ_ONLY_VIEWER'/)
  assert.match(operations, /label: 'Quyền truy cập', value: 'Chỉ đọc', code: 'READ_ONLY'/)
  assert.match(operations, /NOT_VERIFIED/)
  assert.match(operations, /DisabledAction id="ops-resolver-disabled"/)
  assert.doesNotMatch(operations, /\.writeContract\s*\(|\.simulateContract\s*\(/)
})

test('D19-06 initial/no-provider status remains per-page, never promises connected wallet', () => {
  const shell = readFileSync(new URL('../src/design-system/portal.tsx', import.meta.url), 'utf8')
  const ops = readFileSync(new URL('../src/portals/Operations.tsx', import.meta.url), 'utf8')
  assert.match(shell, /trang xác minh Vault/)
  assert.match(ops, /walletSession\(connect\)/)
  assert.match(ops, /on\?\.\('disconnect', changed\)/)
  assert.match(ops, /Không hiển thị tiền minh họa khi ví hoặc Vault không đọc được/)
})
