# OmniCards 🎓

**A universal, web-based flashcard learning platform focusing on flexibility (Math, Languages) and community.**

OmniCards is a web application designed to help users internalize learning content efficiently using a "Spaced Repetition System" (SRS). Unlike simple vocabulary trainers, OmniCards supports complex content through a flexible template system, including mathematical formulas (LaTeX) and language-specific features (e.g., Pinyin conversion).

> **Note:** While the documentation and codebase are in English, the current User Interface (UI) of the application is primarily in German.

---

## 🗺️ Roadmap & Open Tasks

Following a comprehensive testing phase (v1.0), the following roadmap has been established to address UX inconsistencies, logic bugs, and architectural decisions.

### 🚨 Phase 1: Critical Bugfixes & Logic
- [x] **Bugfix:** Dashboard tab navigation style does not update correctly (Blue underline remains on "My Decks").
- [x] **Bugfix:** Restore sorting indicators (arrows) in the deck card table.
- [x] **Bugfix:** "Delete Public Deck" permission error (Rules adjustment needed).
- [x] **Bugfix:** Deleting the currently active card causes "undefined" ghost card in the study session.
- [x] **Logic:** Trigger immediate queue rebuild/card refresh when changing "Study Mode" (Front/Back/Random).
- [x] **Logic:** Make the "Edit Card" modal dynamic (currently hardcoded to Chinese fields, breaks for Math decks).
- [x] **Logic:** Change the table attributes in each deck accordingly, fix standard info column bug.
- [x] **Logic:** Level is not correctly incrementing or decrementing, card should not be button.
- [x] **Logic:** New Cards are not added to queue.
- [x] **Logic:** Fix public deck list layout for long deck titles.
- [x] **Logic:** Queue needs general fix.
- [x] **Logic:** Required input fields need to be filled before adding card.

### 🎨 Phase 2: UI/UX Polish (No more System Alerts)
- [x] **Refactor:** Replace native browser `confirm()` and `alert()` with custom, styled Modals (for deletion, publishing, etc.).
- [x] **UX:** Improve "Empty Deck" state:
    - Change text from "Good job!" to "Add cards to start".
    - Hide "All cards learned" message when deck is actually empty.

### 🏗️ Phase 3: Architecture & Marketplace Evolution
- [x] **Architecture:** Decide on **Synchronization vs. Snapshot** model for Public Decks.
    - *Current:* Public decks are snapshots (no updates).
    - *Goal:* Discuss if updates to private decks should reflect on public ones.
- [x] **Feature:** Prevent duplicate publishing of the same deck by the same user.
- [x] **Feature:** Implement "Delete Public Copy" automatically when Private Deck is deleted (requires Sync/Link logic fix).
- [x] **Feature:** Limit input length of deck title, front, back and extra.
- [x] **Feature:** Cut off text in table and deck title.
- [x] **Feature:** No decks with duplicate name in own decks. allowed for public decks.
- [x] **Feature:** Flashcard growing in height with larger text.
- [x] **Feature:** Public deck preview button also for own published decks.
- [x] **Feature:** Queue cuts long texts off
- [x] **Feature:** Enable importing own deck.

### ⚙️ Phase 4: Maintenance & Settings
- [x] **Feature:** UI Language selection (German/English).
- [ ] **Maintenance:** Investigate and suppress console warnings:
    - `ERR_BLOCKED_BY_CLIENT` (Firebase channel issues with AdBlockers).
    - `Cross-Origin-Opener-Policy` (Google Auth warnings).
    - Handle Firebase timeouts gracefully.

### Unimportant Features
- [ ] **Feature:** Only show "and more cards" when there actually are more cards in preview.
- [ ] **Feature:** Arrow between front and back text in preview should be central.

---

## 📖 Project Description

OmniCards was born out of the need to learn specific content—particularly Chinese and Mathematics—in a single, lightweight app. Many existing apps are either too generic (lacking formula support) or too specific (language-only).

The app relies on **Google Firebase** as a backend, enabling real-time synchronization across devices, secure user authentication, and a scalable database. The frontend is intentionally kept "lightweight" (Vanilla JS & Tailwind CSS) to ensure maximum performance and easy maintainability.

### The MVP (Minimum Viable Product)
The current MVP is fully functional regarding core learning features:
1.  **Multi-User Support:** Each user has their own protected data environment (Google Login).
2.  **Template System:** Support for various card types:
    * *Standard:* Front/Back.
    * *Chinese:* Automatic Pinyin conversion (tone numbers to accents).
    * *Math:* Rendering of LaTeX formulas via KaTeX.
3.  **Learning Algorithm:** A simple Spaced Repetition System that queries cards more or less frequently based on learning success.
4.  **Community Sharing:** The ability to publish own decks and import decks from other users.

---

## ✨ Key Features & Benefits

* **⚡ Flexible Template System:** Thanks to the modular architecture (`templates.js`), new subjects (e.g., Chemistry, Coding) can be added easily without changing the core logic.
* **🧮 Math Support:** Integrated rendering of LaTeX (e.g., `$$\int x dx$$`) makes the app ideal for university curriculum.
* **🇨🇳 Pinyin Automation:** Inputs like `ni3hao3` are automatically converted to `nǐhǎo`.
* **☁️ Cloud-First:** All data is stored securely in the Google Cloud (Firestore). No manual saving required.
* **🤝 Marketplace:** Decks can be shared with friends. Includes search, filtering (My Decks vs. Others), and preview functionality.
* **📱 Installable (PWA):** Thanks to `manifest.json`, the web app can be installed on smartphones just like a native app.
* **🌙 Dark Mode:** Fully supported dark theme that respects user preference.

---

## 🛠 Tech Stack

* **Frontend:** HTML5, Tailwind CSS, JavaScript (ES6 Modules).
* **Backend / BaaS:** Google Firebase (Auth, Firestore, Hosting).
* **Libraries:**
    * [KaTeX](https://katex.org/) (for Math rendering).
    * [Tailwind CSS](https://tailwindcss.com/) (via CDN for styling).

---

## 🚀 Installation & Development

**Prerequisites:** Node.js and Firebase CLI installed.

1.  Clone the repository:
    ```bash
    git clone [https://github.com/YOUR_USERNAME/omnicards-web.git](https://github.com/YOUR_USERNAME/omnicards-web.git)
    cd omnicards-web
    ```

2.  Test locally:
    ```bash
    firebase serve
    ```
    The app will run at `http://localhost:5000`.

3.  Deploy:
    ```bash
    firebase deploy
    ```

---
*Vibe-coded with Gemini 3 Pro*

## Data Structure

erDiagram
    USER ||--o{ DECK : "owns (private)"
    DECK ||--o{ CARD : contains
    
    PUBLIC_DECK }|--|| USER : "published by"
    PUBLIC_DECK ||--o{ PUBLIC_CARD : contains

    USER {
        string uid PK "Google Auth ID"
        string displayName
        string email
    }

    DECK {
        string id PK
        string title
        string type "template type"
        int cardCount
        timestamp createdAt
        timestamp lastLearnedAt
        boolean isImported
    }

    CARD {
        string id PK
        string front
        string back
        string extra
        int srsLevel "0-4"
        int consecutiveCorrect
    }

    PUBLIC_DECK {
        string id PK
        string originalAuthorId FK
        string originalDeckId FK "Link to private deck"
        string title
        timestamp publishedAt
    }

## Data Flow

sequenceDiagram
    participant User
    participant App (Frontend)
    participant Auth (Firebase)
    participant DB (Firestore)

    User->>App: Opens App
    App->>Auth: Check Login State
    
    alt is logged in
        Auth-->>App: User Object (uid)
        App->>DB: subscribeDecks(uid)
        DB-->>App: Stream of Decks
        App->>User: Show Dashboard
    else is guest
        Auth-->>App: null
        App->>User: Show Login Button
    end

    User->>App: Click "Study Deck"
    App->>DB: subscribeCards(deckId)
    DB-->>App: Stream of Cards
    App->>User: Show Flashcard UI