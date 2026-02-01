const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const archiver = require('archiver');

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Get Claude directory based on platform
function getClaudeDir() {
  const platform = os.platform();

  if (platform === 'win32') {
    // Windows: %APPDATA%\Claude\projects or %USERPROFILE%\.claude\projects
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const claudeAppData = path.join(appData, 'Claude', 'projects');
    const claudeHome = path.join(os.homedir(), '.claude', 'projects');

    // Check which directory exists
    if (fs.existsSync(claudeAppData)) {
      return claudeAppData;
    } else if (fs.existsSync(claudeHome)) {
      return claudeHome;
    }
    return claudeAppData; // Default to AppData location
  } else {
    // Unix-like systems (macOS, Linux): ~/.claude/projects
    return path.join(os.homedir(), '.claude', 'projects');
  }
}

// Get all projects
app.get('/api/projects', (req, res) => {
  const claudeDir = getClaudeDir();

  try {
    const projects = fs.readdirSync(claudeDir)
      .filter(name => !name.startsWith('.'))
      .map(name => {
        const projectPath = name.replace(/^-/, '/').replace(/-/g, '/');
        return {
          id: name,
          path: projectPath,
          name: path.basename(projectPath)
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read projects directory' });
  }
});

// Get conversations for a project
app.get('/api/projects/:projectId/conversations', (req, res) => {
  const { projectId } = req.params;
  const claudeDir = getClaudeDir();
  const projectDir = path.join(claudeDir, projectId);

  try {
    const files = fs.readdirSync(projectDir)
      .filter(name => name.endsWith('.jsonl') && !name.includes('/'));

    const conversations = files.map(filename => {
      const filePath = path.join(projectDir, filename);
      const stats = fs.statSync(filePath);
      const conversationId = filename.replace('.jsonl', '');

      // Read first few lines to get conversation start info
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      const firstMessage = lines.find(line => {
        try {
          const msg = JSON.parse(line);
          return msg.type === 'user' && msg.message?.content && !msg.isMeta;
        } catch (e) {
          return false;
        }
      });

      let preview = 'No messages';
      if (firstMessage) {
        try {
          const msg = JSON.parse(firstMessage);
          preview = msg.message.content.substring(0, 100);
        } catch (e) {}
      }

      return {
        id: conversationId,
        filename,
        lastModified: stats.mtime,
        preview,
        messageCount: lines.length
      };
    }).sort((a, b) => b.lastModified - a.lastModified);

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read conversations' });
  }
});

// Utility function to process message entry
function processMessageEntry(entry) {
  let textContent = '';
  let messageType = entry.type;
  const rawContent = entry.message?.content;

  if (typeof rawContent === 'string') {
    textContent = rawContent;
  } else if (Array.isArray(rawContent)) {
    // Check if this message contains only tool results
    const hasOnlyToolResults = rawContent.length > 0 &&
      rawContent.every(block => block.type === 'tool_result');

    if (hasOnlyToolResults && entry.type === 'user') {
      messageType = 'tool_result';
    }

    // Extract text from content blocks
    const textParts = [];
    let hasThinking = false;
    let hasToolUse = false;

    for (const block of rawContent) {
      if (block.type === 'text') {
        textParts.push(block.text);
      } else if (block.type === 'thinking') {
        hasThinking = true;
        textParts.push(`💭 Thinking:\n${block.thinking}`);
      } else if (block.type === 'tool_use') {
        hasToolUse = true;
        textParts.push(`🔧 Tool: ${block.name}\nInput: ${JSON.stringify(block.input, null, 2)}`);
      } else if (block.type === 'tool_result') {
        const result = typeof block.content === 'string'
          ? block.content
          : JSON.stringify(block.content);
        textParts.push(`📊 Tool Result:\n${result}`);
      }
    }

    textContent = textParts.filter(text => text !== '').join('\n\n');

    // Determine message type based on content
    if (entry.type === 'assistant') {
      if (hasToolUse) {
        messageType = 'tool_use';
      } else if (hasThinking) {
        messageType = 'thinking';
      } else {
        messageType = 'claude';
      }
    }
  }

  return {
    uuid: entry.uuid,
    type: messageType,
    timestamp: entry.timestamp,
    content: textContent,
    parentUuid: entry.parentUuid,
    cwd: entry.cwd,
    gitBranch: entry.gitBranch,
    isMeta: entry.isMeta || false
  };
}

// Utility function to process conversation file
function processConversationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const messages = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      // Filter to only user and assistant messages
      if (entry.type === 'user' || entry.type === 'assistant') {
        messages.push(processMessageEntry(entry));
      }
    } catch (e) {
      // Skip invalid lines
    }
  }

  return messages;
}

// Get conversation messages
app.get('/api/conversations/:projectId/:conversationId', (req, res) => {
  const { projectId, conversationId } = req.params;
  const claudeDir = getClaudeDir();
  const filePath = path.join(
    claudeDir,
    projectId,
    `${conversationId}.jsonl`
  );

  try {
    const messages = processConversationFile(filePath);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read conversation' });
  }
});

// Export conversation to user-selected location
app.post('/api/export-conversation', (req, res) => {
  const { projectId, conversationId, savePath } = req.body;

  if (!projectId || !conversationId || !savePath) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const claudeDir = getClaudeDir();
  const sourcePath = path.join(claudeDir, projectId, `${conversationId}.jsonl`);

  try {
    // Read and process the conversation file using utility function
    const messages = processConversationFile(sourcePath);

    // Write processed messages as JSON (not JSONL)
    fs.writeFileSync(savePath, JSON.stringify(messages, null, 2), 'utf-8');

    res.json({
      success: true,
      savedPath: savePath,
      filename: path.basename(savePath)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to export conversation: ' + error.message });
  }
});

// Backup entire project to ZIP file
app.post('/api/backup-project', (req, res) => {
  const { projectId, projectName, savePath } = req.body;

  if (!projectId || !projectName || !savePath) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const claudeDir = getClaudeDir();
  const projectDir = path.join(claudeDir, projectId);

  try {
    // Get all conversation files
    const files = fs.readdirSync(projectDir);
    const conversationFiles = files.filter(file => file.endsWith('.jsonl'));

    if (conversationFiles.length === 0) {
      return res.status(400).json({ error: 'No conversations found in project' });
    }

    // Create ZIP archive
    const output = fs.createWriteStream(savePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    const errors = [];
    let processedCount = 0;
    let totalSize = 0;

    // Handle archive errors
    archive.on('error', (err) => {
      throw err;
    });

    // Track progress
    archive.on('progress', (progress) => {
      totalSize = progress.fs.processedBytes;
    });

    // Pipe archive to file
    archive.pipe(output);

    // Process each conversation
    conversationFiles.forEach((filename, index) => {
      try {
        const conversationId = filename.replace('.jsonl', '');
        const filePath = path.join(projectDir, filename);

        // Read file metadata for date
        const stats = fs.statSync(filePath);
        const date = stats.mtime.toISOString().split('T')[0];

        // Process conversation
        const messages = processConversationFile(filePath);

        // Generate descriptive filename
        const preview = messages.length > 0 && messages[0].content
          ? messages[0].content.substring(0, 30)
            .replace(/[^a-zA-Z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
          : 'conversation';

        const paddedIndex = String(index + 1).padStart(3, '0');
        const outputFilename = `${paddedIndex}-${date}-${preview}.json`;

        // Add to archive
        archive.append(JSON.stringify(messages, null, 2), { name: outputFilename });
        processedCount++;
      } catch (error) {
        errors.push({
          file: filename,
          error: error.message
        });
      }
    });

    // Add metadata file
    const metadata = {
      project: {
        id: projectId,
        name: projectName,
        path: projectDir
      },
      backup: {
        date: new Date().toISOString(),
        conversationCount: processedCount,
        totalConversations: conversationFiles.length,
        errors: errors.length
      }
    };
    archive.append(JSON.stringify(metadata, null, 2), { name: 'backup-metadata.json' });

    // Finalize archive
    archive.finalize();

    // Wait for output stream to finish
    output.on('close', () => {
      const fileSizeInBytes = archive.pointer();
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

      res.json({
        success: true,
        savedPath: savePath,
        conversationCount: processedCount,
        totalSize: `${fileSizeInMB} MB`,
        errors: errors
      });
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to backup project: ' + error.message });
  }
});

app.listen(PORT, () => {
  const claudeDir = getClaudeDir();
  console.log(`\n🚀 Claude Conversation Viewer running at http://localhost:${PORT}`);
  console.log(`📁 Claude directory: ${claudeDir}`);
  console.log(`💻 Platform: ${os.platform()}\n`);
});
