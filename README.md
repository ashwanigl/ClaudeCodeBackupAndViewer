# Giru Claude Code CLI Conversation Backup & Viewer

A nice, standalone application for viewing and backing up your Claude CLI conversations.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)

## ✨ Features

- 📦 **Standalone Application** - No need to manually start servers
- 🎨 **Beautiful Modern UI** - Flat buttons with colored outlines and intuitive grouping
- 🚀 **Zero Port Conflicts** - Uses dedicated port 58234 to avoid development conflicts
- 💾 **Backup & Export** - Save individual conversations or entire projects as ZIP
- 🔍 **Powerful Search** - Search across conversations with highlighting
- 🎯 **Smart Filtering** - Filter by message types (user, assistant, tool results)
- 🌓 **Dark & Light Themes** - Switch between themes for comfortable viewing
- ⛶ **Fullscreen Mode** - Focus on conversations without distractions

## 🚀 Quick Start

### Installation

1. **From the built Installables** (Recommended):
   - Open `dist/Giru Claude Conversation Backup & Viewer-1.0.0-arm64.dmg`
   - Drag the app to your Applications folder
   - Launch it like any other Mac app!

2. **From the app bundle**:
   - Navigate to `dist/mac-arm64/`
   - Copy `Giru Claude Conversation Backup & Viewer.app` to your Applications folder
   - Double-click to launch

### First Run

When you launch the app for the first time:
- It will automatically start a local server on port 58234
- The app window will open showing your Claude projects
- Select a project to view its conversations

**Note**: Make sure you've used Claude CLI at least once so that `~/.claude/projects/` exists.

## 🎨 UI Design

The interface features a clean, modern design with improved button styling:

### Button Groups

Buttons are organized into three functional groups with distinct colors:

#### 📂 File Actions (Blue Outline)
- **📂 Open** - Import previously saved conversation files
- **💾 Backup** - Export entire project as a ZIP archive

#### 🎯 View Controls (Purple Outline)
- **🔍 Search** - Search through messages with real-time highlighting
- **🎯 Filter** - Toggle message type visibility
- **🔄 Refresh** - Reload conversation list

#### 🌓 Appearance (Green Outline)
- **🌓 Theme** - Switch between dark and light modes
- **⛶ Expand** - Toggle fullscreen mode

All buttons feature:
- Transparent backgrounds
- Colored outlines (2px borders)
- Rounded corners (20px border-radius)
- Smooth hover effects with subtle elevation
- Grouped spacing (20px between groups, 8px within groups)

## 🛠 Development

### Prerequisites
- Node.js 14 or higher
- npm

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Build for macOS
npm run build:macos
```

### Project Structure

```
ClaudeConversationViewer/
├── build/                  # Icons and build resources
│   ├── icon.svg           # Source SVG logo
│   ├── icon.icns          # macOS icon
│   └── icon.png           # PNG icon
├── public/                # Frontend assets
│   ├── index.html
│   ├── style.css
│   └── app.js
├── electron-main.js       # Electron main process
├── server.js              # Express server
├── package.json
├── generate-icons.sh      # Icon generation script
└── README.md
```

## 🔧 Technical Details

### Port Configuration
The application uses port **58234** for its internal server. This high-numbered port is unlikely to conflict with typical development servers (3000, 8000, 8080, etc.).

If you need to change the port, edit `electron-main.js`:
```javascript
const PORT = 58234; // Change this value
```

## 📝 License

MIT

## 🤝 Support

For issues or questions, please raise an issue on GitHub.

---

**Built with ❤️ for the Claude Code CLI community**
