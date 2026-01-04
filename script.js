// ========================================
// Prompt Saver - Web Companion
// v2.0 - Simplified Connection Method
// ========================================

// State
const state = {
    connected: false,
    sessionId: null,
    sessionStartTime: null,
    prompts: [],
    categories: [],
    tags: [],
    selectedCategory: 'all',
    searchQuery: '',
    sortBy: 'date_created',
    locale: 'en',
    theme: 'light',
    translations: {},
    pollingInterval: null,
    editingPromptId: null,
    editingCategoryId: null,
    selectedRating: 3,
    peer: null,
    conn: null
};

// DOM Elements
const elements = {
    connectionScreen: document.getElementById('connection-screen'),
    mainScreen: document.getElementById('main-screen'),
    qrCodeContainer: document.getElementById('qr-code-container'),
    refreshQrBtn: document.getElementById('refresh-qr-btn'),
    connectionStatus: document.getElementById('connection-status'),
    disconnectBtn: document.getElementById('disconnect-btn'),
    sessionTimer: document.getElementById('session-timer'),
    languageSelect: document.getElementById('language-select'),
    themeToggle: document.getElementById('theme-toggle'),
    searchInput: document.getElementById('search-input'),
    categoriesList: document.getElementById('categories-list'),
    promptsGrid: document.getElementById('prompts-grid'),
    emptyState: document.getElementById('empty-state'),
    sortSelect: document.getElementById('sort-select'),
    allCount: document.getElementById('all-count'),
    modal: document.getElementById('prompt-modal'),
    modalClose: document.getElementById('modal-close'),
    modalTitle: document.getElementById('modal-title'),
    modalCategory: document.getElementById('modal-category'),
    modalRating: document.getElementById('modal-rating'),
    modalContent: document.getElementById('modal-content'),
    modalNotes: document.getElementById('modal-notes'),
    notesContent: document.getElementById('notes-content'),
    modalTags: document.getElementById('modal-tags'),
    modalCopies: document.getElementById('modal-copies'),
    modalCreated: document.getElementById('modal-created'),
    copyBtn: document.getElementById('copy-btn'),
    editPromptBtn: document.getElementById('edit-prompt-btn'),
    deletePromptBtn: document.getElementById('delete-prompt-btn'),
    addPromptBtn: document.getElementById('add-prompt-btn'),
    emptyAddBtn: document.getElementById('empty-add-btn'),
    addPromptModal: document.getElementById('add-prompt-modal'),
    addModalClose: document.getElementById('add-modal-close'),
    addModalTitle: document.getElementById('add-modal-title'),
    promptForm: document.getElementById('prompt-form'),
    promptTitle: document.getElementById('prompt-title'),
    promptContentInput: document.getElementById('prompt-content-input'),
    promptCategory: document.getElementById('prompt-category'),
    promptNotes: document.getElementById('prompt-notes'),
    promptTags: document.getElementById('prompt-tags'),
    starRating: document.getElementById('star-rating'),
    cancelPromptBtn: document.getElementById('cancel-prompt-btn'),
    savePromptBtn: document.getElementById('save-prompt-btn'),
    moreActionsBtn: document.getElementById('more-actions-btn'),
    actionsDropdown: document.getElementById('actions-dropdown'),
    exportBtn: document.getElementById('export-btn'),
    importBtn: document.getElementById('import-btn'),
    importFile: document.getElementById('import-file'),
    // Category Modal
    addCategoryBtn: document.getElementById('add-category-btn'),
    categoryModal: document.getElementById('category-modal'),
    categoryModalClose: document.getElementById('category-modal-close'),
    categoryModalTitle: document.getElementById('category-modal-title'),
    categoryName: document.getElementById('category-name'),
    categoryColor: document.getElementById('category-color'),
    cancelCategoryBtn: document.getElementById('cancel-category-btn'),
    saveCategoryBtn: document.getElementById('save-category-btn'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

// ========================================
// Initialization
// ========================================

async function init() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedLocale = localStorage.getItem('locale') || getBrowserLocale();

    setTheme(savedTheme);
    await setLocale(savedLocale);

    // Check for data in URL hash first
    // Initialize PeerJS instead of checking URL hash
    initPeer();

    generateQRCode();
    setupEventListeners();
}

// Old URL hash check removed in favor of PeerJS
function checkUrlForData() {
    // Legacy support or fallback if needed, but primarily using PeerJS now
}

function setupEventListeners() {
    elements.refreshQrBtn.addEventListener('click', initPeer);
    elements.disconnectBtn.addEventListener('click', disconnect);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.languageSelect.addEventListener('change', (e) => setLocale(e.target.value));

    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        renderPrompts();
    });
    elements.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderPrompts();
    });

    // View Modal
    elements.modalClose.addEventListener('click', closeModal);
    elements.modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
    elements.copyBtn.addEventListener('click', copyPromptContent);
    elements.editPromptBtn.addEventListener('click', editCurrentPrompt);
    elements.deletePromptBtn.addEventListener('click', deleteCurrentPrompt);

    // Add/Edit Prompt Modal
    elements.addPromptBtn.addEventListener('click', () => openAddModal());
    elements.emptyAddBtn?.addEventListener('click', () => openAddModal());
    elements.addModalClose.addEventListener('click', closeAddModal);
    elements.addPromptModal.querySelector('.modal-overlay').addEventListener('click', closeAddModal);
    elements.cancelPromptBtn.addEventListener('click', closeAddModal);
    elements.savePromptBtn.addEventListener('click', savePrompt);

    // Star Rating
    elements.starRating.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', () => {
            state.selectedRating = parseInt(star.dataset.value);
            updateStarDisplay();
        });
        star.addEventListener('mouseenter', () => highlightStars(parseInt(star.dataset.value)));
        star.addEventListener('mouseleave', () => updateStarDisplay());
    });

    // Category Modal
    elements.addCategoryBtn?.addEventListener('click', () => openCategoryModal());
    elements.categoryModalClose?.addEventListener('click', closeCategoryModal);
    elements.categoryModal?.querySelector('.modal-overlay').addEventListener('click', closeCategoryModal);
    elements.cancelCategoryBtn?.addEventListener('click', closeCategoryModal);
    elements.saveCategoryBtn?.addEventListener('click', saveCategory);

    // Export/Import
    elements.moreActionsBtn.addEventListener('click', toggleDropdown);
    elements.exportBtn.addEventListener('click', exportPrompts);
    elements.importBtn.addEventListener('click', () => elements.importFile.click());
    elements.importFile.addEventListener('change', importPrompts);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            elements.actionsDropdown.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeAddModal();
            closeCategoryModal();
        }
    });

    // Listen for hash changes (when app sends data)
    // window.addEventListener('hashchange', checkUrlForData);
}

// ========================================
// QR Code Generation
// ========================================

function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function initPeer() {
    if (state.peer) {
        state.peer.destroy();
    }

    updateConnectionStatus('waiting');
    elements.qrCodeContainer.innerHTML = `
        <div class="qr-loading">
            <div class="spinner"></div>
            <p>${state.translations.generating_qr || 'Generating QR Code...'}</p>
        </div>
    `;

    // Create a new Peer
    // We use the default PeerJS cloud server (0.peerjs.com)
    state.peer = new Peer(null, {
        debug: 2
    });

    state.peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        generateQRCode(id);
    });

    state.peer.on('connection', (conn) => {
        console.log('Incoming connection from: ' + conn.peer);
        state.conn = conn;

        updateConnectionStatus('connecting');

        conn.on('data', (data) => {
            console.log('Received data', data);
            handleConnection(data);
        });

        conn.on('open', () => {
            console.log('Connection opened');
            // Optional: Send a welcome message or ack
            conn.send({ status: 'connected' });
        });

        conn.on('close', () => {
            console.log('Connection closed');
            // Handle disconnection if needed
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
            showToast('Connection error: ' + err, 'error');
            updateConnectionStatus('error');
        });
    });

    state.peer.on('error', (err) => {
        console.error('Peer error:', err);
        showToast('Server error: ' + err.type, 'error');

        // Show error in QR container
        elements.qrCodeContainer.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 20px; color: #ef4444;">
                <p><strong>Connection Error</strong></p>
                <p style="font-size: 0.9em">${err.type}</p>
                <button onclick="initPeer()" style="margin-top: 10px; padding: 5px 10px; cursor: pointer;">Retry</button>
            </div>
        `;

        // Retry after a delay
        // setTimeout(initPeer, 3000); // Disable auto-retry to let user see error
    });

    state.peer.on('disconnected', () => {
        console.log('Peer disconnected from server');
        // state.peer.reconnect();
    });
}

function generateQRCode(peerId) {
    state.sessionId = peerId;

    // QR data now contains the Peer ID and type 'peerjs'
    const qrData = JSON.stringify({
        type: 'peerjs',
        peerId: peerId,
        timestamp: Date.now()
    });

    elements.qrCodeContainer.innerHTML = '';

    if (typeof QRCode !== 'undefined') {
        try {
            new QRCode(elements.qrCodeContainer, {
                text: qrData,
                width: 256,
                height: 256,
                colorDark: state.theme === 'dark' ? '#F1F5F9' : '#1E293B',
                colorLight: state.theme === 'dark' ? '#334155' : '#FFFFFF',
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch (error) {
            console.error('QR error:', error);
            showQRFallback();
        }
    } else {
        showQRFallback();
    }
    updateConnectionStatus('waiting');
}

function showQRFallback() {
    elements.qrCodeContainer.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <p style="margin-bottom: 8px; color: #64748B;">Session ID:</p>
            <code style="font-size: 10px; word-break: break-all;">${state.sessionId}</code>
            <p style="margin-top: 12px; color: #ef4444; font-size: 12px;">⚠️ QR Library not loaded</p>
        </div>
    `;
}

function updateConnectionStatus(status) {
    const statusEl = elements.connectionStatus;
    const indicator = statusEl.querySelector('.status-indicator');
    const text = statusEl.querySelector('span');
    indicator.className = 'status-indicator ' + status;
    const messages = {
        'waiting': state.translations.waiting_for_scan || 'Waiting for scan...',
        'connecting': state.translations.connecting || 'Connecting...',
        'connected': state.translations.connected || 'Connected!',
        'error': state.translations.connection_error || 'Connection failed'
    };
    text.textContent = messages[status] || messages.waiting;
}

// ========================================
// Connection
// ========================================

function handleConnection(data) {
    updateConnectionStatus('connecting');

    // Add connecting animation
    elements.connectionScreen.classList.add('fade-out');

    setTimeout(() => {
        state.connected = true;
        state.sessionStartTime = Date.now();

        if (data && data.prompts) {
            state.prompts = data.prompts;
            state.categories = data.categories || [];
            state.tags = data.tags || [];

            // Cache the session data
            localStorage.setItem('prompt_master_session', JSON.stringify(data));
        } else {
            loadDemoData();
        }

        // Smooth transition
        elements.connectionScreen.classList.remove('active');
        elements.connectionScreen.classList.add('hidden');
        elements.mainScreen.classList.remove('hidden');
        elements.mainScreen.classList.add('active', 'fade-in');

        // Start session duration timer
        startSessionDurationTimer();
        renderCategories();
        renderPrompts();
        populateCategorySelect();

        // Remove animation class after it completes
        setTimeout(() => {
            elements.mainScreen.classList.remove('fade-in');
        }, 500);
    }, 800);
}

// Function for app to call - receives data and displays it
window.receiveDataFromApp = function (data) {
    if (data && data.prompts) {
        handleConnection(data);
    }
};

// Demo function for testing
window.simulatePhoneScan = function () {
    loadDemoData();
    handleConnection({ prompts: state.prompts, categories: state.categories, tags: state.tags });
};

function loadDemoData() {
    state.categories = [
        { id: 'cat_general', name: 'General', icon: 'folder', color: '#6366F1' },
        { id: 'cat_articles', name: 'Articles', icon: 'article', color: '#8B5CF6' },
        { id: 'cat_video', name: 'Video', icon: 'video', color: '#EC4899' },
        { id: 'cat_images', name: 'Images', icon: 'image', color: '#10B981' },
        { id: 'cat_marketing', name: 'Marketing', icon: 'campaign', color: '#F59E0B' },
    ];
    state.tags = [
        { id: 'tag1', name: 'AI', color: '#10B981' },
        { id: 'tag2', name: 'Writing', color: '#3B82F6' },
        { id: 'tag3', name: 'Creative', color: '#EC4899' },
    ];
    state.prompts = [
        {
            id: '1', title: 'Blog Article Generator',
            content: `Write a comprehensive blog article about [TOPIC].\n\nStructure:\n- Hook: Engaging opening\n- Introduction: Set context\n- Body: 3-5 sections\n- Conclusion: Call to action\n\nTone: Professional yet conversational`,
            notes: 'Great for SEO content', categoryId: 'cat_articles', tagIds: ['tag1', 'tag2'],
            rating: 5, copyCount: 42, createdAt: '2024-01-15T10:30:00Z', lastUsedAt: '2024-01-20T14:00:00Z'
        },
        {
            id: '2', title: 'YouTube Script Template',
            content: `Create a YouTube video script for [TOPIC].\n\n🎬 HOOK (0-5 sec)\n📢 INTRO (5-30 sec)\n📚 CONTENT: Main points\n⚡ ENGAGEMENT: Like, subscribe\n🎯 CTA: Next steps`,
            notes: null, categoryId: 'cat_video', tagIds: ['tag1', 'tag3'],
            rating: 4, copyCount: 28, createdAt: '2024-01-10T09:00:00Z', lastUsedAt: '2024-01-18T16:00:00Z'
        },
        {
            id: '3', title: 'Product Description',
            content: `Write a compelling product description for [PRODUCT].\n\n✅ Headline\n✅ Key benefits\n✅ Pain points\n✅ Social proof\n✅ Call to action`,
            notes: 'For e-commerce', categoryId: 'cat_marketing', tagIds: ['tag2'],
            rating: 5, copyCount: 56, createdAt: '2024-01-05T11:00:00Z', lastUsedAt: '2024-01-19T10:00:00Z'
        }
    ];
}

function disconnect() {
    state.connected = false;
    state.sessionId = null;
    state.sessionStartTime = null;
    state.prompts = [];
    state.categories = [];

    if (state.peer) {
        state.peer.destroy();
        state.peer = null;
    }
    if (state.conn) {
        state.conn.close();
        state.conn = null;
    }

    // Clear cached session
    localStorage.removeItem('prompt_master_session');

    elements.mainScreen.classList.add('fade-out');

    setTimeout(() => {
        elements.mainScreen.classList.remove('active', 'fade-out');
        elements.mainScreen.classList.add('hidden');
        elements.connectionScreen.classList.remove('hidden', 'fade-out');
        elements.connectionScreen.classList.add('active', 'fade-in');

        initPeer();

        setTimeout(() => {
            elements.connectionScreen.classList.remove('fade-in');
        }, 500);
    }, 300);
}

// Session duration timer (counts UP from 0)
function startSessionDurationTimer() {
    const updateTimer = () => {
        if (!state.connected || !state.sessionStartTime) return;

        const elapsed = Date.now() - state.sessionStartTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);

        if (hours > 0) {
            elements.sessionTimer.textContent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            elements.sessionTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        requestAnimationFrame(updateTimer);
    };
    updateTimer();
}

// ========================================
// Rendering
// ========================================

function renderCategories() {
    const categoriesHtml = state.categories.map(cat => {
        const count = state.prompts.filter(p => p.categoryId === cat.id).length;
        return `
            <li class="category-item ${state.selectedCategory === cat.id ? 'active' : ''}" 
                onclick="selectCategory('${cat.id}')">
                <span class="category-dot" style="background: ${cat.color}"></span>
                <span>${cat.name}</span>
                <span class="count">${count}</span>
            </li>
        `;
    }).join('');

    elements.categoriesList.innerHTML = `
        <li class="category-item ${state.selectedCategory === 'all' ? 'active' : ''}" onclick="selectCategory('all')">
            <span class="category-dot" style="background: var(--color-primary)"></span>
            <span>${state.translations.all_categories || 'All Categories'}</span>
            <span class="count">${state.prompts.length}</span>
        </li>
        ${categoriesHtml}
    `;
    elements.allCount.textContent = state.prompts.length;
}

function renderPrompts() {
    let filtered = [...state.prompts];
    if (state.selectedCategory !== 'all') filtered = filtered.filter(p => p.categoryId === state.selectedCategory);
    if (state.searchQuery) filtered = filtered.filter(p => p.title.toLowerCase().includes(state.searchQuery) || p.content.toLowerCase().includes(state.searchQuery));

    filtered.sort((a, b) => {
        switch (state.sortBy) {
            case 'date_created': return new Date(b.createdAt) - new Date(a.createdAt);
            case 'last_used': return new Date(b.lastUsedAt || 0) - new Date(a.lastUsedAt || 0);
            case 'usage_count': return b.copyCount - a.copyCount;
            case 'rating': return b.rating - a.rating;
            default: return 0;
        }
    });

    if (filtered.length === 0) {
        elements.promptsGrid.classList.add('hidden');
        elements.emptyState.classList.remove('hidden');
    } else {
        elements.promptsGrid.classList.remove('hidden');
        elements.emptyState.classList.add('hidden');
        elements.promptsGrid.innerHTML = filtered.map((prompt, index) => {
            const category = state.categories.find(c => c.id === prompt.categoryId);
            const stars = '★'.repeat(prompt.rating) + '☆'.repeat(5 - prompt.rating);
            return `
                <div class="prompt-card" onclick="openPrompt('${prompt.id}')" style="animation-delay: ${index * 0.05}s">
                    <div class="prompt-card-header">
                        <span class="category-badge" style="background: ${category?.color || 'var(--color-primary)'}">${category?.name || 'General'}</span>
                        <span class="rating">${stars}</span>
                    </div>
                    <h3>${escapeHtml(prompt.title)}</h3>
                    <p class="prompt-preview">${escapeHtml(prompt.content)}</p>
                    <div class="prompt-card-footer">
                        <span>📋 ${prompt.copyCount}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function selectCategory(id) {
    state.selectedCategory = id;
    renderCategories();
    renderPrompts();
}

function populateCategorySelect() {
    elements.promptCategory.innerHTML = state.categories.map(cat =>
        `<option value="${cat.id}">${cat.name}</option>`
    ).join('');
}

// ========================================
// Category Management
// ========================================

function openCategoryModal(categoryId = null) {
    state.editingCategoryId = categoryId;

    if (categoryId) {
        const cat = state.categories.find(c => c.id === categoryId);
        if (!cat) return;
        elements.categoryModalTitle.textContent = state.translations.edit_category || 'Edit Category';
        elements.categoryName.value = cat.name;
        elements.categoryColor.value = cat.color;
    } else {
        elements.categoryModalTitle.textContent = state.translations.add_category || 'Add Category';
        elements.categoryName.value = '';
        elements.categoryColor.value = '#6366F1';
    }

    elements.categoryModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCategoryModal() {
    elements.categoryModal?.classList.add('hidden');
    document.body.style.overflow = '';
    state.editingCategoryId = null;
}

function saveCategory() {
    const name = elements.categoryName.value.trim();
    const color = elements.categoryColor.value;

    if (!name) {
        showToast(state.translations.fill_required || 'Please enter a category name', 'error');
        return;
    }

    if (state.editingCategoryId) {
        const cat = state.categories.find(c => c.id === state.editingCategoryId);
        if (cat) {
            cat.name = name;
            cat.color = color;
        }
        showToast(state.translations.category_updated || 'Category updated!', 'success');
    } else {
        const newCategory = {
            id: 'cat_' + Date.now(),
            name,
            icon: 'folder',
            color
        };
        state.categories.push(newCategory);
        showToast(state.translations.category_added || 'Category added!', 'success');
    }

    closeCategoryModal();
    renderCategories();
    populateCategorySelect();
    syncToApp();
}

// ========================================
// Add/Edit Prompt
// ========================================

function openAddModal(promptId = null) {
    state.editingPromptId = promptId;

    // Always refresh the category dropdown with latest categories
    populateCategorySelect();

    if (promptId) {
        const prompt = state.prompts.find(p => p.id === promptId);
        if (!prompt) return;
        elements.addModalTitle.textContent = state.translations.edit_prompt || 'Edit Prompt';
        elements.promptTitle.value = prompt.title;
        elements.promptContentInput.value = prompt.content;
        elements.promptCategory.value = prompt.categoryId;
        elements.promptNotes.value = prompt.notes || '';
        elements.promptTags.value = prompt.tagIds.map(id => state.tags.find(t => t.id === id)?.name || '').filter(Boolean).join(', ');
        state.selectedRating = prompt.rating;
    } else {
        elements.addModalTitle.textContent = state.translations.add_prompt || 'Add New Prompt';
        elements.promptForm.reset();
        state.selectedRating = 3;
    }

    updateStarDisplay();
    elements.addPromptModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeAddModal() {
    elements.addPromptModal.classList.add('hidden');
    document.body.style.overflow = '';
    state.editingPromptId = null;
}

function updateStarDisplay() {
    elements.starRating.querySelectorAll('.star').forEach((star, i) => {
        star.textContent = i < state.selectedRating ? '★' : '☆';
        star.classList.toggle('active', i < state.selectedRating);
    });
}

function highlightStars(value) {
    elements.starRating.querySelectorAll('.star').forEach((star, i) => {
        star.textContent = i < value ? '★' : '☆';
    });
}

function savePrompt() {
    const title = elements.promptTitle.value.trim();
    const content = elements.promptContentInput.value.trim();
    const categoryId = elements.promptCategory.value;
    const notes = elements.promptNotes.value.trim();
    const tagsInput = elements.promptTags.value.trim();

    if (!title || !content) {
        showToast(state.translations.fill_required || 'Please fill in title and content', 'error');
        return;
    }

    const tagNames = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const tagIds = tagNames.map(name => {
        let tag = state.tags.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (!tag) {
            tag = { id: 'tag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9), name, color: '#6366F1' };
            state.tags.push(tag);
        }
        return tag.id;
    });

    if (state.editingPromptId) {
        const prompt = state.prompts.find(p => p.id === state.editingPromptId);
        if (prompt) {
            prompt.title = title;
            prompt.content = content;
            prompt.categoryId = categoryId;
            prompt.notes = notes || null;
            prompt.tagIds = tagIds;
            prompt.rating = state.selectedRating;
            prompt.modifiedAt = new Date().toISOString();
        }
        showToast(state.translations.prompt_updated || 'Prompt updated!', 'success');
    } else {
        const newPrompt = {
            id: 'prompt_' + Date.now(),
            title, content, categoryId,
            notes: notes || null,
            tagIds,
            rating: state.selectedRating,
            copyCount: 0,
            createdAt: new Date().toISOString(),
            lastUsedAt: null
        };
        state.prompts.unshift(newPrompt);
        showToast(state.translations.prompt_added || 'Prompt added!', 'success');
    }

    closeAddModal();
    renderCategories();
    renderPrompts();
    syncToApp();
}

function editCurrentPrompt() {
    const promptId = elements.modal.dataset.promptId;
    closeModal();
    openAddModal(promptId);
}

function deleteCurrentPrompt() {
    const promptId = elements.modal.dataset.promptId;
    if (confirm(state.translations.confirm_delete || 'Are you sure you want to delete this prompt?')) {
        state.prompts = state.prompts.filter(p => p.id !== promptId);
        closeModal();
        renderCategories();
        renderPrompts();
        showToast(state.translations.prompt_deleted || 'Prompt deleted', 'success');
        syncToApp();
    }
}

// ========================================
// View Prompt Modal
// ========================================

function openPrompt(id) {
    const prompt = state.prompts.find(p => p.id === id);
    if (!prompt) return;

    elements.modal.dataset.promptId = id;
    const category = state.categories.find(c => c.id === prompt.categoryId);
    const tags = state.tags.filter(t => prompt.tagIds.includes(t.id));

    elements.modalTitle.textContent = prompt.title;
    elements.modalCategory.textContent = category?.name || 'General';
    elements.modalCategory.style.background = category?.color || 'var(--color-primary)';
    elements.modalRating.textContent = '★'.repeat(prompt.rating) + '☆'.repeat(5 - prompt.rating);
    elements.modalContent.textContent = prompt.content;
    elements.modalCopies.textContent = prompt.copyCount;
    elements.modalCreated.textContent = formatDate(prompt.createdAt);

    if (prompt.notes) {
        elements.notesContent.textContent = prompt.notes;
        elements.modalNotes.classList.remove('hidden');
    } else {
        elements.modalNotes.classList.add('hidden');
    }

    elements.modalTags.innerHTML = tags.map(t => `<span class="tag" style="background: ${t.color}">#${t.name}</span>`).join('');
    elements.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    elements.modal.classList.add('hidden');
    document.body.style.overflow = '';
}

async function copyPromptContent() {
    const content = elements.modalContent.textContent;
    const promptId = elements.modal.dataset.promptId;
    const prompt = state.prompts.find(p => p.id === promptId);

    try {
        await navigator.clipboard.writeText(content);
        if (prompt) {
            prompt.copyCount++;
            prompt.lastUsedAt = new Date().toISOString();
        }
        elements.copyBtn.classList.add('copied');
        elements.copyBtn.querySelector('span').textContent = state.translations.copied || 'Copied!';
        setTimeout(() => {
            elements.copyBtn.classList.remove('copied');
            elements.copyBtn.querySelector('span').textContent = state.translations.copy || 'Copy';
        }, 2000);
        renderPrompts();
        syncToApp();
    } catch (err) {
        showToast('Failed to copy', 'error');
    }
}

// ========================================
// Export/Import
// ========================================

function toggleDropdown(e) {
    e.stopPropagation();
    elements.actionsDropdown.classList.toggle('hidden');
}

function exportPrompts() {
    const data = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        prompts: state.prompts,
        categories: state.categories,
        tags: state.tags
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-master-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    elements.actionsDropdown.classList.add('hidden');
    showToast(state.translations.export_success || 'Prompts exported successfully!', 'success');
}

function importPrompts(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);

            if (data.prompts && Array.isArray(data.prompts)) {
                const existingIds = new Set(state.prompts.map(p => p.id));
                const newPrompts = data.prompts.filter(p => !existingIds.has(p.id));
                state.prompts = [...state.prompts, ...newPrompts];

                if (data.categories) {
                    const existingCatIds = new Set(state.categories.map(c => c.id));
                    const newCats = data.categories.filter(c => !existingCatIds.has(c.id));
                    state.categories = [...state.categories, ...newCats];
                }

                if (data.tags) {
                    const existingTagIds = new Set(state.tags.map(t => t.id));
                    const newTags = data.tags.filter(t => !existingTagIds.has(t.id));
                    state.tags = [...state.tags, ...newTags];
                }

                renderCategories();
                renderPrompts();
                populateCategorySelect();
                showToast(`${newPrompts.length} ${state.translations.prompts_imported || 'prompts imported'}!`, 'success');
                syncToApp();
            } else {
                showToast(state.translations.invalid_file || 'Invalid file format', 'error');
            }
        } catch (err) {
            showToast(state.translations.import_error || 'Error importing file', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
    elements.actionsDropdown.classList.add('hidden');
}

// ========================================
// Sync & Toast
// ========================================

function syncToApp() {
    // Update cached session
    localStorage.setItem('prompt_master_session', JSON.stringify({
        prompts: state.prompts,
        categories: state.categories,
        tags: state.tags
    }));
}

function showToast(message, type = 'info') {
    elements.toastMessage.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.remove('hidden');
    setTimeout(() => elements.toast.classList.add('hidden'), 3000);
}

// ========================================
// Theme & Localization
// ========================================

function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const sunIcon = elements.themeToggle.querySelector('.sun-icon');
    const moonIcon = elements.themeToggle.querySelector('.moon-icon');
    if (theme === 'dark') {
        sunIcon?.classList.remove('hidden');
        moonIcon?.classList.add('hidden');
    } else {
        sunIcon?.classList.add('hidden');
        moonIcon?.classList.remove('hidden');
    }
}

function toggleTheme() {
    setTheme(state.theme === 'light' ? 'dark' : 'light');
    // Regenerate QR with new colors if not connected
    if (!state.connected) {
        generateQRCode();
    }
}

function getBrowserLocale() {
    const lang = navigator.language?.substring(0, 2) || 'en';
    return ['en', 'ar', 'fr', 'es'].includes(lang) ? lang : 'en';
}

async function setLocale(locale) {
    state.locale = locale;
    localStorage.setItem('locale', locale);
    elements.languageSelect.value = locale;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';

    try {
        const response = await fetch(`i18n/${locale}.json`);
        if (response.ok) {
            state.translations = await response.json();
            applyTranslations();
        }
    } catch (e) {
        console.error('Failed to load translations:', e);
    }
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (state.translations[key]) {
            el.textContent = state.translations[key];
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (state.translations[key]) {
            el.placeholder = state.translations[key];
        }
    });
}

// ========================================
// Utilities
// ========================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString(state.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
