#!/usr/bin/env node

const { program } = require('commander');

program
  .name('omniplayr')
  .description('OmniPlayr CLI')
  .version('1.0.0');

program
  .command('install <plugin>')
  .description('Install a plugin')
  .option('-v, --version <version>', 'Plugin version', 'latest')
  .option('-t, --target <target>', 'Target: backend or frontend (default: all found)')
  .action((plugin, options) => {
    require('../src/commands/install')(plugin, options);
  });

program
  .command('list')
  .description('List installed plugins')
  .action(() => {
    require('../src/commands/list')();
  });

program.parse();