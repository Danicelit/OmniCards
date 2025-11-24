// public/js/storage.js
import { 
    signInAnonymously, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { 
    doc, 
    addDoc, 
    setDoc, 
    deleteDoc, 
    onSnapshot, 
    collection, 
    query, 
    getDocs,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

import { db, auth, appId } from './config.js';

const LOCAL_STORAGE_KEY = 'omniCardsData';

// --- Local Storage Service ---
export function createLocalStorageService(handleDataUpdate, userIdEl) {
    // (Bleibt unverändert für lokale Funktion)
    return {
        init: () => {
            const cards = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
            handleDataUpdate(cards);
            if(userIdEl) userIdEl.textContent = "Lokaler Speicher";
        },
        addCardToDeck: async (deckId, card) => { // Angepasst für Kompatibilität
            const cards = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
            card.id = crypto.randomUUID(); 
            cards.push(card);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cards));
            handleDataUpdate(cards);
        },
        // ... (Update/Delete für LocalStorage müsste auch angepasst werden, aber Fokus ist Cloud)
        updateCard: async (deckId, cardId, data) => {
             // Einfache Mock-Implementation für LocalStorage falls benötigt
        },
        deleteCard: async (deckId, cardId) => {
             // Einfache Mock-Implementation
        },
        createDeck: async () => alert("Decks im lokalen Modus noch nicht unterstützt"),
        subscribeDecks: () => {},
        subscribeCards: () => {}
    };
}

// --- Firebase Service ---
// WICHTIG: Erster Parameter ist jetzt onAuthChange (Callback für User-Status)
export function createFirebaseService(onAuthChange, userIdEl, errorContainer, unsubscribeRef) {
    
    return {
        init: async () => {
            try {
                // Hier hören wir NUR auf den Login-Status
                onAuthStateChanged(auth, (user) => {
                    if (user) {
                        if(userIdEl) userIdEl.textContent = `Cloud: ${user.uid.substring(0, 8)}...`;
                        // Wir geben den USER zurück an app.js, NICHT die Karten
                        onAuthChange(user);
                    } else {
                        if(userIdEl) userIdEl.textContent = "Nicht angemeldet";
                        onAuthChange(null);
                    }
                });

                // Versuchen, anonym einzuloggen, falls kein Google-User da ist
                // (Optional, kann man auch weglassen, wenn man Login erzwingen will)
                // await signInAnonymously(auth); 

            } catch (error) {
                console.error("Error initializing Firebase:", error);
                if(errorContainer) errorContainer.innerHTML = `<div class="text-red-500">Firebase Error: ${error.message}</div>`;
            }
        },

        // Login mit Google
        loginWithGoogle: async () => {
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error("Login Error:", error);
                alert("Login fehlgeschlagen: " + error.message);
            }
        },

        // Logout
        logout: async () => {
            try {
                await signOut(auth);
                window.location.reload(); 
            } catch (error) {
                console.error("Logout Error:", error);
            }
        },

        // --- Deck & Card Logic ---

        // 1. Alle Decks des Users abonnieren
        subscribeDecks: (onDecksUpdate) => {
            const user = auth.currentUser;
            if (!user) return;
            
            const decksRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks`);
            const q = query(decksRef);

            return onSnapshot(q, (snapshot) => {
                const decks = [];
                snapshot.forEach((doc) => decks.push({ id: doc.id, ...doc.data() }));
                onDecksUpdate(decks);
            });
        },

        // 2. Ein neues Deck erstellen
        createDeck: async (title, type = 'standard') => {
            const user = auth.currentUser;
            if (!user) return;
            const decksRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks`);
            await addDoc(decksRef, {
                title: title,
                type: type, 
                createdAt: new Date().toISOString(),
                cardCount: 0
            });
        },

        // 3. Karten eines Decks abonnieren
        subscribeCards: (deckId, onCardsUpdate) => {
            const user = auth.currentUser;
            if (!user || !deckId) return;

            const cardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);
            
            // Alten Listener stoppen falls vorhanden
            if (unsubscribeRef.current) unsubscribeRef.current();

            const q = query(cardsRef);
            unsubscribeRef.current = onSnapshot(q, (snapshot) => {
                const cards = [];
                snapshot.forEach((doc) => cards.push({ id: doc.id, ...doc.data() }));
                onCardsUpdate(cards);
            });
            
            // Rückgabe einer Funktion zum Stoppen DIESES Listeners
            return unsubscribeRef.current;
        },

        // 4. Karte hinzufügen
        addCardToDeck: async (deckId, card) => {
            const user = auth.currentUser;
            if (!user || !deckId) return;
            const cardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);
            await addDoc(cardsRef, card);
        },

        // 5. Karte aktualisieren
        updateCard: async (deckId, cardId, data) => {
            const user = auth.currentUser;
            if (!user || !deckId) return;
            const cardRef = doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards/${cardId}`);
            await setDoc(cardRef, data, { merge: true });
        },

        // 6. Karte löschen
        deleteCard: async (deckId, cardId) => {
            const user = auth.currentUser;
            if (!user || !deckId) return;
            const cardRef = doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards/${cardId}`);
            await deleteDoc(cardRef);
        },

        // 7. Deck VERÖFFENTLICHEN (Kopie von Privat -> Public)
        publishDeck: async (deckId) => {
            const user = auth.currentUser;
            if (!user || !deckId) return;

            // A. Original Deck Daten holen
            const deckRef = doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}`);
            // B. Original Karten holen
            const cardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);
            
            // Wir nutzen Promise.all für Geschwindigkeit
            // eslint-disable-next-line no-undef
            const [deckSnap, cardsSnap] = await Promise.all([
                // eslint-disable-next-line no-undef
                // getDoc muss importiert werden! (siehe oben in storage.js imports)
                // Da wir getDoc noch nicht importiert haben, nutzen wir einen Trick oder fügen es hinzu.
                // Besser: Wir fügen getDoc und getDocs zu den Imports hinzu (siehe unten).
            ]);
            // STOP: Um Fehler zu vermeiden, importieren wir erst die fehlenden Funktionen.
            // (Siehe Anweisung unter diesem Code-Block)
        },

        // --- Da wir oben Imports brauchen, hier die fertigen Funktionen für Copy/Paste ---
        // (Füge diese Funktionen ein, nachdem du die Imports oben aktualisiert hast!)

        publishDeckFull: async (deckId, deckData) => { 
            // deckData übergeben wir direkt aus der App, um einen Lesezugriff zu sparen
            const user = auth.currentUser;
            if (!user) throw new Error("Nicht eingeloggt");

            // 1. Das Deck im 'public_decks' Ordner erstellen
            const publicDecksRef = collection(db, `/artifacts/${appId}/public_decks`);
            const newPublicDeckRef = await addDoc(publicDecksRef, {
                title: deckData.title,
                type: deckData.type || 'standard',
                originalAuthor: user.displayName || "Anonym",
                originalAuthorId: user.uid,
                publishedAt: new Date().toISOString(),
                cardCount: deckData.cardCount || 0
            });

            // 2. Alle Karten holen (Privat)
            const privateCardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);
            const q = query(privateCardsRef);
            
            // WICHTIG: getDocs muss importiert sein (siehe Schritt 2a)
            // eslint-disable-next-line no-undef
            const querySnapshot = await getDocs(q);

            // 3. Karten in den öffentlichen Ordner kopieren
            const publicCardsRef = collection(db, `/artifacts/${appId}/public_decks/${newPublicDeckRef.id}/cards`);
            
            const batchPromises = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // SRS Level zurücksetzen beim Veröffentlichen!
                const publicCard = {
                    front: data.front || data.german,
                    back: data.back || data.chinese,
                    extra: data.extra || data.pinyin || '',
                    srsLevel: 0, // Reset für neue Nutzer
                    consecutiveCorrect: 0
                };
                batchPromises.push(addDoc(publicCardsRef, publicCard));
            });

            await Promise.all(batchPromises);
            return newPublicDeckRef.id;
        },

        // 8. Öffentliche Decks abonnieren
        subscribePublicDecks: (onUpdate) => {
            const publicDecksRef = collection(db, `/artifacts/${appId}/public_decks`);
            const q = query(publicDecksRef); // Man könnte hier noch .orderBy('publishedAt') machen

            return onSnapshot(q, (snapshot) => {
                const decks = [];
                snapshot.forEach((doc) => decks.push({ id: doc.id, ...doc.data() }));
                onUpdate(decks);
            });
        },

        // 9. Deck IMPORTIEREN (Kopie von Public -> Privat)
        importDeck: async (publicDeckId) => {
            const user = auth.currentUser;
            if (!user) throw new Error("Nicht eingeloggt");

            // A. Öffentliches Deck lesen (wir brauchen getDoc)
            // eslint-disable-next-line no-undef
            const publicDeckRef = doc(db, `/artifacts/${appId}/public_decks/${publicDeckId}`);
            // eslint-disable-next-line no-undef
            const deckSnap = await getDoc(publicDeckRef);
            
            if (!deckSnap.exists()) throw new Error("Deck nicht gefunden");
            const deckData = deckSnap.data();

            // B. Neues Privates Deck erstellen
            const myDecksRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks`);
            const newMyDeckRef = await addDoc(myDecksRef, {
                title: deckData.title + " (Import)", // Name anpassen
                type: deckData.type || 'standard',
                createdAt: new Date().toISOString(),
                cardCount: deckData.cardCount || 0,
                isImported: true
            });

            // C. Öffentliche Karten holen
            const publicCardsRef = collection(db, `/artifacts/${appId}/public_decks/${publicDeckId}/cards`);
            // eslint-disable-next-line no-undef
            const cardsSnap = await getDocs(query(publicCardsRef));

            // D. In mein privates Deck kopieren
            const myCardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${newMyDeckRef.id}/cards`);
            const batchPromises = [];
            
            cardsSnap.forEach((doc) => {
                const data = doc.data();
                batchPromises.push(addDoc(myCardsRef, {
                    front: data.front,
                    back: data.back,
                    extra: data.extra || '',
                    srsLevel: 0,
                    consecutiveCorrect: 0,
                    createdAt: new Date().toISOString()
                }));
            });

            await Promise.all(batchPromises);
        }
    };
}