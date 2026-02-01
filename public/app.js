let currentProject = null;
let currentConversation = null;
let allProjects = [];
let allConversations = [];
let currentMessages = [];
let isExpanded = false;
let isSearchOpen = false;
let isFiltersOpen = true; // Open by default
let currentSearchResults = [];
let currentSearchIndex = 0;
let selectedMessages = new Set();
let messageFilters = {
  user: true,
  claude: true,
  thinking: true,
  tool_use: false,
  tool_result: false
};
let openedBackups = []; // Store opened backup conversations
let currentViewMode = 'project'; // 'project' or 'backups'

// Load projects on page load
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  initResize();
  loadThemePreference();
  initScrollToBottomButton();
});

// About modal functions
function toggleAbout() {
  const modal = document.getElementById('aboutModal');
  if (modal.style.display === 'none' || !modal.style.display) {
    modal.style.display = 'flex';
  } else {
    modal.style.display = 'none';
  }
}

function closeAboutIfClickedOutside(event) {
  const modalContent = event.target.closest('.modal-content');
  if (!modalContent) {
    toggleAbout();
  }
}

function openExternal(url) {
  // Check if running in Electron
  if (typeof require !== 'undefined') {
    const { shell } = require('electron');
    shell.openExternal(url);
  } else {
    // Fallback for web browser
    window.open(url, '_blank');
  }
}

async function loadProjects() {
  const projectList = document.getElementById('projectList');

  try {
    const response = await fetch('/api/projects');
    const projects = await response.json();
    allProjects = projects;

    // Build dropdown with Project and Open Downloaded Conversations sections
    let html = '';

    // Projects section
    html += '<div class="dropdown-section-header">Projects</div>';
    if (projects.length === 0) {
      html += '<div class="project-item" style="text-align: center; color: #86868b;">No projects found</div>';
    } else {
      html += projects.map(project => `
        <div class="project-item" data-project-id="${project.id}" data-project-name="${escapeHtml(project.name)}" onclick="selectProjectFromList('${project.id}', this.dataset.projectName)">
          <div class="project-item-name">${escapeHtml(project.name)}</div>
          <div class="project-item-path">${escapeHtml(project.path)}</div>
        </div>
      `).join('');
    }

    // Open Downloaded Conversations section
    html += '<div class="dropdown-section-header">Open Downloaded Conversations</div>';
    html += '<div class="project-item" data-view-mode="backups" onclick="switchToBackupsView()" style="color: #007aff; cursor: pointer;">';
    html += '<div class="project-item-name">📂 View Opened Conversations</div>';
    html += `<div class="project-item-path">${openedBackups.length} file${openedBackups.length !== 1 ? 's' : ''} loaded</div>`;
    html += '</div>';

    projectList.innerHTML = html;
  } catch (error) {
    projectList.innerHTML = '<div class="project-item" style="text-align: center; color: #ff3b30;">Failed to load projects</div>';
    console.error('Error loading projects:', error);
  }
}

function toggleProjectSelector() {
  const dropdown = document.getElementById('projectSelectorDropdown');
  const button = document.getElementById('projectSelectorButton');
  const isOpen = dropdown.style.display === 'block';

  if (isOpen) {
    dropdown.style.display = 'none';
    button.classList.remove('active');
  } else {
    dropdown.style.display = 'block';
    button.classList.add('active');
  }
}

function selectProjectFromList(projectId, projectName) {
  // Close dropdown
  document.getElementById('projectSelectorDropdown').style.display = 'none';
  document.getElementById('projectSelectorButton').classList.remove('active');

  // Update selected project display
  document.getElementById('currentProjectName').textContent = projectName;

  // Mark as active
  document.querySelectorAll('.project-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-project-id="${projectId}"]`).classList.add('active');

  // Set view mode to project
  currentViewMode = 'project';

  // Load project
  selectProject(projectId, projectName);
}

function switchToBackupsView() {
  // Close dropdown
  document.getElementById('projectSelectorDropdown').style.display = 'none';
  document.getElementById('projectSelectorButton').classList.remove('active');

  // Update selected project display
  document.getElementById('currentProjectName').textContent = 'Open Downloaded Conversations';

  // Mark as active
  document.querySelectorAll('.project-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector('[data-view-mode="backups"]').classList.add('active');

  // Set view mode to backups
  currentViewMode = 'backups';
  currentProject = null;
  currentConversation = null;

  // Update UI
  document.getElementById('conversationMeta').textContent = '';
  document.getElementById('messagesList').innerHTML = '<div class="empty-state"><p>Select a conversation to view messages</p></div>';

  // Load backups list
  loadBackupsList();
}

// Close project selector when clicking outside
document.addEventListener('click', (e) => {
  const container = document.querySelector('.project-selector-container');
  const dropdown = document.getElementById('projectSelectorDropdown');
  const button = document.getElementById('projectSelectorButton');

  if (container && !container.contains(e.target) && dropdown && dropdown.style.display === 'block') {
    dropdown.style.display = 'none';
    button.classList.remove('active');
  }
});

async function selectProject(projectId, projectName) {
  currentProject = projectId;
  currentConversation = null;

  // Update UI
  document.getElementById('conversationMeta').textContent = '';
  document.getElementById('messagesList').innerHTML = '<div class="empty-state"><p>Select a conversation to view messages</p></div>';

  // Load conversations
  await loadConversations(projectId);
}

async function loadConversations(projectId) {
  const conversationsList = document.getElementById('conversationsList');
  conversationsList.innerHTML = '<div class="loading">Loading conversations...</div>';

  try {
    const response = await fetch(`/api/projects/${projectId}/conversations`);
    const conversations = await response.json();
    allConversations = conversations;

    if (conversations.length === 0) {
      conversationsList.innerHTML = '<div class="empty-state"><p>No conversations found</p></div>';
      return;
    }

    conversationsList.innerHTML = conversations.map(conv => {
      const date = new Date(conv.lastModified);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

      return `
        <div class="conversation-item-wrapper">
          <div class="conversation-item" data-conversation-id="${conv.id}"
               onclick="selectConversation('${projectId}', '${conv.id}')">
            <div class="conversation-date">${dateStr}</div>
            <div class="conversation-meta">
              <span>${conv.messageCount} messages</span>
            </div>
          </div>
          <button class="export-conversation-btn" onclick="event.stopPropagation(); exportConversation('${projectId}', '${conv.id}')" title="Download conversation">
            ⬇️
          </button>
        </div>
      `;
    }).join('');
  } catch (error) {
    conversationsList.innerHTML = '<div class="error">Failed to load conversations</div>';
    console.error('Error loading conversations:', error);
  }
}

function loadBackupsList() {
  const conversationsList = document.getElementById('conversationsList');

  if (openedBackups.length === 0) {
    conversationsList.innerHTML = '<div class="empty-state"><p>No conversations loaded. Click "Open" to load conversation files.</p></div>';
    return;
  }

  conversationsList.innerHTML = openedBackups.map(backup => {
    const date = new Date(backup.lastModified);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

    return `
      <div class="conversation-item-wrapper">
        <div class="conversation-item" data-backup-id="${backup.id}"
             onclick="selectBackupConversation('${backup.id}')">
          <div class="conversation-name">${escapeHtml(backup.name)}</div>
          <div class="conversation-date">${dateStr}</div>
          <div class="conversation-meta">
            <span>${backup.messageCount} messages</span>
          </div>
        </div>
        <button class="export-conversation-btn" onclick="event.stopPropagation(); removeBackup('${backup.id}')" title="Remove from list">
          ✕
        </button>
      </div>
    `;
  }).join('');
}

function selectBackupConversation(backupId) {
  const backup = openedBackups.find(b => b.id === backupId);
  if (!backup) return;

  currentConversation = backupId;
  currentMessages = backup.messages;

  // Update UI - mark as active
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.remove('active');
  });
  const selectedItem = document.querySelector(`[data-backup-id="${backupId}"]`);
  if (selectedItem) {
    selectedItem.classList.add('active');
  }

  // Update meta info with filters
  document.getElementById('conversationMeta').innerHTML = `
    <div class="message-filters" id="messageFilters">
      <span class="filter-label">Filter:</span>
      <label class="filter-checkbox">
        <input type="checkbox" id="filter-user" ${messageFilters.user ? 'checked' : ''} onchange="toggleFilter('user')">
        <span>User</span>
      </label>
      <label class="filter-checkbox">
        <input type="checkbox" id="filter-claude" ${messageFilters.claude ? 'checked' : ''} onchange="toggleFilter('claude')">
        <span>Claude</span>
      </label>
      <label class="filter-checkbox">
        <input type="checkbox" id="filter-thinking" ${messageFilters.thinking ? 'checked' : ''} onchange="toggleFilter('thinking')">
        <span>Thinking</span>
      </label>
      <label class="filter-checkbox">
        <input type="checkbox" id="filter-tool_use" ${messageFilters.tool_use ? 'checked' : ''} onchange="toggleFilter('tool_use')">
        <span>Tool Use</span>
      </label>
      <label class="filter-checkbox">
        <input type="checkbox" id="filter-tool_result" ${messageFilters.tool_result ? 'checked' : ''} onchange="toggleFilter('tool_result')">
        <span>Tool Results</span>
      </label>
    </div>
  `;

  displayMessages(backup.messages);

  // Clear and close search
  document.getElementById('searchInput').value = '';
  document.getElementById('clearSearch').style.display = 'none';
  document.getElementById('searchResults').textContent = '';
  document.getElementById('searchNavigation').style.display = 'none';
  document.getElementById('searchContainer').style.display = 'none';
  document.getElementById('searchToggle').classList.remove('active');
  currentSearchResults = [];
  currentSearchIndex = 0;
  isSearchOpen = false;

  // Clear selection
  selectedMessages.clear();
  updateBulkActionsToolbar();

  // Keep filters visible by default
  if (!isFiltersOpen) {
    document.getElementById('messageFilters').classList.add('hidden');
  }
}

function removeBackup(backupId) {
  if (!confirm('Remove this conversation from the list?')) {
    return;
  }

  // Remove from array
  openedBackups = openedBackups.filter(b => b.id !== backupId);

  // Reload backups list
  loadBackupsList();

  // Update project dropdown count
  loadProjects();

  // Clear messages if this was the current conversation
  if (currentConversation === backupId) {
    currentConversation = null;
    currentMessages = [];
    document.getElementById('conversationMeta').textContent = '';
    document.getElementById('messagesList').innerHTML = '<div class="empty-state"><p>Select a conversation to view messages</p></div>';
  }
}

async function selectConversation(projectId, conversationId, messageTimestamp = null) {
  currentConversation = conversationId;

  // Update UI
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.remove('active');
  });
  const selectedItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
  if (selectedItem) {
    selectedItem.classList.add('active');
  }

  // Load messages
  await loadMessages(projectId, conversationId, messageTimestamp);
}

async function loadMessages(projectId, conversationId, messageTimestamp = null) {
  const messagesList = document.getElementById('messagesList');
  messagesList.innerHTML = '<div class="loading">Loading messages...</div>';

  try {
    const response = await fetch(`/api/conversations/${projectId}/${conversationId}`);
    const messages = await response.json();
    currentMessages = messages;

    if (messages.length === 0) {
      messagesList.innerHTML = '<div class="empty-state"><p>No messages in this conversation</p></div>';
      return;
    }

    // Update meta info with filters (visible by default)
    const firstMsg = messages[0];
    document.getElementById('conversationMeta').innerHTML = `
      <div class="message-filters" id="messageFilters">
        <span class="filter-label">Filter:</span>
        <label class="filter-checkbox">
          <input type="checkbox" id="filter-user" ${messageFilters.user ? 'checked' : ''} onchange="toggleFilter('user')">
          <span>User</span>
        </label>
        <label class="filter-checkbox">
          <input type="checkbox" id="filter-claude" ${messageFilters.claude ? 'checked' : ''} onchange="toggleFilter('claude')">
          <span>Claude</span>
        </label>
        <label class="filter-checkbox">
          <input type="checkbox" id="filter-thinking" ${messageFilters.thinking ? 'checked' : ''} onchange="toggleFilter('thinking')">
          <span>Thinking</span>
        </label>
        <label class="filter-checkbox">
          <input type="checkbox" id="filter-tool_use" ${messageFilters.tool_use ? 'checked' : ''} onchange="toggleFilter('tool_use')">
          <span>Tool Use</span>
        </label>
        <label class="filter-checkbox">
          <input type="checkbox" id="filter-tool_result" ${messageFilters.tool_result ? 'checked' : ''} onchange="toggleFilter('tool_result')">
          <span>Tool Results</span>
        </label>
      </div>
    `;

    displayMessages(messages);

    // Scroll to specific message if timestamp provided
    if (messageTimestamp) {
      setTimeout(() => {
        scrollToMessageByTimestamp(messageTimestamp);
      }, 100);
    }

    // Clear and close search when loading new conversation
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearch').style.display = 'none';
    document.getElementById('searchResults').textContent = '';
    document.getElementById('searchNavigation').style.display = 'none';
    document.getElementById('searchContainer').style.display = 'none';
    document.getElementById('searchToggle').classList.remove('active');
    currentSearchResults = [];
    currentSearchIndex = 0;
    isSearchOpen = false;

    // Clear selection when loading new conversation
    selectedMessages.clear();
    updateBulkActionsToolbar();

    // Keep filters visible by default
    if (!isFiltersOpen) {
      document.getElementById('messageFilters').classList.add('hidden');
    }
  } catch (error) {
    messagesList.innerHTML = '<div class="error">Failed to load messages</div>';
    console.error('Error loading messages:', error);
  }
}

function displayMessages(messages, searchTerm = null) {
  const messagesList = document.getElementById('messagesList');

  // Filter messages: exclude meta messages and apply type filters (default to true if type not in filters)
  const filteredMessages = messages.filter(msg => {
    if (msg.isMeta) return false;
    // If the message type is not in our filters, show it by default
    return messageFilters.hasOwnProperty(msg.type) ? messageFilters[msg.type] : true;
  });

  if (filteredMessages.length === 0) {
    messagesList.innerHTML = '<div class="empty-state"><p>No messages to display with current filters</p></div>';
    return;
  }

  messagesList.innerHTML = filteredMessages
    .map((msg, index) => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      let content = escapeHtml(msg.content || '');

      // Highlight search term if present
      if (searchTerm && searchTerm.trim()) {
        content = highlightText(content, searchTerm);
      }

      // Build conversation header if this is a cross-conversation search result
      let conversationHeader = '';
      if (msg.conversationId) {
        const dateStr = new Date(msg.conversationDate).toLocaleString();
        const preview = msg.conversationPreview ? escapeHtml(msg.conversationPreview) : '';
        conversationHeader = `
          <div class="search-result-conversation" onclick="selectConversation('${msg.projectId}', '${msg.conversationId}', '${msg.timestamp}'); event.stopPropagation();">
            <div class="conversation-datetime">📅 ${dateStr}</div>
            ${preview ? `<div class="conversation-header-preview">${preview}</div>` : ''}
          </div>
        `;
      }

      const isSelected = selectedMessages.has(index);
      const selectedClass = isSelected ? 'selected' : '';

      return `
        <div class="message ${msg.type} ${selectedClass} has-checkbox" data-conversation-id="${msg.conversationId || ''}" data-message-index="${index}" data-timestamp="${msg.timestamp}">
          <input type="checkbox" class="message-checkbox" ${isSelected ? 'checked' : ''} onchange="toggleMessageSelection(${index})" />
          ${conversationHeader}
          <div class="message-header">
            <span class="message-role">${msg.type.toUpperCase()}</span>
            <span class="message-timestamp">${timestamp}</span>
          </div>
          <div class="message-content">${content}</div>
          <button class="copy-button" onclick="copyMessage(${index}); event.stopPropagation();" title="Copy message">📋 Copy</button>
        </div>
      `;
    })
    .join('');

  // Scroll to top
  messagesList.scrollTop = 0;
}

function highlightText(text, searchTerm) {
  if (!searchTerm) return text;

  const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
  return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function scrollToMessageByTimestamp(timestamp) {
  const messageElement = document.querySelector(`[data-timestamp="${timestamp}"]`);
  if (messageElement) {
    // Scroll to the message
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Add temporary highlight
    messageElement.classList.add('search-current');
    setTimeout(() => {
      messageElement.classList.remove('search-current');
    }, 3000);
  }
}

function toggleFilter(type) {
  messageFilters[type] = !messageFilters[type];

  // Re-apply current search or reload messages
  const searchInput = document.getElementById('searchInput');
  if (searchInput.value.trim()) {
    handleSearch();
  } else if (currentMessages.length > 0) {
    displayMessages(currentMessages);
  }
}

function toggleExpand() {
  isExpanded = !isExpanded;
  const conversationsPanel = document.getElementById('conversationsPanel');
  const mainContent = document.querySelector('.main-content');
  const container = document.querySelector('.container');
  const resizeHandle = document.getElementById('resizeHandle');
  const expandText = document.getElementById('expandText');

  if (isExpanded) {
    conversationsPanel.style.display = 'none';
    resizeHandle.style.display = 'none';
    mainContent.classList.add('fullscreen');
    container.classList.add('fullscreen-mode');
    expandText.textContent = 'Collapse';
    document.querySelector('.expand-button').title = 'Exit fullscreen';
  } else {
    conversationsPanel.style.display = 'flex';
    resizeHandle.style.display = 'block';
    mainContent.classList.remove('fullscreen');
    container.classList.remove('fullscreen-mode');
    expandText.textContent = 'Expand';
    document.querySelector('.expand-button').title = 'Toggle fullscreen';
  }
}

function initResize() {
  const resizeHandle = document.getElementById('resizeHandle');
  const conversationsPanel = document.getElementById('conversationsPanel');
  const mainContent = document.querySelector('.main-content');
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = conversationsPanel.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const delta = e.clientX - startX;
    const newWidth = Math.max(200, Math.min(800, startWidth + delta));

    mainContent.style.gridTemplateColumns = `${newWidth}px auto 1fr`;
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

async function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearButton = document.getElementById('clearSearch');
  const searchResults = document.getElementById('searchResults');
  const searchTerm = searchInput.value.trim();
  const scope = document.querySelector('input[name="searchScope"]:checked').value;

  // Show/hide clear button
  clearButton.style.display = searchTerm ? 'block' : 'none';

  if (!searchTerm) {
    searchResults.textContent = '';
    if (currentMessages.length > 0) {
      displayMessages(currentMessages);
    }
    return;
  }

  if (scope === 'conversation') {
    await searchInConversation(searchTerm);
  } else {
    await searchInProject(searchTerm);
  }
}

async function searchInConversation(searchTerm) {
  const searchResults = document.getElementById('searchResults');
  const searchNavigation = document.getElementById('searchNavigation');

  if (!currentMessages.length) {
    searchResults.textContent = 'No conversation loaded';
    searchNavigation.style.display = 'none';
    return;
  }

  const lowerSearchTerm = searchTerm.toLowerCase();
  const matches = currentMessages.filter(msg =>
    !msg.isMeta &&
    messageFilters[msg.type] &&
    msg.content &&
    msg.content.toLowerCase().includes(lowerSearchTerm)
  );

  currentSearchResults = matches;
  currentSearchIndex = 0;

  searchResults.textContent = matches.length > 0
    ? `Found ${matches.length} result${matches.length !== 1 ? 's' : ''} in this conversation`
    : 'No results found in this conversation';

  // Show/hide navigation
  if (matches.length > 1) {
    searchNavigation.style.display = 'flex';
    updateSearchPosition();
  } else {
    searchNavigation.style.display = 'none';
  }

  displayMessages(matches.length > 0 ? matches : currentMessages, searchTerm);

  // Scroll to first result if any
  if (matches.length > 0) {
    scrollToSearchResult(0);
  }
}

async function searchInProject(searchTerm) {
  const searchResults = document.getElementById('searchResults');
  const searchNavigation = document.getElementById('searchNavigation');
  const messagesList = document.getElementById('messagesList');

  // Hide navigation for project search
  searchNavigation.style.display = 'none';
  currentSearchResults = [];

  if (!currentProject || !allConversations.length) {
    searchResults.textContent = 'No project loaded';
    return;
  }

  messagesList.innerHTML = '<div class="loading">Searching all conversations...</div>';
  searchResults.textContent = 'Searching...';

  const lowerSearchTerm = searchTerm.toLowerCase();
  let allMatches = [];
  let totalSearched = 0;

  for (const conv of allConversations) {
    try {
      const response = await fetch(`/api/conversations/${currentProject}/${conv.id}`);
      const messages = await response.json();
      totalSearched++;

      const matches = messages.filter(msg =>
        !msg.isMeta &&
        messageFilters[msg.type] &&
        msg.content &&
        msg.content.toLowerCase().includes(lowerSearchTerm)
      );

      // Add conversation info to each matching message
      matches.forEach(msg => {
        msg.projectId = currentProject;
        msg.conversationId = conv.id;
        msg.conversationDate = conv.lastModified;
        msg.conversationPreview = conv.preview;
      });

      allMatches = allMatches.concat(matches);
    } catch (error) {
      console.error(`Error searching conversation ${conv.id}:`, error);
    }
  }

  searchResults.textContent = allMatches.length > 0
    ? `Found ${allMatches.length} result${allMatches.length !== 1 ? 's' : ''} across ${totalSearched} conversation${totalSearched !== 1 ? 's' : ''}`
    : `No results found in ${totalSearched} conversation${totalSearched !== 1 ? 's' : ''}`;

  if (allMatches.length > 0) {
    // Sort by date (most recent first)
    allMatches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    displayMessages(allMatches, searchTerm);
  } else {
    messagesList.innerHTML = '<div class="empty-state"><p>No messages found matching your search</p></div>';
  }
}

function clearSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearButton = document.getElementById('clearSearch');
  const searchResults = document.getElementById('searchResults');
  const searchNavigation = document.getElementById('searchNavigation');

  searchInput.value = '';
  clearButton.style.display = 'none';
  searchResults.textContent = '';
  searchNavigation.style.display = 'none';
  currentSearchResults = [];
  currentSearchIndex = 0;

  if (currentMessages.length > 0) {
    displayMessages(currentMessages);
  }
}

function navigateSearchResult(direction) {
  if (currentSearchResults.length === 0) return;

  currentSearchIndex += direction;

  // Wrap around
  if (currentSearchIndex < 0) {
    currentSearchIndex = currentSearchResults.length - 1;
  } else if (currentSearchIndex >= currentSearchResults.length) {
    currentSearchIndex = 0;
  }

  updateSearchPosition();
  scrollToSearchResult(currentSearchIndex);
}

function updateSearchPosition() {
  const searchPosition = document.getElementById('searchPosition');
  if (currentSearchResults.length > 0) {
    searchPosition.textContent = `${currentSearchIndex + 1}/${currentSearchResults.length}`;
  }
}

function scrollToSearchResult(index) {
  const messagesList = document.getElementById('messagesList');
  const messages = messagesList.querySelectorAll('.message');

  if (messages[index]) {
    // Remove previous highlight
    messages.forEach(msg => msg.classList.remove('search-current'));

    // Add current highlight
    messages[index].classList.add('search-current');

    // Scroll to message with smooth behavior
    messages[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function toggleSearch() {
  isSearchOpen = !isSearchOpen;
  const searchContainer = document.getElementById('searchContainer');
  const searchToggle = document.getElementById('searchToggle');

  if (isSearchOpen) {
    searchContainer.style.display = 'block';
    searchToggle.classList.add('active');
    // Focus on search input
    setTimeout(() => {
      const searchInput = document.getElementById('searchInput');
      searchInput.focus();
      // Add keyboard listener for navigation
      searchInput.addEventListener('keydown', handleSearchKeyboard);
    }, 100);
  } else {
    searchContainer.style.display = 'none';
    searchToggle.classList.remove('active');
    // Remove keyboard listener
    const searchInput = document.getElementById('searchInput');
    searchInput.removeEventListener('keydown', handleSearchKeyboard);
    // Clear search when closing
    clearSearch();
  }
}

function handleSearchKeyboard(e) {
  // Navigate with Enter (next) and Shift+Enter (previous)
  if (e.key === 'Enter' && currentSearchResults.length > 1) {
    e.preventDefault();
    navigateSearchResult(e.shiftKey ? -1 : 1);
  }
  // Close search with Escape
  else if (e.key === 'Escape') {
    toggleSearch();
  }
}

function toggleFilters() {
  const messageFiltersEl = document.getElementById('messageFilters');
  const filterToggle = document.getElementById('filterToggle');

  if (!messageFiltersEl) return;

  isFiltersOpen = !isFiltersOpen;

  if (isFiltersOpen) {
    messageFiltersEl.classList.remove('hidden');
    filterToggle.classList.add('active');
  } else {
    messageFiltersEl.classList.add('hidden');
    filterToggle.classList.remove('active');
  }
}

function toggleTheme() {
  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');

  if (body.classList.contains('light-theme')) {
    body.classList.remove('light-theme');
    localStorage.setItem('theme', 'dark');
    themeToggle.title = 'Switch to light theme';
  } else {
    body.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
    themeToggle.title = 'Switch to dark theme';
  }
}

function loadThemePreference() {
  const savedTheme = localStorage.getItem('theme');
  const themeToggle = document.getElementById('themeToggle');

  // Default to dark theme if no preference saved
  if (!savedTheme) {
    localStorage.setItem('theme', 'dark');
  }

  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    if (themeToggle) {
      themeToggle.title = 'Switch to dark theme';
    }
  } else {
    if (themeToggle) {
      themeToggle.title = 'Switch to light theme';
    }
  }
}

function refreshMessages() {
  if (!currentProject || !currentConversation) {
    alert('No conversation loaded to refresh');
    return;
  }
  loadMessages(currentProject, currentConversation);
}

function openSavedConversation() {
  const fileInput = document.getElementById('conversationFileInput');
  fileInput.click();
}

async function handleConversationFileSelect(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  let successCount = 0;
  let failCount = 0;

  // Process each file
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      const text = await file.text();

      // Parse the conversation - handle both JSON and JSONL
      let conversation;
      if (file.name.endsWith('.jsonl')) {
        // Parse JSONL format (one JSON object per line)
        const lines = text.trim().split('\n').filter(line => line.trim());
        conversation = lines.map(line => JSON.parse(line));
      } else {
        // Parse regular JSON format
        conversation = JSON.parse(text);
      }

      // Validate the file structure
      if (!Array.isArray(conversation) || conversation.length === 0) {
        console.error(`Invalid conversation file format: ${file.name}`);
        failCount++;
        continue;
      }

      // Process messages to ensure they have the correct structure
      conversation = conversation.map(msg => {
        // Ensure the message has required fields
        if (!msg.type) {
          msg.type = 'claude'; // Default type
        }
        if (!msg.timestamp) {
          msg.timestamp = new Date().toISOString();
        }
        if (msg.content === undefined || msg.content === null) {
          msg.content = '';
        }
        // Mark meta messages
        if (!msg.hasOwnProperty('isMeta')) {
          msg.isMeta = false;
        }
        return msg;
      });

      // Extract first message preview for display
      const firstUserMsg = conversation.find(msg => msg.type === 'user' && msg.content);
      const preview = firstUserMsg?.content ? firstUserMsg.content.substring(0, 50) + '...' : 'No preview';

      // Get file timestamp (use first message timestamp or file last modified)
      const firstMsg = conversation[0];
      const timestamp = firstMsg.timestamp ? new Date(firstMsg.timestamp) : new Date(file.lastModified);

      // Add to opened backups with unique ID
      const backupId = 'backup_' + Date.now() + '_' + i;
      openedBackups.push({
        id: backupId,
        name: file.name,
        messages: conversation,
        messageCount: conversation.length,
        lastModified: timestamp,
        preview: preview
      });

      successCount++;
    } catch (error) {
      console.error(`Error loading conversation file ${file.name}:`, error);
      failCount++;
    }
  }

  // Show feedback
  if (successCount > 0) {
    // Switch to backups view automatically
    switchToBackupsView();

    // Update project dropdown count
    loadProjects();

    // Auto-select the first loaded conversation
    if (openedBackups.length > 0) {
      const firstBackup = openedBackups[openedBackups.length - 1];
      setTimeout(() => selectBackupConversation(firstBackup.id), 100);
    }

    if (failCount > 0) {
      alert(`Loaded ${successCount} conversation${successCount !== 1 ? 's' : ''} successfully. ${failCount} file${failCount !== 1 ? 's' : ''} failed to load.`);
    }
  } else {
    alert('Failed to load any conversation files. Please check the file format.');
  }

  // Reset file input
  event.target.value = '';
}

function toggleMessageSelection(index) {
  if (selectedMessages.has(index)) {
    selectedMessages.delete(index);
  } else {
    selectedMessages.add(index);
  }

  // Update UI
  const messageEl = document.querySelector(`[data-message-index="${index}"]`);
  if (messageEl) {
    if (selectedMessages.has(index)) {
      messageEl.classList.add('selected');
    } else {
      messageEl.classList.remove('selected');
    }
  }

  updateBulkActionsToolbar();
}

function updateBulkActionsToolbar() {
  const toolbar = document.getElementById('bulkActionsToolbar');
  const countEl = document.getElementById('selectedCount');

  if (selectedMessages.size > 0) {
    toolbar.classList.add('visible');
    countEl.textContent = selectedMessages.size;
  } else {
    toolbar.classList.remove('visible');
  }
}

function clearSelection() {
  selectedMessages.clear();
  document.querySelectorAll('.message').forEach(msg => {
    msg.classList.remove('selected');
    const checkbox = msg.querySelector('.message-checkbox');
    if (checkbox) checkbox.checked = false;
  });
  updateBulkActionsToolbar();
}

async function copyMessage(index) {
  const filteredMessages = currentMessages.filter(msg => !msg.isMeta && messageFilters[msg.type]);
  const message = filteredMessages[index];

  if (!message) return;

  const text = formatMessageForCopy([message]);

  try {
    await navigator.clipboard.writeText(text);

    // Show feedback
    const copyBtn = document.querySelector(`[data-message-index="${index}"] .copy-button`);
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Copied';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('copied');
      }, 2000);
    }
  } catch (err) {
    console.error('Failed to copy:', err);
    alert('Failed to copy to clipboard');
  }
}

async function copySelectedMessages() {
  const filteredMessages = currentMessages.filter(msg => !msg.isMeta && messageFilters[msg.type]);
  const messagesToCopy = Array.from(selectedMessages)
    .sort((a, b) => a - b)
    .map(index => filteredMessages[index])
    .filter(Boolean);

  if (messagesToCopy.length === 0) return;

  const text = formatMessageForCopy(messagesToCopy);

  try {
    await navigator.clipboard.writeText(text);

    // Show feedback
    const copyBtn = document.querySelector('.bulk-actions-toolbar .bulk-action-button');
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Copied';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    }

    // Clear selection after copying
    setTimeout(() => {
      clearSelection();
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    alert('Failed to copy to clipboard');
  }
}

function formatMessageForCopy(messages) {
  return messages.map(msg => {
    const content = msg.content || '';
    return content;
  }).join('\n\n');
}

function scrollToLatest() {
  const messagesList = document.getElementById('messagesList');
  if (messagesList) {
    // Scroll to the very bottom
    messagesList.scrollTop = messagesList.scrollHeight;
  }
}

function initScrollToBottomButton() {
  const messagesList = document.getElementById('messagesList');
  const scrollButton = document.getElementById('scrollToBottomButton');

  if (!messagesList || !scrollButton) return;

  messagesList.addEventListener('scroll', () => {
    // Show button if not at bottom
    const isAtBottom = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight < 100;
    if (isAtBottom) {
      scrollButton.classList.remove('visible');
    } else {
      scrollButton.classList.add('visible');
    }
  });
}

async function exportConversation(projectId, conversationId) {
  try {
    // Check if running in Electron
    const isElectron = typeof window !== 'undefined' && window.require;

    if (!isElectron) {
      alert('Export feature requires the desktop app');
      return;
    }

    // Create default filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const defaultFilename = `claude-conversation-${conversationId}-${timestamp}.json`;

    // Use Electron's Save As dialog
    const { ipcRenderer } = window.require('electron');
    const savePath = await ipcRenderer.invoke('save-conversation', defaultFilename);

    if (!savePath) {
      return; // User cancelled
    }

    // Call API to export
    const response = await fetch('/api/export-conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectId,
        conversationId,
        savePath
      })
    });

    const result = await response.json();

    if (result.success) {
      alert(`Conversation saved successfully!\n\nSaved to: ${result.savedPath}`);
    } else {
      alert(`Failed to export: ${result.error}`);
    }
  } catch (error) {
    console.error('Export error:', error);
    alert('Failed to export conversation: ' + error.message);
  }
}

// Backup entire project
async function backupProject() {
  if (!currentProject || currentViewMode !== 'project') {
    alert('Please select a project to backup');
    return;
  }

  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && window.require;

  if (!isElectron) {
    alert('Backup feature requires the desktop app');
    return;
  }

  try {
    // Get project name
    const projectName = document.getElementById('currentProjectName').textContent;

    // Show save dialog
    const { ipcRenderer } = window.require('electron');
    const savePath = await ipcRenderer.invoke('save-project-backup', projectName);

    if (!savePath) {
      return; // User cancelled
    }

    // Disable button and show progress
    const backupBtn = document.getElementById('backupProject');
    backupBtn.disabled = true;
    backupBtn.textContent = 'Backing up...';

    // Show progress modal
    showBackupProgressModal(allConversations.length);

    // Call backup API
    const response = await fetch('/api/backup-project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectId: currentProject,
        projectName: projectName,
        savePath: savePath
      })
    });

    const result = await response.json();

    // Hide progress modal
    hideBackupProgressModal();

    // Re-enable button
    backupBtn.disabled = false;
    backupBtn.textContent = 'Backup Project';

    if (result.success) {
      let message = `Project backup completed!\n\n`;
      message += `Saved to: ${result.savedPath}\n`;
      message += `Conversations: ${result.conversationCount}\n`;
      message += `Size: ${result.totalSize}`;

      if (result.errors && result.errors.length > 0) {
        message += `\n\nWarning: ${result.errors.length} conversation(s) failed to backup`;
      }

      alert(message);
    } else {
      alert(`Failed to backup project: ${result.error}`);
    }
  } catch (error) {
    console.error('Backup error:', error);
    alert('Failed to backup project: ' + error.message);

    // Re-enable button on error
    const backupBtn = document.getElementById('backupProject');
    backupBtn.disabled = false;
    backupBtn.textContent = 'Backup Project';
    hideBackupProgressModal();
  }
}

// Show backup progress modal
function showBackupProgressModal(totalConversations) {
  const modal = document.getElementById('backupProgressModal');
  const progressText = document.getElementById('backupProgressText');

  progressText.textContent = `Processing ${totalConversations} conversation${totalConversations !== 1 ? 's' : ''}...`;
  modal.style.display = 'flex';

  // Set progress bar to indeterminate (animated)
  const progressBar = document.getElementById('backupProgressBar');
  progressBar.style.width = '100%';
}

// Hide backup progress modal
function hideBackupProgressModal() {
  const modal = document.getElementById('backupProgressModal');
  modal.style.display = 'none';

  // Reset progress bar
  const progressBar = document.getElementById('backupProgressBar');
  progressBar.style.width = '0%';
}
