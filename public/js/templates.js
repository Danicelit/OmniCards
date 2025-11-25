import { convertPinyinTones } from './utils.js';

// Helfer: Holt Daten sicher
const getVal = (card, field, fallback) => {
    if (card[field] !== undefined && card[field] !== null && card[field] !== '') return card[field];
    if (card[fallback] !== undefined && card[fallback] !== null && card[fallback] !== '') return card[fallback];
    return ''; 
};

export const CardTemplates = {
    'standard': {
        name: 'Standard (Languages & Knowledge)',
        description: 'Front & Back. Good for vocabulary, history, trivia.',
        fields: [
            { id: 'front', label: 'Front (Question)', placeholder: 'e.g., Dog', type: 'text' },
            { id: 'back', label: 'Back (Answer)', placeholder: 'e.g., Hund', type: 'text' },
            { id: 'note', label: 'Note (Optional)', placeholder: 'Mnemonic...', type: 'text' }
        ],
        // FIX: dark:text-gray-100 für Lesbarkeit
        renderFront: (card) => `<div class="text-3xl font-bold dark:text-gray-100">${getVal(card, 'front', 'german')}</div>`,
        renderBack: (card) => `
            <div class="text-3xl font-bold mb-4 dark:text-gray-100">${getVal(card, 'back', 'chinese')}</div>
            ${card.note ? `<div class="text-gray-500 dark:text-gray-400 italic text-lg">${card.note}</div>` : ''}
        `
    },
    
    'chinese': {
        name: 'Chinese (with Pinyin)',
        description: 'Special field for Pinyin with automatic tone conversion.',
        fields: [
            { id: 'front', label: 'German Word', placeholder: 'e.g., Haus', type: 'text' },
            { id: 'back', label: 'Hanzi (Characters)', placeholder: 'e.g., 房子', type: 'text' },
            { 
                id: 'pinyin', 
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
        renderFront: (card) => `<div class="text-3xl font-bold dark:text-gray-100">${getVal(card, 'front', 'german')}</div>`,
        renderBack: (card) => {
            const pinyin = getVal(card, 'pinyin', 'extra');
            return `
            <div class="text-5xl font-bold mb-2 font-serif dark:text-gray-100">${getVal(card, 'back', 'chinese')}</div>
            <div class="text-2xl text-blue-600 dark:text-blue-400 mb-4">${pinyin}</div>
            `;
        }
    },

    'math': {
        name: 'Mathematics (LaTeX)',
        description: 'Optimized for formulas. Supports $$...$$ syntax.',
        fields: [
            { id: 'front', label: 'Problem / Concept', placeholder: 'e.g., Derivative of $$ x^2 $$', type: 'text' },
            { id: 'back', label: 'Solution / Formula', placeholder: 'e.g., $$ 2x $$', type: 'text' },
            { id: 'hint', label: 'Hint (Optional)', placeholder: 'Rule...', type: 'text' }
        ],
        renderFront: (card) => `<div class="text-2xl dark:text-gray-100">${getVal(card, 'front', 'german')}</div>`,
        renderBack: (card) => `
            <div class="text-2xl mb-4 text-blue-700 dark:text-blue-400">${getVal(card, 'back', 'chinese')}</div>
            ${card.hint ? `<div class="text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-600 pt-2 mt-2">Hint: ${card.hint}</div>` : ''}
        `
    }
};