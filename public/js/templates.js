// public/js/templates.js
import { convertPinyinTones } from './utils.js'; // Wir nutzen deine existierende Funktion

export const CardTemplates = {
    'standard': {
        name: 'Standard (Sprachen & Wissen)',
        description: 'Vorderseite & Rückseite. Gut für Vokabeln, Geschichte, Trivia.',
        fields: [
            { id: 'front', label: 'Vorderseite (Frage)', placeholder: 'z.B. Dog', type: 'text' },
            { id: 'back', label: 'Rückseite (Antwort)', placeholder: 'z.B. Hund', type: 'text' },
            { id: 'note', label: 'Notiz (Optional)', placeholder: 'Eselsbrücke...', type: 'text' }
        ],
        // Wie wird die Karte im Lernmodus angezeigt?
        renderFront: (card) => `<div class="text-3xl font-bold">${card.front}</div>`,
        renderBack: (card) => `
            <div class="text-3xl font-bold mb-4">${card.back}</div>
            ${card.note ? `<div class="text-gray-500 italic text-lg">${card.note}</div>` : ''}
        `
    },
    
    'chinese': {
        name: 'Chinesisch (mit Pinyin)',
        description: 'Spezialfeld für Pinyin mit automatischer Ton-Umwandlung.',
        fields: [
            { id: 'front', label: 'Deutsches Wort', placeholder: 'z.B. Haus', type: 'text' },
            { id: 'back', label: 'Hanzi (Schriftzeichen)', placeholder: 'z.B. 房子', type: 'text' },
            { 
                id: 'pinyin', 
                label: 'Pinyin', 
                placeholder: 'fang2zi', 
                type: 'text', 
                hasAction: true, 
                actionLabel: 'Wandeln',
                actionHandler: (inputEl) => {
                    inputEl.value = convertPinyinTones(inputEl.value);
                }
            }
        ],
        renderFront: (card) => `<div class="text-3xl font-bold">${card.front}</div>`,
        renderBack: (card) => `
            <div class="text-5xl font-bold mb-2 font-serif">${card.back}</div>
            <div class="text-2xl text-blue-600 mb-4">${card.pinyin || ''}</div>
        `
    },

    'math': {
        name: 'Mathematik (LaTeX)',
        description: 'Optimiert für Formeln. Unterstützt $$...$$ Syntax.',
        fields: [
            { id: 'front', label: 'Aufgabe / Begriff', placeholder: 'z.B. Ableitung von $$ x^2 $$', type: 'text' },
            { id: 'back', label: 'Lösung / Formel', placeholder: 'z.B. $$ 2x $$', type: 'text' },
            { id: 'hint', label: 'Tipp (Optional)', placeholder: 'Regel...', type: 'text' }
        ],
        renderFront: (card) => `<div class="text-2xl">${card.front}</div>`,
        renderBack: (card) => `
            <div class="text-2xl mb-4 text-blue-700">${card.back}</div>
            ${card.hint ? `<div class="text-sm text-gray-500 border-t pt-2 mt-2">Tipp: ${card.hint}</div>` : ''}
        `
    },

    'coding': { // Beispiel für zukünftige Erweiterung
        name: 'Programmieren / Code',
        description: 'Monospace Font für Code-Snippets.',
        fields: [
            { id: 'front', label: 'Konzept / Frage', placeholder: 'Wie definiert man eine Konstante?', type: 'text' },
            { id: 'back', label: 'Code', placeholder: 'const x = 1;', type: 'textarea' } // textarea könnte man später unterstützen
        ],
        renderFront: (card) => `<div class="text-xl font-bold">${card.front}</div>`,
        renderBack: (card) => `<pre class="bg-gray-800 text-green-400 p-4 rounded text-left text-sm overflow-x-auto">${card.back}</pre>`
    }
};