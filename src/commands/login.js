const http = require('http');
const { execSync } = require('child_process');
const { saveConfig } = require('../utils/config');

function openBrowser(url) {
  try {
    if (process.platform === 'win32') execSync(`start "" "${url}"`);
    else if (process.platform === 'darwin') execSync(`open "${url}"`);
    else execSync(`xdg-open "${url}"`);
  } catch {}
}

module.exports = function login() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');

      if (url.pathname !== '/callback' || !token) {
        res.writeHead(404);
        res.end();
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Login successful! You can close this tab.</h1>');
      server.close();

      saveConfig({ token });

      try {
        const profileRes = await fetch('https://omniplayr.wokki20.nl/api/profile', {
          headers: { authorization: `Bearer ${token}` }
        });
        const profile = await profileRes.json();
        console.log(`Logged in as ${profile.display_name || profile.username} (${profile.username}).`);
      } catch {
        console.log('Logged in successfully.');
      }

      resolve();
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const callbackUrl = `http://127.0.0.1:${port}/callback`;
      const loginUrl = `https://omniplayr.wokki20.nl/packages/login?redirect=${encodeURIComponent(callbackUrl)}`;

      console.log('Opening browser for login...');
      console.log(`If it doesn\'t open, visit:\n${loginUrl}`);
      openBrowser(loginUrl);
    });

    server.on('error', reject);
  });
};