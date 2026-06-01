import fs from 'fs'
import { chromium } from 'playwright'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const url = process.env.URL || 'http://localhost:5173'
  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1366, height: 768 }
  ]

  const outDir = 'visual-checks'
  fs.mkdirSync(outDir, { recursive: true })

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 })
    } catch (err) {
      console.error('Failed to load', url, err.message)
      continue
    }
    await page.waitForSelector('#root', { timeout: 5000 }).catch(() => {})
    const path = `${outDir}/screenshot-${vp.name}.png`
    await page.screenshot({ path, fullPage: true })
    console.log('Saved screenshot:', path)
  }

  await browser.close()
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
