# Building Electron Desktop App

This guide explains how to build a native desktop application for Windows, macOS, and Linux using Electron.

## What You Get

The Electron build creates:
- **Windows**: `.exe` installer (NSIS) and portable `.exe`
- **macOS**: `.dmg` installer and `.zip` archive
- **Linux**: `.AppImage`, `.deb` (Debian/Ubuntu), and `.rpm` (Fedora/RHEL)

## Prerequisites

- Node.js 14 or higher
- npm
- For macOS builds on macOS: Xcode Command Line Tools
- For Windows builds: Windows SDK (usually installed with Visual Studio)
- ~500MB disk space for dependencies

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This installs Electron and electron-builder (~200MB download).

### 2. Test the App Locally

Before building, test the app:

```bash
npm start
```

The desktop app should open in a window. Press Ctrl+Q or Cmd+Q to quit.

### 3. Build for All Platforms

```bash
npm run build
```

This creates installers for Windows, macOS, and Linux in the `dist/` folder.

**Note**: You can only build macOS apps on macOS, but Windows and Linux can be built on any platform.

## Platform-Specific Builds

Build for a specific platform:

```bash
# Windows only (works on any platform)
npm run build:windows

# macOS only (requires macOS)
npm run build:macos

# Linux only (works on any platform)
npm run build:linux
```

## Build Output

After building, check the `dist/` folder:

### Windows Output
- `Claude Conversation Viewer Setup 1.0.0.exe` - Installer (~100MB)
- `Claude Conversation Viewer 1.0.0.exe` - Portable version (~100MB)

### macOS Output
- `Claude Conversation Viewer-1.0.0.dmg` - Disk image installer (~90MB)
- `Claude Conversation Viewer-1.0.0-mac.zip` - ZIP archive

### Linux Output
- `Claude Conversation Viewer-1.0.0.AppImage` - Universal Linux app (~100MB)
- `claude-conversation-viewer_1.0.0_amd64.deb` - Debian/Ubuntu package
- `claude-conversation-viewer-1.0.0.x86_64.rpm` - Fedora/RHEL package

## Distribution

### Windows
1. Share the installer: `Claude Conversation Viewer Setup 1.0.0.exe`
2. Users run it and follow the installation wizard
3. App appears in Start Menu and Desktop (optional)
4. Users can uninstall from Windows Settings

**Windows SmartScreen**: Unsigned apps show a warning. Users click "More info" → "Run anyway". For production, sign with a code signing certificate.

### macOS
1. Share the DMG: `Claude Conversation Viewer-1.0.0.dmg`
2. Users open it and drag the app to Applications
3. First launch may show security warning (System Preferences → Security → "Open Anyway")
4. For production, sign with an Apple Developer certificate

### Linux

**AppImage** (Universal):
1. Share the `.AppImage` file
2. Users make it executable: `chmod +x Claude\ Conversation\ Viewer-1.0.0.AppImage`
3. Run it: `./Claude\ Conversation\ Viewer-1.0.0.AppImage`

**Debian/Ubuntu**:
```bash
sudo dpkg -i claude-conversation-viewer_1.0.0_amd64.deb
```

**Fedora/RHEL**:
```bash
sudo rpm -i claude-conversation-viewer-1.0.0.x86_64.rpm
```

## Customization

### Application Icon

Place your icons in the `build/` folder:
- `icon.png` (512x512) - Linux
- `icon.ico` - Windows
- `icon.icns` - macOS

See `build/icon-instructions.txt` for details.

### App Information

Edit `package.json` to customize:
- `version` - App version number
- `description` - App description
- `author` - Your name
- `build.appId` - Unique app identifier

### Window Size and Properties

Edit `electron-main.js`:
- `width` / `height` - Default window size
- `title` - Window title
- Add `icon` path for custom icon

## File Sizes

Electron apps are large (~100MB) because they include:
- Chromium browser engine (~70MB)
- Node.js runtime (~20MB)
- Your application code (~5-10MB)

This is normal for Electron apps and ensures they work without dependencies.

## Development vs Production

**Development** (`npm start`):
- Fast iteration
- See console logs
- Can use DevTools (uncomment in electron-main.js)
- Hot reload not included (restart app to see changes)

**Production** (`npm run build`):
- Optimized bundle
- No console window
- Signed and notarized (if configured)
- Ready for distribution

## Advanced Configuration

### Code Signing (Production)

**Windows**: Get a code signing certificate from DigiCert, Sectigo, etc.
```json
"win": {
  "certificateFile": "cert.pfx",
  "certificatePassword": "password"
}
```

**macOS**: Enroll in Apple Developer Program ($99/year)
```json
"mac": {
  "identity": "Developer ID Application: Your Name (TEAM_ID)"
}
```

### Auto-Updates

Add electron-updater for automatic updates:
```bash
npm install electron-updater
```

Configure update server in `package.json`:
```json
"publish": {
  "provider": "github",
  "owner": "yourusername",
  "repo": "claude-conversation-viewer"
}
```

### Build on CI/CD

Use GitHub Actions to build on all platforms:
- Linux: Build on Ubuntu
- Windows: Build on Windows Server
- macOS: Build on macOS (requires paid GitHub plan)

## Troubleshooting

### "Cannot find module 'electron'"
- Run `npm install` again
- Delete `node_modules` and run `npm install`

### Build fails with "Cannot build for X on Y"
- macOS apps can only be built on macOS
- Windows and Linux can be built on any platform

### App crashes on launch
- Check console for errors: `npm start`
- Verify Claude directory exists: `~/.claude/projects`

### Installer not working
- Check antivirus software (may block unsigned apps)
- Try portable version instead

### "App is damaged" on macOS
- App is not signed (normal for development)
- Right-click app → "Open" → Confirm
- Or disable Gatekeeper (not recommended for production)

### Linux permission denied
- Make AppImage executable: `chmod +x filename.AppImage`

## Building from Scratch

If you're setting up Electron for the first time:

1. **Install Electron**:
   ```bash
   npm install --save-dev electron electron-builder
   ```

2. **Create electron-main.js**: Entry point for Electron

3. **Update package.json**:
   - Set `"main": "electron-main.js"`
   - Add build scripts
   - Configure electron-builder

4. **Test locally**: `npm start`

5. **Build**: `npm run build`

## Comparison: Electron vs pkg

| Feature | Electron | pkg |
|---------|----------|-----|
| File size | ~100MB | ~45MB |
| UI | Native window | Browser required |
| Platform | Desktop app | Command-line tool |
| Updates | Auto-update support | Manual distribution |
| DevTools | Built-in | None |
| Best for | End users | Developers |

Choose Electron for a professional desktop app experience.

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [Publishing to App Stores](https://www.electron.build/configuration/publish)
