import { convertPinyinTones } from './utils.js';

const getVal = (card, field, fallback) => {
    if (card[field] !== undefined && card[field] !== null && card[field] !== '') return card[field];
    if (card[fallback] !== undefined && card[fallback] !== null && card[fallback] !== '') return card[fallback];
    return ''; 
};

export const CardTemplates = {
    'standard': {
        nameKey: 'tpl.std.name',
        descKey: 'tpl.std.desc',
        fields: [
            { id: 'front', label: 'field.front', placeholder: 'ph.dog', type: 'text', required: true },
            { id: 'back', label: 'field.back', placeholder: 'ph.hund', type: 'text', required: true },
            { id: 'extra', label: 'field.note', placeholder: 'ph.memo', type: 'text', required: false }
        ],
        // NEU: 'font-content' Klasse hinzugefügt für Inter Font
        renderFront: (card) => `<div class="text-3xl font-bold dark:text-gray-100 font-content">${getVal(card, 'front', 'german')}</div>`,
        renderBack: (card) => `
            <div class="text-3xl font-bold mb-4 dark:text-gray-100 font-content">${getVal(card, 'back', 'chinese')}</div>
            ${card.extra ? `<div class="text-gray-500 dark:text-gray-400 italic text-lg font-content">${card.extra}</div>` : ''}
        `
    },
    
    'chinese': {
        nameKey: 'tpl.chn.name',
        descKey: 'tpl.chn.desc',
        fields: [
            { id: 'front', label: 'field.german', placeholder: 'ph.haus', type: 'text', required: true },
            { id: 'back', label: 'field.hanzi', placeholder: 'ph.fangzi', type: 'text', required: true },
            { 
                id: 'extra', 
                label: 'field.pinyin', 
                placeholder: 'ph.pinyin', 
                type: 'text', 
                required: true,
                hasAction: true, 
                actionLabel: 'btn.convert',
                actionHandler: (inputEl) => {
                    inputEl.value = convertPinyinTones(inputEl.value);
                }
            }
        ],
        // NEU: 'font-content' Klasse
        renderFront: (card) => `<div class="text-3xl font-bold dark:text-gray-100 font-content">${getVal(card, 'front', 'german')}</div>`,
        renderBack: (card) => `
            <div class="text-5xl font-bold mb-2 font-serif dark:text-gray-100 font-content">${getVal(card, 'back', 'chinese')}</div>
            <div class="text-2xl text-blue-600 dark:text-blue-400 mb-4 font-content">${getVal(card, 'extra', 'pinyin')}</div>
        `
    },

    'math': {
        nameKey: 'tpl.math.name',
        descKey: 'tpl.math.desc',
        fields: [
            { id: 'front', label: 'field.problem', placeholder: 'ph.deriv', type: 'text', required: true },
            { id: 'back', label: 'field.solution', placeholder: 'ph.sol2x', type: 'text', required: true },
            { id: 'extra', label: 'field.hint', placeholder: 'ph.rule', type: 'text', required: false }
        ],
        // NEU: 'font-content' Klasse
        renderFront: (card) => `<div class="text-2xl dark:text-gray-100 font-content">${getVal(card, 'front', 'german')}</div>`,
        renderBack: (card) => `
            <div class="text-2xl mb-4 text-blue-700 dark:text-blue-400 font-content">${getVal(card, 'back', 'chinese')}</div>
            ${card.extra ? `<div class="text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-600 pt-2 mt-2 font-content">Hint: ${card.extra}</div>` : ''}
        `
    }
};