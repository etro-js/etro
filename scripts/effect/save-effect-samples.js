/**
 * @module
 * <em>Run this script and review the results whenever you add a unit test or make an effect algorithm change.</em>
 */

const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer')

// parent directory
const projectDir = __dirname.split('/').slice(0, -1).join('/')

function createDirs(filePath) {
  const dirname = path.dirname(filePath)
  if (fs.existsSync(dirname)) {
    return
  }
  createDirs(dirname)
  fs.mkdirSync(dirname)
}

(async () => {
  const browser = await puppeteer.launch({
    args: ['--autoplay-policy=no-user-gesture-required']
  })
  const page = await browser.newPage()
  page.on('console', msg => {
    console.log(`[CONSOLE] ${msg.text()}`)
  })

  await page.goto(`file://${__dirname}/gen-effect-samples.html`)
  await page.waitForFunction(() => window.done);

  const items = await page.$$eval('p', elems => elems.map(p => {
    return { data: p.innerHTML, path: p.dataset.path }
  }))

  items.forEach(item => {
    // remove prefix and save to png
    const buffer = Buffer.from(item.data.replace(/^data:image\/png;base64,/, ''), 'base64')
    console.log(`writing ${item.path} ...`)
    const path = projectDir + '/spec/assets/effect/' + item.path
    createDirs(path)
    fs.writeFileSync(path, buffer)
  })
  await browser.close()
})()
