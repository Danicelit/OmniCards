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
        // KEIN 'modes' Objekt mehr -> Signal für App.js: Nutze generische Logik!
        
        renderFront: (card, direction, extraPos) => {
            const content = direction === 'rev' ? getVal(card, 'back', 'chinese') : getVal(card, 'front', 'german');
            const extra = getVal(card, 'extra', 'note');
            
            let html = `<div class="text-3xl font-bold dark:text-gray-100 font-content">${content}</div>`;
            
            // Wenn Extra auf Vorderseite gewünscht ist:
            if (extraPos === 'front' && extra) {
                html += `<div class="text-lg text-blue-600 dark:text-blue-400 mt-4 font-content italic">${extra}</div>`;
            }
            return html;
        },
        
        renderBack: (card, direction, extraPos) => {
            const content = direction === 'rev' ? getVal(card, 'front', 'german') : getVal(card, 'back', 'chinese');
            const extra = getVal(card, 'extra', 'note');

            let html = `<div class="text-3xl font-bold mb-4 dark:text-gray-100 font-content">${content}</div>`;
            
            // Wenn Extra auf Rückseite gewünscht ist (Standard):
            if (extraPos === 'back' && extra) {
                html += `<div class="text-gray-500 dark:text-gray-400 italic text-lg font-content">${extra}</div>`;
            }
            return html;
        }
    },
    
    'chinese': {
        nameKey: 'tpl.chn.name',
        descKey: 'tpl.chn.desc',
        fields: [ /* ... Felder bleiben gleich ... */ 
            { id: 'front', label: 'field.german', placeholder: 'ph.haus', type: 'text', required: true },
            { id: 'back', label: 'field.hanzi', placeholder: 'ph.fangzi', type: 'text', required: true },
            { id: 'extra', label: 'field.pinyin', placeholder: 'ph.pinyin', type: 'text', required: true, hasAction: true, actionLabel: 'btn.convert', actionHandler: (inputEl) => { inputEl.value = convertPinyinTones(inputEl.value); } }
        ],
        // 'modes' EXISTIERT -> Signal für App.js: Nutze Spezial-Logik (nur 1 Dropdown)
        modes: {
            'de_zh': 'mode.chn.de_zh',
            'zh_de': 'mode.chn.zh_de',
            'py_de': 'mode.chn.py_de'
        },
        // renderFront/Back ignorieren 'extraPos', da es hier fest verdrahtet ist
        renderFront: (card, mode) => {
            const de = getVal(card, 'front', 'german');
            const hanzi = getVal(card, 'back', 'chinese');
            const pinyin = getVal(card, 'extra', 'pinyin');

            if (!mode || mode === 'de_zh') return `<div class="text-3xl font-bold dark:text-gray-100 font-content">${de}</div>`;
            if (mode === 'zh_de') return `<div class="text-5xl font-bold font-serif dark:text-gray-100 font-content">${hanzi}</div>`;
            if (mode === 'py_de') return `<div class="text-3xl font-bold text-blue-600 dark:text-blue-400 font-content">${pinyin}</div>`;
        },
        renderBack: (card, mode) => {
            const de = getVal(card, 'front', 'german');
            const hanzi = getVal(card, 'back', 'chinese');
            const pinyin = getVal(card, 'extra', 'pinyin');

            if (!mode || mode === 'de_zh') return `
                <div class="text-5xl font-bold mb-2 font-serif dark:text-gray-100 font-content">${hanzi}</div>
                <div class="text-2xl text-blue-600 dark:text-blue-400 mb-4 font-content">${pinyin}</div>`;
            
            if (mode === 'zh_de') return `
                <div class="text-3xl font-bold mb-2 dark:text-gray-100 font-content">${de}</div>
                <div class="text-2xl text-blue-600 dark:text-blue-400 mb-4 font-content">${pinyin}</div>`;

            if (mode === 'py_de') return `
                <div class="text-3xl font-bold mb-2 dark:text-gray-100 font-content">${de}</div>
                <div class="text-5xl font-bold font-serif dark:text-gray-100 font-content">${hanzi}</div>`;
        }
    },

    'math': {
        nameKey: 'tpl.math.name',
        descKey: 'tpl.math.desc',
        fields: [
            { id: 'front', label: 'field.problem', placeholder: 'ph.deriv', type: 'text', required: true },
            { id: 'back', label: 'field.solution', placeholder: 'ph.sol2x', type: 'text', required: true },
            { id: 'extra', label: 'field.hint', placeholder: 'ph.rule', type: 'text', required: false }
        ],
        // KEIN 'modes' -> Generisch!
        renderFront: (card, direction, extraPos) => {
            const content = direction === 'rev' ? getVal(card, 'back', 'chinese') : getVal(card, 'front', 'german');
            const extra = getVal(card, 'extra', 'hint');
            
            let html = `<div class="text-2xl dark:text-gray-100 font-content">${content}</div>`;
            
            if (extraPos === 'front' && extra) {
                 html += `<div class="text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-600 pt-2 mt-4 font-content">Hint: ${extra}</div>`;
            }
            return html;
        },
        renderBack: (card, direction, extraPos) => {
            const content = direction === 'rev' ? getVal(card, 'front', 'german') : getVal(card, 'back', 'chinese');
            const extra = getVal(card, 'extra', 'hint');

            let html = `<div class="text-2xl mb-4 text-blue-700 dark:text-blue-400 font-content">${content}</div>`;

            if (extraPos === 'back' && extra) {
                 html += `<div class="text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-600 pt-2 mt-2 font-content">Hint: ${extra}</div>`;
            }
            return html;
        }
    }
};