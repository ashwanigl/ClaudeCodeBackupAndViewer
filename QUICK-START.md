# Quick Start Guide

## Option 1: Download Desktop App (Easiest)

1. Download the installer for your platform:
   - **Windows**: `Claude Conversation Viewer Setup.exe`
   - **macOS**: `Claude Conversation Viewer.dmg`
   - **Linux**: `Claude Conversation Viewer.AppImage`

2. Install/Run:
   - **Windows**: Double-click installer, follow wizard
   - **macOS**: Open DMG, drag to Applications
   - **Linux**: Make executable (`chmod +x`), then run

3. Launch the app - it opens in its own window!

## Option 2: Run from Source

### First Time Setup

```bash
# Install Node.js from nodejs.org (if not already installed)

# Clone or download this repository
cd claude-conversation-viewer

# Install dependencies
npm install
```

### Running the App

```bash
# Launch the desktop app
npm start
```

The app will open in a window. That's it!

## Using the App

1. **Select a project**: Click the dropdown at the top to see all your Claude projects
2. **View conversations**: Click any conversation to see the messages
3. **Search**: Click 🔍 to search within or across conversations
4. **Filter**: Click 🎛️ to filter message types
5. **Resize**: Drag the divider between panels
6. **Fullscreen**: Click ⬆️ for distraction-free viewing

## Troubleshooting

### "Claude directory not found"
- Make sure you've used Claude CLI at least once
- Check if this directory exists:
  - Windows: `%USERPROFILE%\.claude\projects`
  - macOS/Linux: `~/.claude/projects`

### Nothing happens when I double-click (Windows)
- Windows may show a security warning for unsigned apps
- Click "More info" → "Run anyway"

### "App is damaged" (macOS)
- Right-click the app → "Open" → Confirm
- This happens with unsigned apps (normal for development builds)

### Permission denied (Linux)
```bash
chmod +x Claude\ Conversation\ Viewer.AppImage
./Claude\ Conversation\ Viewer.AppImage
```

## Need Help?

- Full installation guide: See [README.md](README.md)
- Build instructions: See [ELECTRON-BUILD.md](ELECTRON-BUILD.md)
- Report issues: Check the repository for issue tracker

---

**Tip**: The app automatically detects your operating system and finds your Claude conversations. Just launch and go!
