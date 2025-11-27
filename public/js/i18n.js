// public/js/i18n.js

const translations = {
    de: {
        // Navigation & Header
        "nav.myDecks": "Meine Decks",
        "nav.community": "Community / Marktplatz",
        "auth.login": "Login mit Google",
        "auth.logout": "Logout",
        "auth.guest": "Gast",
        
        // Dashboard
        "dash.desc": "Lerne deine eigenen Karten.",
        "dash.newDeck": "+ Neues Deck",
        "dash.empty": "Noch keine Decks. Erstelle eines!",
        
        // Community
        "comm.desc": "Entdecke Decks von anderen Nutzern und importiere sie.",
        "comm.loading": "Lade Community Decks...",
        "comm.searchPlaceholder": "Suche nach Titel, Thema oder Autor...",
        "comm.filter.all": "Alle Decks",
        "comm.filter.mine": "Meine Uploads",
        "comm.filter.others": "Von Anderen",
        "comm.emptyDeck": "Dieses Deck ist leer.",
        "comm.createdBy": "Erstellt von",
        "comm.loadingExamples": "Lade Beispiele...",
        
        // Deck Cards & Actions
        "btn.preview": "Vorschau",
        "btn.import": "Import",
        "btn.importing": "Importiere...",
        "btn.delete": "Löschen",
        "btn.rename": "Umbenennen",
        "btn.share": "Veröffentlichen",
        
        // Study View
        "study.back": "← Zurück zur Übersicht",
        "study.addCard": "Neue Karte hinzufügen",
        "study.btnAdd": "Karte hinzufügen",
        "study.learn": "Lernen",
        "study.queue": "Warteschlange",
        "study.showAnswer": "Lösung anzeigen",
        "study.wrong": "Falsch / Nicht gewusst",
        "study.right": "Richtig / Gewusst",
        "study.reset": "Stapel neu mischen (Reset)",
        "study.allCards": "Alle meine Karten",
        
        // Table Headers
        "table.front": "Vorderseite",
        "table.back": "Rückseite",
        "table.info": "Info",
        "table.level": "Level",
        "table.actions": "Aktionen",
        "table.noCards": "Keine Karten vorhanden.",
        "table.edit": "Bearbeiten",
        "table.delete": "Löschen",
        
        // Modals & Dialogs
        "modal.settings": "Einstellungen",
        "modal.darkmode": "Dunkelmodus",
        "modal.darkmode.desc": "Augenschonendes Design.",
        "modal.lang": "Sprache / Language",
        "modal.lang.desc": "Wähle die App-Sprache.",
        "modal.createDeck": "Neues Deck erstellen",
        "modal.deckName": "Name des Decks",
        "modal.template": "Vorlage wählen",
        "modal.cancel": "Abbrechen",
        "modal.create": "Erstellen",
        "modal.editCard": "Karte bearbeiten",
        "modal.saveChanges": "Änderungen speichern",
        "modal.queue": "Aktuelle Warteschlange",
        "modal.preview.title": "Beispiel-Karten (Vorschau)",
        "modal.preview.import": "⬇ Dieses Deck importieren",

        // Templates (NEU)
        "tpl.std.name": "Standard (Sprachen & Wissen)",
        "tpl.std.desc": "Vorderseite & Rückseite. Gut für Vokabeln, Geschichte, Trivia.",
        "tpl.chn.name": "Chinesisch (mit Pinyin)",
        "tpl.chn.desc": "Spezialfeld für Pinyin mit automatischer Ton-Umwandlung.",
        "tpl.math.name": "Mathematik (LaTeX)",
        "tpl.math.desc": "Optimiert für Formeln. Unterstützt $$...$$ Syntax.",
        
        "field.front": "Vorderseite (Frage)",
        "field.back": "Rückseite (Antwort)",
        "field.note": "Notiz (Optional)",
        "field.german": "Deutsches Wort",
        "field.hanzi": "Hanzi (Schriftzeichen)",
        "field.pinyin": "Pinyin",
        "field.problem": "Aufgabe / Begriff",
        "field.solution": "Lösung / Formel",
        "field.hint": "Tipp (Optional)",
        
        "ph.dog": "z.B. Dog",
        "ph.hund": "z.B. Hund",
        "ph.memo": "Eselsbrücke...",
        "ph.haus": "z.B. Haus",
        "ph.fangzi": "z.B. 房子",
        "ph.pinyin": "fang2zi",
        "ph.deriv": "z.B. Ableitung von $$ x^2 $$",
        "ph.sol2x": "z.B. $$ 2x $$",
        "ph.rule": "Regel...",
        "btn.convert": "Wandeln",

        // Messages (Toasts & Dialogs)
        "msg.cardAdded": "Karte hinzugefügt.",
        "msg.cardUpdated": "Karte aktualisiert.",
        "msg.cardDeleted": "Karte gelöscht.",
        "msg.deckDeleted": "Deck erfolgreich gelöscht.",
        "msg.deckRenamed": "Deck erfolgreich umbenannt.",
        "msg.deckPublished": "Deck veröffentlicht!",
        "msg.deckImported": "Deck erfolgreich importiert!",
        "msg.emptyDeck": "Füge Karteikarten hinzu,<br>um loszulegen.",
        "msg.sessionDone": "Alle Karten für diese Runde gelernt.",
        "msg.goodJob": "Gut gemacht!",
        "msg.saveError": "Fehler beim Speichern.",
        "msg.deleteError": "Fehler beim Löschen.",
        "msg.enterName": "Bitte einen Namen eingeben.",
        
        // Dialog Questions
        "dialog.delDeck.title": "Deck löschen?",
        "dialog.delDeck.msg": "Möchtest du dieses Deck und ALLE Karten unwiderruflich löschen?",
        "dialog.rename.title": "Deck umbenennen",
        "dialog.rename.msg": "Neuer Name für das Deck:",
        "dialog.publish.title": "Veröffentlichen",
        "dialog.publish.msg": "Möchtest du \"{title}\" für alle Nutzer im Marktplatz sichtbar machen?",
        "dialog.import.title": "Importieren",
        "dialog.import.msg": "Möchtest du \"{title}\" in deine Sammlung importieren?",
        "dialog.delPublic.title": "Löschen",
        "dialog.delPublic.msg": "Möchtest du dein öffentliches Deck \"{title}\" wirklich löschen?",

        // Common
        "common.cards": "Karten",
        "common.error": "Fehler",
        "common.success": "Erfolg",
        "common.geloescht": "Gelöscht",

        // Sort Options
        "sort.lastLearned": "Zuletzt gelernt",
        "sort.newest": "Neueste zuerst",
        "sort.oldest": "Älteste zuerst",
        "sort.name": "Name (A-Z)",
        "sort.countDesc": "Meiste Karten",
        "sort.countAsc": "Wenigste Karten",

        // Filter Options
        "filter.all": "Alle Decks",
        "filter.mine": "Meine Uploads",
        "filter.others": "Von Anderen",

        // Study Modes
        "mode.standard": "Standard (A → B)",
        "mode.reverse": "Umgekehrt (B → A)",
        "mode.random": "Zufällig (Mix)"
    },
    en: {
        // Navigation & Header
        "nav.myDecks": "My Decks",
        "nav.community": "Community / Marketplace",
        "auth.login": "Login with Google",
        "auth.logout": "Logout",
        "auth.guest": "Guest",
        
        // Dashboard
        "dash.desc": "Study your own flashcards.",
        "dash.newDeck": "+ New Deck",
        "dash.empty": "No decks yet. Create one!",
        
        // Community
        "comm.desc": "Discover decks from other users and import them.",
        "comm.loading": "Loading community decks...",
        "comm.searchPlaceholder": "Search by title, topic, or author...",
        "comm.filter.all": "All Decks",
        "comm.filter.mine": "My Uploads",
        "comm.filter.others": "From Others",
        "comm.emptyDeck": "This deck is empty.",
        "comm.createdBy": "Created by",
        "comm.loadingExamples": "Loading examples...",
        
        // Deck Cards & Actions
        "btn.preview": "Preview",
        "btn.import": "Import",
        "btn.importing": "Importing...",
        "btn.delete": "Delete",
        "btn.rename": "Rename",
        "btn.share": "Publish",
        
        // Study View
        "study.back": "← Back to Dashboard",
        "study.addCard": "Add New Card",
        "study.btnAdd": "Add Card",
        "study.learn": "Study",
        "study.queue": "Queue",
        "study.showAnswer": "Show Answer",
        "study.wrong": "Wrong / Forgot",
        "study.right": "Right / Knew it",
        "study.reset": "Reshuffle Stack (Reset)",
        "study.allCards": "All My Cards",
        
        // Table Headers
        "table.front": "Front",
        "table.back": "Back",
        "table.info": "Info",
        "table.level": "Level",
        "table.actions": "Actions",
        "table.noCards": "No cards available.",
        "table.edit": "Edit",
        "table.delete": "Delete",
        
        // Modals
        "modal.settings": "Settings",
        "modal.darkmode": "Dark Mode",
        "modal.darkmode.desc": "Easy on the eyes.",
        "modal.lang": "Language",
        "modal.lang.desc": "Choose app language.",
        "modal.createDeck": "Create New Deck",
        "modal.deckName": "Deck Name",
        "modal.template": "Choose Template",
        "modal.cancel": "Cancel",
        "modal.create": "Create",
        "modal.editCard": "Edit Card",
        "modal.saveChanges": "Save Changes",
        "modal.queue": "Current Queue",
        "modal.preview.title": "Sample Cards",
        "modal.preview.import": "⬇ Import this Deck",

        // Templates
        "tpl.std.name": "Standard (Languages & Knowledge)",
        "tpl.std.desc": "Front & Back. Good for vocabulary, history, trivia.",
        "tpl.chn.name": "Chinese (with Pinyin)",
        "tpl.chn.desc": "Special field for Pinyin with automatic tone conversion.",
        "tpl.math.name": "Mathematics (LaTeX)",
        "tpl.math.desc": "Optimized for formulas. Supports $$...$$ syntax.",
        
        "field.front": "Front (Question)",
        "field.back": "Back (Answer)",
        "field.note": "Note (Optional)",
        "field.german": "German Word",
        "field.hanzi": "Hanzi (Characters)",
        "field.pinyin": "Pinyin",
        "field.problem": "Problem / Concept",
        "field.solution": "Solution / Formula",
        "field.hint": "Hint (Optional)",
        
        "ph.dog": "e.g., Dog",
        "ph.hund": "e.g., Hund",
        "ph.memo": "Mnemonic...",
        "ph.haus": "e.g., Haus",
        "ph.fangzi": "e.g., 房子",
        "ph.pinyin": "fang2zi",
        "ph.deriv": "e.g., Derivative of $$ x^2 $$",
        "ph.sol2x": "e.g., $$ 2x $$",
        "ph.rule": "Rule...",
        "btn.convert": "Convert",

        // Messages
        "msg.cardAdded": "Card added.",
        "msg.cardUpdated": "Card updated.",
        "msg.cardDeleted": "Card deleted.",
        "msg.deckDeleted": "Deck deleted successfully.",
        "msg.deckRenamed": "Deck renamed successfully.",
        "msg.deckPublished": "Deck published!",
        "msg.deckImported": "Deck imported successfully!",
        "msg.emptyDeck": "Add flashcards<br>to get started.",
        "msg.sessionDone": "All cards for this session learned.",
        "msg.goodJob": "Good job!",
        "msg.saveError": "Error saving data.",
        "msg.deleteError": "Error deleting data.",
        "msg.enterName": "Please enter a name.",

        // Dialog Questions
        "dialog.delDeck.title": "Delete Deck?",
        "dialog.delDeck.msg": "Do you really want to delete this deck and ALL its cards?",
        "dialog.rename.title": "Rename Deck",
        "dialog.rename.msg": "New name for the deck:",
        "dialog.publish.title": "Publish",
        "dialog.publish.msg": "Do you want to publish \"{title}\" to the marketplace?",
        "dialog.import.title": "Import",
        "dialog.import.msg": "Do you want to import \"{title}\" to your collection?",
        "dialog.delPublic.title": "Delete",
        "dialog.delPublic.msg": "Do you really want to delete your public deck \"{title}\"?",

        // Common
        "common.cards": "Cards",
        "common.error": "Error",
        "common.success": "Success",
        "common.geloescht": "Deleted",

        // Sort Options
        "sort.lastLearned": "Last learned",
        "sort.newest": "Newest first",
        "sort.oldest": "Oldest first",
        "sort.name": "Name (A-Z)",
        "sort.countDesc": "Most cards",
        "sort.countAsc": "Fewest cards",

        // Filter Options
        "filter.all": "All Decks",
        "filter.mine": "My Uploads",
        "filter.others": "From Others",

        // Study Modes
        "mode.standard": "Standard (A → B)",
        "mode.reverse": "Reverse (B → A)",
        "mode.random": "Random (Mix)",
    }
};

let currentLang = localStorage.getItem('omniCardsLanguage') || 'de';

// Helfer für Platzhalter in Texten: t("dialog.msg", {title: "Mathe"})
export function t(key, replacements = {}) {
    let text = key;
    if (translations[currentLang] && translations[currentLang][key]) {
        text = translations[currentLang][key];
    }
    
    // Ersetze {platzhalter} durch Werte
    Object.keys(replacements).forEach(repKey => {
        text = text.replace(`{${repKey}}`, replacements[repKey]);
    });
    
    return text;
}

export function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('omniCardsLanguage', lang);
    applyTranslations();
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
    
    const langSelect = document.getElementById('language-select');
    if (langSelect) langSelect.value = currentLang;
}

applyTranslations();