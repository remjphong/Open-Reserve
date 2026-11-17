const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

async function verify() {
  const runtime = process.env.CHROMIUM_RUNTIME_MODULE
  const portable = runtime ? (await import(runtime)).default : null
  const browser = await chromium.launch(portable
    ? { executablePath: await portable.executablePath(), args: portable.args }
    : { executablePath: process.env.CHROMIUM_PATH })
  const base = process.env.PORTAL_URL || 'http://127.0.0.1:4173'
  try {
    const page = await browser.newPage()
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      await page.setViewportSize({ width, height })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      const check = async (url, heading) => {
        assert.equal(new URL(page.url()).pathname, url)
        assert.match(await page.locator('h1').innerText(), heading)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width)
      }
      await page.goto(base + '/customer')
      await check('/customer', /Chọn gói tập/)
      await page.screenshot({ path: __dirname + '/customer-' + width + 'x' + height + '.jpg' })
      for (const [id, index, heading] of [['pt-10', 0, /10 buổi/], ['time-90', 1, /90 ngày/]]) {
        await page.goto(base + '/customer')
        await page.getByRole('link', { name: 'Xem quyền lợi và điều kiện' }).nth(index).click()
        await check('/customer/packages/' + id, heading)
        await page.getByRole('link', { name: 'Tiếp tục đến thanh toán' }).click()
        await check('/customer/checkout/' + id, /Thanh toán thử nghiệm/)
        await page.getByText(/NOT_VERIFIED/).waitFor()
        assert.equal(await page.getByRole('button', { name: /Nạp vào Vault|Cấp hạn mức/ }).count(), 0)
        await page.screenshot({ path: __dirname + '/checkout-' + id + '-' + width + 'x' + height + '.jpg' })
        await page.getByRole('link', { name: 'Xem các gói của tôi' }).click()
        await check('/customer/passes', /Các gói của tôi/)
      }
      for (const [path, title] of [
        ['/customer/passes/OR-024', /Gói tập của tôi/],
        ['/customer/passes/OR-024/evidence', /Bằng chứng buổi PT-04/],
        ['/customer/passes/1', /Gói của tôi/],
        ['/customer/passes/1/dispute', /Phản đối đề nghị/],
        ['/gym', /Tổng quan phòng gym/],
        ['/operations', /Tổng quan vận hành/],
      ]) {
        assert.equal((await page.goto(base + path)).status(), 200)
        await check(path, title)
      }
      assert.deepEqual(errors, [])
      console.log(width + 'x' + height + ': PASS customer package flows, pass deep links and all three portal entries')
      page.removeAllListeners('pageerror')
    }
  } finally { await browser.close() }
}

verify().catch(error => { console.error(error); process.exitCode = 1 })
