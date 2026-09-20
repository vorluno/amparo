// Capturas de QA a 1280 y 400 con Chromium de Playwright (node scripts/capturas.mjs, con bun dev corriendo).
import { chromium } from 'playwright-core'
const base = 'http://localhost:3947'
const browser = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1243/chrome-win64/chrome.exe', headless: true, timeout: 60000 })
for (const [w, tag] of [[1280, 'desktop'], [400, 'movil']]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 })
  for (const [path, name] of [['/', 'lista'], ['/solicitudes/PA-0003', 'detalle'], ['/solicitudes/PA-0001', 'preaprobada']]) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    await page.screenshot({ path: `docs/media/_${name}-${tag}.png`, fullPage: true })
    console.log(`${name} @${w}: overflow=${overflow}`)
  }
  await page.close()
}
await browser.close()
