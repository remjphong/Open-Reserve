const assert = require('node:assert/strict')
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const cases = {
  '/customer': ['Tổng quan khách hàng','Khách hàng / Tổng quan','Gói tập hiện tại','Tổng quan'],
  '/customer/passes/OR-024': ['Gói tập của tôi','Khách hàng / Gói của tôi','Lịch sử gói','Gói của tôi'],
  '/customer/passes/OR-024/evidence': ['Bằng chứng buổi PT-04','Khách hàng / Gói của tôi / Bằng chứng','Nhật ký buổi tập','Gói của tôi'],
  '/gym': ['Tổng quan phòng gym','Phòng gym / Tổng quan','Hợp đồng cần theo dõi','Tổng quan'],
  '/gym/agreements/OR-024': ['Hợp đồng OR-024','Phòng gym / Hợp đồng','Đề nghị ghi nhận buổi tập','Hợp đồng'],
  '/gym/payouts': ['Giải ngân','Phòng gym / Giải ngân','Khoản có thể rút theo hợp đồng','Giải ngân'],
  '/operations': ['Tổng quan vận hành','Vận hành / Tổng quan','Hợp đồng đang theo dõi','Tổng quan'],
  '/operations/agreements/OR-024': ['Sổ cái OR-024','Vận hành / Sổ cái','Đối chiếu số dư hợp đồng','Sổ cái'],
  '/operations/disputes/PT-04': ['Hồ sơ PT-04','Vận hành / Phản đối','Xem xét phản đối','Phản đối'],
  '/customer/passes': ['Các gói của tôi','Khách hàng / Gói của tôi','Gói đang sử dụng','Gói của tôi'],
  '/gym/agreements': ['Danh sách hợp đồng','Phòng gym / Hợp đồng','Hợp đồng đang sử dụng','Hợp đồng'],
  '/operations/agreements': ['Danh sách sổ cái','Vận hành / Sổ cái','Hợp đồng đang theo dõi','Sổ cái'],
  '/operations/disputes': ['Danh sách phản đối','Vận hành / Phản đối','Phản đối cần xem xét','Phản đối'],
}
const base = 'http://127.0.0.1:4173'
;(async()=>{
  const runtime = process.env.CHROMIUM_RUNTIME_MODULE
  const portable = runtime ? (await import(runtime)).default : null
  const browser = await chromium.launch(portable ? { executablePath: await portable.executablePath(), args: portable.args } : {})
  try {
    const page=await browser.newPage()
    const errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    page.on('response',r=>{if(r.status()>=400)errors.push(r.url())})
    page.on('request',r=>{if(new URL(r.url()).origin!==base)errors.push(r.url())})
    for(const [width,height] of [[1440,900],[390,844]]){
      await page.setViewportSize({width,height})
      const check=async path=>{
        const [h1,crumb,section,active]=cases[path]
        assert.equal(await page.locator('h1').innerText(),h1)
        assert.equal(await page.locator('.breadcrumb').innerText(),crumb)
        assert.equal(await page.getByRole('heading',{name:section,exact:true}).count(),1)
        assert.equal(await page.locator('nav:visible [aria-current="page"]').innerText(),active)
        assert.match(await page.locator('.notice').innerText(),/Dữ liệu minh họa/)
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width)
        for(const cta of await page.locator('button.button-primary').all())assert.ok(await cta.isDisabled())
      }
      for(const path of Object.keys(cases)){
        assert.equal((await page.goto(base+path)).status(),200)
        await check(path)
        assert.equal((await page.reload()).status(),200)
        await check(path)
      }
      for(const role of ['customer','gym','operations']){
        await page.goto(base+'/'+role)
        const links=await page.locator('nav:visible a').evaluateAll(xs=>xs.map(a=>a.getAttribute('href')))
        for(const path of links){
          await page.locator(`nav:visible a[href="${path}"]`).click()
          assert.equal(new URL(page.url()).pathname,path)
          await check(path)
        }
        await page.goto(base+'/'+role+'/unknown')
        assert.equal(await page.locator('h1').innerText(),'Không tìm thấy trang')
        await page.locator('main a').click()
        await check('/'+role)
      }
      await page.goto(base+'/customer/passes/OR-024')
      await page.getByRole('link',{name:'Xem bằng chứng trước'}).click()
      await check('/customer/passes/OR-024/evidence')
      await page.locator('summary').click()
      assert.equal(await page.locator('details[open] .state-example').count(),3)
      assert.deepEqual(errors,[])
      console.log(`${width}×${height}: PASS — 13 direct URLs and reloads, 8 primary navigation destinations, exact headings, breadcrumbs, content markers, active nav; all 3 unknown-route recoveries; evidence link, disabled actions and no overflow.`)
    }
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1})
