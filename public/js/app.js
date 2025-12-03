/**
 * @file app.js
 * @description Main controller logic for OmniCards. Handles UI rendering,
 * state management, SRS study logic, and interactions with the storage service.
 * @verion 1.1.0
 */

import { createFirebaseService } from './storage.js';
import { convertPinyinTones, parseRichText } from './utils.js';
import { CardTemplates } from './templates.js';
import { t, setLanguage } from './i18n.js';

// --- Global State & Configuration ---
let currentDeckId = null;
let unsubscribeDecks = null;
let unsubscribeCards = null;
// Ref object to hold the unsubscribe function for cards, passed to storage service
const unsubscribeRef = { current: null };

const STORAGE_MODE_KEY = 'chineseCardsStorageMode';
const LOCAL_STORAGE_KEY = 'chineseCards';

let currentStorageMode = 'firebase';
let storageService = null;
let currentEditCardId = null;

// Sort state for the deck table
let currentSort = { column: 'front', direction: 'asc' };

// Main data containers
let allCards = [];      // Snapshot of all cards in the current deck
let reviewQueue = [];   // Active study queue (cards to be learned)
let currentCard = null; // Currently displayed card object
let currentDeckType = 'standard';

let currentUser = null; // Stores the firebase User object

let currentDeckSort = 'lastLearned'; // Default sort for dashboard
let cachedDecks = [];                // Local cache of deck to prevent flickering/re-fetching

let currentStudyMode = 'standard';  // 'standard (A->B', 'reverse (B->A)', 'random'

let currentPreviewDeckId = null;    // ID of the deck currently shown in preview modal
let allPublicDecks = [];            // Cache for public marketplace decks

let dialogResolve = null; // Promise resolve function for custom dialogs

let selectedCardIds = new Set();

let currentStudyExtra = 'back';

let cachedFolders = []; 
let currentFolderId = null; // null = Root
let unsubscribeFolders = null;

// --- DOM Elements ---

const appContainer = document.getElementById('app-container');
const firebaseErrorContainer = document.getElementById('firebase-error-container');
const userIdEl = document.getElementById('user-id');

// Dashboard Elements
const dashboardView = document.getElementById('dashboard-view');
const studyView = document.getElementById('study-view');
const deckListContainer = document.getElementById('deck-list-container');
const createDeckBtn = document.getElementById('create-deck-btn'); // <--- HIER FEHLTE ER
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const deckCountEl = document.getElementById('deck-count');
const deleteDeckBtn = document.getElementById('delete-deck-btn');
const renameDeckBtn = document.getElementById('rename-deck-btn');
const deckSortSelect = document.getElementById('deck-sort-select');
const folderNavControls = document.getElementById('folder-nav-controls');

// Tabs
const tabMyDecks = document.getElementById('tab-my-decks');
const tabCommunity = document.getElementById('tab-community');
const myDecksSection = document.getElementById('my-decks-section');
const communitySection = document.getElementById('community-section');
const publicDeckListContainer = document.getElementById('public-deck-list-container');

// Auth Elements
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userDisplayName = document.getElementById('user-display-name');
const userAvatar = document.getElementById('user-avatar');
const userAvatarPlaceholder = document.getElementById('user-avatar-placeholder');

// Study Elements
const addCardForm = document.getElementById('add-card-form');
const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
const cardListBody = document.getElementById('card-list-body');
const cardInner = document.getElementById('card-inner');
const cardFrontText = document.getElementById('card-front-text');
const cardBackContent = document.getElementById('card-back-content');
const showButton = document.getElementById('show-button');
const feedbackButtons = document.getElementById('feedback-buttons');
const rightButton = document.getElementById('right-button');
const wrongButton = document.getElementById('wrong-button');
const reviewCountEl = document.getElementById('review-count');
const reviewCountContainer = document.getElementById('review-count-container');
const rebuildQueueBtn = document.getElementById('rebuild-queue-btn');
const headerAddCard = document.getElementById('header-add-card');
const contentAddCard = document.getElementById('content-add-card');
const iconAddCard = document.getElementById('icon-add-card');
const headerCardList = document.getElementById('header-card-list');
const contentCardList = document.getElementById('content-card-list');
const iconCardList = document.getElementById('icon-card-list');
const tableActionContainer = document.getElementById('table-action-container');
const studyExtraSelect = document.getElementById('study-extra-select');

// Inputs (Reference kept for Pinyin helper, but mostly generated dynamically now)
const inputFront = document.getElementById('input-front');
const inputBack = document.getElementById('input-back');
const inputExtra = document.getElementById('input-extra');
const extraFieldContainer = document.getElementById('extra-field-container');
const convertPinyinBtn = document.getElementById('convert-pinyin-btn');

// Modals
const createDeckModal = document.getElementById('create-deck-modal');
const createDeckForm = document.getElementById('create-deck-form');
const templateSelect = document.getElementById('template-select');
const templateDesc = document.getElementById('template-desc');
const cancelCreateDeckBtn = document.getElementById('cancel-create-deck');

const settingsModal = document.getElementById('settings-modal');
const modalContent = document.querySelector('.modal-content'); // Generic modal content
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const storageToggle = document.getElementById('storage-toggle');
const syncLocalToCloudBtn = document.getElementById('sync-local-to-cloud-btn');
const syncMessage = document.getElementById('sync-message');

const editCardModal = document.getElementById('edit-card-modal');
const editModalContent = editCardModal ? editCardModal.querySelector('.modal-content') : null;
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const editCardForm = document.getElementById('edit-card-form');
const editDynamicFieldsContainer = document.getElementById('edit-dynamic-fields-container');

const queueModal = document.getElementById('queue-modal');
const queueModalContent = document.getElementById('queue-modal-content');
const closeQueueModalBtn = document.getElementById('close-queue-modal-btn');
const queueListContainer = document.getElementById('queue-list-container');

const darkModeToggle = document.getElementById('dark-mode-toggle');
const darkModeKnob = document.getElementById('dark-mode-knob');
const languageSelect = document.getElementById('language-select');
const studyModeSelect = document.getElementById('study-mode-select');

const previewModal = document.getElementById('preview-deck-modal');
const previewTitle = document.getElementById('preview-title');
const previewMeta = document.getElementById('preview-meta');
const previewCardsList = document.getElementById('preview-cards-list');
const previewImportBtn = document.getElementById('preview-import-btn');
const previewCancelBtn = document.getElementById('preview-cancel-btn');
const closePreviewBtn = document.getElementById('close-preview-btn');

const publicSearchInput = document.getElementById('public-search-input');
const publicSortSelect = document.getElementById('public-sort-select');
const publicFilterSelect = document.getElementById('public-filter-select');

const cardTableHeaderRow = document.getElementById('card-table-header-row');

const dialogModal = document.getElementById('global-dialog-modal');
const dialogTitle = document.getElementById('dialog-title');
const dialogMessage = document.getElementById('dialog-message');
const dialogInputContainer = document.getElementById('dialog-input-container');
const dialogInput = document.getElementById('dialog-input');
const dialogConfirmBtn = document.getElementById('dialog-confirm-btn');
const dialogCancelBtn = document.getElementById('dialog-cancel-btn');

const breadcrumbsContainer = document.getElementById('breadcrumbs');
const createFolderBtn = document.getElementById('create-folder-btn');
const MAX_FOLDER_DEPTH = 10;

const queueMaxInput = document.getElementById('queue-max-input');
const modalReshuffleBtn = document.getElementById('modal-reshuffle-btn');


// --- Initialization ---

/**
 * Main entry point . initializes Firebase, Event Listeners, and Theme.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Storage Service & Auth Callback
    storageService = createFirebaseService((user) => {
        currentUser = user;
        if (user) {
            // Logged In State
            if (user.isAnonymous) {
                if(userDisplayName) {
                    userDisplayName.textContent = "Gast";
                    userDisplayName.classList.remove('hidden');
                }
                if(loginBtn) {
                    loginBtn.textContent = "Login";
                    loginBtn.classList.remove('hidden');
                }
                if(logoutBtn) logoutBtn.classList.add('hidden');
                if(userAvatar) userAvatar.classList.add('hidden');
            } else {
                // Real Google User
                if(userDisplayName) {
                    userDisplayName.textContent = user.displayName || user.email;
                    userDisplayName.classList.remove('hidden');
                }
                
                // Avatar logic
                if (user.photoURL) {
                    if(userAvatar) {
                        userAvatar.src = user.photoURL;
                        userAvatar.classList.remove('hidden');
                    }
                    if(userAvatarPlaceholder) userAvatarPlaceholder.classList.add('hidden');
                } else {
                    // Fallback to initials if no photo
                    if(userAvatar) userAvatar.classList.add('hidden');
                    if(userAvatarPlaceholder) {
                        const name = user.displayName || user.email || "?";
                        userAvatarPlaceholder.textContent = name.charAt(0).toUpperCase();
                        userAvatarPlaceholder.classList.remove('hidden');
                    }
                }
                
                if(loginBtn) loginBtn.classList.add('hidden');
                if(logoutBtn) logoutBtn.classList.remove('hidden');
            }
            showDashboard();
        } else {
            // Logged Out State
            if(loginBtn) loginBtn.classList.remove('hidden');
            if(userDisplayName) userDisplayName.classList.add('hidden');
            if(logoutBtn) logoutBtn.classList.add('hidden');
            if(userAvatar) userAvatar.classList.add('hidden');
            if(userAvatarPlaceholder) userAvatarPlaceholder.classList.add('hidden');
            
            deckListContainer.innerHTML = '<p class="text-center p-8 text-gray-500">Bitte logge dich ein.</p>';
        }
    }, userIdEl, firebaseErrorContainer, unsubscribeRef);

    storageService.init();

    window.migrate = () => storageService.migrateLegacyData();

    // 2. Register global Event Listeners
    if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', showDashboard);
    if (addCardForm) addCardForm.addEventListener('submit', handleAddCard);
    if (showButton) showButton.addEventListener('click', flipCard);
    if (rightButton) rightButton.addEventListener('click', () => handleFeedback(true));
    if (wrongButton) wrongButton.addEventListener('click', () => handleFeedback(false));
    if (cardListBody) cardListBody.addEventListener('click', handleCardListActions);
    if (convertPinyinBtn) convertPinyinBtn.addEventListener('click', handlePinyinConvert);
    
    if (cardTableHeaderRow) {
        cardTableHeaderRow.addEventListener('click', handleSortClick);
    }
    
    if (reviewCountContainer) reviewCountContainer.addEventListener('click', buildAndShowQueueModal);
    if (rebuildQueueBtn) rebuildQueueBtn.addEventListener('click', handleRebuildQueue);

    // Global listener for Pinyin generated inputs (Event Delegation fallback)
    if(inputExtra) inputExtra.addEventListener('keyup', handlePinyinKeyup);
    
    // 3. Create Deck logic
    if (createDeckBtn) createDeckBtn.addEventListener('click', openCreateDeckModal);
    if (createDeckForm) createDeckForm.addEventListener('submit', handleCreateDeckSubmit);
    if (cancelCreateDeckBtn) cancelCreateDeckBtn.addEventListener('click', () => {
        createDeckModal.classList.add('opacity-0', 'pointer-events-none');
    });

    // Settings & Edit Modals
    if(openSettingsBtn) openSettingsBtn.addEventListener('click', openModal);
    if(closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeModal);
    if(settingsModal) settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeModal();
    });

    if(editCardForm) editCardForm.addEventListener('submit', handleUpdateCard);
    if(closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditModal);
    if(editCardModal) editCardModal.addEventListener('click', (e) => {
        if (e.target === editCardModal) closeEditModal();
    });

    // Queue Modal
    if(closeQueueModalBtn) closeQueueModalBtn.addEventListener('click', closeQueueModal);
    if(queueModal) queueModal.addEventListener('click', (e) => {
        if (e.target === queueModal) closeQueueModal();
    });

    // Auth Actions
    if (loginBtn) loginBtn.addEventListener('click', () => storageService.loginWithGoogle());
    if (logoutBtn) logoutBtn.addEventListener('click', () => storageService.logout());

    // Tabs
    if (tabMyDecks) tabMyDecks.addEventListener('click', () => switchTab('my-decks'));
    if (tabCommunity) tabCommunity.addEventListener('click', () => switchTab('community'));

    // Deck Actions
    if(syncLocalToCloudBtn) syncLocalToCloudBtn.addEventListener('click', handleSyncLocalToCloud);
    if (deleteDeckBtn) deleteDeckBtn.addEventListener('click', handleDeleteDeck);
    if (renameDeckBtn) renameDeckBtn.addEventListener('click', handleRenameDeck);

    // Dashboard Sorting
    if (deckSortSelect) {
        deckSortSelect.addEventListener('change', (e) => {
            currentDeckSort = e.target.value;
            renderDeckList(cachedDecks); 
        });
    }

    // Initialie Theme (Dark/Light)
    initTheme();
    if (darkModeToggle) darkModeToggle.addEventListener('click', toggleDarkMode);

    // Initialize study Mode
    const savedMode = localStorage.getItem('omniCardsStudyMode');
    if (savedMode) {
        currentStudyMode = savedMode;
        if (studyModeSelect) studyModeSelect.value = savedMode;
    }

    // Mode Listener
    if (studyModeSelect) {
        studyModeSelect.addEventListener('change', (e) => {
            currentStudyMode = e.target.value;
            localStorage.setItem(`omniMode_${currentDeckType}`, currentStudyMode);
            if (currentDeckId) {
                buildReviewQueue();
                showNextCard();
            }
        });
    }

    // Extra-field Listener
    if (studyExtraSelect) {
        studyExtraSelect.addEventListener('change', (e) => {
            currentStudyExtra = e.target.value;
            localStorage.setItem(`omniExtra_${currentDeckType}`, currentStudyExtra);
            
            if (currentDeckId && currentCard) {
                renderCurrentCardUI(); 
            }
        });
    }

    // Preview Modal Listeners
    if(previewImportBtn) previewImportBtn.addEventListener('click', handlePreviewImport);
    if(closePreviewBtn) closePreviewBtn.addEventListener('click', closePreviewModal);
    if(previewCancelBtn) previewCancelBtn.addEventListener('click', closePreviewModal);
    if(previewModal) previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) closePreviewModal();
    });

    // Marketplace Filters
    if (publicSearchInput) {publicSearchInput.addEventListener('input', () => renderPublicDeckList());}
    if (publicSortSelect) {publicSortSelect.addEventListener('change', () => renderPublicDeckList());}
    if (publicFilterSelect) {publicFilterSelect.addEventListener('change', () => renderPublicDeckList());}

    // Language Selection
    if (languageSelect) {
        languageSelect.value = localStorage.getItem('omniCardsLanguage') || 'de';
        
        languageSelect.addEventListener('change', (e) => {
            const lang = e.target.value;
            setLanguage(lang);
            window.location.reload(); 
        });
    }

    // Collapsible Sections Listeners
    if (headerAddCard) {
        headerAddCard.addEventListener('click', () => toggleSection(contentAddCard, iconAddCard, 'omni_ui_add_open'));
    }
    if (headerCardList) {
        headerCardList.addEventListener('click', () => toggleSection(contentCardList, iconCardList, 'omni_ui_list_open'));
    }

    if (createFolderBtn) createFolderBtn.addEventListener('click', handleCreateFolder);

    if (modalReshuffleBtn) modalReshuffleBtn.addEventListener('click', handleRebuildQueue);
});


// --- Logic Functions ---

/**
 * Handles renaming of the currently active deck.
 * Prompts user for new name and checks for duplicates locally
 */
async function handleRenameDeck() {
    if (!currentDeckId) return;
    const oldTitle = document.querySelector('h1').textContent;
    
    const newTitle = await uiShowPrompt(t('dialog.rename.title'), t('dialog.rename.msg'), oldTitle);
    
    if (newTitle && newTitle.trim() !== "" && newTitle !== oldTitle) {
        const trimmedTitle = newTitle.trim();

        // Check for duplicates in cached decks (excluding self)
        const exists = cachedDecks.some(d => 
            d.id !== currentDeckId &&
            d.title.toLowerCase() === trimmedTitle.toLowerCase()
        );

        if (exists) {
            await uiShowAlert(t('common.error'), t('msg.deckExists'));
            return;
        }

        try {
            await storageService.updateDeck(currentDeckId, { title: trimmedTitle });
            document.querySelector('h1').textContent = trimmedTitle;
        } catch (error) {
            console.error(error);
            await uiShowAlert(t('common.error'), error.message);
        }
    }
}

/**
 * Central handler for data updates from Firestore.
 * Handles queue management , empty states, and card injections.
 * @param {Array} cards - The new list of cards from the database 
 * @returns 
 */
function handleDataUpdate(cards) {
    // 1. Detect deletion: If count decreased, reset queue to avoid ghost cards
    const previousCount = allCards.length;
    
    // Update State
    allCards = cards;
    renderCardList();
    if(deckCountEl) deckCountEl.textContent = allCards.length;

    if (allCards.length < previousCount && previousCount > 0) {
        buildReviewQueue();
        showNextCard();
        return;
    }

    if (reviewQueue.length === 0) {
        const restored = loadSessionState();
        
        if (!restored) {
            // Nur neu bauen, wenn keine Session gespeichert war
            if (allCards.length > 0) buildReviewQueue();
        } else {
            // Wenn erfolgreich wiederhergestellt:
            if (!currentCard && reviewQueue.length > 0) {
                 showNextCard();
                 return; 
            } else if (currentCard) {
                // UI refreshen mit wiederhergestelltem Stand
                renderCurrentCardUI();
                if(reviewCountEl) reviewCountEl.textContent = reviewQueue.length;
                return;
            }
        }
    }

    // 2. Queue maintenance: Update existing queue items with new data
    if (reviewQueue.length > 0) {
        reviewQueue = reviewQueue
            .map(qCard => allCards.find(c => c.id === qCard.id))
            .filter(c => c !== undefined);
    }

    // 3. Inject New Cards (Level 0) into active queue
    const currentId = currentCard ? currentCard.id : null;
    const queueIds = new Set(reviewQueue.map(c => c.id));
    
    const newCards = allCards.filter(c => 
        c.id !== currentId &&       
        !queueIds.has(c.id) &&      
        c.srsLevel === 0            
    );

    if (newCards.length > 0) {
        newCards.forEach(c => {
            reviewQueue.push(c);
        });
        shuffleArray(reviewQueue);
        if(reviewCountEl) reviewCountEl.textContent = reviewQueue.length;
    }

    // 4. Cack active card integrity
    if (currentCard) {
        const updatedCard = allCards.find(c => c.id === currentCard.id);
        if (!updatedCard) {
            showNextCard();
        } else {
            currentCard = updatedCard;
        }
    }

    // 5. Handle Start / Empty / Session Done states
    const isSessionDone = !currentCard && (reviewQueue.length > 0 || (allCards.length > 0 && reviewQueue.length === 0));
    
    if (isSessionDone) {
        if (reviewQueue.length === 0) buildReviewQueue();
        if (reviewQueue.length > 0) showNextCard();
    } else if (!currentCard && allCards.length === 0) {
        showNextCard();
    }

    if (reviewQueue.length > 0) saveSessionState();
}

/**
 * Creates a rich text toolbar for an input element.
 */
function addFormattingToolbar(input) {
    const toolbar = document.createElement('div');
    toolbar.className = "flex gap-1 mb-1";

    const createBtn = (label, tag, colorClass = "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200") => {
        const btn = document.createElement('button');
        btn.type = 'button'; // Prevent form submit
        btn.className = `px-2 py-0.5 rounded text-xs font-bold border border-gray-300 dark:border-gray-500 ${colorClass} hover:opacity-80 transition`;
        btn.textContent = label;
        
        btn.onclick = () => {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const text = input.value;
            const selectedText = text.substring(start, end);
            
            const before = text.substring(0, start);
            const after = text.substring(end);
            
            const newText = `${before}[${tag}]${selectedText}[/${tag}]${after}`;
            
            input.value = newText;
            input.focus();
            
            // Cursor positionieren (nach dem eingefügten Tag oder umschließend)
            const newCursorPos = end + tag.length + 2; // grob geschätzt nach Start-Tag
            input.selectionStart = newCursorPos;
            input.selectionEnd = newCursorPos;
        };
        return btn;
    };

    toolbar.appendChild(createBtn('B', 'b'));
    toolbar.appendChild(createBtn('I', 'i', 'italic'));
    
    // Colors
    toolbar.appendChild(createBtn('R', 'red', 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300'));
    toolbar.appendChild(createBtn('B', 'blue', 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-300'));
    toolbar.appendChild(createBtn('G', 'green', 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-300'));
    toolbar.appendChild(createBtn('O', 'orange', 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-300'));

    return toolbar;
}

/**
 * Dynamically builds from inputs based on the selected template.
 * @param {string} templateKey - e.g., 'standard', 'chinese' 
 * @param {HTMLElement} containerElement - DOM element to append inputs to
 * @param {string} idPrefix - Prefix for IDs (e.g., 'edit' or 'input-')
 */
function buildFormFields(templateKey, containerElement, idPrefix = 'input-') {
    const template = CardTemplates[templateKey] || CardTemplates['standard'];
    containerElement.innerHTML = ''; 

    template.fields.forEach(field => {
        const wrapper = document.createElement('div');
        wrapper.className = "flex flex-col mb-4";

        const label = document.createElement('label');
        label.className = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
        label.textContent = t(field.label) + (field.required ? ' *' : '');
        label.setAttribute('for', `${idPrefix}${field.id}`); 
        wrapper.appendChild(label);

        const inputGroup = document.createElement('div');
        
        const input = document.createElement('input');
        input.type = field.type || 'text';
        input.name = field.id; 
        input.id = `${idPrefix}${field.id}`;
        input.placeholder = t(field.placeholder);
        input.maxLength = 500;
        input.autocomplete = 'off';
        
        if (field.required) input.required = true;

        const baseInputClass = "w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500";

        // 1. Toolbar generieren (für alle Textfelder, inkl. Pinyin)
        let toolbar = null;
        if (field.type === 'text') {
            toolbar = addFormattingToolbar(input);
        }

        // 2. Layout unterscheiden
        if (field.hasAction) {
            // LAYOUT MIT BUTTON (z.B. Pinyin): Flex Row
            // Toolbar muss ÜBER die Gruppe, da die Gruppe horizontal ist
            if (toolbar) wrapper.appendChild(toolbar);

            inputGroup.className = "flex flex-row";
            input.className = baseInputClass + " rounded-l-lg";
            
            inputGroup.appendChild(input);

            // Action Button
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = t(field.actionLabel); 
            btn.className = "px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg hover:bg-gray-300 dark:hover:bg-gray-500 text-sm font-medium transition";
            btn.onclick = () => field.actionHandler(input);
            inputGroup.appendChild(btn);

        } else {
            // STANDARD LAYOUT: Flex Col
            // Toolbar kommt IN die Gruppe
            inputGroup.className = "flex flex-col relative";
            input.className = baseInputClass + " rounded-lg";

            if (toolbar) inputGroup.appendChild(toolbar);
            inputGroup.appendChild(input);
        }

        // Event Listener (Pinyin Conversion Live)
        if (field.id === 'pinyin' || field.id === 'extra') {
             input.addEventListener('keyup', handlePinyinKeyup);
        }

        wrapper.appendChild(inputGroup);
        containerElement.appendChild(wrapper);
    });
}

/**
 * Handles adding a new card. validates required fields dynamically.
 */
async function handleAddCard(e) {
    e.preventDefault();
    const formData = new FormData(addCardForm);
    const newCard = {};

    for (let [key, value] of formData.entries()) {
        newCard[key] = value.trim();
    }

    const template = CardTemplates[currentDeckType] || CardTemplates['standard'];
    
    // Validate required fields
    for (const field of template.fields) {
        if (field.required) {
            const value = newCard[field.id];
            if (!value || value.length === 0) {
                await uiShowAlert(t('common.error'), `Bitte fülle das Feld "${t(field.label)}" aus.`);
                const el = document.getElementById(`input-${field.id}`);
                if(el) el.focus();
                return;
            }
        }
    }

    newCard.srsLevel = 0;
    newCard.consecutiveCorrect = 0;
    newCard.createdAt = new Date().toISOString();

    try {
        await storageService.addCardToDeck(currentDeckId, newCard);
        addCardForm.reset();
        
        // Refocus first field for speed
        if(template.fields.length > 0) {
             const firstId = template.fields[0].id;
             setTimeout(() => {
                 const el = document.getElementById(`input-${firstId}`);
                 if(el) el.focus();
             }, 100);
        }
    } catch (error) { 
        console.error(error);
        await uiShowAlert(t('common.error'), t('msg.saveError'));
    }
}

/**
 * Reset study state (queue, current card) when leaving a deck
 */
function resetStudyState() {
    currentCard = null;
    reviewQueue = [];
    currentDeckId = null;
    currentDeckType = 'standard';
    allCards = [];
    selectedCardIds.clear();
    
    if(cardFrontText) cardFrontText.innerHTML = '';
    if(cardBackContent) cardBackContent.innerHTML = '';
    
    resetCardState();
}

async function handleDeleteDeck() {
    if (!currentDeckId) return;

    const confirmed = await uiShowConfirm(t('dialog.delDeck.title'), t('dialog.delDeck.msg'), true);
    
    if (!confirmed) return;

    try {
        await storageService.deleteDeckFull(currentDeckId);
        await uiShowAlert(t('common.geloescht'), t('msg.deckDeleted'));
        showDashboard();
    } catch (error) {
        console.error(error);
        await uiShowAlert("Fehler", error.message);
    }
}

async function handleBulkDelete() {
    if (selectedCardIds.size === 0) return;

    const count = selectedCardIds.size;
    const confirmed = await uiShowConfirm(
        t('dialog.delBulk.title'), 
        t('dialog.delBulk.msg', {n: count}), 
        true
    );

    if (confirmed) {
        try {
            const idsToDelete = Array.from(selectedCardIds);
            
            await storageService.deleteCards(currentDeckId, idsToDelete);
            
            selectedCardIds.clear();
            
            updateTableHeaders(currentDeckType); 
            
            await uiShowAlert(t('common.success'), `${count} ${t('common.geloescht')}`);
        } catch (error) {
            console.error(error);
            await uiShowAlert(t('common.error'), error.message);
        }
    }
}

// --- Create Deck Logic ---

function openCreateDeckModal() {
    templateSelect.innerHTML = '';
    
    Object.entries(CardTemplates).forEach(([key, tpl]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = t(tpl.nameKey);
        templateSelect.appendChild(option);
    });
    
    updateTemplateDesc();
    templateSelect.onchange = updateTemplateDesc;

    createDeckModal.classList.remove('opacity-0', 'pointer-events-none');
    document.querySelector('#create-deck-modal .modal-content').classList.remove('scale-95', 'opacity-0');
}

function updateTemplateDesc() {
    const key = templateSelect.value;
    if (CardTemplates[key]) {
        templateDesc.textContent = t(CardTemplates[key].descKey); // Übersetzung!
    }
}

async function handleCreateDeckSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(createDeckForm);
    const title = formData.get('deckName').trim();
    const type = formData.get('template');

    if (!title) {
        await uiShowAlert(t('common.error'), t('msg.enterName'));
        return;
    }

    const exists = cachedDecks.some(d => d.title.toLowerCase() === title.toLowerCase());
    
    if (exists) {
        await uiShowAlert(t('common.error'), t('msg.deckExists'));
        return;
    }

    await storageService.createDeck(title, type, currentFolderId);
    
    createDeckModal.classList.add('opacity-0', 'pointer-events-none');
    createDeckForm.reset();
}


// --- Study & Card Logic ---

function showNextCard(delayBackUpdate = false) {
    resetCardState(); 
    
    // CASE 1: Empty deck
    if (!allCards || allCards.length === 0) {
        cardFrontText.innerHTML = `
            <div class="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span class="text-lg font-medium text-center">${t('msg.emptyDeck')}</span>
            </div>
        `;
        cardBackContent.innerHTML = ''; 
        showButton.style.display = 'none';
        currentCard = null;
        return;
    }

    // CASE 2: Session finished
    if (!reviewQueue || reviewQueue.length === 0) {
        cardFrontText.innerHTML = `
            <div class="flex flex-col items-center justify-center text-green-600 dark:text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-2xl font-bold">${t('msg.goodJob')}</span>
            </div>
        `;
        cardBackContent.innerHTML = ''; 
        showButton.style.display = 'none';
        currentCard = null;
        return;
    }

    // CASE 3: Show Card
    currentCard = reviewQueue.shift(); 
    if (!currentCard) { showNextCard(); return; }
    
    if(reviewCountEl) reviewCountEl.textContent = reviewQueue.length;

    renderCurrentCardUI(delayBackUpdate);
}

/**
 * Builds the weighted study queue using 4-2-1 Interleaving strategy.
 * Groups: A (Lvl 0-1), B (Lvl 2-3), C (Lvl 4+).
 * Pattern: 4x A, 2x B, 1x C -> Shuffle -> Add to Queue.
 */
function buildReviewQueue() {
    reviewQueue = [];
    if (!allCards || allCards.length === 0) return;

    // 1. Pools erstellen
    // Wir arbeiten mit Kopien, damit wir splice() nutzen können, ohne allCards zu leeren
    const poolA = allCards.filter(c => (c.srsLevel || 0) <= 1); // Lernen
    const poolB = allCards.filter(c => (c.srsLevel || 0) >= 2 && (c.srsLevel || 0) <= 3); // Festigen
    const poolC = allCards.filter(c => (c.srsLevel || 0) >= 4); // Meistern

    // Shuffle Pools initial, damit wir zufällige Karten aus den Pools ziehen
    shuffleArray(poolA);
    shuffleArray(poolB);
    shuffleArray(poolC);

    // 2. Limit holen
    let maxCards = 50;
    if (queueMaxInput && queueMaxInput.value) {
        let val = parseInt(queueMaxInput.value);
        
        if (isNaN(val)) {
            val = 50;
        }
        
        if (val < 1) {
            val = 50;
        }

        if (val > 100000) {
            val = 100000;
        }

        maxCards = val;
        
        queueMaxInput.value = maxCards;
    }

    // 3. Queue bauen (Interleaving Loop)
    while (reviewQueue.length < maxCards) {
        // Abbruchbedingung: Wenn alle Pools leer sind
        if (poolA.length === 0 && poolB.length === 0 && poolC.length === 0) break;

        const chunk = [];

        // 4x Level 0-1
        if (poolA.length > 0) chunk.push(...poolA.splice(0, 4));
        
        // 2x Level 2-3
        if (poolB.length > 0) chunk.push(...poolB.splice(0, 2));
        
        // 1x Level 4+
        if (poolC.length > 0) chunk.push(...poolC.splice(0, 1));

        // Chunk mischen, damit die Reihenfolge innerhalb des Blocks (4-2-1) nicht starr ist
        shuffleArray(chunk);

        // Zur Queue hinzufügen
        reviewQueue.push(...chunk);
    }

    // Hard Cut, falls der letzte Chunk das Limit überschritten hat
    if (reviewQueue.length > maxCards) {
        reviewQueue = reviewQueue.slice(0, maxCards);
    }
    
    // UI Update
    if(reviewCountEl) reviewCountEl.textContent = reviewQueue.length;
    
    // Wenn Modal offen ist, Liste aktualisieren
    if (!queueModal.classList.contains('opacity-0')) {
        buildAndShowQueueModal(); // Refresht die Liste im Modal
    }

    saveSessionState();
}

async function handleCardListActions(e) {
    if (e.target.classList.contains('delete-btn')) {
        const cardId = e.target.dataset.id;
        
        const confirmed = await uiShowConfirm(
            t('dialog.delCard.title'), 
            t('dialog.delCard.msg'), 
            true
        );

        if (confirmed) {
            try {
                await storageService.deleteCard(currentDeckId, cardId);
            } catch (error) {
                console.error(error);
                await uiShowAlert(t('common.error'), error.message);
            }
        }
    }

    if (e.target.classList.contains('edit-btn')) {
        const cardId = e.target.dataset.id;
        const cardToEdit = allCards.find(c => c.id === cardId);
        
        if (cardToEdit) {
            currentEditCardId = cardId;
            
            buildFormFields(currentDeckType, editDynamicFieldsContainer, 'edit-');
            
            const template = CardTemplates[currentDeckType] || CardTemplates['standard'];
            
            template.fields.forEach(field => {
                const input = document.getElementById(`edit-${field.id}`);
                if (input) {
                    input.value = cardToEdit[field.id] || '';
                    // Legacy Fallback
                    if (!input.value) {
                        if (field.id === 'front') input.value = cardToEdit.german || '';
                        if (field.id === 'back') input.value = cardToEdit.chinese || '';
                        if (field.id === 'extra') input.value = cardToEdit.pinyin || '';
                    }
                }
            });

            openEditModal();
        }
    }
}

async function handleUpdateCard(e) {
    e.preventDefault();
    if (!currentEditCardId || !currentDeckId) return;

    const formData = new FormData(editCardForm);
    const updatedData = {};

    for (let [key, value] of formData.entries()) {
        updatedData[key] = value.trim();
    }

    const template = CardTemplates[currentDeckType] || CardTemplates['standard'];
    
    // Validate
    for (const field of template.fields) {
        if (field.required) {
            const value = updatedData[field.id];
            if (!value || value.length === 0) {
                await uiShowAlert(t('common.error'), `${t('msg.missingFields')}"${t(field.label)}"`);
                return;
            }
        }
    }

    try {
        await storageService.updateCard(currentDeckId, currentEditCardId, updatedData);
        
        if (currentCard && currentCard.id === currentEditCardId) {
            currentCard = { ...currentCard, ...updatedData };
            renderCurrentCardUI();
        }

        closeEditModal();
        await uiShowAlert(t('common.success'), t('msg.cardUpdated')); 
    } catch (error) {
        console.error(error);
        await uiShowAlert("Fehler", error.message);
    }
}

/**
 * Processes user feedback (Right/Wrong).
 * Updates SRS Level and resets queue if wrong.
 */
async function handleFeedback(wasCorrect) {
    if (!currentCard || !currentDeckId) return;

    cardInner.classList.remove('is-flipped');
    feedbackButtons.style.display = 'none';

    const oldLevel = (typeof currentCard.srsLevel === 'number') ? currentCard.srsLevel : 0;
    
    let srsLevel = oldLevel;
    let consecutiveCorrect = (typeof currentCard.consecutiveCorrect === 'number') ? currentCard.consecutiveCorrect : 0;

    if (wasCorrect) {
        consecutiveCorrect++;
        if (consecutiveCorrect >= 3 && srsLevel < 4) {
            srsLevel++;
            consecutiveCorrect = 0; 
        } else if (oldLevel === 0) {
            srsLevel = 1;
            consecutiveCorrect = 0;
        }
    } else {
        consecutiveCorrect = 0;
        if (srsLevel > 0) srsLevel--;
    }

    storageService.updateCard(currentDeckId, currentCard.id, { 
        srsLevel: srsLevel, 
        consecutiveCorrect: consecutiveCorrect 
    }).catch(console.error);

    currentCard.srsLevel = srsLevel;
    currentCard.consecutiveCorrect = consecutiveCorrect;
    
    const localRef = allCards.find(c => c.id === currentCard.id);
    if (localRef) {
        localRef.srsLevel = srsLevel;
        localRef.consecutiveCorrect = consecutiveCorrect;
    }

    if (!wasCorrect) {
        const insertIndex = Math.min(reviewQueue.length, 3);
        reviewQueue.splice(insertIndex, 0, currentCard);
    
    } else {        
        if (srsLevel >= 3) {
        } else {
            let insertIndex;

            if (oldLevel === 0) {
                insertIndex = Math.min(reviewQueue.length, 3);
                reviewQueue.splice(insertIndex, 0, currentCard);
            } 
            else if (oldLevel === 1) {
                insertIndex = Math.min(reviewQueue.length, 10);
                reviewQueue.splice(insertIndex, 0, currentCard);
            } 
            else {
                reviewQueue.push(currentCard);
            }
        }
    }

    if (reviewQueue.length === 0) {
        buildReviewQueue(); 
    }

    if(reviewCountEl) reviewCountEl.textContent = reviewQueue.length;
    showNextCard(true);

    saveSessionState();
}

// --- Helper Functions ---

// --- Session Persistence Helper ---
function saveSessionState() {
    if (!currentDeckId) return;
    const sessionData = {
        queue: reviewQueue.map(c => c.id),
        currentCardId: currentCard ? currentCard.id : null
    };
    localStorage.setItem(`omni_queue_${currentDeckId}`, JSON.stringify(sessionData));
}

function loadSessionState() {
    if (!currentDeckId) return false;
    const json = localStorage.getItem(`omni_queue_${currentDeckId}`);
    if (!json) return false;
    
    try {
        const data = JSON.parse(json);
        if (!data.queue || !Array.isArray(data.queue) || data.queue.length === 0) return false;

        // IDs zurück zu echten Karten-Objekten mappen
        const restoredQueue = data.queue
            .map(id => allCards.find(c => c.id === id))
            .filter(c => c !== undefined);

        if (restoredQueue.length === 0) return false;

        reviewQueue = restoredQueue;
        
        // Aktive Karte wiederherstellen
        if (data.currentCardId) {
            const restoredCard = allCards.find(c => c.id === data.currentCardId);
            if (restoredCard) currentCard = restoredCard;
        }
        return true;
    } catch (e) {
        return false;
    }
}

function clearSessionState() {
    if (!currentDeckId) return;
    localStorage.removeItem(`omni_queue_${currentDeckId}`);
}

function getFolderDepth(folderId) {
    if (!folderId) return 0;
    const folder = cachedFolders.find(f => f.id === folderId);
    return folder ? 1 + getFolderDepth(folder.parentId) : 0;
}

// Nav Controls
function renderFolderNavigation() {
    if (!folderNavControls) return;
    folderNavControls.innerHTML = '';

    if (!currentFolderId) {
        // Wir sind im Root -> Keine Buttons anzeigen
        folderNavControls.classList.add('hidden');
        return;
    }

    folderNavControls.classList.remove('hidden');

    // 1. BACK BUTTON (Eine Ebene hoch)
    const btnBack = document.createElement('button');
    btnBack.className = "px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition shadow-sm font-medium";
    btnBack.textContent = t('nav.back');
    btnBack.onclick = () => {
        // Parent ID finden
        const currentFolder = cachedFolders.find(f => f.id === currentFolderId);
        if (currentFolder) {
            currentFolderId = currentFolder.parentId || null; // Wenn parentId undefiniert/null, gehe zu Root
            renderDeckList();
        } else {
            // Fallback: Zu Root
            currentFolderId = null;
            renderDeckList();
        }
    };

    // 2. ROOT BUTTON (Direkt zum Start)
    const btnRoot = document.createElement('button');
    btnRoot.className = "px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition shadow-sm";
    btnRoot.textContent = t('nav.root');
    btnRoot.onclick = () => {
        currentFolderId = null;
        renderDeckList();
    };

    folderNavControls.appendChild(btnBack);
    folderNavControls.appendChild(btnRoot);
}

function renderBreadcrumbs() {
    if (!breadcrumbsContainer) return;
    breadcrumbsContainer.innerHTML = '';

    // "Home" immer da
    const homeSpan = document.createElement('span');
    homeSpan.className = "cursor-pointer hover:underline font-bold " + (currentFolderId === null ? "text-gray-800 dark:text-gray-200" : "");
    homeSpan.textContent = "Home";
    homeSpan.onclick = () => { currentFolderId = null; renderDeckList(); };
    breadcrumbsContainer.appendChild(homeSpan);

    if (currentFolderId) {
        // Pfad rekonstruieren (rekursiv nach oben)
        const path = [];
        let curr = cachedFolders.find(f => f.id === currentFolderId);
        while (curr) {
            path.unshift(curr);
            curr = cachedFolders.find(f => f.id === curr.parentId);
        }

        path.forEach((folder, index) => {
            const sep = document.createElement('span');
            sep.className = "mx-2";
            sep.textContent = ">";
            breadcrumbsContainer.appendChild(sep);

            const span = document.createElement('span');
            span.textContent = folder.title;
            
            // Letztes Element ist nicht klickbar (aktueller Ort)
            if (index === path.length - 1) {
                span.className = "font-bold text-gray-800 dark:text-gray-200";
            } else {
                span.className = "cursor-pointer hover:underline";
                span.onclick = () => { currentFolderId = folder.id; renderDeckList(); };
            }
            breadcrumbsContainer.appendChild(span);
        });
    }
}

async function handleCreateFolder() {
    // 1. Check Hardcap
    const currentDepth = getFolderDepth(currentFolderId);
    if (currentDepth >= MAX_FOLDER_DEPTH) {
        await uiShowAlert(t('common.error'), t('error.maxDepth'));
        return;
    }

    // 2. Normaler Flow
    const name = await uiShowPrompt(t('dialog.newFolder.title'), t('dialog.newFolder.msg'));
    if (name && name.trim()) {
        try {
            await storageService.createFolder(name.trim(), currentFolderId);
        } catch (e) {
            uiShowAlert(t('common.error'), e.message);
        }
    }
}

async function handleMoveItem(itemId, isFolder) {
    // 1. Rekursive Liste bauen (wie zuvor)
    const buildTargetList = (parentId = null, depth = 0, list = []) => {
        const children = cachedFolders.filter(f => f.parentId === parentId);
        children.sort((a, b) => a.title.localeCompare(b.title));

        children.forEach(folder => {
            // Zirkelbezug verhindern: Ordner kann nicht in sich selbst verschoben werden
            if (isFolder) {
                if (folder.id === itemId) return; 
            }
            list.push({ ...folder, depth });
            buildTargetList(folder.id, depth + 1, list);
        });
        return list;
    };

    // 2. Liste filtern und vorbereiten
    let orderedFolders = buildTargetList(null, 0);

    // Filter: Wenn Ordner verschoben wird, descandents entfernen (einfacher Check gegen Zirkelbezug via ID)
    if (isFolder) {
        const getDescendantIds = (rootId) => {
            let ids = [rootId];
            const children = cachedFolders.filter(f => f.parentId === rootId);
            children.forEach(c => ids = ids.concat(getDescendantIds(c.id)));
            return ids;
        };
        const invalidIds = new Set(getDescendantIds(itemId));
        orderedFolders = orderedFolders.filter(f => !invalidIds.has(f.id));
    }

    const rootOption = { id: 'root', title: t('folder.root'), depth: 0, isRoot: true };
    const finalTargets = [rootOption, ...orderedFolders];
    
    // 3. HTML generieren
    let html = `<div class="flex flex-col gap-1 mt-4 max-h-[60vh] overflow-y-auto pr-1">`;
    
    finalTargets.forEach(tgt => {
        // Hardcap Check:
        // Wenn wir einen ORDNER verschieben, darf das Ziel nicht >= MAX_DEPTH sein.
        // (Decks dürfen theoretisch tiefer liegen, aber für UX Konsistenz sperren wir es hier auch oft, 
        //  aber laut Anforderung geht es primär um "10 Unterordner erstellen". 
        //  Wir sperren das Ziel nur, wenn 'isFolder' true ist, um nesting zu verhindern.)
        const isDisabled = isFolder && tgt.depth >= MAX_FOLDER_DEPTH - 1;
        
        const indent = tgt.isRoot ? 0 : (tgt.depth * 1.5) + 0.5; 
        const prefix = tgt.depth > 0 && !tgt.isRoot ? `<span class="text-gray-300 dark:text-gray-600 mr-1">└─</span>` : '';
        const icon = tgt.isRoot ? '⌂' : '📁';
        
        // Styles für disabled state
        const baseClass = "move-target-btn w-full text-left py-2 px-3 rounded border transition flex items-center gap-2 group";
        const stateClass = isDisabled 
            ? "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 cursor-not-allowed opacity-50" 
            : "hover:bg-blue-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600 cursor-pointer";

        const iconColor = tgt.isRoot ? 'text-gray-500' : 'text-yellow-500';
        const titleColor = isDisabled ? "text-gray-400" : "text-gray-700 dark:text-gray-200";

        html += `
        <button class="${baseClass} ${stateClass}" 
                style="padding-left: ${tgt.isRoot ? '0.75rem' : `calc(0.75rem + ${indent}rem)`}"
                data-id="${tgt.id}"
                ${isDisabled ? 'disabled' : ''}>
            
            <span class="${iconColor} flex-shrink-0 ${isDisabled ? '' : 'group-hover:scale-110 transition-transform'}">${icon}</span>
            <span class="text-gray-400 text-xs flex-shrink-0">${prefix}</span>
            <span class="truncate ${titleColor}">
                ${tgt.title} ${isDisabled ? '<span class="text-xs ml-2 border border-gray-300 rounded px-1">Max</span>' : ''}
            </span>
        </button>`;
    });
    html += `</div>`;

    // 4. Modal Setup
    dialogTitle.textContent = t('dialog.move.title');
    dialogMessage.innerHTML = html;
    dialogInputContainer.classList.add('hidden');
    dialogConfirmBtn.classList.add('hidden');
    dialogCancelBtn.classList.remove('hidden');

    dialogModal.classList.remove('opacity-0', 'pointer-events-none');
    dialogModal.querySelector('.modal-content').classList.remove('scale-95');

    // 5. Listener
    const buttons = dialogMessage.querySelectorAll('.move-target-btn:not([disabled])');
    buttons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetId = btn.dataset.id === 'root' ? null : btn.dataset.id;
            
            dialogModal.classList.add('opacity-0', 'pointer-events-none');
            dialogModal.querySelector('.modal-content').classList.add('scale-95');
            
            try {
                await storageService.moveItem(itemId, targetId, isFolder);
                renderDeckList();
            } catch (err) {
                uiShowAlert(t('common.error'), err.message);
            }
        });
    });
}

/**
 * Renders the current card to the DOM based on active settings.
 * Does NOT advance the queue.
 */
function renderCurrentCardUI(delayBack = false) {
    if (!currentCard) return;

    const template = CardTemplates[currentDeckType] || CardTemplates['standard'];
    const hasCustomModes = !!template.modes;

    let renderMode = currentStudyMode;

    if (currentStudyMode === 'random') {
        if (hasCustomModes) {
            const modeKeys = Object.keys(template.modes);
            renderMode = modeKeys[Math.floor(Math.random() * modeKeys.length)];
        } else {
            renderMode = Math.random() < 0.5 ? 'std' : 'rev';
        }
    }
    
    const extraPos = (typeof currentStudyExtra !== 'undefined') ? currentStudyExtra : 'back';

    cardFrontText.innerHTML = template.renderFront(currentCard, renderMode, extraPos);
    renderMath(cardFrontText); 
    
    const updateBackContent = () => {
        const newBackContent = template.renderBack(currentCard, renderMode, extraPos);
        cardBackContent.innerHTML = newBackContent;
        renderMath(cardBackContent);
    };

    if (delayBack) {
        setTimeout(updateBackContent, 250);
    } else {
        updateBackContent();
    }
}

/**
 * Updates the study mode options based on the selected template.
 */
function updateStudyModeOptions(templateKey) {
    const template = CardTemplates[templateKey] || CardTemplates['standard'];
    studyModeSelect.innerHTML = '';
    
    const hasCustomModes = !!template.modes;

    if (hasCustomModes) {
        if(studyExtraSelect) studyExtraSelect.classList.add('hidden');

        Object.entries(template.modes).forEach(([key, labelKey]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = t(labelKey);
            studyModeSelect.appendChild(option);
        });
        
        // Random Option
        const randomOption = document.createElement('option');
        randomOption.value = 'random';
        randomOption.textContent = t('mode.random');
        studyModeSelect.appendChild(randomOption);
        
        // Load State
        const savedMode = localStorage.getItem(`omniMode_${templateKey}`);
        if (savedMode && (template.modes[savedMode] || savedMode === 'random')) {
            studyModeSelect.value = savedMode;
            currentStudyMode = savedMode;
        } else {
            const firstKey = Object.keys(template.modes)[0];
            studyModeSelect.value = firstKey;
            currentStudyMode = firstKey;
        }

    } else {
        if(studyExtraSelect) {
            studyExtraSelect.classList.remove('hidden');
            // Load Extra State
            const savedExtra = localStorage.getItem(`omniExtra_${templateKey}`) || 'back';
            studyExtraSelect.value = savedExtra;
            currentStudyExtra = savedExtra;
        }

        const genericOptions = [
            { val: 'std', label: 'dir.std' },
            { val: 'rev', label: 'dir.rev' },
            { val: 'random', label: 'mode.random' }
        ];

        genericOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.val;
            option.textContent = t(opt.label);
            studyModeSelect.appendChild(option);
        });

        // Load Direction State
        const savedMode = localStorage.getItem(`omniMode_${templateKey}`);
        if (savedMode && ['std', 'rev', 'random'].includes(savedMode)) {
            studyModeSelect.value = savedMode;
            currentStudyMode = savedMode;
        } else {
            studyModeSelect.value = 'std';
            currentStudyMode = 'std';
        }
    }
}

function handlePinyinConvert() {
    let pinyinText = inputExtra.value;
    if (!pinyinText) return;
    inputExtra.value = convertPinyinTones(pinyinText);
}

/**
 * Live Pinyin conversion on Space key press
 */
function handlePinyinKeyup(e) {
    if (e.key === ' ' || e.code === 'Space') {
        const input = e.target;
        const originalValue = input.value;
        const originalCursorPos = input.selectionStart; 

        const convertedValue = convertPinyinTones(originalValue);
        
        const lengthDifference = originalValue.length - convertedValue.length;
        const newCursorPos = originalCursorPos - lengthDifference;

        input.value = convertedValue;
        input.selectionStart = newCursorPos;
        input.selectionEnd = newCursorPos;
    }
}

async function handleSyncLocalToCloud() {
    syncMessage.textContent = 'Synchronisiere...';
    const localCards = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    
    if (localCards.length === 0) {
        syncMessage.textContent = 'Nichts zu synchronisieren.';
        return;
    }

    // Simpler Sync: Einfach alles hochladen was da ist (könnte Duplikate erzeugen wenn nicht vorsichtig)
    // Hier stark vereinfacht:
    try {
        let count = 0;
        for (const card of localCards) {
             await storageService.addCardToDeck(currentDeckId, card); // Achtung: Braucht eigentlich Deck Auswahl!
             count++;
        }
        syncMessage.textContent = `${count} Karten hochgeladen.`;
    } catch (error) {
        syncMessage.textContent = 'Fehler beim Sync.';
    }
}

/**
 * Switches the UI to Dashboard view.
 * Resets study state, stops listeners, and refreshes the deck list.
 */
function showDashboard() {
    if (currentDeckId && reviewQueue.length > 0) {
        saveSessionState();
    }

    dashboardView.classList.remove('hidden');
    studyView.classList.add('hidden');
    
    document.querySelector('h1').textContent = 'OmniCards';

    resetStudyState(); 

    // Subscribe Decks
    if (!unsubscribeDecks && storageService.subscribeDecks) {
        unsubscribeDecks = storageService.subscribeDecks((decks) => {
            decks.forEach(d => { if(d.parentId === undefined) d.parentId = null; });
            cachedDecks = decks;
            renderDeckList();
        });
    }

    // Subscribe Folders
    if (!unsubscribeFolders && storageService.subscribeFolders) {
        unsubscribeFolders = storageService.subscribeFolders((folders) => {
            cachedFolders = folders;
            renderDeckList();
        });
    }
}

/**
 * Switches UI to Study view for a specific deck.
 * Loads the appropriate template form and starts the card listener.
 */
function showStudyView(deckId, deckTitle, deckType = 'standard') {
    resetStudyState();

    storageService.updateDeck(deckId, { lastLearnedAt: new Date().toISOString() }).catch(err => console.error("Could not update lastLearnedAt", err));
    
    dashboardView.classList.add('hidden');
    studyView.classList.remove('hidden');
    currentDeckId = deckId;
    currentDeckType = deckType || 'standard'; 
    
    buildFormFields(currentDeckType, dynamicFieldsContainer);
    updateTableHeaders(currentDeckType);
    updateStudyModeOptions(currentDeckType);

    document.querySelector('h1').textContent = deckTitle;
    
    // Start realtime Listener for cards
    if (storageService.subscribeCards) {
        unsubscribeCards = storageService.subscribeCards(deckId, handleDataUpdate);
    }

    initSectionState(contentAddCard, iconAddCard, 'omni_ui_add_open');
    initSectionState(contentCardList, iconCardList, 'omni_ui_list_open');
}

/**
 * Renders the list of private decks in the dashboard.
 */
function renderDeckList() {
    deckListContainer.innerHTML = '';
    renderBreadcrumbs();
    
    // NEU: Navigations-Buttons rendern
    renderFolderNavigation();

    // 1. Filtern
    const currentDecks = cachedDecks.filter(d => d.parentId === currentFolderId);
    const currentFolders = cachedFolders.filter(f => f.parentId === currentFolderId);

    // 2. Sortieren
    currentFolders.sort((a, b) => a.title.localeCompare(b.title));
    
    const sortedDecks = [...currentDecks].sort((a, b) => {
        // (Sortier-Logik bleibt gleich wie vorher)
        switch (currentDeckSort) {
            case 'name': return a.title.localeCompare(b.title);
            case 'countDesc': return (b.cardCount || 0) - (a.cardCount || 0);
            case 'countAsc': return (a.cardCount || 0) - (b.cardCount || 0);
            case 'newest': return (b.createdAt || '').localeCompare(a.createdAt || '');
            case 'lastLearned':
            default:
                const dateA = a.lastLearnedAt || '';
                const dateB = b.lastLearnedAt || '';
                if (dateB === dateA) return a.title.localeCompare(b.title);
                return dateB.localeCompare(dateA);
        }
    });

    if (currentFolders.length === 0 && sortedDecks.length === 0) {
        deckListContainer.innerHTML = `<div class="col-span-full text-center p-8 text-gray-500 italic">${t('folder.empty')}</div>`;
        return;
    }

    // --- BUTTON STYLE UPDATE ---
    // Jetzt mit sichtbarem Border und weißem Hintergrund für besseren Kontrast
    const btnBase = "p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 transition shadow-sm";
    
    const btnClass = `${btnBase} text-gray-600 hover:text-blue-600 hover:border-blue-300 dark:text-gray-300 dark:hover:text-blue-400`;
    const btnDeleteClass = `${btnBase} text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 dark:text-gray-300 dark:hover:text-red-400 dark:hover:bg-red-900/20`;
    const btnMoveClass = `${btnBase} text-gray-600 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 dark:text-gray-300 dark:hover:text-purple-400 dark:hover:bg-purple-900/20`;

    // 3. RENDER FOLDERS
    currentFolders.forEach(folder => {
        const div = document.createElement('div');
        // UPDATE: Dunkleres Design (bg-amber-100, border-amber-300)
        div.className = "h-full p-6 bg-amber-100 dark:bg-amber-900/20 rounded-lg shadow hover:shadow-md transition cursor-pointer border border-amber-300 dark:border-amber-800 flex flex-col justify-between group relative";
        
        div.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-amber-600 dark:text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span class="font-bold text-lg text-gray-800 dark:text-gray-100 truncate w-full" title="${folder.title}">
                    ${folder.title}
                </span>
            </div>
            
            <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition z-10">
                <button class="rename-folder-btn ${btnClass}" title="${t('btn.rename')}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button class="move-folder-btn ${btnMoveClass}" title="${t('btn.move')}">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                </button>
                <button class="delete-folder-btn ${btnDeleteClass}" title="${t('btn.delete')}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
            
            <div class="text-xs text-amber-800/70 dark:text-amber-500/60 mt-2 font-medium">
                ${t('folder.sub')}
            </div>
        `;

        // ... (Event Listeners wie gehabt, keine Änderungen an der Logik) ...
        div.addEventListener('click', (e) => { if (!e.target.closest('button')) { currentFolderId = folder.id; renderDeckList(); }});
        div.querySelector('.delete-folder-btn').addEventListener('click', async (e) => { e.stopPropagation(); try { await storageService.deleteFolder(folder.id); } catch (err) { uiShowAlert(t('common.error'), err.message); }});
        div.querySelector('.rename-folder-btn').addEventListener('click', async (e) => { e.stopPropagation(); const newName = await uiShowPrompt(t('dialog.renameFolder.title'), t('dialog.renameFolder.msg'), folder.title); if(newName && newName.trim()) await storageService.renameFolder(folder.id, newName.trim()); });
        div.querySelector('.move-folder-btn').addEventListener('click', (e) => { e.stopPropagation(); handleMoveItem(folder.id, true); });

        deckListContainer.appendChild(div);
    });

    // 4. RENDER DECKS
    sortedDecks.forEach(deck => {
        const div = document.createElement('div');
        // UPDATE: 'dark:border-l-blue-500' hinzugefügt, um die Farbe im Dark Mode zu erzwingen
        div.className = "h-full p-6 pr-14 bg-stone-100 dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition cursor-pointer border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-500 dark:border-l-blue-500 relative group flex flex-col justify-between";
        
        div.innerHTML = `
            <div class="relative w-full">
                <h3 class="font-bold text-xl mb-2 text-gray-800 dark:text-gray-100 break-words hyphens-auto pr-6">
                    ${deck.title}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    ${deck.cardCount || 0} ${t('common.cards')}
                </p>
                
                <div class="absolute -top-2 -right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition z-10">
                    <button class="move-deck-btn ${btnMoveClass}" title="${t('btn.move')}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </button>
                    <button class="share-btn ${btnClass}" title="${t('btn.share')}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>
                </div>
            </div>
            
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-4 uppercase tracking-wide">
                ${deck.type}
            </p>
        `;
        
        // Listener
        div.addEventListener('click', (e) => { if(!e.target.closest('button')) showStudyView(deck.id, deck.title, deck.type); });
        const moveBtn = div.querySelector('.move-deck-btn'); if(moveBtn) moveBtn.addEventListener('click', (e) => { e.stopPropagation(); handleMoveItem(deck.id, false); });
        const shareBtn = div.querySelector('.share-btn'); if (shareBtn) shareBtn.addEventListener('click', async (e) => { 
            e.stopPropagation(); 
            const confirmed = await uiShowConfirm(t('dialog.publish.title'), t('dialog.publish.msg', {title: deck.title}));
            if (confirmed) { try { await storageService.publishDeckFull(deck.id, deck); await uiShowAlert(t('common.success'), t('msg.deckPublished')); } catch (err) { uiShowAlert(t('common.error'), err.message); }}
        });

        deckListContainer.appendChild(div);
    });
}

/**
 * Handles Tab Switching (My Decks vs. Community)
 * @param {string} tab - 'my-decks' or 'community'
 */
function switchTab(tab) {
    const activeClasses = [
        'text-blue-600', 'dark:text-blue-400', 
        'font-bold', 
        'border-b-2', 'border-blue-600', 'dark:border-blue-400'
    ];
    
    const inactiveClasses = [
        'text-gray-500', 'hover:text-gray-700', 
        'dark:text-gray-400', 'dark:hover:text-gray-200'
    ];

    if (tab === 'my-decks') {
        tabMyDecks.classList.add(...activeClasses);
        tabMyDecks.classList.remove(...inactiveClasses);
        tabCommunity.classList.remove(...activeClasses);
        tabCommunity.classList.add(...inactiveClasses);
        myDecksSection.classList.remove('hidden');
        communitySection.classList.add('hidden');
    } else {
        tabCommunity.classList.add(...activeClasses);
        tabCommunity.classList.remove(...inactiveClasses);
        tabMyDecks.classList.remove(...activeClasses);
        tabMyDecks.classList.add(...inactiveClasses);
        myDecksSection.classList.add('hidden');
        communitySection.classList.remove('hidden');
        loadPublicDecks();
    }
}

function loadPublicDecks() {
    if (unsubscribeDecks && storageService.subscribePublicDecks) {
        storageService.subscribePublicDecks((decks) => {
            allPublicDecks = decks;
            renderPublicDeckList();
        });
    }
}

// Visual Helpers
function flipCard() {
    cardInner.classList.add('is-flipped');
    showButton.style.display = 'none';
    feedbackButtons.style.display = 'flex';
}

function resetCardState() {
    cardInner.classList.remove('is-flipped');
    showButton.style.display = 'block';
    feedbackButtons.style.display = 'none';
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Returns Tailwind classes for the SRS Level Badge.
 */
function getLevelBadgeClasses(srsLevel) {
    switch (srsLevel) {
        case 0:
            return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
        case 1:
            return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
        case 2:
            return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
        case 3:
            return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
        case 4:
            return 'bg-emerald-300 text-emerald-800 border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
        default: 
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
}

/**
 * Renders the table list of all cards in the current deck.
 * Handles sorting, truncating long text, and displaying SRS stats.
 */
function renderCardList() {
    cardListBody.innerHTML = ''; 
    const sortedCards = [...allCards]; 

    const currentIds = new Set(allCards.map(c => c.id));
    selectedCardIds = new Set([...selectedCardIds].filter(id => currentIds.has(id)));
    
    // Sorting Logic
    const { column, direction } = currentSort;
    sortedCards.sort((a, b) => {
        let valA, valB;
        switch (column) {
            // Legacy fallbacks
            case 'front':
                valA = (a.front || '').toLowerCase();
                valB = (b.front || '').toLowerCase();
                break;
            case 'back': 
                valA = (a.back || '').toLowerCase();
                valB = (b.back || '').toLowerCase();
                break;
            case 'extra': 
                valA = (a.extra || '').toLowerCase();
                valB = (b.extra || '').toLowerCase();
                break;
            case 'level':
                // Numerical sort for levels, then streak
                if (a.srsLevel !== b.srsLevel) {
                    return direction === 'asc' ? a.srsLevel - b.srsLevel : b.srsLevel - a.srsLevel;
                }
                return direction === 'asc' ? a.consecutiveCorrect - b.consecutiveCorrect : b.consecutiveCorrect - a.consecutiveCorrect;
            default:
                valA = (a[column] || '').toString().toLowerCase();
                valB = (b[column] || '').toString().toLowerCase();
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    if (sortedCards.length === 0) {
        cardListBody.innerHTML = `<tr><td colspan="6" class="px-4 py-4 text-center text-gray-500">${t('table.noCards')}</td></tr>`;
        updateTableHeaders(currentDeckType);
        return;
    }

    updateTableHeaders(currentDeckType);
    updateSortIndicators();
    
    sortedCards.forEach((card, index) => {
        const badgeClass = getLevelBadgeClasses(card.srsLevel);
        const tr = document.createElement('tr');
        tr.className = "hover:bg-stone-50 dark:hover:bg-gray-700 transition-colors duration-200 border-b border-gray-100 dark:border-gray-700 last:border-0";

        // Checkbox Status
        const isSelected = selectedCardIds.has(card.id);
        const trBg = isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "";
        if (isSelected) tr.className += " " + trBg;
        
        // Fallbacks for display
        const displayFront = parseRichText(card.front);
        const displayBack = parseRichText(card.back);
        const displayExtra = parseRichText(card.extra || card.note || card.pinyin);

        // CSS class for truncating text (3 lines max)
        const cellClass = "line-clamp-2 overflow-hidden break-words max-w-[200px] max-h-[3em]";

        tr.innerHTML = `
            <td class="px-4 py-3 w-10 text-center align-top">
                <input type="checkbox" class="card-select-cb rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" data-id="${card.id}" ${isSelected ? 'checked' : ''}>
            </td>

            <td class="px-2 py-3 text-sm text-gray-500 dark:text-gray-400 align-top">${index + 1}</td>
            
            <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 align-top">
                <div class="${cellClass}">${displayFront}</div> 
            </td>
            
            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 align-top">
                <div class="${cellClass}">${displayBack}</div>
            </td>
            
            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 align-top">
                <div class="${cellClass}">${displayExtra}</div>
            </td>
            
            <td class="px-4 py-3 text-sm align-top whitespace-nowrap">
                <span class="${getLevelBadgeClasses(card.srsLevel)} px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center">
                    Level ${card.srsLevel}
                </span>
                <span class="text-xs text-gray-400 dark:text-gray-500 ml-2" title="Gewusst in Folge">
                    🔥 ${card.consecutiveCorrect || 0}
                </span>
            </td>
            
            <td class="px-4 py-3 text-sm align-top">
                <div class="flex flex-col sm:flex-row gap-2">
                    <button data-id="${card.id}" class="edit-btn text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors">${t('table.edit')}</button>
                    <button data-id="${card.id}" class="delete-btn text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors">${t('table.delete')}</button>
                </div>
            </td>
        `;
        cardListBody.appendChild(tr);
    });

    // Listener for checkboxes
    document.querySelectorAll('.card-select-cb').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            if (e.target.checked) {
                selectedCardIds.add(id);
            } else {
                selectedCardIds.delete(id);
            }
            // Wir rendern neu, um den "Delete All" Button und "Select All" Status im Header zu updaten
            // Das ist etwas teuer, aber bei <1000 Karten ok. 
            // Optimierung: Nur Header updaten. Aber wir bleiben erstmal simpel.
            renderCardList(); 
        });
    });

    renderMath(cardListBody); 
    updateTableActions();
}

function renderMath(element) {
    if (window.renderMathInElement) {
        renderMathInElement(element, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        });
    }
}

function handleSortClick(e) {
    const header = e.target.closest('th');
    if (!header || !header.dataset.sort) return;
    const newColumn = header.dataset.sort;
    if (currentSort.column === newColumn) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = newColumn;
        currentSort.direction = 'asc';
    }
    renderCardList();
}

/**
 * Builds and display the "Current Queue" modal.
 */
function buildAndShowQueueModal() {
    if (!reviewQueue || reviewQueue.length === 0) {
        queueListContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Warteschlange leer.</p>';
    } else {
        queueListContainer.innerHTML = reviewQueue.map((card, index) => `
            <div class="p-2 border-b dark:border-gray-700 flex justify-between">
                <span class="text-gray-800 dark:text-gray-200 truncate flex-1 ml-2" title="${card.front || card.german}">
                    ${index + 1}. ${card.front || card.german}
                </span>
                <span class="text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 rounded">Lvl: ${card.srsLevel}</span>
            </div>
        `).join('');
    }
    openQueueModal();
}

function handleRebuildQueue() {
    clearSessionState();
    buildReviewQueue();
    showNextCard();
}

const ICON_MINUS = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" /></svg>`;
const ICON_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>`;

function toggleSection(contentEl, iconEl, storageKey) {
    const isHidden = contentEl.classList.contains('hidden');
    
    if (isHidden) {
        contentEl.classList.remove('hidden');
        iconEl.innerHTML = ICON_MINUS;
        localStorage.setItem(storageKey, 'true');
    } else {
        contentEl.classList.add('hidden');
        iconEl.innerHTML = ICON_PLUS;
        localStorage.setItem(storageKey, 'false');
    }
}

function initSectionState(contentEl, iconEl, storageKey) {
    const storedState = localStorage.getItem(storageKey);
    const isOpen = storedState === null || storedState === 'true';

    if (isOpen) {
        contentEl.classList.remove('hidden');
        iconEl.innerHTML = ICON_MINUS;
    } else {
        contentEl.classList.add('hidden');
        iconEl.innerHTML = ICON_PLUS;
    }
}

function updateTableActions() {
    const container = document.getElementById('table-action-container');
    if (!container) return;
    
    const selectedCount = selectedCardIds.size;

    if (selectedCount > 0) {
        tableActionContainer.innerHTML = `
            <button id="bulk-delete-btn" class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-gray-700 border border-red-200 dark:border-red-900 px-3 py-1 rounded text-sm font-bold transition shadow-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                ${t('btn.deleteSelected', {n: selectedCount})}
            </button>
        `;
        
        const btn = document.getElementById('bulk-delete-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleBulkDelete();
            });
        }
    } else {
        container.innerHTML = '';
    }
}

// --- Theme Logic ---

function initTheme() {
    const savedTheme = localStorage.getItem('omniCardsTheme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        document.documentElement.classList.add('dark');
        updateDarkModeToggleUI(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateDarkModeToggleUI(false);
    }
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('omniCardsTheme', isDark ? 'dark' : 'light');
    updateDarkModeToggleUI(isDark);
}

function updateDarkModeToggleUI(isDark) {
    if (!darkModeToggle || !darkModeKnob) return;
    if (isDark) {
        darkModeKnob.classList.add('translate-x-6');
        darkModeKnob.classList.remove('translate-x-1');
        darkModeToggle.classList.add('bg-blue-600');
        darkModeToggle.classList.remove('bg-gray-200');
    } else {
        darkModeKnob.classList.add('translate-x-1');
        darkModeKnob.classList.remove('translate-x-6');
        darkModeToggle.classList.add('bg-gray-200');
        darkModeToggle.classList.remove('bg-blue-600');
    }
}

// --- Preview Logic & Marketplace Logic ---

async function openPreviewModal(deck) {
    currentPreviewDeckId = deck.id;
    
    previewTitle.textContent = deck.title;
    previewMeta.textContent = `${t('comm.createdBy')} ${deck.originalAuthor} • ${deck.type} • ${deck.cardCount} ${t('common.cards')}`;
    previewCardsList.innerHTML = `<p class="text-gray-500 dark:text-gray-400 italic">${t('comm.loading')}</p>`;
    
    previewModal.classList.remove('opacity-0', 'pointer-events-none');
    previewModal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');

    try {
        const sampleCards = await storageService.getPublicDeckPreview(deck.id);
        renderPreviewCards(sampleCards, deck.type, deck.cardCount);
    } catch (err) {
        console.error(err);
        previewCardsList.innerHTML = '<p class="text-red-500">Fehler beim Laden der Vorschau.</p>';
    }
}

function renderPreviewCards(cards, deckType, totalCount = 0) {
    previewCardsList.innerHTML = '';
    
    if (cards.length === 0) {
        previewCardsList.innerHTML = `<p class="text-gray-500">${t('comm.emptyDeck')}</p>`;
        return;
    }
    // Reuse template logic for preview (safely)
    const template = CardTemplates[deckType] || CardTemplates['standard'];

    cards.forEach(card => {
        const div = document.createElement('div');
        div.className = "p-3 bg-stone-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-1 sm:gap-4 items-center";
        
        // Legacy Fallbacks
        const front = card.front || card.german || '?';
        const back = card.back || card.chinese || '?';
        
        div.innerHTML = `
            <div class="font-medium text-gray-800 dark:text-gray-200 truncate text-center sm:text-left w-full" title="${front.replace(/"/g, '&quot;')}">
                ${front}
            </div>

            <div class="text-gray-400 dark:text-gray-500 text-center text-sm">
                <span class="hidden sm:inline">➔</span>
                <span class="sm:hidden">↓</span>
            </div>

            <div class="text-gray-600 dark:text-gray-400 truncate text-center sm:text-right w-full" title="${back.replace(/"/g, '&quot;')}">
                ${back}
            </div>
        `;
        previewCardsList.appendChild(div);
    });
    
    if (totalCount > cards.length) {
        const info = document.createElement('p');
        info.className = "text-xs text-center text-gray-400 mt-2 italic";
        info.textContent = t('comm.moreExamples'); 
        previewCardsList.appendChild(info);
    }
}

function closePreviewModal() {
    previewModal.classList.add('opacity-0', 'pointer-events-none');
    previewModal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0');
    currentPreviewDeckId = null;
}

async function handlePreviewImport() {
    if (!currentPreviewDeckId) return;
    
    const originalText = previewImportBtn.textContent;
    previewImportBtn.textContent = t('btn.importing');
    previewImportBtn.disabled = true;

    try {
        await storageService.importDeck(currentPreviewDeckId);
        closePreviewModal();
        await uiShowAlert(t('common.success'), t('msg.deckImported'));
        switchTab('my-decks');
    } catch (err) {
        console.error(err);
        await uiShowAlert(t('common.error'), err.message);
    } finally {
        previewImportBtn.textContent = originalText;
        previewImportBtn.disabled = false;
    }
}

// --- Modal Visibility Helpers ---
function openModal() { settingsModal.classList.remove('opacity-0', 'pointer-events-none'); modalContent.classList.remove('scale-95', 'opacity-0'); }
function closeModal() { settingsModal.classList.add('opacity-0', 'pointer-events-none'); modalContent.classList.add('scale-95', 'opacity-0'); }
function openEditModal() { editCardModal.classList.remove('opacity-0', 'pointer-events-none'); editModalContent.classList.remove('scale-95', 'opacity-0'); }
function closeEditModal() { editCardModal.classList.add('opacity-0', 'pointer-events-none'); editModalContent.classList.add('scale-95', 'opacity-0'); currentEditCardId = null; }
function openQueueModal() { queueModal.classList.remove('opacity-0', 'pointer-events-none'); queueModalContent.classList.remove('scale-95', 'opacity-0'); }
function closeQueueModal() { queueModal.classList.add('opacity-0', 'pointer-events-none'); queueModalContent.classList.add('scale-95', 'opacity-0'); }

/**
 * Renders the Marketplace list. Handles Search, Filter, and Sorting.
 * @returns 
 */
function renderPublicDeckList() {
    publicDeckListContainer.innerHTML = '';
    
    // 1. Get Filters
    const searchTerm = publicSearchInput ? publicSearchInput.value.toLowerCase().trim() : '';
    const filterMode = publicFilterSelect ? publicFilterSelect.value : 'all'; // 'all', 'mine', 'others'
    
    // 2. Filter Array
    let filteredDecks = allPublicDecks.filter(deck => {
        const isMyDeck = currentUser && deck.originalAuthorId === currentUser.uid;

        const matchesSearch = !searchTerm || (
            (deck.title || '').toLowerCase().includes(searchTerm) ||
            (deck.originalAuthor || '').toLowerCase().includes(searchTerm) ||
            (deck.type || '').toLowerCase().includes(searchTerm)
        );

        let matchesFilter = true;
        if (filterMode === 'mine') matchesFilter = isMyDeck;
        if (filterMode === 'others') matchesFilter = !isMyDeck;

        return matchesSearch && matchesFilter;
    });

    // 3. Sort Array
    const sortMode = publicSortSelect ? publicSortSelect.value : 'newest';
    filteredDecks.sort((a, b) => {
        switch (sortMode) {
            case 'name': return a.title.localeCompare(b.title);
            case 'oldest': return (a.publishedAt || '').localeCompare(b.publishedAt || '');
            case 'cards': return (b.cardCount || 0) - (a.cardCount || 0);
            case 'newest': default: return (b.publishedAt || '').localeCompare(a.publishedAt || '');
        }
    });

    if (filteredDecks.length === 0) {
        publicDeckListContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">Keine Decks gefunden.</p>';
        return;
    }

    // 4. Render Items
    filteredDecks.forEach(deck => {
        const div = document.createElement('div');
        const isMyDeck = currentUser && deck.originalAuthorId === currentUser.uid;

        // Visual distinction for own decks
        const borderClass = isMyDeck 
            ? "border-blue-300 dark:border-blue-700 ring-1 ring-blue-100 dark:ring-blue-900" 
            : "border-gray-200 dark:border-gray-700";

        div.className = `p-6 bg-stone-100 dark:bg-gray-800 rounded-lg shadow border ${borderClass} transition-all`;
        
        let actionBtnHtml = '';
        
        if (isMyDeck) {
            actionBtnHtml = `
                <div class="flex space-x-2">
                    <button class="preview-btn bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 px-3 py-1 rounded text-sm font-medium transition" title="${t('btn.preview')}" data-id="${deck.id}">
                        👁
                    </button>
                    <button class="import-btn bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800 px-3 py-1 rounded text-sm font-medium transition" title="${t('btn.import')}" data-id="${deck.id}">
                        ⬇
                    </button>
                    <button class="delete-public-btn bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-800 px-3 py-1 rounded text-sm font-medium transition" title="${t('btn.delete')}" data-id="${deck.id}">
                        🗑
                    </button>
                </div>`;
        } else {
            actionBtnHtml = `
                <div class="flex space-x-2">
                    <button class="preview-btn bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 px-3 py-1 rounded text-sm font-medium transition" title="${t('btn.preview')}" data-id="${deck.id}">
                        👁
                    </button>
                    <button class="import-btn bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800 px-3 py-1 rounded text-sm font-medium transition" title="${t('btn.import')}" data-id="${deck.id}">
                        ⬇
                    </button>
                </div>`;
        }

        div.innerHTML = `
            <div class="flex justify-between items-start gap-4">
                
                <div class="min-w-0 flex-1">
                    <h3 class="font-bold text-xl text-gray-800 dark:text-gray-100 flex items-center gap-2 break-all hyphens-auto">
                        ${deck.title}
                        ${isMyDeck ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-200 flex-shrink-0">Du</span>' : ''}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                        ${t('comm.createdBy')} ${deck.originalAuthor}
                    </p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-2 uppercase tracking-wide">
                        ${deck.type} • ${deck.cardCount} ${t('common.cards')}
                    </p>
                </div>

                <div class="flex-shrink-0">
                    ${actionBtnHtml}
                </div>
            </div>
        `;

        // Event Listeners for Dynamic Buttons
        const previewBtn = div.querySelector('.preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openPreviewModal(deck);
            });
        }

        const importBtn = div.querySelector('.import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const msg = isMyDeck 
                    ? `${t('comm.importOwnDeck')} "${deck.title}"?`
                    : t('dialog.import.msg', {title: deck.title});

                const confirmed = await uiShowConfirm(t('dialog.import.title'), msg);

                if (confirmed) {
                    try {
                        await storageService.importDeck(deck.id);
                        switchTab('my-decks');
                        await uiShowAlert(t('common.success'), t('msg.deckImported'));
                    } catch (err) {
                        console.error(err);
                        await uiShowAlert(t('common.error'), err.message);
                    }
                }
            });
        }

        if (isMyDeck) {
            div.querySelector('.delete-public-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await uiShowConfirm(t('dialog.delPublic.title'), t('dialog.delPublic.msg', {title: deck.title}), true);
            
                if (confirmed) {
                    try {
                        await storageService.deletePublicDeck(deck.id);
                        await uiShowAlert(t('common.success'), t('msg.deckDeleted'));
                    } catch (err) {
                        console.error(err);
                        await uiShowAlert(t('common.error'), err.message);
                    }
                }
            });
        }

        publicDeckListContainer.appendChild(div);
    });
}

function updateSortIndicators() {
    const headers = document.querySelectorAll('th[data-sort]');
    
    headers.forEach(th => {
        const column = th.dataset.sort;
        const indicator = th.querySelector('.sort-indicator');
        
        if (column === currentSort.column) {
            indicator.textContent = currentSort.direction === 'asc' ? ' ▲' : ' ▼';
            th.classList.add('text-blue-600', 'dark:text-blue-400');
            th.classList.remove('text-gray-500', 'dark:text-gray-300');
        } else {
            indicator.textContent = '';
            th.classList.remove('text-blue-600', 'dark:text-blue-400');
            th.classList.add('text-gray-500', 'dark:text-gray-300');
        }
    });
}

function updateTableHeaders(deckType) {
    if (!cardTableHeaderRow) return;

    const template = CardTemplates[deckType] || CardTemplates['standard'];
    const selectedCount = selectedCardIds.size;
    
    const allSelected = allCards.length > 0 && selectedCardIds.size === allCards.length;

    if (selectedCount > 0) {
        tableActionContainer.innerHTML = `
            <button id="bulk-delete-btn" class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-gray-700 border border-red-200 dark:border-red-900 px-3 py-1 rounded text-xs font-bold transition shadow-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                ${t('btn.deleteSelected', {n: selectedCount})}
            </button>
        `;
        
        document.getElementById('bulk-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            handleBulkDelete();
        });
    } else {
        tableActionContainer.innerHTML = '';
    }

    let html = `
        <th class="px-4 py-3 w-10 text-center">
            <input type="checkbox" id="select-all-checkbox" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" ${allSelected ? 'checked' : ''}>
        </th>
        <th class="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
    `;

    const sortKeys = ['front', 'back', 'extra'];
    
    template.fields.forEach((field, index) => {
        const sortKey = sortKeys[index] || field.id; 
        
        html += `
            <th data-sort="${sortKey}" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-white">
                ${t(field.label)} <span class="sort-indicator"></span>
            </th>
        `;
    });

    html += `
        <th data-sort="level" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-white">
            ${t('table.level')} <span class="sort-indicator"></span>
        </th>
        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            ${t('table.actions')}
        </th>
    `;

    cardTableHeaderRow.innerHTML = html;

    const selectAllCb = document.getElementById('select-all-checkbox');
    if(selectAllCb) {
        selectAllCb.addEventListener('change', (e) => {
            if (e.target.checked) {
                allCards.forEach(c => selectedCardIds.add(c.id));
            } else {
                selectedCardIds.clear();
            }
            renderCardList(); 
        });
    }

    const bulkBtn = document.getElementById('bulk-delete-btn');
    if (bulkBtn) {
        bulkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleBulkDelete();
        });
    }
}

// --- Custom Dialog System (Alert/Confirm/Prompt Replacement) ---

/**
 * Internal logic to show the global modal with specific configuration.
 * @returns {Promise} Resolves when user clicks OK/Cancel
 */
function openDialog(title, message, type = 'alert', placeholder = '') {
    return new Promise((resolve) => {
        dialogResolve = resolve;

        dialogTitle.textContent = title;
        dialogMessage.textContent = message;
        dialogInput.value = '';

        dialogInputContainer.classList.add('hidden');
        dialogCancelBtn.classList.remove('hidden');
        dialogConfirmBtn.className = "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-sm font-medium"; // Reset styles
        dialogConfirmBtn.textContent = "OK";

        if (type === 'alert') {
            dialogCancelBtn.classList.add('hidden');
        } else if (type === 'confirm-danger') {
            dialogConfirmBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            dialogConfirmBtn.classList.add('bg-red-600', 'hover:bg-red-700');
            dialogConfirmBtn.textContent = t('btn.delete');
        } else if (type === 'prompt') {
            dialogInputContainer.classList.remove('hidden');
            dialogInput.placeholder = placeholder;
            dialogConfirmBtn.textContent = t('modal.save');
        }

        dialogModal.classList.remove('opacity-0', 'pointer-events-none');
        dialogModal.querySelector('.modal-content').classList.remove('scale-95');
        
        if (type === 'prompt') setTimeout(() => dialogInput.focus(), 100);
    });
}

function closeDialog(result) {
    dialogModal.classList.add('opacity-0', 'pointer-events-none');
    dialogModal.querySelector('.modal-content').classList.add('scale-95');
    
    if (dialogResolve) {
        dialogResolve(result);
        dialogResolve = null;
    }
}

if(dialogConfirmBtn) {
    dialogConfirmBtn.addEventListener('click', () => {
        const value = (!dialogInputContainer.classList.contains('hidden')) ? dialogInput.value : true;
        closeDialog(value);
    });
}
if(dialogCancelBtn) {
    dialogCancelBtn.addEventListener('click', () => closeDialog(false));
}
if(dialogInput) {
    dialogInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') dialogConfirmBtn.click();
    });
}

async function uiShowAlert(title, message) {
    await openDialog(title, message, 'alert');
}

async function uiShowConfirm(title, message, isDangerous = false) {
    return await openDialog(title, message, isDangerous ? 'confirm-danger' : 'confirm');
}

async function uiShowPrompt(title, message, placeholder = '') {
    return await openDialog(title, message, 'prompt', placeholder);
}