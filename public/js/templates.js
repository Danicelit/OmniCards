import { convertPinyinTones } from './utils.js';

export const CardTemplates = {
    'standard': {
        name: 'Standard (Languages & Knowledge)',
        description: 'Front & Back. Good for vocabulary, history, trivia.',
        fields: [
            { id: 'front', label: 'Front (Question)', placeholder: 'e.g., Dog', type: 'text' },
            { id: 'back', label: 'Back (Answer)', placeholder: 'e.g., Hund', type: 'text' },
            { id: 'extra', label: 'Note (Optional)', placeholder: 'Mnemonic...', type: 'text' }
        ],
        // ... render funktionen bleiben gleich ...
        renderFront: (card) => `<div class="text-3xl font-bold dark:text-gray-100">${card.front}</div>`,
        renderBack: (card) => `
            <div class="text-3xl font-bold mb-4 dark:text-gray-100">${card.back}</div>
            ${card.extra ? `<div class="text-gray-500 dark:text-gray-400 italic text-lg">${card.extra}</div>` : ''}
        `
    },
    
    'chinese': {
        name: 'Chinese (with Pinyin)',
        description: 'Special field for Pinyin with automatic tone conversion.',
        fields: [
            { id: 'front', label: 'German Word', placeholder: 'e.g., Haus', type: 'text' },
            { id: 'back', label: 'Hanzi (Characters)', placeholder: 'e.g., 房子', type: 'text' },
            { 
                id: 'extra', // CLEANUP: War vorher 'pinyin'
                label: 'Pinyin', 
                placeholder: 'fang2zi', 
                type: 'text', 
                hasAction: true, 
                actionLabel: 'Convert',
                actionHandler: (inputEl) => {
                    inputEl.value = convertPinyinTones(inputEl.value);
                }
            }
        ],
        renderFront: (card) => `<div class="text-3xl font-bold dark:text-gray-100">${card.front}</div>`,
        renderBack: (card) => `
            <div class="text-5xl font-bold mb-2 font-serif dark:text-gray-100">${card.back}</div>
            <div class="text-2xl text-blue-600 dark:text-blue-400 mb-4">${card.extra}</div>
        `
    },

    'math': {
        name: 'Mathematics (LaTeX)',
        description: 'Optimized for formulas. Supports $$...$$ syntax.',
        fields: [
            { id: 'front', label: 'Problem / Concept', placeholder: 'e.g., Derivative of $$ x^2 $$', type: 'text' },
            { id: 'back', label: 'Solution / Formula', placeholder: 'e.g., $$ 2x $$', type: 'text' },
            { id: 'extra', label: 'Hint (Optional)', placeholder: 'Rule...', type: 'text' } // War 'hint'
        ],
        renderFront: (card) => `<div class="text-2xl dark:text-gray-100">${card.front}</div>`,
        renderBack: (card) => `
            <div class="text-2xl mb-4 text-blue-700 dark:text-blue-400">${card.back}</div>
            ${card.extra ? `<div class="text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-600 pt-2 mt-2">Hint: ${card.extra}</div>` : ''}
        `
    }
};