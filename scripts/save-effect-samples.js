/**
 * @module
 * <em>Run this script and review the results whenever you add a unit test or make an effect algorithm change.</em>
 */

const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer')
const { exec } = require('child_process')
const { exit } = require('process')

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

async function saveImageSnapshots(page) {
  const items = await page.evaluate(() => window.imageEffects)

  items.forEach(item => {
    // remove prefix and save to png
    const buffer = Buffer.from(item.result.replace(/^data:image\/png;base64,/, ''), 'base64')
    console.log(`writing ${item.path} ...`)
    const path = projectDir + '/spec/assets/effect/' + item.path
    createDirs(path)
    fs.writeFileSync(path, buffer)
  })
}

async function saveAudioSnapshots(page) {
  const items = await page.evaluate(() => window.audioEffects)
  items.forEach(item => {
    console.log(`writing ${item.path} ...`)
    const buffer = Buffer.from(item.result)
    fs.writeFileSync(projectDir + '/spec/assets/effect/' + item.path, buffer)
  })
}

(async () => {
  // Start server to prevent CORS issues
  const childProc = exec('npx http-server')

  const browser = await puppeteer.launch({
    // Redirect console to terminal
    dumpio: true,
    // Allow recording
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', '--disable-gpu']
  })
  const page = await browser.newPage()

  await page.goto(`http://localhost:8080/scripts/gen-effect-samples.html`)
  // Wait for page to apply effects and save results
  await page.waitForFunction(() => window.done);

  await saveImageSnapshots(page)
  await saveAudioSnapshots(page)

  await browser.close()
  childProc.kill()
  exit() // for some reason without this it hangs
})()
