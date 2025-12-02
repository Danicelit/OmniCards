# Security Architecture 🔒

## 1. Authentication
We use **Firebase Authentication** (Google OAuth). The user's `uid` is the trusted key for all data operations.

## 2. Database Isolation (Firestore Rules)

### Private Data (`/users/{userId}`)
* **Rule:** `request.auth.uid == userId`
* **Effect:** A user can ONLY read and write data in their own namespace. Accessing another user's private deck is mathematically impossible.

### Public Data (`/public_decks`)
* **Read:** Open to everyone (`allow read: if true`).
* **Write (Create):** Any authenticated user.
* **Delete/Update:** Only the original author.
    * *Mechanism:* The rule compares `request.auth.uid` with the stored `resource.data.originalAuthorId`.

### Sub-Collections (Cards)
* **Delete:** Uses a custom function `isDeckOwner()` to verify that the user trying to delete a card also owns the parent deck. This prevents malicious users from emptying public decks they don't own.