# Security Policy & Architecture 🔒

This document outlines the security architecture of OmniCards, specifically focusing on data isolation, authentication, and database rules via Google Firebase.

---

## 1. Authentication (Identity)

OmniCards uses **Firebase Authentication** to handle user identity.
* **Provider:** Google OAuth.
* **Mechanism:** When a user logs in, they receive a secure ID Token (`request.auth`).
* **User ID (`uid`):** This unique string (e.g., `user123`) is the key to all security rules. We never trust data sent from the client (frontend); we only trust the `uid` contained in the verified token.

---

## 2. Database Security (Firestore Rules)

Our security model is "Deny by Default". Access is only granted if a specific rule allows it.

### A. Private User Data (Strict Isolation)
**Path:** `/artifacts/{appId}/users/{userId}/...`

```javascript
match /artifacts/{appId}/users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}