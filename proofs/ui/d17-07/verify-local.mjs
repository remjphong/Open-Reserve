import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createPublicClient, createWalletClient, erc20Abi, http, keccak256, toHex } from 'viem'
import { foundry } from 'viem/chains'
import { reserveVaultAbi } from '@openreserve/contracts-sdk'

const playwright = process.env.PLAYWRIGHT_MODULE
const { chromium } = await import(playwright ? playwright + '/index.mjs' : 'playwright')
const portable = process.env.CHROMIUM_RUNTIME_MODULE ? (await import(process.env.CHROMIUM_RUNTIME_MODULE)).default : null
const rpc = 'http://127.0.0.1:8545'
const base = 'http://127.0.0.1:4174'
const client = createPublicClient({ chain: foundry, transport: http(rpc) })
const wallet = createWalletClient({ chain: foundry, transport: http(rpc) })
const [buyer, merchant, resolver] = await wallet.getAddresses()
const wait = async hash => {
  const receipt = await client.waitForTransactionReceipt({ hash })
  assert.equal(receipt.status, 'success')
  return receipt
}
const deploy = async (name, args) => {
  const artifact = JSON.parse(await readFile('contracts/out/' + name + '.sol/' + name + '.json', 'utf8'))
  const hash = await wallet.deployContract({ account: buyer, abi: artifact.abi, bytecode: artifact.bytecode.object, args })
  const receipt = await wait(hash)
  assert.ok(receipt.contractAddress)
  return receipt
}
const token = await deploy('MockReserveToken', [5000n])
const vault = await deploy('ReserveVault', [token.contractAddress, resolver])
const writeVault = async (account, functionName, args) => wait(await wallet.writeContract({
  account, address: vault.contractAddress, abi: reserveVaultAbi, functionName, args,
}))
const digest = keccak256(toHex('local workflow test evidence'))
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'apps/web', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], {
  env: { ...process.env, VITE_VAULT_CHAIN_ID: '31337', VITE_VAULT_ADDRESS: vault.contractAddress,
    VITE_VAULT_DEPLOYMENT_BLOCK: String(vault.blockNumber), VITE_MERCHANT_ADDRESS: merchant },
  stdio: 'ignore',
})
let browser
try {
  for (let attempts = 0; ; attempts++) {
    try { if ((await fetch(base)).ok) break } catch {}
    if (attempts > 60) throw new Error('Local web server did not start')
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  browser = await chromium.launch(portable ? { executablePath: await portable.executablePath(), args: portable.args }
    : { executablePath: process.env.CHROMIUM_PATH })
  const page = await browser.newPage()
  page.setDefaultTimeout(12000)
  page.on('pageerror', error => console.error(error))
  let selected = buyer
  let chain = '0x1'
  let rejectNext = false
  let waitForRelease = null
  await page.exposeFunction('walletRpc', async (method, params) => {
    if (method === 'eth_accounts' || method === 'eth_requestAccounts') return { result: [selected] }
    if (method === 'eth_chainId') return { result: chain }
    if (method === 'eth_sendTransaction' && rejectNext) {
      rejectNext = false
      return { error: { code: 4001, message: 'Rejected for test' } }
    }
    if (method === 'eth_getTransactionReceipt' && waitForRelease) await waitForRelease
    return (await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) })).json()
  })
  await page.addInitScript(() => {
    window.ethereum = { async request({ method, params = [] }) {
      const { result, error } = await window.walletRpc(method, params)
      if (error) throw Object.assign(new Error(error.message), { code: error.code })
      return result
    } }
  })
  await page.goto(base + '/customer/checkout/pt-10')
  await page.getByText(/Sai mạng/).waitFor()
  chain = '0x7a69'
  await page.getByRole('button', { name: /Kết nối ví/ }).click()
  await page.getByRole('checkbox').check()
  rejectNext = true
  await page.getByRole('button', { name: 'Cấp hạn mức MRES' }).click()
  await page.getByText(/Bạn đã từ chối/).waitFor()
  let release
  waitForRelease = new Promise(resolve => { release = resolve })
  await page.getByRole('button', { name: 'Cấp hạn mức MRES' }).click()
  await page.getByText(/Đang chờ biên nhận/).waitFor()
  assert.equal(await page.getByText(/Đã xác nhận cấp hạn mức/).count(), 0)
  release()
  waitForRelease = null
  await page.getByText(/Đã xác nhận cấp hạn mức/).waitFor()
  await page.getByRole('button', { name: 'Nạp vào Vault' }).click()
  await page.getByText(/Đã xác nhận giao dịch nạp/).waitFor()
  await page.getByRole('link', { name: 'Mở gói vừa mua' }).click()
  await page.getByText('Đang được Vault giữ', { exact: true }).waitFor()
  assert.equal(await client.readContract({ address: token.contractAddress, abi: erc20Abi, functionName: 'balanceOf', args: [vault.contractAddress] }), 1003n)

  await writeVault(merchant, 'proposeSession', [1n, keccak256(toHex('first PT session')), digest])
  selected = merchant
  await page.reload()
  await page.getByText(/Chỉ ví người mua/).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Xác nhận buổi PT' }).count(), 0)
  selected = buyer
  await page.reload()
  await page.getByRole('button', { name: 'Đánh dấu đã xem bằng chứng' }).click()
  await page.getByRole('button', { name: 'Xác nhận buổi PT' }).click()
  await page.getByText(/Đã xác nhận · 0x/).waitFor()
  await page.getByText(/#1 · Đã xác nhận/).waitFor()

  await writeVault(merchant, 'finalizeClaim', [1n, 1n])
  await writeVault(merchant, 'proposeSession', [1n, keccak256(toHex('second PT session')), digest])
  await page.getByRole('link', { name: 'Xem tùy chọn phản đối' }).click()
  await page.getByLabel('Hash bằng chứng phản đối').fill(digest)
  await page.getByRole('button', { name: 'Gửi phản đối' }).click()
  await page.getByText(/Đã xác nhận · 0x/).waitFor()
  const claim = await client.readContract({ address: vault.contractAddress, abi: reserveVaultAbi, functionName: 'getClaim', args: [1n, 2n] })
  assert.equal(claim.state, 3)
  await writeVault(resolver, 'resolveClaim', [1n, 2n, 0n, 50n, digest])
  await page.getByRole('button', { name: 'Làm mới dữ liệu Vault' }).click()
  await page.getByRole('button', { name: 'Nhận token được duyệt hoàn' }).click()
  await page.getByText(/Đã xác nhận · 0x/).waitFor()
  const [, , refundable] = await client.readContract({ address: vault.contractAddress, abi: reserveVaultAbi, functionName: 'getBalances', args: [1n] })
  assert.equal(refundable, 0n)
  await page.goto(base + '/customer/checkout/time-90')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Cấp hạn mức MRES' }).click()
  await page.getByText(/Đã xác nhận cấp hạn mức/).waitFor()
  await page.getByRole('button', { name: 'Nạp vào Vault' }).click()
  await page.getByRole('link', { name: 'Mở gói vừa mua' }).click()
  const timeAgreement = await client.readContract({ address: vault.contractAddress, abi: reserveVaultAbi, functionName: 'getAgreement', args: [2n] })
  assert.equal(timeAgreement.endAt - timeAgreement.startAt, 7776000n)
  await client.request({ method: 'evm_setNextBlockTimestamp', params: [toHex(timeAgreement.startAt + 91n)] })
  await client.request({ method: 'evm_mine' })
  await writeVault(merchant, 'proposeTime', [2n, timeAgreement.startAt, timeAgreement.startAt + 90n, digest])
  await page.getByRole('link', { name: 'Xem tùy chọn phản đối' }).click()
  await page.getByLabel('Hash bằng chứng phản đối').fill(digest)
  await page.getByRole('button', { name: 'Gửi phản đối' }).click()
  await page.getByText(/Đã xác nhận · 0x/).waitFor()
  const challengedTime = await client.readContract({ address: vault.contractAddress, abi: reserveVaultAbi, functionName: 'getClaim', args: [2n, 1n] })
  assert.equal(challengedTime.state, 3)
  console.log('PASS local Anvil: wrong network, rejected signature, pending receipt, approval, PT deposit, buyer-only confirmation, PT challenge authorized refund, TIME_ACCESS deposit and challenge')
} finally {
  await browser?.close()
  const exit = once(server, 'exit')
  if (server.kill()) await exit
}
