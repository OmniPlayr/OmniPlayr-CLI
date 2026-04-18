const fs = require('fs');
const path = require('path');

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
  gray: '\x1b[90m',
};

function c(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

module.exports = function list() {
  console.log();

  const found = {};

  for (const [type, dir] of Object.entries(PLUGIN_DIRS)) {
    if (!fs.existsSync(dir)) continue;

    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);

    for (const name of entries) {
      if (!found[name]) found[name] = [];
      found[name].push(type);
    }
  }

  const plugins = Object.entries(found);

  if (plugins.length === 0) {
    console.log(`  No plugins installed.`);
    console.log();
    return;
  }

  console.log(`  ${c('bold', 'Installed plugins')}  ${c('gray', `(${plugins.length})`)}`);
  console.log(`  ${c('gray', '-'.repeat(40))}`);
  console.log();

  for (const [name, types] of plugins) {
    const typeLabels = types.map(t => c('gray', t)).join(c('dim', ' + '));
    console.log(`  ${c('green', '•')} ${c('cyan', name)}  ${typeLabels}`);
  }

  console.log();
};