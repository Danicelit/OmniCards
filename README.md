# OmniCards 🎓

**A universal, web-based flashcard learning platform focusing on flexibility (Math, Languages) and community.**

OmniCards (formerly *chinesisch-app*) is a web application designed to help users internalize learning content efficiently using a "Spaced Repetition System" (SRS). Unlike simple vocabulary trainers, OmniCards supports complex content through a flexible template system, including mathematical formulas (LaTeX) and language-specific features (e.g., Pinyin conversion).

> **Note:** While the documentation and codebase are in English, the current User Interface (UI) of the application is primarily in German. Multi-language support for the UI is planned for Phase 3.

---

## 🗺️ Roadmap & Open Tasks

Here is the current development plan, sorted by priority.

### 🚨 Phase 1: Stability & Critical Bugfixes
- [ ] **Bugfix:** Empty card back during study session (rendering issue).
- [ ] **Bugfix:** Imported cards display "undefined" (data structure compatibility).
- [ ] **Bugfix:** Remove duplicate "Add new card" UI element.
- [ ] **Bugfix:** Header title ("OmniCards") does not reset when returning to the dashboard.
- [ ] **Bugfix:** Card count in dashboard always shows "0".
- [ ] **Bugfix:** User avatar is not consistently displayed after login.

### 🛠 Phase 2: Deck Management & Core Features
- [ ] **Feature:** Delete decks (with security confirmation & sync to marketplace).
- [ ] **Feature:** Rename decks.
- [ ] **Feature:** Extended dashboard sorting (Last opened, Name, Card count).
- [ ] **Feature:** Pin "Last opened deck" to the top.

### ⚙️ Phase 3: Settings & Personalization
- [ ] **Feature:** New settings menu (Modal).
- [ ] **Feature:** UI Language selection (German/English).
- [ ] **Feature:** Dark Mode.
- [ ] **Feature:** Customizable study modes (Front only, Back only, Random).

### 🚀 Phase 4: Marketplace & Community
- [ ] **Feature:** Deck preview before importing (Modal with sample cards).
- [ ] **Feature:** Search and filter functionality in the marketplace.
- [ ] **Feature:** Automatic deletion from marketplace when the private source deck is deleted.

---

## 📖 Project Description

OmniCards was born out of the need to learn specific content—particularly Chinese and Mathematics—in a single, lightweight app. Many existing apps are either too generic (lacking formula support) or too specific (language-only).

The app relies on **Google Firebase** as a backend, enabling real-time synchronization across devices, secure user authentication, and a scalable database. The frontend is intentionally kept "lightweight" (Vanilla JS & Tailwind CSS) to ensure maximum performance and easy maintainability.

### The MVP (Minimum Viable Product)
The current MVP is fully functional and includes the following definitions:
1.  **Multi-User Support:** Each user has their own protected data environment (Google Login).
2.  **Template System:** Support for various card types:
    * *Standard:* Front/Back.
    * *Chinese:* Automatic Pinyin conversion (tone numbers to accents).
    * *Math:* Rendering of LaTeX formulas via KaTeX.
3.  **Learning Algorithm:** A simple Spaced Repetition System that queries cards more or less frequently based on learning success (Levels 0-4).
4.  **Community Sharing:** The ability to publish own decks and import decks from other users.

---

## ✨ Key Features & Benefits

* **⚡ Flexible Template System:** Thanks to the modular architecture (`templates.js`), new subjects (e.g., Chemistry, Coding) can be added easily without changing the core logic.
* **🧮 Math Support:** Integrated rendering of LaTeX (e.g., `$$\int x dx$$`) makes the app ideal for university curriculum.
* **🇨🇳 Pinyin Automation:** Inputs like `ni3hao3` are automatically converted to `nǐhǎo`.
* **☁️ Cloud-First:** All data is stored securely in the Google Cloud (Firestore). No manual saving required.
* **🤝 Marketplace:** Decks can be shared with friends with a single click. Importing creates a *copy*, ensuring your learning progress remains independent of the creator.
* **📱 Installable (PWA):** Thanks to `manifest.json`, the web app can be installed on smartphones just like a native app.

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