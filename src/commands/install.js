const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const tar = require('tar');
const os = require('os');
const { execSync } = require('child_process');

const REGISTRY_API = 'https://omniplayr.wokki20.nl/api/package.php';
const DOWNLOAD_BASE = 'https://omniplayr-registry.wokki20.nl/api/v1/download';

const PLUGIN_DIRS = {
  backend: path.join(process.cwd(), 'backend', 'plugins'),
  frontend: path.join(process.cwd(), 'frontend', 'src', 'plugins'),
};

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function c(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function log(symbol, message) {
  console.log(`  ${symbol} ${message}`);
}

function fetchPackageInfo(pluginId) {
  return new Promise((resolve, reject) => {
    https.get(`${REGISTRY_API}?id=${encodeURIComponent(pluginId)}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Failed to parse package info')); }
      });
    }).on('error', reject);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function buildProgressBar(pct, width) {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return `[${'#'.repeat(filled)}${'.'.repeat(empty)}]`;
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);

    proto.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`Download failed with status ${res.statusCode}`));
      }

      const total = parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;

      res.on('data', chunk => {
        downloaded += chunk.length;
        if (total) {
          const pct = Math.round((downloaded / total) * 100);
          const bar = buildProgressBar(pct, 24);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(`  ${c('gray', bar)} ${c('dim', `${formatBytes(downloaded)} / ${formatBytes(total)}`)} ${c('cyan', `${pct}%`)}`);
        }
      });

      res.pipe(file);
      file.on('finish', () => {
        if (total) {
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
        }
        file.close(resolve);
      });
    }).on('error', (err) => {
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

function updateBackendConfig(pluginId, version) {
  const configPath = path.join(process.cwd(), 'backend', 'config.local.json');
  if (!fs.existsSync(configPath)) return;

  let config;
  try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch { return; }

  if (!config.plugins) config.plugins = {};
  config.plugins[pluginId] = `^${version}`;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
  log(c('green', '+'), `Registered in ${c('dim', 'config.local.json')}`);
}

function installFrontendDependencies(installDir) {
  const pkgPath = path.join(installDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  let pluginPkg;
  try { pluginPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')); }
  catch { return; }

  const deps = pluginPkg.dependencies;
  if (!deps || Object.keys(deps).length === 0) return;

  const frontendPkgPath = path.join(process.cwd(), 'frontend', 'package.json');
  if (!fs.existsSync(frontendPkgPath)) {
    log(c('yellow', '!'), `No frontend/package.json found, skipping dependency install`);
    return;
  }

  let frontendPkg;
  try { frontendPkg = JSON.parse(fs.readFileSync(frontendPkgPath, 'utf-8')); }
  catch {
    log(c('yellow', '!'), `Could not read frontend/package.json`);
    return;
  }

  if (!frontendPkg.dependencies) frontendPkg.dependencies = {};

  const newDeps = [];
  for (const [name, version] of Object.entries(deps)) {
    if (!frontendPkg.dependencies[name]) {
      frontendPkg.dependencies[name] = version;
      newDeps.push(`${name}@${version}`);
    }
  }

  if (newDeps.length === 0) return;

  fs.writeFileSync(frontendPkgPath, JSON.stringify(frontendPkg, null, 2));

  for (const dep of newDeps) {
    log(c('green', '+'), `Added ${c('cyan', dep)} to frontend/package.json`);
  }

  log(c('cyan', '>'), `Running npm install in frontend...`);
  try {
    execSync('npm install', {
      cwd: path.join(process.cwd(), 'frontend'),
      stdio: 'inherit',
    });
    log(c('green', '+'), `Dependencies installed`);
  } catch {
    log(c('yellow', '!'), `npm install failed, run it manually in frontend/`);
  }
}

module.exports = async function install(plugin, options) {
  console.log();
  console.log(`  ${c('bold', 'Installing')} ${c('cyan', plugin)}`);
  console.log(`  ${c('gray', '-'.repeat(40))}`);

  let info;
  try {
    log(c('gray', '>'), `Fetching package info...`);
    info = await fetchPackageInfo(plugin);
  } catch (e) {
    log(c('red', 'x'), `Failed to fetch package info: ${e.message}`);
    process.exit(1);
  }

  if (info.error || !info.package_id) {
    log(c('red', 'x'), `Package not found: ${c('cyan', plugin)}`);
    process.exit(1);
  }

  const availableTypes = info.types || [];

  let targetTypes;
  if (options.target) {
    if (!PLUGIN_DIRS[options.target]) {
      log(c('red', 'x'), `Unknown target "${options.target}". Use "backend" or "frontend".`);
      process.exit(1);
    }
    if (!availableTypes.includes(options.target)) {
      log(c('red', 'x'), `Plugin "${plugin}" does not have a ${options.target} type.`);
      process.exit(1);
    }
    targetTypes = [options.target];
  } else {
    targetTypes = availableTypes.filter(type => fs.existsSync(PLUGIN_DIRS[type]));
    if (targetTypes.length === 0) {
      log(c('red', 'x'), `No plugin directories found. Are you in an OmniPlayr project?`);
      process.exit(1);
    }
  }

  for (const type of targetTypes) {
    const version = (!options.version || options.version === 'latest')
      ? info.latest[type]
      : options.version;

    if (!version) {
      log(c('yellow', '!'), `No version available for ${type}`);
      continue;
    }

    const pluginFolder = plugin.includes('@') ? plugin.replace('/', '_') : plugin;
    const installDir = path.join(PLUGIN_DIRS[type], pluginFolder);

    console.log();
    log(c('bold', type.toUpperCase()), `${c('cyan', plugin)}  ${c('gray', `v${version}`)}`);

    fs.mkdirSync(installDir, { recursive: true });

    const tmpFile = path.join(os.tmpdir(), `omniplayr-${pluginFolder}-${type}-${version}-${Date.now()}.tar.gz`);
    const downloadUrl = `${DOWNLOAD_BASE}?id=${encodeURIComponent(plugin)}&version=${encodeURIComponent(version)}&type=${encodeURIComponent(type)}`;

    log(c('gray', '>'), `Downloading...`);
    try {
      await downloadFile(downloadUrl, tmpFile);
      log(c('green', '+'), `Downloaded ${c('dim', formatBytes(fs.statSync(tmpFile).size))}`);
    } catch (e) {
      log(c('red', 'x'), `Download failed: ${e.message}`);
      continue;
    }

    log(c('gray', '>'), `Extracting...`);

    const tmpExtract = path.join(os.tmpdir(), `omniplayr-extract-${Date.now()}`);
    fs.mkdirSync(tmpExtract, { recursive: true });

    try {
      await tar.extract({ file: tmpFile, cwd: tmpExtract });
    } catch (e) {
      log(c('red', 'x'), `Extraction failed: ${e.message}`);
      fs.unlinkSync(tmpFile);
      fs.rmSync(tmpExtract, { recursive: true, force: true });
      continue;
    }

    fs.unlinkSync(tmpFile);

    const typeDir = path.join(tmpExtract, type);
    if (fs.existsSync(typeDir)) {
      for (const item of fs.readdirSync(typeDir)) {
        fs.cpSync(path.join(typeDir, item), path.join(installDir, item), { recursive: true });
      }
    }

    fs.rmSync(tmpExtract, { recursive: true, force: true });

    if (type === 'backend') {
      updateBackendConfig(plugin, version);
    }

    if (type === 'frontend') {
      installFrontendDependencies(installDir);
    }

    log(c('green', '+'), `Installed to ${c('dim', installDir)}`);
  }

  console.log();
  console.log(`  ${c('green', 'Done')}  ${c('gray', plugin)}`);
  console.log();
};