const fs = require('fs');
const path = require('path');
const os = require('os');
const tar = require('tar');
const FormData = require('form-data');
const fetch = require('node-fetch');
const ignore = require('ignore');
const { getConfig } = require('../utils/config');

const REGISTRY_URL = 'https://omniplayr-registry.wokki20.nl/api/v1/publish';

function getEntries(cwd) {
  const ig = ignore();

  const omniplayrIgnore = path.join(cwd, '.omniplayrignore');
  const gitIgnore = path.join(cwd, '.gitignore');

  if (fs.existsSync(omniplayrIgnore)) {
    ig.add(fs.readFileSync(omniplayrIgnore, 'utf-8'));
  } else if (fs.existsSync(gitIgnore)) {
    ig.add(fs.readFileSync(gitIgnore, 'utf-8'));
  }

  return fs.readdirSync(cwd).filter(f => !ig.ignores(f));
}

module.exports = async function publish() {
  const pkgPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(pkgPath)) {
    console.error('No package.json found. Are you in the right directory?');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const { name, version } = pkg;

  if (!name || !version) {
    console.error('package.json must have a name and version.');
    process.exit(1);
  }

  const { token } = getConfig();
  if (!token) {
    console.error('Not logged in. Run `omniplayr login` first.');
    process.exit(1);
  }

  const safeName = name.replace(/[@\/]/g, '-');
  const tarName = `${safeName}-${version}.tar.gz`;
  const tarPath = path.join(os.tmpdir(), tarName);

  if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);

  console.log(`Packing ${name}@${version}...`);

  const entries = getEntries(process.cwd());

  await tar.create(
    { gzip: true, file: tarPath, cwd: process.cwd() },
    entries
  );

  console.log('Publishing...');

  const form = new FormData();
  form.append('file', fs.createReadStream(tarPath), { filename: tarName, contentType: 'application/gzip' });

  const res = await fetch(REGISTRY_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      ...form.getHeaders()
    },
    body: form,
  });

  fs.unlinkSync(tarPath);

  const text = await res.text();

  if (!res.ok) {
    console.error(`Publish failed (${res.status}): ${text}`);
    process.exit(1);
  }

  console.log(`Published ${name}@${version} successfully.`);
};