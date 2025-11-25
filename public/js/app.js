import { createLocalStorageService, createFirebaseService } from './storage.js';
import { convertPinyinTones } from './utils.js';
import { CardTemplates } from './templates.js';

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
let currentSort = { column: 'german', direction: 'asc' };

let allCards = []; 
let reviewQueue = []; 
let currentCard = null; 
let currentDeckType = 'standard';

let currentUser = null; // Speichert das User-Objekt

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
const studyMessage = document.getElementById('study-message');

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
const editFrontInput = document.getElementById('edit-front');
const editBackInput = document.getElementById('edit-back');
const editExtraInput = document.getElementById('edit-extra');
const convertEditPinyinBtn = document.getElementById('convert-edit-pinyin-btn');

const queueModal = document.getElementById('queue-modal');
const queueModalContent = document.getElementById('queue-modal-content');
const closeQueueModalBtn = document.getElementById('close-queue-modal-btn');
const queueListContainer = document.getElementById('queue-list-container');


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Firebase Init
    storageService = createFirebaseService((user) => {
        currentUser = user;
        if (user) {
            console.log("User logged in:", user.uid);
            
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
            console.log("User not logged in");
            if(loginBtn) loginBtn.classList.remove('hidden');
            if(userDisplayName) userDisplayName.classList.add('hidden');
            if(logoutBtn) logoutBtn.classList.add('hidden');
            if(userAvatar) userAvatar.classList.add('hidden');
            if(userAvatarPlaceholder) userAvatarPlaceholder.classList.add('hidden');
            
            deckListContainer.innerHTML = '<p class="text-center p-8 text-gray-500">Bitte logge dich ein.</p>';
        }
    }, userIdEl, firebaseErrorContainer, unsubscribeRef);

    storageService.init();

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
    if(editExtraInput) editExtraInput.addEventListener('keyup', handlePinyinKeyup);
    
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
    if(convertEditPinyinBtn) convertEditPinyinBtn.addEventListener('click', handleEditPinyinConvert);

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
});


// --- Logic Functions ---

async function handleRenameDeck() {
    if (!currentDeckId) return;

    // Aktuellen Titel aus der H1 lesen (Hack, aber effizient)
    const oldTitle = document.querySelector('h1').textContent;

    const newTitle = prompt("Neuer Name für das Deck:", oldTitle);

    if (newTitle && newTitle.trim() !== "" && newTitle !== oldTitle) {
        try {
            await storageService.updateDeck(currentDeckId, { title: newTitle.trim() });

            // UI sofort aktualisieren
            document.querySelector('h1').textContent = newTitle.trim();
            studyMessage.textContent = "Deck umbenannt.";

            // Hinweis: Die Deck-Liste im Dashboard aktualisiert sich automatisch dank onSnapshot!
        } catch (error) {
            console.error(error);
            alert("Fehler beim Umbenennen: " + error.message);
        }
    }
}

// Abstracted Data Update Function
function handleDataUpdate(cards) {
    allCards = cards;
    renderCardList();
    if(deckCountEl) deckCountEl.textContent = allCards.length;
    buildReviewQueue();
    if (!currentCard) { 
        showNextCard();
    }
}

function buildFormFields(templateKey, containerElement) {
    const template = CardTemplates[templateKey] || CardTemplates['standard'];
    containerElement.innerHTML = ''; 

    template.fields.forEach(field => {
        const wrapper = document.createElement('div');
        wrapper.className = "flex flex-col";

        const label = document.createElement('label');
        label.className = "block text-sm font-medium text-gray-700 mb-1";
        label.textContent = field.label;
        wrapper.appendChild(label);

        const inputGroup = document.createElement('div');
        inputGroup.className = "flex";

        const input = document.createElement('input');
        input.type = field.type || 'text';
        input.name = field.id; 
        input.id = `input-${field.id}`;
        input.placeholder = field.placeholder || '';
        input.className = "w-full p-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 " + (field.hasAction ? "rounded-l-lg" : "rounded-lg");

        if (field.id === 'pinyin') {
             input.addEventListener('keyup', handlePinyinKeyup);
        }

        inputGroup.appendChild(input);

        if (field.hasAction) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = field.actionLabel;
            btn.className = "px-3 py-2 bg-gray-200 text-gray-700 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-300 text-sm";
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
    if(studyMessage) studyMessage.textContent = '';
    
    // Reset buttons using existing helper
    resetCardState();
}

async function handleDeleteDeck() {
    if (!currentDeckId) return;

    // Sicherheitsabfrage
    const confirmDelete = confirm("Bist du sicher, dass du dieses Deck und ALLE seine Karten unwiderruflich löschen möchtest?");
    if (!confirmDelete) return;

    // Zweite Sicherheitsabfrage (weil Löschen endgültig ist)
    // const reallySure = confirm("Wirklich? Es gibt kein Zurück!"); // Optional, wenn du willst

    try {
        await storageService.deleteDeckFull(currentDeckId);
        alert("Deck erfolgreich gelöscht.");
        showDashboard(); // Zurück zur Übersicht
    } catch (error) {
        console.error(error);
        alert("Fehler beim Löschen: " + error.message);
    }
}

// --- Create Deck Logic ---
function openCreateDeckModal() {
    templateSelect.innerHTML = '';
    
    Object.entries(CardTemplates).forEach(([key, tpl]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = tpl.name;
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
        templateDesc.textContent = CardTemplates[key].description;
    }
}

async function handleCreateDeckSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(createDeckForm);
    const title = formData.get('deckName');
    const type = formData.get('template');

    if (!title) return;

    await storageService.createDeck(title, type);
    
    createDeckModal.classList.add('opacity-0', 'pointer-events-none');
    createDeckForm.reset();
}


// --- Study & Card Logic ---

function showNextCard() {
    resetCardState(); 
    
    // 1. Check Empty
    if (!reviewQueue || reviewQueue.length === 0) {
        cardFrontText.innerHTML = '<span class="text-2xl text-gray-700">Gut gemacht!</span>';
        cardBackContent.innerHTML = ''; 
        showButton.style.display = 'none';
        studyMessage.textContent = "Alle Karten für diese Runde gelernt.";
        currentCard = null;
        
        buildReviewQueue(); 
        return;
    }

    // 2. Get Card
    currentCard = reviewQueue.shift(); 
    if (!currentCard) { 
        showNextCard(); 
        return;
    }
    
    // 3. Template Render
    const template = CardTemplates[currentDeckType] || CardTemplates['standard'];

    cardFrontText.innerHTML = template.renderFront(currentCard);
    renderMath(cardFrontText); 
    
    cardBackContent.innerHTML = '';
    const newBackContent = template.renderBack(currentCard);
    
    // 4. Backside Delay
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
            // Simple mapping fallback
            editFrontInput.value = cardToEdit.front || cardToEdit.german || '';
            editBackInput.value = cardToEdit.back || cardToEdit.chinese || '';
            editExtraInput.value = cardToEdit.extra || cardToEdit.pinyin || '';
            openEditModal();
        }
    }
}

async function handleUpdateCard(e) {
    e.preventDefault();
    if (!currentEditCardId || !currentDeckId) return;

    const updatedData = {
        front: editFrontInput.value.trim(),
        back: editBackInput.value.trim(),
        extra: editExtraInput.value.trim(),
        // Legacy
        german: editFrontInput.value.trim(),
        chinese: editBackInput.value.trim(),
        pinyin: editExtraInput.value.trim()
    };

    try {
        await storageService.updateCard(currentDeckId, currentEditCardId, updatedData);
        studyMessage.textContent = "Karte aktualisiert.";
        closeEditModal();
    } catch (error) {
        console.error(error);
    }
}

async function handleFeedback(wasCorrect) {
    if (!currentCard || !currentDeckId) return;

    let { id, srsLevel, consecutiveCorrect } = currentCard;
    
    if (wasCorrect) {
        consecutiveCorrect++;
        if (consecutiveCorrect >= 3 && srsLevel < 4) {
            srsLevel++;
            consecutiveCorrect = 0; 
        }
    } else {
        consecutiveCorrect = 0;
        if (srsLevel > 0) srsLevel--;
    }

    try {
        await storageService.updateCard(currentDeckId, id, { srsLevel, consecutiveCorrect });
    } catch (error) {
        console.error(error);
    }

    if (reviewQueue.length === 0) buildReviewQueue();
    showNextCard();
}

// --- Helper Functions ---

function handlePinyinConvert() {
    let pinyinText = inputExtra.value;
    if (!pinyinText) return;
    inputExtra.value = convertPinyinTones(pinyinText);
}

function handleEditPinyinConvert() {
    let pinyinText = editExtraInput.value;
    if (!pinyinText) return;
    editExtraInput.value = convertPinyinTones(pinyinText);
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
    
    dashboardView.classList.add('hidden');
    studyView.classList.remove('hidden');
    currentDeckId = deckId;
    currentDeckType = deckType || 'standard'; 
    
    buildFormFields(currentDeckType, dynamicFieldsContainer);

    document.querySelector('h1').textContent = deckTitle;
    
    if (storageService.subscribeCards) {
        unsubscribeCards = storageService.subscribeCards(deckId, handleDataUpdate);
    }
}

function renderDeckList(decks) {
    deckListContainer.innerHTML = '';
    decks.forEach(deck => {
        const div = document.createElement('div');
        div.className = "p-6 bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer border-l-4 border-blue-500 relative group";
        
        div.innerHTML = `
            <h3 class="font-bold text-xl mb-2">${deck.title}</h3>
            <p class="text-sm text-gray-500">${deck.cardCount || 0} Karten</p>
            <p class="text-xs text-gray-400 mt-2 uppercase tracking-wide">${deck.type}</p>
            
            <button class="share-btn absolute top-4 right-4 text-gray-400 hover:text-blue-600 p-2 opacity-0 group-hover:opacity-100 transition" title="Veröffentlichen">
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
            if (confirm(`Deck "${deck.title}" veröffentlichen?`)) {
                try {
                    await storageService.publishDeckFull(deck.id, deck);
                    alert("Veröffentlicht!");
                } catch (err) {
                    console.error(err);
                    alert("Fehler: " + err.message);
                }
            }
        });

        deckListContainer.appendChild(div);
    });
}

function switchTab(tab) {
    if (tab === 'my-decks') {
        tabMyDecks.classList.add('border-blue-600', 'text-blue-600', 'font-bold');
        tabMyDecks.classList.remove('text-gray-500');
        tabCommunity.classList.remove('border-blue-600', 'text-blue-600', 'font-bold');
        tabCommunity.classList.add('text-gray-500');
        
        myDecksSection.classList.remove('hidden');
        communitySection.classList.add('hidden');
    } else {
        tabCommunity.classList.add('border-blue-600', 'text-blue-600', 'font-bold');
        tabCommunity.classList.remove('text-gray-500');
        tabMyDecks.classList.remove('border-blue-600', 'text-blue-600', 'font-bold');
        tabMyDecks.classList.add('text-gray-500');

        myDecksSection.classList.add('hidden');
        communitySection.classList.remove('hidden');
        loadPublicDecks();
    }
}

function loadPublicDecks() {
    if (unsubscribeDecks && storageService.subscribePublicDecks) {
        // Hier nutzen wir einen neuen Listener
        storageService.subscribePublicDecks((decks) => {
            publicDeckListContainer.innerHTML = '';
            if (decks.length === 0) {
                publicDeckListContainer.innerHTML = '<p class="text-gray-500">Keine Decks gefunden.</p>';
                return;
            }
            decks.forEach(deck => {
                const div = document.createElement('div');
                div.className = "p-6 bg-white rounded-lg shadow border border-gray-200";
                
                // Prüfen: Gehört das Deck mir?
                const isMyDeck = currentUser && deck.originalAuthorId === currentUser.uid;

                // Button HTML: Entweder Löschen (Rot) oder Importieren (Grün)
                let actionBtnHtml = '';
                if (isMyDeck) {
                    actionBtnHtml = `
                        <button class="delete-public-btn bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded text-sm font-medium transition" data-id="${deck.id}">
                            🗑 Löschen
                        </button>`;
                } else {
                    actionBtnHtml = `
                        <button class="import-btn bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded text-sm font-medium transition" data-id="${deck.id}">
                            ⬇ Importieren
                        </button>`;
                }

                div.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-bold text-xl text-gray-800">${deck.title}</h3>
                            <p class="text-sm text-gray-500 mt-1">von ${deck.originalAuthor} ${isMyDeck ? '(Du)' : ''}</p>
                            <p class="text-xs text-gray-400 mt-2 uppercase tracking-wide">${deck.type} • ${deck.cardCount} Karten</p>
                        </div>
                        ${actionBtnHtml}
                    </div>
                `;

                // Event Listener hinzufügen
                if (isMyDeck) {
                    div.querySelector('.delete-public-btn').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (confirm(`Möchtest du dein öffentliches Deck "${deck.title}" wirklich löschen?`)) {
                            try {
                                await storageService.deletePublicDeck(deck.id);
                                alert("Deck vom Marktplatz entfernt.");
                            } catch (err) {
                                console.error(err);
                                alert("Fehler: " + err.message);
                            }
                        }
                    });
                } else {
                    div.querySelector('.import-btn').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (confirm(`"${deck.title}" importieren?`)) {
                            try {
                                await storageService.importDeck(deck.id);
                                alert("Importiert!");
                                switchTab('my-decks');
                            } catch (err) {
                                console.error(err);
                                alert("Fehler beim Import.");
                            }
                        }
                    });
                }
                
                publicDeckListContainer.appendChild(div);
            });
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
    studyMessage.textContent = "";
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
         const valA = (a[column] || a.front || '').toLowerCase();
         const valB = (b[column] || b.front || '').toLowerCase();
         return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    if (sortedCards.length === 0) {
        cardListBody.innerHTML = '<tr><td colspan="6" class="px-4 py-4 text-center text-gray-500">Keine Karten.</td></tr>';
        return;
    }
    
    sortedCards.forEach((card, index) => {
        const colorClass = getLevelColorClass(card.srsLevel, card.consecutiveCorrect);
        const tr = document.createElement('tr');
        tr.className = `${colorClass} transition-colors duration-300`; 
        
        const displayFront = card.front || card.german || '?';
        const displayBack = card.back || card.chinese || '?';
        const displayExtra = card.extra || card.pinyin || '';

        tr.innerHTML = `
            <td class="px-2 py-3 text-sm text-gray-500">${index + 1}</td>
            <td class="px-4 py-3 text-sm font-medium text-gray-900">${displayFront}</td>
            <td class="px-4 py-3 text-sm text-gray-700">${displayBack}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${displayExtra}</td>
            <td class="px-4 py-3 text-sm text-gray-600">${card.srsLevel}</td>
            <td class="px-4 py-3 text-sm">
                <button data-id="${card.id}" class="edit-btn text-blue-600 hover:text-blue-800 font-medium mr-3">Edit</button>
                <button data-id="${card.id}" class="delete-btn text-red-600 hover:text-red-800 font-medium">Löschen</button>
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
        queueListContainer.innerHTML = '<p class="text-gray-500">Warteschlange leer.</p>';
    } else {
        queueListContainer.innerHTML = reviewQueue.map((card, index) => `
            <div class="p-2 border-b flex justify-between">
                <span>${index + 1}. ${card.front || card.german}</span>
                <span class="text-xs bg-gray-100 px-2 rounded">Lvl: ${card.srsLevel}</span>
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

// --- Modal Helpers ---
function openModal() { settingsModal.classList.remove('opacity-0', 'pointer-events-none'); modalContent.classList.remove('scale-95', 'opacity-0'); }
function closeModal() { settingsModal.classList.add('opacity-0', 'pointer-events-none'); modalContent.classList.add('scale-95', 'opacity-0'); }
function openEditModal() { editCardModal.classList.remove('opacity-0', 'pointer-events-none'); editModalContent.classList.remove('scale-95', 'opacity-0'); }
function closeEditModal() { editCardModal.classList.add('opacity-0', 'pointer-events-none'); editModalContent.classList.add('scale-95', 'opacity-0'); currentEditCardId = null; }
function openQueueModal() { queueModal.classList.remove('opacity-0', 'pointer-events-none'); queueModalContent.classList.remove('scale-95', 'opacity-0'); }
function closeQueueModal() { queueModal.classList.add('opacity-0', 'pointer-events-none'); queueModalContent.classList.add('scale-95', 'opacity-0'); }