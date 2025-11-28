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
    where,
    deleteField
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

import { db, auth, appId } from './config.js';

/**
 * Factory function to create Firebase Storage Service.
 * Handles all database interactions (Firestore) and authentification (Auth).
 * @param {function} onAuthChange - Callback triggered when user login state changes.
 * @param {HTMLElement} userIdEl - Debug element to display current user ID.
 * @param {HTMLElement} errorContainer - Element to render critical errors.
 * @param {object} unsubscribeRef - Mutable ref object { current: null } to hold active listeners.
 * @returns {object} Firebase Storage Service with methods for auth and data management.
 */
export function createFirebaseService(onAuthChange, userIdEl, errorContainer, unsubscribeRef) {
    
    /**
     * Internal Helper: Deletes a public deck and all its sub-collection cards.
     * Used for manual deletion and auto-cleanup logic.
     * @param {string} publicDeckId - ID of public deck.
     * @private
     */
    const _deletePublicDeckInternal = async (publicDeckId) => {
        const cardsRef = collection(db, `/artifacts/${appId}/public_decks/${publicDeckId}/cards`);
        const cardsSnap = await getDocs(cardsRef);
        // Deleting documents in a loop (batch write would be better for >500 items)
        const deletePromises = cardsSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        const deckRef = doc(db, `/artifacts/${appId}/public_decks/${publicDeckId}`);
        await deleteDoc(deckRef);
    };

    return {
        /**
         * Initializes the Authentification Listeners.
         * Must be called once when the app starts.
         */
        init: async () => { /* Dein bestehender Code */
             try {
                onAuthStateChanged(auth, (user) => {
                    if (user) {
                        if(userIdEl) userIdEl.textContent = `Cloud: ${user.uid.substring(0, 8)}...`;
                        onAuthChange(user);
                    } else {
                        if(userIdEl) userIdEl.textContent = "Not signed in";
                        onAuthChange(null);
                    }
                });
            } catch (error) {
                console.error(error);
            }
        },

        // --- AUTHENTIFICATION ---

        /**
         * Opens the Google Sign-In Popup.
         */
        loginWithGoogle: async () => {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        },

        /**
         * Signs out the current user and reloads the page to clear state.
         */
        logout: async () => {
            await signOut(auth);
            window.location.reload();
        },

        // --- PRIVATE DECKS ---

        /**
         * Subscribes to the current user's private decks.
         * Real-time listener: Updates automatically when data changes.
         * @param {function} onDecksUpdate - Callback receiving the array of decks.
         * @returns {function} Unsubscribe function to stop the listener.
         */
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

        /**
         * Creates a new empty private deck.
         * @param {string} title - Deck title. 
         * @param {string} type - Template type (e.g., 'standard', 'vocab', etc.).
         */
        createDeck: async (title, type) => {
            const user = auth.currentUser;
            if (!user) return;
            await addDoc(collection(db, `/artifacts/${appId}/users/${user.uid}/decks`), {
                title, type, createdAt: new Date().toISOString(), cardCount: 0
            });
        },

        /**
         * Updates metadata of a private deck (e.g., title, LastLearned).
         * @param {string} deckId
         * @param {object} data - Key-value pairs to update.
         * @returns 
         */
        updateDeck: async (deckId, data) => {
            const user = auth.currentUser;
            if (!user) return;
            await setDoc(doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}`), data, { merge: true });
        },

        /**
         * Deletes a private deck AND all its contained cards.
         * Also attempts to clean up any public copies in the marketplace. // TODO remove this feature
         * @param {string} deckId 
         */
        deleteDeckFull: async (deckId) => {
            const user = auth.currentUser;
            if (!user) throw new Error("No Auth");

            // 1. Delete private cards
            const cardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);
            const cardsSnap = await getDocs(cardsRef);
            await Promise.all(cardsSnap.docs.map(d => deleteDoc(d.ref)));

            // 2. Delete the deck document
            await deleteDoc(doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}`));
            
            // 3. Auto-Cleanup: Find and delete linked public copies. // TODO remove this feature
            try {
                const q = query(collection(db, `/artifacts/${appId}/public_decks`), where("originalDeckId", "==", deckId));
                const snap = await getDocs(q);
                await Promise.all(snap.docs.map(d => _deletePublicDeckInternal(d.id)));
            } catch (e) { console.warn(e); }
        },

        // --- CARDS ---

        /**
         * Subscribes to cards within a specific private deck.
         * @param {string} deckId 
         * @param {function} cb - Callback receiving the array of cards. 
         */
        subscribeCards: (deckId, cb) => {
            const user = auth.currentUser;
            if (!user) return;
            const cardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);

            if (unsubscribeRef.current) unsubscribeRef.current(); // Stop previous listener

            unsubscribeRef.current = onSnapshot(query(cardsRef), (snap) => {
                const cards = [];
                snap.forEach((doc) => cards.push({ id: doc.id, ...doc.data() }));
                cb(cards);
            });
            return unsubscribeRef.current;
        },

        /**
         * Adds a card to a deck and automatically increments the deck's cardCount.
         */
        addCardToDeck: async (deckId, card) => {
            const user = auth.currentUser;
            if (!user) return;
            await addDoc(collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`), card);
            // Atomic increment to ensure accuracy
            await setDoc(doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}`), { cardCount: increment(1) }, { merge: true });
        },
        updateCard: async (deckId, cardId, data) => {
            const user = auth.currentUser;
            if (!user) return;
            await setDoc(doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards/${cardId}`), data, { merge: true });
        },
        deleteCard: async (deckId, cardId) => {
            const user = auth.currentUser;
            if (!user) return;
            await deleteDoc(doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards/${cardId}`));
            await setDoc(doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}`), { cardCount: increment(-1) }, { merge: true });
        },
        
        // --- MARKETPLACE (PUBLIC) ---

        /**
         * Publishes a private deck to the public marketplace.
         * Implememts "Managed Update": Overwrites existing public deck if it exists, otherwise creates new.
         * @param {string} deckId 
         * @param {*} deckData - Deck metadata
         * @returns 
         */
        publishDeckFull: async (deckId, deckData) => { 
            const user = auth.currentUser;
            if (!user) throw new Error("Nicht eingeloggt");

            const publicDecksRef = collection(db, `/artifacts/${appId}/public_decks`);
            
            // Check if already published
            const q = query(publicDecksRef, where("originalDeckId", "==", deckId));
            const existingSnap = await getDocs(q);

            let publicDeckRef;

            if (!existingSnap.empty) {
                // Update existing
                const existingDoc = existingSnap.docs[0];
                publicDeckRef = existingDoc.ref;
                
                if (existingDoc.data().originalAuthorId !== user.uid) {throw new Error("Not your deck");}

                await setDoc(publicDeckRef, {
                    title: deckData.title,
                    type: deckData.type || 'standard',
                    cardCount: deckData.cardCount || 0,
                    publishedAt: new Date().toISOString()
                }, { merge: true });

                // Delete old public cards to replace them
                const oldCardsRef = collection(db, `/artifacts/${appId}/public_decks/${publicDeckRef.id}/cards`);
                const oldCardsSnap = await getDocs(oldCardsRef);
                const deletePromises = oldCardsSnap.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);

            } else {
                // Create new
                publicDeckRef = await addDoc(publicDecksRef, {
                    title: deckData.title,
                    type: deckData.type || 'standard',
                    originalAuthor: user.displayName || "Anonym",
                    originalAuthorId: user.uid,
                    originalDeckId: deckId, // WICHTIG für die Wiedererkennung
                    publishedAt: new Date().toISOString(),
                    cardCount: deckData.cardCount || 0
                });
            }

            // Copy cards to public
            const privateCardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);
            const querySnapshot = await getDocs(query(privateCardsRef));
            
            const publicCardsRef = collection(db, `/artifacts/${appId}/public_decks/${publicDeckRef.id}/cards`);
            const batchPromises = querySnapshot.docs.map(doc => {
                const data = doc.data();
                // Copy generic fields only, reset SRS data
                return addDoc(publicCardsRef, {
                    front: data.front,
                    back: data.back,
                    extra: data.extra || '',
                    srsLevel: 0, 
                    consecutiveCorrect: 0
                });
            });

            await Promise.all(batchPromises);
            return publicDeckRef.id;
        },

        subscribePublicDecks: (cb) => {
            return onSnapshot(query(collection(db, `/artifacts/${appId}/public_decks`)), (snap) => {
                const decks = [];
                snap.forEach(d => decks.push({id: d.id, ...d.data()}));
                cb(decks);
            });
        },
        getPublicDeckPreview: async (id) => {
            const q = query(collection(db, `/artifacts/${appId}/public_decks/${id}/cards`), limit(5));
            const snap = await getDocs(q);
            return snap.docs.map(d => d.data());
        },

        /**
         * Imports a public deck into the user's private collection.
         * Creates a deep copy (new IDs, independent of original).
         */
        importDeck: async (id) => {
            const user = auth.currentUser;
            if (!user) throw new Error("No Auth");

            // 1. Fetch public deck data
            const pDeck = await getDoc(doc(db, `/artifacts/${appId}/public_decks/${id}`));
            if(!pDeck.exists()) throw new Error("Not found");
            const pData = pDeck.data();
            
            // 2. Create private deck
            const myDeckRef = await addDoc(collection(db, `/artifacts/${appId}/users/${user.uid}/decks`), {
                title: pData.title + " (Import)",
                type: pData.type || 'standard',
                createdAt: new Date().toISOString(),
                cardCount: pData.cardCount || 0,
                isImported: true
            });
            
            // 3. Copy cards
            const pCards = await getDocs(collection(db, `/artifacts/${appId}/public_decks/${id}/cards`));
            const myCardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${myDeckRef.id}/cards`);
            await Promise.all(pCards.docs.map(d => {
                const data = d.data();
                return addDoc(myCardsRef, {
                    front: data.front,
                    back: data.back,
                    extra: data.extra || '',
                    srsLevel: 0, consecutiveCorrect: 0, createdAt: new Date().toISOString()
                });
            }));
        },

        deletePublicDeck: async (id) => {
            const user = auth.currentUser;
            if (!user) throw new Error("No Auth");
            const d = await getDoc(doc(db, `/artifacts/${appId}/public_decks/${id}`));
            if(!d.exists() || d.data().originalAuthorId !== user.uid) throw new Error("Not allowed");
            await _deletePublicDeckInternal(id);
        },
    };
}