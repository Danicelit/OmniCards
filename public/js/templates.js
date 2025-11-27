import { convertPinyinTones } from './utils.js';

// Helfer: Holt Daten sicher
const getVal = (card, field, fallback) => {
    if (card[field] !== undefined && card[field] !== null && card[field] !== '') return card[field];
    if (card[fallback] !== undefined && card[fallback] !== null && card[fallback] !== '') return card[fallback];
    return ''; 
};

export const CardTemplates = {
    'standard': {
        nameKey: 'tpl.std.name', // NEU: Key statt Text
        descKey: 'tpl.std.desc', // NEU: Key statt Text
        fields: [
            { id: 'front', label: 'field.front', placeholder: 'ph.dog', type: 'text' },
            { id: 'back', label: 'field.back', placeholder: 'ph.hund', type: 'text' },
            { id: 'extra', label: 'field.note', placeholder: 'ph.memo', type: 'text' }
        ],
        renderFront: (card) => `<div class="text-3xl font-bold dark:text-gray-100">${getVal(card, 'front', 'german')}</div>`,
        renderBack: (card) => `
            <div class="text-3xl font-bold mb-4 dark:text-gray-100">${getVal(card, 'back', 'chinese')}</div>
            ${card.extra ? `<div class="text-gray-500 dark:text-gray-400 italic text-lg">${card.extra}</div>` : ''}
        `
    },
    
    'chinese': {
        nameKey: 'tpl.chn.name',
        descKey: 'tpl.chn.desc',
        fields: [
            { id: 'front', label: 'field.german', placeholder: 'ph.haus', type: 'text' },
            { id: 'back', label: 'field.hanzi', placeholder: 'ph.fangzi', type: 'text' },
            { 
                id: 'extra', 
                label: 'field.pinyin', 
                placeholder: 'ph.pinyin', 
                type: 'text', 
                hasAction: true, 
                actionLabel: 'btn.convert', // Key
                actionHandler: (inputEl) => {
                    inputEl.value = convertPinyinTones(inputEl.value);
                }
            }
        ],
        renderFront: (card) => `<div class="text-3xl font-bold dark:text-gray-100">${getVal(card, 'front', 'german')}</div>`,
        renderBack: (card) => `
            <div class="text-5xl font-bold mb-2 font-serif dark:text-gray-100">${getVal(card, 'back', 'chinese')}</div>
            <div class="text-2xl text-blue-600 dark:text-blue-400 mb-4">${getVal(card, 'extra', 'pinyin')}</div>
        `
    },

    'math': {
        nameKey: 'tpl.math.name',
        descKey: 'tpl.math.desc',
        fields: [
            { id: 'front', label: 'field.problem', placeholder: 'ph.deriv', type: 'text' },
            { id: 'back', label: 'field.solution', placeholder: 'ph.sol2x', type: 'text' },
            { id: 'extra', label: 'field.hint', placeholder: 'ph.rule', type: 'text' }
        ],
        renderFront: (card) => `<div class="text-2xl dark:text-gray-100">${getVal(card, 'front', 'german')}</div>`,
        renderBack: (card) => `
            <div class="text-2xl mb-4 text-blue-700 dark:text-blue-400">${getVal(card, 'back', 'chinese')}</div>
            ${card.extra ? `<div class="text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-600 pt-2 mt-2">Hint: ${card.extra}</div>` : ''}
        `
    }
};