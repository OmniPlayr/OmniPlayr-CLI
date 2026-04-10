const fs = require('fs');
const path = require('path');

module.exports = function list() {
  const pluginsDir = path.join(process.cwd(), '.omniplayr', 'plugins');

  if (!fs.existsSync(pluginsDir)) {
    console.log('No plugins installed.');
    return;
  }

  const plugins = fs.readdirSync(pluginsDir);

  if (plugins.length === 0) {
    console.log('No plugins installed.');
  } else {
    console.log('Installed plugins:');
    plugins.forEach(p => console.log(` - ${p}`));
  }
};