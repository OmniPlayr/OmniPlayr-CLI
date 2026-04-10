const path = require('path');
const fs = require('fs');

const PLUGIN_DIRS = {
  backend: path.join(process.cwd(), 'backend', 'plugins'),
  frontend: path.join(process.cwd(), 'frontend', 'src', 'plugins'),
};

function getTargetDirs(target) {
  if (target) {
    if (!PLUGIN_DIRS[target]) throw new Error(`Unknown target: "${target}". Use "backend" or "frontend".`);
    return [PLUGIN_DIRS[target]];
  }

  const found = Object.values(PLUGIN_DIRS).filter(dir => fs.existsSync(dir));
  if (found.length === 0) throw new Error('Could not find a plugins directory. Are you in an OmniPlayr project?');
  return found;
}

module.exports = async function install(plugin, options) {
  const dirs = getTargetDirs(options.target);

  for (const dir of dirs) {
    console.log(`Installing ${plugin}@${options.version} into ${dir}...`);
    fs.mkdirSync(dir, { recursive: true });
    
    console.log(`Done simulating install.`);
  }
};