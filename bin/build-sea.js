const fs = require('fs')
const { execSync } = require('child_process')
const path = require('path')
const os = require('os')

const platform = process.argv[2]
const arch = process.argv[3] || os.arch()

if (!platform) {
  console.error('Usage: node build-sea.js <win|mac|linux> [arm64|x64]')
  process.exit(1)
}

const out = path.join(__dirname, '../dist')
if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true })

const bundlePath = path.join(out, 'bundle.js')
const blobPath = path.join(out, 'omniplayr.blob')

const outputName =
  platform === 'win' ? 'omniplayr-win.exe'
  : platform === 'mac' ? `omniplayr-macos-${arch}`
  : 'omniplayr-linux'

const outputPath = path.join(out, outputName)

console.log('Bundling with esbuild...')
execSync(
  `npx esbuild bin/omniplayr.js --bundle --platform=node --target=node20 --outfile=${bundlePath}`,
  { stdio: 'inherit' }
)

const seaConfig = { main: bundlePath, output: blobPath, disableExperimentalSEAWarning: true }
fs.writeFileSync('sea-config.tmp.json', JSON.stringify(seaConfig))

console.log('Generating SEA blob...')
execSync('node --experimental-sea-config sea-config.tmp.json', { stdio: 'inherit' })
fs.unlinkSync('sea-config.tmp.json')

console.log(`Creating binary: ${outputName}`)
fs.copyFileSync(process.execPath, outputPath)

if (process.platform === 'darwin') {
  execSync(`codesign --remove-signature "${outputPath}"`)
}

const machoFlag = process.platform === 'darwin' ? '--macho-segment-name NODE_SEA' : ''
execSync(
  `npx postject "${outputPath}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 ${machoFlag}`,
  { stdio: 'inherit' }
)

if (process.platform === 'darwin') {
  execSync(`codesign --sign - "${outputPath}"`)
}

if (process.platform !== 'win32') {
  fs.chmodSync(outputPath, 0o755)
}

fs.unlinkSync(bundlePath)
fs.unlinkSync(blobPath)

console.log(`Done: ${outputPath}`)