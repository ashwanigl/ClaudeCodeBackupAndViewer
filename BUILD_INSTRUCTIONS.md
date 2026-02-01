# Build Instructions for Giru Claude Conversation Backup & Viewer

## Quick Start

### Building the Mac Application

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Build the application**:
   ```bash
   npm run build:macos
   ```

3. **Find your application**:
   - The built app will be in the `dist` folder
   - Look for `Giru Claude Conversation Backup & Viewer.app`
   - You can drag this to your Applications folder

### Running the Application

#### Option 1: From the built app (Recommended)
Simply double-click `Giru Claude Conversation Backup & Viewer.app` from your Applications folder or wherever you placed it.

#### Option 2: Development mode
```bash
npm start
```

## Features

✨ **No Manual Server Management** - The app starts its own server automatically on port 58234
🎨 **Beautiful UI** - Flat buttons with colored outlines and grouped functionality
📦 **Packaged Application** - No need to start the server separately
🚀 **Port Isolation** - Uses port 58234 to avoid conflicts with development servers (typically port 3000)

## What's Different from the Previous Version?

1. **Application Name**: Now branded as "Giru Claude Conversation Backup & Viewer"
2. **Port**: Changed from 3000 to 58234 to avoid conflicts
3. **Logo**: Custom icon with chat bubbles and save indicator
4. **Buttons**: Redesigned with:
   - Flat, transparent backgrounds
   - Colored outlines (blue for file actions, purple for view controls, green for appearance)
   - Rounded corners (20px border-radius)
   - Grouped by functionality with visual spacing
5. **Packaged as Mac App**: Can be installed and launched like any other Mac application

## Button Groups

The toolbar buttons are now organized into three logical groups:

### 📂 File Actions (Blue)
- **Open** - Open saved conversation files
- **Backup** - Backup entire project to ZIP

### 🎯 View Controls (Purple)
- **Search** - Search through messages
- **Filter** - Filter message types
- **Refresh** - Reload messages

### 🌓 Appearance (Green)
- **Theme** - Toggle dark/light theme
- **Expand** - Toggle fullscreen mode

## Rebuilding Icons

If you need to modify the logo, edit `build/icon.svg` and run:

```bash
./generate-icons.sh
```

This will regenerate all icon sizes and the .icns file for macOS.

## Distribution

To create a DMG installer that others can use:

```bash
npm run build:macos
```

The DMG file will be in the `dist` folder. Share this file with others to install the app.

## Troubleshooting

### Port Already in Use
If port 58234 is somehow in use, you can change it in `electron-main.js` by modifying the `PORT` constant.

### Claude Directory Not Found
Make sure you've used Claude CLI at least once. The app looks for conversations in `~/.claude/projects/`.

### App Won't Open
If macOS blocks the app, go to System Preferences > Security & Privacy and allow it to run.
