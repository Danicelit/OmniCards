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
    deleteField // <--- NEU: Zum Löschen der alten Felder
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

import { db, auth, appId } from './config.js';

// --- Firebase Service ---
export function createFirebaseService(onAuthChange, userIdEl, errorContainer, unsubscribeRef) {
    
    const _deletePublicDeckInternal = async (publicDeckId) => {
        const cardsRef = collection(db, `/artifacts/${appId}/public_decks/${publicDeckId}/cards`);
        const cardsSnap = await getDocs(cardsRef);
        const deletePromises = cardsSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        const deckRef = doc(db, `/artifacts/${appId}/public_decks/${publicDeckId}`);
        await deleteDoc(deckRef);
    };

    return {
        // ... (init, auth, deck management bleiben gleich - hier gekürzt für Übersicht) ...
        // KORREKTUR: Bitte kopiere deine bestehenden init, login, logout, subscribeDecks, 
        // createDeck, updateDeck, subscribeCards, addCardToDeck, updateCard, 
        // deleteCard, deleteDeckFull Funktionen hier herein. Sie brauchen keine Änderungen 
        // (außer dass du darauf achtest, dass sie keine Logik mit 'german' enthalten, was sie m.W. nicht tun).
        
        // Hier die Funktionen, die wir ändern müssen:

        init: async () => { /* Dein bestehender Code */
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
                console.error(error);
            }
        },
        loginWithGoogle: async () => {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        },
        logout: async () => {
            await signOut(auth);
            window.location.reload();
        },
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
        createDeck: async (title, type) => {
            const user = auth.currentUser;
            if (!user) return;
            await addDoc(collection(db, `/artifacts/${appId}/users/${user.uid}/decks`), {
                title, type, createdAt: new Date().toISOString(), cardCount: 0
            });
        },
        updateDeck: async (deckId, data) => {
            const user = auth.currentUser;
            if (!user) return;
            await setDoc(doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}`), data, { merge: true });
        },
        subscribeCards: (deckId, cb) => {
            const user = auth.currentUser;
            if (!user) return;
            const cardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);
            if (unsubscribeRef.current) unsubscribeRef.current();
            unsubscribeRef.current = onSnapshot(query(cardsRef), (snap) => {
                const cards = [];
                snap.forEach((doc) => cards.push({ id: doc.id, ...doc.data() }));
                cb(cards);
            });
            return unsubscribeRef.current;
        },
        addCardToDeck: async (deckId, card) => {
            const user = auth.currentUser;
            if (!user) return;
            await addDoc(collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`), card);
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
        deleteDeckFull: async (deckId) => {
            const user = auth.currentUser;
            if (!user) throw new Error("No Auth");
            const cardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);
            const cardsSnap = await getDocs(cardsRef);
            await Promise.all(cardsSnap.docs.map(d => deleteDoc(d.ref)));
            await deleteDoc(doc(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}`));
            
            // Auto-Delete Public Copy
            try {
                const q = query(collection(db, `/artifacts/${appId}/public_decks`), where("originalDeckId", "==", deckId));
                const snap = await getDocs(q);
                await Promise.all(snap.docs.map(d => _deletePublicDeckInternal(d.id)));
            } catch (e) { console.warn(e); }
        },

        // --- CLEANUP HIER STARTEN ---

        publishDeckFull: async (deckId, deckData) => { 
            const user = auth.currentUser;
            if (!user) throw new Error("Nicht eingeloggt");

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

            const privateCardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckId}/cards`);
            const querySnapshot = await getDocs(query(privateCardsRef));
            
            const publicCardsRef = collection(db, `/artifacts/${appId}/public_decks/${newPublicDeckRef.id}/cards`);
            const batchPromises = querySnapshot.docs.map(doc => {
                const data = doc.data();
                // CLEANUP: Nur noch generische Felder nutzen!
                // Wir gehen davon aus, dass die Daten migriert wurden.
                return addDoc(publicCardsRef, {
                    front: data.front,
                    back: data.back,
                    extra: data.extra || '',
                    srsLevel: 0, 
                    consecutiveCorrect: 0
                });
            });

            await Promise.all(batchPromises);
            return newPublicDeckRef.id;
        },

        // ... subscribePublicDecks, getPublicDeckPreview, importDeck, deletePublicDeck (bleiben gleich) ...
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
        importDeck: async (id) => {
            const user = auth.currentUser;
            if (!user) throw new Error("No Auth");
            const pDeck = await getDoc(doc(db, `/artifacts/${appId}/public_decks/${id}`));
            if(!pDeck.exists()) throw new Error("Not found");
            const pData = pDeck.data();
            
            const myDeckRef = await addDoc(collection(db, `/artifacts/${appId}/users/${user.uid}/decks`), {
                title: pData.title + " (Import)",
                type: pData.type || 'standard',
                createdAt: new Date().toISOString(),
                cardCount: pData.cardCount || 0,
                isImported: true
            });
            
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

        // --- MIGRATION SCRIPT ---
        migrateLegacyData: async () => {
            const user = auth.currentUser;
            if (!user) { alert("Bitte einloggen!"); return; }
            console.log("Starte Migration...");
            
            const decksRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks`);
            const decksSnap = await getDocs(decksRef);
            let count = 0;

            for (const deckDoc of decksSnap.docs) {
                const cardsRef = collection(db, `/artifacts/${appId}/users/${user.uid}/decks/${deckDoc.id}/cards`);
                const cardsSnap = await getDocs(cardsRef);
                
                for (const cardDoc of cardsSnap.docs) {
                    const data = cardDoc.data();
                    // Prüfen ob Migration nötig (wenn 'german' existiert oder 'pinyin')
                    if (data.german || data.chinese || data.pinyin) {
                        await setDoc(cardDoc.ref, {
                            front: data.front || data.german,
                            back: data.back || data.chinese,
                            extra: data.extra || data.pinyin || '',
                            // Lösche die alten Felder
                            german: deleteField(),
                            chinese: deleteField(),
                            pinyin: deleteField()
                        }, { merge: true });
                        count++;
                    }
                }
            }
            console.log(`Migration fertig. ${count} Karten aktualisiert.`);
            alert(`Migration erfolgreich! ${count} Karten aktualisiert. Bitte Seite neu laden.`);
        }
    };
}