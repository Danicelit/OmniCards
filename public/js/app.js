import { createFirebaseService } from './storage.js';
import { convertPinyinTones } from './utils.js';
import { CardTemplates } from './templates.js';
import { t, setLanguage } from './i18n.js';

// --- Globale Variablen & State ---
let currentDeckId = null;
let unsubscribeDecks = null;
let unsubscribeCards = null;
const unsubscribeRef = { current: null };

const STORAGE_MODE_KEY = 'chineseCardsStorageMode';
const LOCAL_STORAGE_KEY = 'chineseCards';

let currentStorageMode = 'firebase';
let storageService = null;
let currentEditCardId = null;
let currentSort = { column: 'front', direction: 'asc' };

let allCards = []; 
let reviewQueue = []; 
let currentCard = null; 
let currentDeckType = 'standard';

let currentUser = null; // Speichert das User-Objekt

let currentDeckSort = 'lastLearned'; // Standard: Zuletzt gelernt
let cachedDecks = [];

let currentStudyMode = 'standard'; // 'standard', 'reverse', 'random'

let currentPreviewDeckId = null;

let allPublicDecks = []; // Cache für alle geladenen Public Decks

let dialogResolve = null; // Function to call when user clicks a button

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


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Firebase Init
    storageService = createFirebaseService((user) => {
        currentUser = user;
        if (user) {
            
            // UI Update: Logged In
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
                // Echter Google User
                if(userDisplayName) {
                    userDisplayName.textContent = user.displayName || user.email;
                    userDisplayName.classList.remove('hidden');
                }
                
                // AVATAR LOGIK VERBESSERT
                if (user.photoURL) {
                    // Fall 1: Google Bild vorhanden
                    if(userAvatar) {
                        userAvatar.src = user.photoURL;
                        userAvatar.classList.remove('hidden');
                    }
                    if(userAvatarPlaceholder) userAvatarPlaceholder.classList.add('hidden');
                } else {
                    // Fall 2: Kein Bild -> Zeige Initialen
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
            // Not Logged In
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

    // 2. General Event Listeners
    if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', showDashboard);
    if (addCardForm) addCardForm.addEventListener('submit', handleAddCard);
    if (showButton) showButton.addEventListener('click', flipCard);
    if (rightButton) rightButton.addEventListener('click', () => handleFeedback(true));
    if (wrongButton) wrongButton.addEventListener('click', () => handleFeedback(false));
    if (cardListBody) cardListBody.addEventListener('click', handleCardListActions);
    if (convertPinyinBtn) convertPinyinBtn.addEventListener('click', handlePinyinConvert);
    
    const tableHead = document.getElementById('card-table-head');
    if (tableHead) tableHead.addEventListener('click', handleSortClick);
    
    if (reviewCountContainer) reviewCountContainer.addEventListener('click', buildAndShowQueueModal);
    if (rebuildQueueBtn) rebuildQueueBtn.addEventListener('click', handleRebuildQueue);

    // Pinyin Helpers (Global Listeners for generated inputs)
    // Wir nutzen Event Delegation oder direkte Listener beim Erstellen, 
    // aber diese hier sind für statische Felder (falls noch vorhanden)
    if(inputExtra) inputExtra.addEventListener('keyup', handlePinyinKeyup);
    
    // 3. Create Deck Listeners (NEU)
    if (createDeckBtn) createDeckBtn.addEventListener('click', openCreateDeckModal);
    if (createDeckForm) createDeckForm.addEventListener('submit', handleCreateDeckSubmit);
    if (cancelCreateDeckBtn) cancelCreateDeckBtn.addEventListener('click', () => {
        createDeckModal.classList.add('opacity-0', 'pointer-events-none');
    });

    // 4. Settings & Edit Modals
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

    // 5. Queue Modal
    if(closeQueueModalBtn) closeQueueModalBtn.addEventListener('click', closeQueueModal);
    if(queueModal) queueModal.addEventListener('click', (e) => {
        if (e.target === queueModal) closeQueueModal();
    });

    // 6. Auth
    if (loginBtn) loginBtn.addEventListener('click', () => storageService.loginWithGoogle());
    if (logoutBtn) logoutBtn.addEventListener('click', () => storageService.logout());

    // 7. Tabs
    if (tabMyDecks) tabMyDecks.addEventListener('click', () => switchTab('my-decks'));
    if (tabCommunity) tabCommunity.addEventListener('click', () => switchTab('community'));

    // 8. Sync (Optional)
    if(syncLocalToCloudBtn) syncLocalToCloudBtn.addEventListener('click', handleSyncLocalToCloud);

    if (deleteDeckBtn) deleteDeckBtn.addEventListener('click', handleDeleteDeck);

    if (renameDeckBtn) renameDeckBtn.addEventListener('click', handleRenameDeck);

    // Sort Decks Listener
    if (deckSortSelect) {
        deckSortSelect.addEventListener('change', (e) => {
            currentDeckSort = e.target.value;
            // Wir müssen die Liste neu rendern. 
            // Da wir die Decks nicht global gespeichert haben (nur im Closure von subscribeDecks),
            // ist der einfachste Weg: Den Listener neu triggern oder die Decks global speichern.
            
            // Bessere Lösung: Wir speichern die Decks kurz global zwischen oder triggern reload.
            // Da 'showDashboard' den Listener neu aufbaut, rufen wir das einfach auf (etwas brachial aber sicher).
            // ODER ELEGANT: Wir speichern 'cachedDecks' global.
            
            // Lass uns 'cachedDecks' einführen (siehe Schritt F)
            renderDeckList(cachedDecks); 
        });
    }
    // 1. Theme laden (Ganz am Anfang!)
    initTheme();

    // 2. Listener für Settings
    if (darkModeToggle) darkModeToggle.addEventListener('click', toggleDarkMode);

    // 3. Lern-Modus laden
    const savedMode = localStorage.getItem('omniCardsStudyMode');
    if (savedMode) {
        currentStudyMode = savedMode;
        if (studyModeSelect) studyModeSelect.value = savedMode;
    }

    // Listener für Modus-Wechsel
    if (studyModeSelect) {
        studyModeSelect.addEventListener('change', (e) => {
            currentStudyMode = e.target.value;
            localStorage.setItem('omniCardsStudyMode', currentStudyMode);
            
            // NEU: Sofort anwenden!
            // 1. Wenn wir uns in einem Deck befinden...
            if (currentDeckId) {
                // 2. ...Mischen wir den Stapel neu (damit die Sortierung/Zufall greift)
                buildReviewQueue();
                // 3. ...Und zeigen sofort eine neue Karte im neuen Modus an
                showNextCard();
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

    // Marketplace Search & Sort Listeners
    if (publicSearchInput) {
        publicSearchInput.addEventListener('input', () => renderPublicDeckList());
    }
    if (publicSortSelect) {
        publicSortSelect.addEventListener('change', () => renderPublicDeckList());
    }

    if (publicFilterSelect) {
        publicFilterSelect.addEventListener('change', () => renderPublicDeckList());
    }

    // Sprache
    if (languageSelect) {
        // Aktuelle Sprache setzen (damit Dropdown stimmt)
        languageSelect.value = localStorage.getItem('omniCardsLanguage') || 'de';
        
        languageSelect.addEventListener('change', (e) => {
            const lang = e.target.value;
            setLanguage(lang); // <--- NEU: Funktion aufrufen
            // Optional: Seite neu laden, um auch JS-generierte Inhalte (Templates) sicher zu aktualisieren
            // Das ist oft einfacher als alles dynamisch neu zu rendern.
            window.location.reload(); 
        });
    }
});


// --- Logic Functions ---

async function handleRenameDeck() {
    if (!currentDeckId) return;
    const oldTitle = document.querySelector('h1').textContent;
    
    const newTitle = await uiShowPrompt(t('dialog.rename.title'), t('dialog.rename.msg'), oldTitle);
    
    // Prüfen ob gültig
    if (newTitle && newTitle.trim() !== "" && newTitle !== oldTitle) {
        const trimmedTitle = newTitle.trim();

        // NEU: Duplikat-Check
        // Wir prüfen alle Decks AUSSER dem aktuellen (sich selbst darf man ja gleich nennen)
        const exists = cachedDecks.some(d => 
            d.id !== currentDeckId && // Nicht das aktuelle Deck prüfen
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
            await uiShowAlert("Fehler", error.message);
        }
    }
}

// Abstracted Data Update Function
function handleDataUpdate(cards) {
    allCards = cards;
    renderCardList();
    if(deckCountEl) deckCountEl.textContent = allCards.length;

    // Queue cleanen ... (bleibt gleich) ...
    if (reviewQueue.length > 0) {
        reviewQueue = reviewQueue
            .map(qCard => allCards.find(c => c.id === qCard.id))
            .filter(c => c !== undefined);
    }

    // Prüfen ob aktuelle Karte gelöscht ... (bleibt gleich) ...
    if (currentCard) {
        const updatedCard = allCards.find(c => c.id === currentCard.id);
        if (!updatedCard) {
            showNextCard();
        } else {
            currentCard = updatedCard;
        }
    }

    // FIX: Initialer Start oder Leeres Deck
    // Wenn keine Karte aktiv ist, schauen wir nach.
    if (!currentCard) {
        // Fall A: Deck hat Karten, aber Queue leer -> Mischen & Starten
        if (allCards.length > 0 && reviewQueue.length === 0) {
            buildReviewQueue();
            showNextCard();
        } 
        // Fall B: Deck ist leer -> Sofort showNextCard (damit der Empty-State angezeigt wird)
        else if (allCards.length === 0) {
            showNextCard();
        }
        // Fall C: Queue hat Karten -> Starten
        else if (reviewQueue.length > 0) {
            showNextCard();
        }
    }
}

function buildFormFields(templateKey, containerElement, idPrefix = 'input-') {
    const template = CardTemplates[templateKey] || CardTemplates['standard'];
    containerElement.innerHTML = ''; 

    template.fields.forEach(field => {
        const wrapper = document.createElement('div');
        wrapper.className = "flex flex-col";

        const label = document.createElement('label');
        label.className = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
        label.textContent = t(field.label);
        label.setAttribute('for', `${idPrefix}${field.id}`); 
        wrapper.appendChild(label);

        const inputGroup = document.createElement('div');
        inputGroup.className = "flex";

        const input = document.createElement('input');
        input.type = field.type || 'text';
        input.name = field.id; 
        input.id = `${idPrefix}${field.id}`;
        input.placeholder = t(field.placeholder);
        input.maxLength = 500;
        input.className = "w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-blue-500 focus:border-blue-500 " + (field.hasAction ? "rounded-l-lg" : "rounded-lg");

        if (field.id === 'pinyin' || field.id === 'extra') {
             input.addEventListener('keyup', handlePinyinKeyup);
        }

        inputGroup.appendChild(input);

        if (field.hasAction) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = t(field.actionLabel); // Übersetzung!
            btn.className = "px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg hover:bg-gray-300 dark:hover:bg-gray-500 text-sm";
            btn.onclick = () => field.actionHandler(input);
            inputGroup.appendChild(btn);
        }

        wrapper.appendChild(inputGroup);
        containerElement.appendChild(wrapper);
    });
}

async function handleAddCard(e) {
    e.preventDefault();
    const formData = new FormData(addCardForm);
    const newCard = {};

    for (let [key, value] of formData.entries()) {
        newCard[key] = value.trim();
    }

    const template = CardTemplates[currentDeckType] || CardTemplates['standard'];
    // Fallback safe check
    if(template.fields && template.fields.length > 0) {
        const firstFieldId = template.fields[0].id;
        if (!newCard[firstFieldId]) {
            studyMessage.textContent = "Bitte das erste Feld ausfüllen.";
            return;
        }
        
        // Fokus Reset Logik
        setTimeout(() => {
             const el = document.getElementById(`input-${firstFieldId}`);
             if(el) el.focus();
        }, 100);
    }

    newCard.srsLevel = 0;
    newCard.consecutiveCorrect = 0;
    newCard.createdAt = new Date().toISOString();

    try {
        await storageService.addCardToDeck(currentDeckId, newCard);
        addCardForm.reset();
        studyMessage.textContent = "Karte hinzugefügt.";
    } catch (error) { 
        console.error(error);
        studyMessage.textContent = "Fehler beim Speichern.";
    }
}

// Clears all study-related state to prevent "ghost cards" from appearing in other decks
function resetStudyState() {
    currentCard = null;
    reviewQueue = [];
    currentDeckId = null;
    currentDeckType = 'standard';
    
    // Clear UI
    if(cardFrontText) cardFrontText.innerHTML = '';
    if(cardBackContent) cardBackContent.innerHTML = '';
    
    // Reset buttons using existing helper
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

// --- Create Deck Logic ---
function openCreateDeckModal() {
    templateSelect.innerHTML = '';
    
    Object.entries(CardTemplates).forEach(([key, tpl]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = t(tpl.nameKey); // Übersetzung!
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
    const title = formData.get('deckName').trim(); // Wichtig: trim()
    const type = formData.get('template');

    if (!title) {
        await uiShowAlert(t('common.error'), t('msg.enterName'));
        return;
    }

    // NEU: Duplikat-Check (Case-Insensitive)
    // Wir prüfen in der lokalen Liste 'cachedDecks', ob der Name schon da ist
    const exists = cachedDecks.some(d => d.title.toLowerCase() === title.toLowerCase());
    
    if (exists) {
        await uiShowAlert(t('common.error'), t('msg.deckExists'));
        return; // Abbrechen
    }

    await storageService.createDeck(title, type);
    
    createDeckModal.classList.add('opacity-0', 'pointer-events-none');
    createDeckForm.reset();
}


// --- Study & Card Logic ---

function showNextCard() {
    resetCardState(); 
    
    // FALL 1: Leeres Deck
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
        studyMessage.textContent = ""; 
        currentCard = null;
        return;
    }

    // FALL 2: Runde fertig
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
        // NEU: Nachricht übersetzen
        studyMessage.textContent = t('msg.sessionDone');
        currentCard = null;
        
        buildReviewQueue(); 
        return;
    }

    // ... (Rest der Funktion bleibt gleich) ...
    currentCard = reviewQueue.shift(); 
    if (!currentCard) { showNextCard(); return; }
    
    let useReverse = false;
    if (currentStudyMode === 'reverse') { useReverse = true; }
    else if (currentStudyMode === 'random') { useReverse = Math.random() < 0.5; }

    const displayCard = { ...currentCard };

    if (useReverse) {
        const realFront = displayCard.front || displayCard.german || '';
        const realBack = displayCard.back || displayCard.chinese || '';
        displayCard.front = realBack;
        displayCard.back = realFront;
    }
    
    const template = CardTemplates[currentDeckType] || CardTemplates['standard'];
    cardFrontText.innerHTML = template.renderFront(displayCard);
    renderMath(cardFrontText); 
    cardBackContent.innerHTML = '';
    const newBackContent = template.renderBack(displayCard);
    setTimeout(() => {
        cardBackContent.innerHTML = newBackContent;
        renderMath(cardBackContent); 
    }, 300);
    if(reviewCountEl) reviewCountEl.textContent = reviewQueue.length;
}

function buildReviewQueue() {
    reviewQueue = [];
    
    allCards.forEach(card => {
        let weight = 0;
        switch (card.srsLevel) {
            case 0: weight = 9; break; 
            case 1: weight = 6; break; 
            case 2: weight = 3; break; 
            case 3: weight = 1; break;
            case 4: weight = (Math.random() < 0.33) ? 1 : 0; break; 
            default: weight = 1;
        }
        for (let i = 0; i < weight; i++) {
            reviewQueue.push(card);
        }
    });

    if (reviewQueue.length === 0 && allCards.length > 0) {
        allCards.forEach(card => reviewQueue.push(card));
    }

    shuffleArray(reviewQueue);
    if(reviewCountEl) reviewCountEl.textContent = reviewQueue.length;
}

async function handleCardListActions(e) {
    if (e.target.classList.contains('delete-btn')) {
        const cardId = e.target.dataset.id;
        try {
            await storageService.deleteCard(currentDeckId, cardId);
            studyMessage.textContent = "Karte gelöscht.";
        } catch (error) {
            console.error(error);
        }
    }

    if (e.target.classList.contains('edit-btn')) {
        const cardId = e.target.dataset.id;
        const cardToEdit = allCards.find(c => c.id === cardId);
        
        if (cardToEdit) {
            currentEditCardId = cardId;
            
            // 1. Formular aufbauen (passend zum aktuellen Deck-Typ!)
            // Wir nutzen den Prefix 'edit-' damit die IDs eindeutig sind
            buildFormFields(currentDeckType, editDynamicFieldsContainer, 'edit-');
            
            // 2. Werte einfüllen
            // Wir gehen durch die Felder des Templates und suchen die passenden Inputs
            const template = CardTemplates[currentDeckType] || CardTemplates['standard'];
            
            template.fields.forEach(field => {
                const input = document.getElementById(`edit-${field.id}`);
                if (input) {
                    // Wert aus der Karte holen (z.B. cardToEdit.front)
                    // Fallback auf leeren String
                    input.value = cardToEdit[field.id] || '';
                    
                    // Legacy Fallback (falls Karte noch alt ist und wir 'german' statt 'front' haben)
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

    // 1. Daten dynamisch aus dem Formular holen
    const formData = new FormData(editCardForm);
    const updatedData = {};

    for (let [key, value] of formData.entries()) {
        updatedData[key] = value.trim();
    }

    // Validierung (optional: prüfen ob Pflichtfelder da sind)
    // ...

    try {
        await storageService.updateCard(currentDeckId, currentEditCardId, updatedData);
        studyMessage.textContent = "Karte aktualisiert.";
        closeEditModal();
    } catch (error) {
        console.error(error);
        alert("Fehler beim Aktualisieren: " + error.message);
    }
}

async function handleFeedback(wasCorrect) {
    if (!currentCard || !currentDeckId) return;

    // 1. Werte sicher auslesen (mit Fallback auf 0, falls undefined/null)
    // Das verhindert den "NaN" Fehler bei alten Karten.
    let srsLevel = (typeof currentCard.srsLevel === 'number') ? currentCard.srsLevel : 0;
    let consecutiveCorrect = (typeof currentCard.consecutiveCorrect === 'number') ? currentCard.consecutiveCorrect : 0;

    // 2. Neue Werte berechnen
    if (wasCorrect) {
        consecutiveCorrect++;
        
        // Logik: Alle 3 richtigen Antworten in Folge steigt man ein Level auf
        if (consecutiveCorrect >= 3 && srsLevel < 4) {
            srsLevel++;
            consecutiveCorrect = 0; // Streak Reset beim Aufstieg
        }
    } else {
        // Bei Fehler: Streak weg und Level absteigen
        consecutiveCorrect = 0;
        if (srsLevel > 0) {
            srsLevel--;
        }
    }

    // 3. Speichern
    try {
        await storageService.updateCard(currentDeckId, currentCard.id, { 
            srsLevel: srsLevel, 
            consecutiveCorrect: consecutiveCorrect 
        });
    } catch (error) {
        console.error("Fehler beim Speichern des Fortschritts:", error);
    }

    // 4. Weiter zur nächsten Karte (wenn Queue leer, neu mischen)
    if (reviewQueue.length === 0) {
        buildReviewQueue();
    }
    showNextCard();
}

// --- Helper Functions ---

function handlePinyinConvert() {
    let pinyinText = inputExtra.value;
    if (!pinyinText) return;
    inputExtra.value = convertPinyinTones(pinyinText);
}

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

function showDashboard() {
    dashboardView.classList.remove('hidden');
    studyView.classList.add('hidden');
    
    // Reset Header Title
    document.querySelector('h1').textContent = 'OmniCards';

    // --- Clean up old study session data ---
    resetStudyState(); 
    // --------------------------------------------
    
    // Stop Card Listener
    if (unsubscribeCards) {
        unsubscribeCards();
        unsubscribeCards = null;
    }
    
    // Start Deck Listener (if not running)
    if (!unsubscribeDecks && storageService.subscribeDecks) {
        unsubscribeDecks = storageService.subscribeDecks(renderDeckList);
    }
}

function showStudyView(deckId, deckTitle, deckType = 'standard') {
    resetStudyState();

    storageService.updateDeck(deckId, { lastLearnedAt: new Date().toISOString() }).catch(err => console.error("Could not update lastLearnedAt", err));
    
    dashboardView.classList.add('hidden');
    studyView.classList.remove('hidden');
    currentDeckId = deckId;
    currentDeckType = deckType || 'standard'; 
    
    buildFormFields(currentDeckType, dynamicFieldsContainer);

    updateTableHeaders(currentDeckType);

    document.querySelector('h1').textContent = deckTitle;
    
    if (storageService.subscribeCards) {
        unsubscribeCards = storageService.subscribeCards(deckId, handleDataUpdate);
    }
}

function renderDeckList(decks) {
    cachedDecks = decks;
    deckListContainer.innerHTML = '';

    const sortedDecks = [...decks].sort((a, b) => {
        switch (currentDeckSort) {
            case 'name':
                return a.title.localeCompare(b.title);
            case 'countDesc':
                return (b.cardCount || 0) - (a.cardCount || 0);
            case 'countAsc':
                return (a.cardCount || 0) - (b.cardCount || 0);
            case 'newest':
                return (b.createdAt || '').localeCompare(a.createdAt || '');
            case 'lastLearned':
            default:
                // Fallback: Wenn noch nie gelernt, behandeln wir es als ganz alt ('')
                const dateA = a.lastLearnedAt || '';
                const dateB = b.lastLearnedAt || '';
                // Absteigend sortieren (neuestes Datum zuerst)
                // Wenn Datum gleich ist, fallback auf Name
                if (dateB === dateA) return a.title.localeCompare(b.title);
                return dateB.localeCompare(dateA);
        }
    });

    sortedDecks.forEach(deck => {
        const div = document.createElement('div');
        div.className = "p-6 pr-14 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-l-4 border-blue-500 relative group";
        
        div.innerHTML = `
            <h3 class="font-bold text-xl mb-2 text-gray-800 dark:text-gray-100 break-words hyphens-auto">${deck.title}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">${deck.cardCount || 0} ${t('common.cards')}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-2 uppercase tracking-wide">${deck.type}</p>
            
            <button class="share-btn absolute top-4 right-4 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 p-2 opacity-0 group-hover:opacity-100 transition" title="Veröffentlichen">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
            </button>
        `;
        
        div.addEventListener('click', (e) => {
             if(!e.target.closest('.share-btn')) {
                 showStudyView(deck.id, deck.title, deck.type);
             }
        });

        const shareBtn = div.querySelector('.share-btn');
        shareBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const confirmed = await uiShowConfirm(t('dialog.publish.title'), t('dialog.publish.msg', {title: deck.title}));

            if (confirmed) {
                try {
                    await storageService.publishDeckFull(deck.id, deck);
                    await uiShowAlert(t('common.success'), t('msg.deckPublished'));
                } catch (err) {
                    console.error(err);
                    await uiShowAlert(t('common.error'), err.message);
                }
            }
        });

        deckListContainer.appendChild(div);
    });
}

function switchTab(tab) {
    // Definition der Klassen für aktiven und inaktiven Zustand (inkl. Dark Mode)
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
        // 1. Meine Decks -> AKTIV
        tabMyDecks.classList.add(...activeClasses);
        tabMyDecks.classList.remove(...inactiveClasses);

        // 2. Community -> INAKTIV
        tabCommunity.classList.remove(...activeClasses);
        tabCommunity.classList.add(...inactiveClasses);
        
        // 3. Views umschalten
        myDecksSection.classList.remove('hidden');
        communitySection.classList.add('hidden');
    } else {
        // 1. Community -> AKTIV
        tabCommunity.classList.add(...activeClasses);
        tabCommunity.classList.remove(...inactiveClasses);

        // 2. Meine Decks -> INAKTIV
        tabMyDecks.classList.remove(...activeClasses);
        tabMyDecks.classList.add(...inactiveClasses);

        // 3. Views umschalten
        myDecksSection.classList.add('hidden');
        communitySection.classList.remove('hidden');
        
        // Daten laden
        loadPublicDecks();
    }
}

function loadPublicDecks() {
    if (unsubscribeDecks && storageService.subscribePublicDecks) {
        // Wir nutzen den Listener, um die Daten aktuell zu halten
        storageService.subscribePublicDecks((decks) => {
            allPublicDecks = decks; // Speichern
            renderPublicDeckList(); // Anzeigen (mit aktuellem Filter)
        });
    }
}

// Utils
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

function getLevelColorClass(srsLevel, consecutiveCorrect) {
    switch (srsLevel) {
        case 0: return (consecutiveCorrect === 0) ? 'bg-red-500' : 'bg-red-300';
        case 1: return 'bg-orange-300';
        case 2: return 'bg-yellow-200';
        case 3: return 'bg-green-400';
        case 4: return 'bg-green-600 text-white';
        default: return 'bg-gray-100';
    }
}

function renderCardList() {
    cardListBody.innerHTML = ''; 
    const sortedCards = [...allCards]; 
    
    // ... Sortierlogik hier (vereinfacht für Übersicht) ...
    const { column, direction } = currentSort;
    sortedCards.sort((a, b) => {
        let valA, valB;

        // Werte basierend auf Spalte holen (mit Fallbacks für alte Daten)
        switch (column) {
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
                // Bei Level sortieren wir erst nach Level, dann nach Success-Count
                if (a.srsLevel !== b.srsLevel) {
                    return direction === 'asc' ? a.srsLevel - b.srsLevel : b.srsLevel - a.srsLevel;
                }
                return direction === 'asc' ? a.consecutiveCorrect - b.consecutiveCorrect : b.consecutiveCorrect - a.consecutiveCorrect;
            default:
                valA = (a[column] || '').toString().toLowerCase();
                valB = (b[column] || '').toString().toLowerCase();
        }

        // String Vergleich für Text-Spalten
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    if (sortedCards.length === 0) {
        cardListBody.innerHTML = `<tr><td colspan="6" class="px-4 py-4 text-center text-gray-500">${t('table.noCards')}</td></tr>`; // Übersetzung!
        return;
    }

    updateSortIndicators();
    
    sortedCards.forEach((card, index) => {
        const colorClass = getLevelColorClass(card.srsLevel, card.consecutiveCorrect);
        const tr = document.createElement('tr');
        tr.className = `${colorClass} transition-colors duration-300`; 
        
        const displayFront = card.front || card.german || '?';
        const displayBack = card.back || card.chinese || '?';
        const displayExtra = card.extra || card.note || card.pinyin || '';

        // NEU: Wir packen den Inhalt in ein Div mit line-clamp-2
        // 'break-words' sorgt dafür, dass lange Wörter ohne Leerzeichen umbrechen
        // 'min-w-[150px]' gibt der Spalte eine Mindestbreite, damit sie nicht kollabiert
        const cellClass = "line-clamp-2 overflow-hidden break-words max-w-[200px] max-h-[3em]";

        tr.innerHTML = `
            <td class="px-2 py-3 text-sm text-gray-500 dark:text-gray-400 align-top">${index + 1}</td>
            
            <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 align-top">
                <div class="${cellClass}" title="${displayFront.replace(/"/g, '&quot;')}">${displayFront}</div>
            </td>
            
            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 align-top">
                <div class="${cellClass}" title="${displayBack.replace(/"/g, '&quot;')}">${displayBack}</div>
            </td>
            
            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 align-top">
                <div class="${cellClass}" title="${displayExtra.replace(/"/g, '&quot;')}">${displayExtra}</div>
            </td>
            
            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 align-top">
                <span class="font-bold">${card.srsLevel}</span>
                <span class="text-xs text-gray-400 dark:text-gray-500 ml-1 block">(Streak: ${card.consecutiveCorrect || 0})</span>
            </td>
            
            <td class="px-4 py-3 text-sm align-top">
                <div class="flex flex-col sm:flex-row gap-2">
                    <button data-id="${card.id}" class="edit-btn text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">Edit</button>
                    <button data-id="${card.id}" class="delete-btn text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium">Löschen</button>
                </div>
            </td>
        `;
        cardListBody.appendChild(tr);
    });

    renderMath(cardListBody); 
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

function buildAndShowQueueModal() {
    if (!reviewQueue || reviewQueue.length === 0) {
        queueListContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Warteschlange leer.</p>';
    } else {
        queueListContainer.innerHTML = reviewQueue.map((card, index) => `
            <div class="p-2 border-b dark:border-gray-700 flex justify-between">
                <span class="text-gray-800 dark:text-gray-200">${index + 1}. ${card.front || card.german}</span>
                <span class="text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 rounded">Lvl: ${card.srsLevel}</span>
            </div>
        `).join('');
    }
    openQueueModal();
}

function handleRebuildQueue() {
    studyMessage.textContent = "Mische...";
    buildReviewQueue();
    showNextCard();     
    setTimeout(() => {
        studyMessage.textContent = reviewQueue.length > 0 ? "Bereit!" : "Keine Karten.";
    }, 300);
}

function initTheme() {
    // Prüfen ob gespeichert oder System-Einstellung
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
    // Einfache UI Logik für den Toggle
    if (isDark) {
        // Knob nach rechts
        darkModeKnob.classList.add('translate-x-6');
        darkModeKnob.classList.remove('translate-x-1');
        // Hintergrund Blau
        darkModeToggle.classList.add('bg-blue-600');
        darkModeToggle.classList.remove('bg-gray-200');
    } else {
        // Knob nach links
        darkModeKnob.classList.add('translate-x-1');
        darkModeKnob.classList.remove('translate-x-6');
        // Hintergrund Grau
        darkModeToggle.classList.add('bg-gray-200');
        darkModeToggle.classList.remove('bg-blue-600');
    }
}

// --- Preview Logic ---

async function openPreviewModal(deck) {
    currentPreviewDeckId = deck.id;
    
    // 1. UI Reset & Öffnen
    previewTitle.textContent = deck.title;
    previewMeta.textContent = `${t('comm.createdBy')} ${deck.originalAuthor} • ${deck.type} • ${deck.cardCount} ${t('common.cards')}`;
    previewCardsList.innerHTML = `<p class="text-gray-500 dark:text-gray-400 italic">${t('comm.loading')}</p>`;
    
    previewModal.classList.remove('opacity-0', 'pointer-events-none');
    previewModal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');

    // 2. Daten laden
    try {
        const sampleCards = await storageService.getPublicDeckPreview(deck.id);
        renderPreviewCards(sampleCards, deck.type);
    } catch (err) {
        console.error(err);
        previewCardsList.innerHTML = '<p class="text-red-500">Fehler beim Laden der Vorschau.</p>';
    }
}

function renderPreviewCards(cards, deckType) {
    previewCardsList.innerHTML = '';
    
    if (cards.length === 0) {
        previewCardsList.innerHTML = `<p class="text-gray-500">${t('comm.emptyDeck')}</p>`;
        return;
    }

    const template = CardTemplates[deckType] || CardTemplates['standard'];

    cards.forEach(card => {
        const div = document.createElement('div');
        div.className = "p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex flex-col sm:flex-row gap-2 sm:items-center justify-between";
        
        // Wir nutzen einfache Text-Darstellung statt komplexem HTML-Render für die Liste
        // Aber wir nutzen die Template-Felderlogik um die richtigen Daten zu greifen
        // Da templates.js renderFront HTML zurückgibt, ist es sicherer, direkt auf die Daten zuzugreifen.
        
        // Einfacher Fallback für Preview:
        const front = card.front || card.german || '?';
        const back = card.back || card.chinese || '?';
        
        div.innerHTML = `
            <div class="font-medium text-gray-800 dark:text-gray-200 truncate w-full sm:w-1/2">${front}</div>
            <div class="text-gray-600 dark:text-gray-400 truncate w-full sm:w-1/2 sm:text-right">➔ ${back}</div>
        `;
        previewCardsList.appendChild(div);
    });
    
    // Info, dass es nur ein Auszug ist
    const info = document.createElement('p');
    info.className = "text-xs text-center text-gray-400 mt-2";
    info.textContent = "... und weitere Karten.";
    previewCardsList.appendChild(info);
}

function closePreviewModal() {
    previewModal.classList.add('opacity-0', 'pointer-events-none');
    previewModal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0');
    currentPreviewDeckId = null;
}

async function handlePreviewImport() {
    if (!currentPreviewDeckId) return;
    
    // Button Loading State
    const originalText = previewImportBtn.textContent;
    previewImportBtn.textContent = t('btn.importing');
    previewImportBtn.disabled = true;

    try {
        await storageService.importDeck(currentPreviewDeckId);
        closePreviewModal();
        await uiShowAlert(t('common.success'), t('msg.deckImported')); // Hier ist Feedback gut
        switchTab('my-decks');
    } catch (err) {
        console.error(err);
        await uiShowAlert(t('common.error'), err.message);
    } finally {
        previewImportBtn.textContent = originalText;
        previewImportBtn.disabled = false;
    }
}

// --- Modal Helpers ---
function openModal() { settingsModal.classList.remove('opacity-0', 'pointer-events-none'); modalContent.classList.remove('scale-95', 'opacity-0'); }
function closeModal() { settingsModal.classList.add('opacity-0', 'pointer-events-none'); modalContent.classList.add('scale-95', 'opacity-0'); }
function openEditModal() { editCardModal.classList.remove('opacity-0', 'pointer-events-none'); editModalContent.classList.remove('scale-95', 'opacity-0'); }
function closeEditModal() { editCardModal.classList.add('opacity-0', 'pointer-events-none'); editModalContent.classList.add('scale-95', 'opacity-0'); currentEditCardId = null; }
function openQueueModal() { queueModal.classList.remove('opacity-0', 'pointer-events-none'); queueModalContent.classList.remove('scale-95', 'opacity-0'); }
function closeQueueModal() { queueModal.classList.add('opacity-0', 'pointer-events-none'); queueModalContent.classList.add('scale-95', 'opacity-0'); }

function renderPublicDeckList() {
    publicDeckListContainer.innerHTML = '';
    
    // 1. Inputs lesen
    const searchTerm = publicSearchInput ? publicSearchInput.value.toLowerCase().trim() : '';
    const filterMode = publicFilterSelect ? publicFilterSelect.value : 'all'; // 'all', 'mine', 'others'
    
    // 2. Filtern
    let filteredDecks = allPublicDecks.filter(deck => {
        const isMyDeck = currentUser && deck.originalAuthorId === currentUser.uid;

        // A. Text-Suche
        const matchesSearch = !searchTerm || (
            (deck.title || '').toLowerCase().includes(searchTerm) ||
            (deck.originalAuthor || '').toLowerCase().includes(searchTerm) ||
            (deck.type || '').toLowerCase().includes(searchTerm)
        );

        // B. Besitz-Filter
        let matchesFilter = true;
        if (filterMode === 'mine') matchesFilter = isMyDeck;
        if (filterMode === 'others') matchesFilter = !isMyDeck;

        return matchesSearch && matchesFilter;
    });

    // 3. Sortieren (unverändert)
    const sortMode = publicSortSelect ? publicSortSelect.value : 'newest';
    filteredDecks.sort((a, b) => {
        switch (sortMode) {
            case 'name': return a.title.localeCompare(b.title);
            case 'oldest': return (a.publishedAt || '').localeCompare(b.publishedAt || '');
            case 'cards': return (b.cardCount || 0) - (a.cardCount || 0);
            case 'newest': default: return (b.publishedAt || '').localeCompare(a.publishedAt || '');
        }
    });

    // 4. Empty State
    if (filteredDecks.length === 0) {
        publicDeckListContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">Keine Decks gefunden.</p>';
        return;
    }

    // 5. Rendern
    filteredDecks.forEach(deck => {
        const div = document.createElement('div');
        const isMyDeck = currentUser && deck.originalAuthorId === currentUser.uid;

        // VISUELLE TRENNUNG:
        // Eigene Decks bekommen einen blauen Rand, fremde Decks einen grauen.
        const borderClass = isMyDeck 
            ? "border-blue-300 dark:border-blue-700 ring-1 ring-blue-100 dark:ring-blue-900" 
            : "border-gray-200 dark:border-gray-700";

        div.className = `p-6 bg-white dark:bg-gray-800 rounded-lg shadow border ${borderClass} transition-all`;
        
        let actionBtnHtml = '';
        
        if (isMyDeck) {
            // Fall 1: Mein Deck -> Vorschau UND Löschen
            actionBtnHtml = `
                <div class="flex space-x-2">
                    <button class="preview-btn bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 px-3 py-1 rounded text-sm font-medium transition" title="${t('btn.preview')}" data-id="${deck.id}">
                        👁
                    </button>
                    <button class="delete-public-btn bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-800 px-3 py-1 rounded text-sm font-medium transition" title="${t('btn.delete')}" data-id="${deck.id}">
                        🗑
                    </button>
                </div>`;
        } else {
            // Fall 2: Fremdes Deck -> Vorschau UND Importieren
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
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-xl text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        ${deck.title}
                        ${isMyDeck ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-200">Du</span>' : ''}
                    </h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${t('comm.createdBy')} ${deck.originalAuthor}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-2 uppercase tracking-wide">${deck.type} • ${deck.cardCount} ${t('common.cards')}</p>
                </div>
                ${actionBtnHtml}
            </div>
        `;

        // Event Listener hinzufügen
        // 1. VORSCHAU (Gilt jetzt für BEIDE Fälle)
        const previewBtn = div.querySelector('.preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openPreviewModal(deck);
            });
        }

        if (isMyDeck) {
            // 2. LÖSCHEN (Nur bei mir)
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
        } else {
            // 3. IMPORTIEREN (Nur bei anderen)
            div.querySelector('.import-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await uiShowConfirm(t('dialog.import.title'), t('dialog.import.msg', {title: deck.title}));

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
        
        publicDeckListContainer.appendChild(div);
    });
}

function updateSortIndicators() {
    // 1. Alle Header mit Sortier-Funktion suchen
    const headers = document.querySelectorAll('th[data-sort]');
    
    headers.forEach(th => {
        const column = th.dataset.sort;
        const indicator = th.querySelector('.sort-indicator');
        
        // Prüfen: Ist das die aktuelle Spalte?
        if (column === currentSort.column) {
            // Pfeil setzen
            indicator.textContent = currentSort.direction === 'asc' ? ' ▲' : ' ▼';
            // Optional: Farbe hervorheben (aktive Spalte)
            th.classList.add('text-blue-600', 'dark:text-blue-400');
            th.classList.remove('text-gray-500', 'dark:text-gray-300');
        } else {
            // Pfeil entfernen
            indicator.textContent = '';
            // Farbe zurücksetzen
            th.classList.remove('text-blue-600', 'dark:text-blue-400');
            th.classList.add('text-gray-500', 'dark:text-gray-300');
        }
    });
}

function updateTableHeaders(deckType) {
    if (!cardTableHeaderRow) return;

    const template = CardTemplates[deckType] || CardTemplates['standard'];
    
    // NEU: Index Header übersetzen? Oder '#' lassen.
    let html = `<th class="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>`;

    const sortKeys = ['front', 'back', 'extra'];
    
    template.fields.forEach((field, index) => {
        const sortKey = sortKeys[index] || field.id; 
        
        html += `
            <th data-sort="${sortKey}" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-white">
                ${t(field.label)} <span class="sort-indicator"></span>
            </th>
        `;
    });

    // NEU: Level & Actions Header übersetzen
    html += `
        <th data-sort="level" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-white">
            ${t('table.level')} <span class="sort-indicator"></span>
        </th>
        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">${t('table.actions')}</th>
    `;

    cardTableHeaderRow.innerHTML = html;
}

// --- Custom Dialog System (Alert/Confirm/Prompt Replacement) ---
function openDialog(title, message, type = 'alert', placeholder = '') {
    return new Promise((resolve) => {
        dialogResolve = resolve;

        // 1. Content setzen
        dialogTitle.textContent = title;
        dialogMessage.textContent = message;
        dialogInput.value = '';

        // 2. UI anpassen je nach Typ
        dialogInputContainer.classList.add('hidden');
        dialogCancelBtn.classList.remove('hidden');
        dialogConfirmBtn.className = "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-sm font-medium"; // Reset styles
        dialogConfirmBtn.textContent = "OK";

        if (type === 'alert') {
            dialogCancelBtn.classList.add('hidden'); // Alert hat kein Cancel
        } else if (type === 'confirm-danger') {
            dialogConfirmBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            dialogConfirmBtn.classList.add('bg-red-600', 'hover:bg-red-700');
            dialogConfirmBtn.textContent = "Löschen";
        } else if (type === 'prompt') {
            dialogInputContainer.classList.remove('hidden');
            dialogInput.placeholder = placeholder;
            dialogConfirmBtn.textContent = "Speichern";
        }

        // 3. Anzeigen
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

// Event Listeners für Dialog (Einmalig registrieren!)
if(dialogConfirmBtn) {
    dialogConfirmBtn.addEventListener('click', () => {
        // Bei Prompt den Text zurückgeben, sonst true
        const value = (!dialogInputContainer.classList.contains('hidden')) ? dialogInput.value : true;
        closeDialog(value);
    });
}
if(dialogCancelBtn) {
    dialogCancelBtn.addEventListener('click', () => closeDialog(false)); // Cancel = false
}
// Enter im Input bestätigt auch
if(dialogInput) {
    dialogInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') dialogConfirmBtn.click();
    });
}

// Wrapper Functions for easier usage
async function uiShowAlert(title, message) {
    await openDialog(title, message, 'alert');
}

async function uiShowConfirm(title, message, isDangerous = false) {
    return await openDialog(title, message, isDangerous ? 'confirm-danger' : 'confirm');
}

async function uiShowPrompt(title, message, placeholder = '') {
    return await openDialog(title, message, 'prompt', placeholder);
}