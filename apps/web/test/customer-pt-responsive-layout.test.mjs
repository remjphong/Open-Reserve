import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const source = ts.createSourceFile('Customer.tsx', read('../src/portals/Customer.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const pass = source.statements.find(node => node.name?.text === 'Pass')
const render = pass.body.statements.find(ts.isReturnStatement)
const sections = []
function visit(node) {
  if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
    const attr = node.attributes.properties.find(prop => prop.name?.text === 'className')
    sections.push(attr?.initializer?.text ?? node.tagName.getText(source))
  }
  ts.forEachChild(node, visit)
}
visit(render)
test('receipt, claim review, accounting, PT evidence and source follow DOM order', () => {
  const sequence = ['or-receipt', 'ClaimEvidenceReview', 'customer-pass-financial', 'PtProofPanel', 'or-source']
  assert.deepEqual(sections.filter(name => sequence.includes(name)), sequence)
  assert.match(render.getText(source), /isBuyer && !mismatch &&/)
  assert.match(render.getText(source), /id === ptAgreementId && session.chain.id === 43113/)
})
test('responsive pass uses native reading order at every breakpoint', () => {
  const css = read('../src/style.css')
  assert.match(css, /\.customer-pass-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/)
  assert.doesNotMatch(css, /(?:^|[;{])\s*order\s*:|flex-direction:\s*(?:row|column)-reverse/)
})
