// public/js/storage.js
import { 
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
    getDoc,
    increment,
    limit,
    where
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

import { db, auth, appId } from './config.js';

const LOCAL_STORAGE_KEY = 'omniCardsData';

// --- Firebase Service ---
export function createFirebaseService(onAuthChange, userIdEl, errorContainer, unsubscribeRef) {
    
    // Helper: Internes Löschen eines öffentlichen Decks
    const _deletePublicDeckInternal = async (publicDeckId) => {
        // 1. Karten löschen
        const cardsRef = collection(db, `/artifacts/${appId}/public_decks/${publicDeckId}/cards`);
        const cardsSnap = await getDocs(cardsRef);
        const deletePromises = cardsSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // 2. Deck löschen
        const deckRef = doc(db, `/artifacts/${appId}/public_decks/${publicDeckId}`);
        await deleteDoc(deckRef);
    };

    return {
        init: async () => {
            try {
                onAuthStateChanged(auth, (user) => {
                    if (user) {
                        if(userIdEl) userIdEl.textContent = `Cloud: ${user.uid.substring(0, 8)}...`;
                        onAuthChange(user);
                    } else {
                        if(userIdEl) userIdEl.textContent = "Nicht angemeldet";
                        onAuthChange(null);
                    }
                });
            } catch (error) {
                console.error("Firebase Init Error:", error);
                if(errorContainer) errorContainer.innerHTML = `<div class="text-red-500">Error: ${error.message}</div>`;
            }
        },

        // --- Auth ---
        loginWithGoogle: async () => {
            try {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
            } catch (error) {
                console.error("Login Error:", error);
                alert("Login fehlgeschlagen: " + error.message);
            }
        },

        logout: async () => {
            try {
                await signOut(auth);
                window.location.reload(); 
            } catch (error) {
                console.error("Logout Error:", error);
            }
        },

        // --- Deck & Card Management (Private) ---

        subscribeDecks: (onDecksUpdate) => {
            const user = auth.currentUser;
            if (!user) return;
            
            const decksRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks`);
            return onSnapshot(query(decksRef), (snapshot) => {
                const decks = [];
                snapshot.forEach((doc) => decks.push({ id: doc.id, ...doc.data() }));
                onDecksUpdate(decks);
            });
        },

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

        updateDeck: async (deckId, data) => {
            const user = auth.currentUser;
            if (!user || !deckId) throw new Error("Auth required");
            const deckRef = doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}`);
            await setDoc(deckRef, data, { merge: true });
        },

        subscribeCards: (deckId, onCardsUpdate) => {
            const user = auth.currentUser;
            if (!user || !deckId) return;

            const cardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);
            
            if (unsubscribeRef.current) unsubscribeRef.current();

            unsubscribeRef.current = onSnapshot(query(cardsRef), (snapshot) => {
                const cards = [];
                snapshot.forEach((doc) => cards.push({ id: doc.id, ...doc.data() }));
                onCardsUpdate(cards);
            });
            return unsubscribeRef.current;
        },

        addCardToDeck: async (deckId, card) => {
            const user = auth.currentUser;
            if (!user || !deckId) return;
            
            // 1. Karte speichern
            const cardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);
            await addDoc(cardsRef, card);

            // 2. Zähler hochsetzen
            const deckRef = doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}`);
            await setDoc(deckRef, { cardCount: increment(1) }, { merge: true });
        },

        updateCard: async (deckId, cardId, data) => {
            const user = auth.currentUser;
            if (!user || !deckId) return;
            const cardRef = doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards/${cardId}`);
            await setDoc(cardRef, data, { merge: true });
        },

        deleteCard: async (deckId, cardId) => {
            const user = auth.currentUser;
            if (!user || !deckId) return;
            
            // 1. Löschen
            const cardRef = doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards/${cardId}`);
            await deleteDoc(cardRef);

            // 2. Zähler runtersetzen
            const deckRef = doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}`);
            await setDoc(deckRef, { cardCount: increment(-1) }, { merge: true });
        },

        deleteDeckFull: async (deckId) => {
            const user = auth.currentUser;
            if (!user || !deckId) throw new Error("Nicht eingeloggt");

            // 1. Private Karten löschen
            const cardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);
            const cardsSnap = await getDocs(cardsRef);
            const deletePromises = cardsSnap.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            // 2. Privates Deck löschen
            const deckRef = doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}`);
            await deleteDoc(deckRef);

            // 3. Öffentliche Kopien suchen & löschen (Auto-Cleanup)
            try {
                const publicDecksRef = collection(db, `/artifacts/${appId}/public_decks`);
                const q = query(publicDecksRef, where("originalDeckId", "==", deckId));
                const publicSnap = await getDocs(q);
                
                const publicDeletePromises = publicSnap.docs.map(doc => 
                    _deletePublicDeckInternal(doc.id)
                );
                await Promise.all(publicDeletePromises);
            } catch (err) {
                console.warn("Auto-Delete public copy failed (might not exist):", err);
            }
        },

        // --- Marketplace (Public) ---

        publishDeckFull: async (deckId, deckData) => { 
            const user = auth.currentUser;
            if (!user) throw new Error("Nicht eingeloggt");

            // 1. Public Deck erstellen
            const publicDecksRef = collection(db, `/artifacts/${appId}/public_decks`);
            const newPublicDeckRef = await addDoc(publicDecksRef, {
                title: deckData.title,
                type: deckData.type || 'standard',
                originalAuthor: user.displayName || "Anonym",
                originalAuthorId: user.uid,
                originalDeckId: deckId,
                publishedAt: new Date().toISOString(),
                cardCount: deckData.cardCount || 0
            });

            // 2. Karten kopieren
            const privateCardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);
            const querySnapshot = await getDocs(query(privateCardsRef));
            
            const publicCardsRef = collection(db, `/artifacts/${appId}/public_decks/${newPublicDeckRef.id}/cards`);
            const batchPromises = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return addDoc(publicCardsRef, {
                    front: data.front || data.german,
                    back: data.back || data.chinese,
                    extra: data.extra || data.pinyin || '',
                    srsLevel: 0, 
                    consecutiveCorrect: 0
                });
            });

            await Promise.all(batchPromises);
            return newPublicDeckRef.id;
        },

        subscribePublicDecks: (onUpdate) => {
            const publicDecksRef = collection(db, `/artifacts/${appId}/public_decks`);
            // Optional: Limit auf 100 o.ä. für Performance
            return onSnapshot(query(publicDecksRef), (snapshot) => {
                const decks = [];
                snapshot.forEach((doc) => decks.push({ id: doc.id, ...doc.data() }));
                onUpdate(decks);
            });
        },

        getPublicDeckPreview: async (publicDeckId) => {
            const cardsRef = collection(db, `/artifacts/${appId}/public_decks/${publicDeckId}/cards`);
            const q = query(cardsRef, limit(5));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data());
        },

        importDeck: async (publicDeckId) => {
            const user = auth.currentUser;
            if (!user) throw new Error("Nicht eingeloggt");

            // 1. Public Deck lesen
            const publicDeckRef = doc(db, `/artifacts/${appId}/public_decks/${publicDeckId}`);
            const deckSnap = await getDoc(publicDeckRef);
            if (!deckSnap.exists()) throw new Error("Deck nicht gefunden");
            const deckData = deckSnap.data();

            // 2. Privates Deck erstellen
            const myDecksRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks`);
            const newMyDeckRef = await addDoc(myDecksRef, {
                title: deckData.title + " (Import)",
                type: deckData.type || 'standard',
                createdAt: new Date().toISOString(),
                cardCount: deckData.cardCount || 0,
                isImported: true
            });

            // 3. Karten kopieren
            const publicCardsRef = collection(db, `/artifacts/${appId}/public_decks/${publicDeckId}/cards`);
            const cardsSnap = await getDocs(query(publicCardsRef));

            const myCardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${newMyDeckRef.id}/cards`);
            const batchPromises = cardsSnap.docs.map(doc => {
                const data = doc.data();
                return addDoc(myCardsRef, {
                    front: data.front,
                    back: data.back,
                    extra: data.extra || '',
                    srsLevel: 0,
                    consecutiveCorrect: 0,
                    createdAt: new Date().toISOString()
                });
            });

            await Promise.all(batchPromises);
        },

        deletePublicDeck: async (publicDeckId) => {
            const user = auth.currentUser;
            if (!user) throw new Error("Nicht eingeloggt");
            
            const deckRef = doc(db, `/artifacts/${appId}/public_decks/${publicDeckId}`);
            const deckSnap = await getDoc(deckRef);
            
            if (!deckSnap.exists()) throw new Error("Deck nicht gefunden");
            if (deckSnap.data().originalAuthorId !== user.uid) {
                throw new Error("Nur eigene Decks löschbar.");
            }

            await _deletePublicDeckInternal(publicDeckId);
        }
    };
}
// LocalStorage Service entfernt, da nicht mehr aktiv genutzt.