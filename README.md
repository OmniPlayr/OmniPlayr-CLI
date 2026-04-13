# OmniPlayr CLI

The official CLI for managing plugins on your OmniPlayr server.

---

## Installation

**npm (recommended)**
```bash
npm install -g @omniplayr/cli
```

**Homebrew (macOS and Linux)**
```bash
brew tap OmniPlayr/homebrew-tap
brew install omniplayr
```

**Scoop (Windows)**
```bash
scoop bucket add omniplayr https://github.com/OmniPlayr/scoop-bucket
scoop install omniplayr
```

**Without installing**
```bash
npx @omniplayr/cli
```

---

## Usage

All commands should be run from the root of your OmniPlayr project directory.

### Install a plugin

```bash
omniplayr install <plugin-name>
```

By default, the CLI detects which plugin directories exist and installs into both backend and frontend. To target only one:

```bash
omniplayr install <plugin-name> --target backend
omniplayr install <plugin-name> --target frontend
```

To install a specific version:

```bash
omniplayr install <plugin-name> --version 1.2.0
```

### List installed plugins

```bash
omniplayr list
```

### Log in to the registry

```bash
omniplayr login
```

This opens your browser to the OmniPlayr Plugin Registry login page. After logging in, your access token is saved locally to `~/.omniplayr/config.json`.

### Publish a plugin

```bash
omniplayr publish
```

Run this from your plugin directory. Your `package.json` must have a `name` and `version` field. You must be logged in first.

Files matching your `.omniplayrignore` or `.gitignore` are excluded from the published package.

### Log out

```bash
omniplayr logout
```

Removes your saved access token.

---

## Authentication

The CLI uses OAuth-style browser-based login. After running `omniplayr login`, a local HTTP server starts on a random port to receive the callback. Your browser opens to the registry login page. After logging in, the token is saved to `~/.omniplayr/config.json`.

---

## Publishing a Plugin

Before publishing, make sure your plugin directory contains a valid `package.json`:

```json
{
    "id": "my-plugin@yourname",
    "name": "My Plugin",
    "author": "yourname",
    "version": "1.0.0",
    "description": "What this plugin does"
}
```

Then run:

```bash
omniplayr publish
```

The CLI packs your project into a tarball (excluding ignored files) and uploads it to the registry. See the [publishing guide](https://omniplayr.wokki20.nl/docs/plugins/building) for full details.

---

## Building from Source

Requirements: Node.js 20+

```bash
git clone https://github.com/OmniPlayr/OmniPlayr-CLI.git
cd OmniPlayr-CLI
npm install
```

To build a standalone binary:

```bash
npm run build:linux
npm run build:win
npm run build:mac-arm64
```

Binaries are output to `dist/`.

---

## Contributing

See [CONTRIBUTING.md](https://github.com/OmniPlayr/OmniPlayr-CLI/blob/main/CONTRIBUTING.md) and the [Contributor License Agreement](https://omniplayr.wokki20.nl/legal/cla).

---

## License

MIT - see [LICENSE](./LICENSE).