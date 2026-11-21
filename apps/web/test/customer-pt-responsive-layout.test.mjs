import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const customer = readFileSync(new URL('../src/portals/Customer.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')

test('D20 PT receipt is grouped under entitlement, not third child of two-column grid', () => {
  const start = customer.indexOf('className="grid customer-grid customer-pass-grid"')
  const end = customer.indexOf('</Page>', start)
  assert.ok(start > 0)
  const layout = customer.slice(start, end < 0 ? undefined : end)
  assert.match(layout, /className="customer-pass-main"/)
  assert.match(layout, /className="customer-pass-entitlement"/)
  assert.match(layout, /className="customer-pass-financial"/)
  assert.match(layout, /className="customer-pass-proof"/)
  assert.ok(layout.indexOf('<PtProofPanel') > layout.indexOf('className="customer-pass-entitlement"'))
  assert.ok(layout.indexOf('<PtProofPanel') < layout.indexOf('className="customer-pass-financial"'))
  assert.equal((layout.match(/<PtProofPanel/g) ?? []).length, 1)
  assert.match(layout, /id === ptAgreementId && session\.chain\.id === 43113/)
})

test('D20 scoped CSS preserves desktop columns and mobile entitlement -> ledger -> proof order', () => {
  assert.match(css, /\.customer-pass-main\s*\{[^}]*display:\s*grid/s)
  assert.match(css, /\.customer-pass-main\s*\{[^}]*align-content:\s*start/s)
  assert.match(css, /@media\s*\(max-width:\s*820px\)\s*\{[\s\S]*?\.customer-pass-grid\s*\{[^}]*display:\s*flex/s)
  assert.match(css, /\.customer-pass-main\s*\{\s*display:\s*contents;\s*\}/)
  assert.match(css, /\.customer-pass-entitlement\s*\{\s*order:\s*0;/)
  assert.match(css, /\.customer-pass-financial\s*\{\s*order:\s*1;/)
  assert.match(css, /\.customer-pass-proof\s*\{\s*order:\s*2;/)
})
