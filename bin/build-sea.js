const fs = require('fs')
const { execSync } = require('child_process')
const path = require('path')

const out = path.join(__dirname, '../dist')

if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true })

const platform = process.argv[2]

const entry = path.join(__dirname, 'omniplayr.js')
const output = path.join(
  out,
  platform === 'win'
    ? 'omniplayr-win.exe'
    : platform === 'mac'
    ? 'omniplayr-macos'
    : 'omniplayr-linux'
)

execSync(`node --experimental-sea-config sea-config.json`, { stdio: 'inherit' })

console.log('SEA build placeholder - next step we finalize packaging')
console.log('Entry:', entry)
console.log('Output:', output)