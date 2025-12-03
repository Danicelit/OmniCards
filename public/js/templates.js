// public/js/templates.js
import { convertPinyinTones, parseRichText } from './utils.js'; // <--- IMPORT UPDATE

const getVal = (card, field, fallback) => {
    // ... (bleibt gleich)
    if (card[field] !== undefined && card[field] !== null && card[field] !== '') return card[field];
    if (card[fallback] !== undefined && card[fallback] !== null && card[fallback] !== '') return card[fallback];
    return ''; 
};

// Helper: Wendet Parser auf Content an
const renderVal = (card, field, fallback) => {
    return parseRichText(getVal(card, field, fallback));
};

export const CardTemplates = {
    'standard': {
        // ... (nameKey, descKey, fields bleiben gleich) ...
        nameKey: 'tpl.std.name',
        descKey: 'tpl.std.desc',
        fields: [
            { id: 'front', label: 'field.front', placeholder: 'ph.dog', type: 'text', required: true },
            { id: 'back', label: 'field.back', placeholder: 'ph.hund', type: 'text', required: true },
            { id: 'extra', label: 'field.note', placeholder: 'ph.memo', type: 'text', required: false }
        ],
        
        renderFront: (card, direction, extraPos) => {
            // BENUTZE renderVal STATT getVal
            const content = direction === 'rev' ? renderVal(card, 'back', 'chinese') : renderVal(card, 'front', 'german');
            const extra = renderVal(card, 'extra', 'note');
            
            let html = `<div class="text-3xl font-bold dark:text-gray-100 font-content">${content}</div>`;
            
            if (extraPos === 'front' && extra) {
                html += `<div class="text-lg text-blue-600 dark:text-blue-400 mt-4 font-content italic">${extra}</div>`;
            }
            return html;
        },
        
        renderBack: (card, direction, extraPos) => {
            const content = direction === 'rev' ? renderVal(card, 'front', 'german') : renderVal(card, 'back', 'chinese');
            const extra = renderVal(card, 'extra', 'note');

            let html = `<div class="text-3xl font-bold mb-4 dark:text-gray-100 font-content">${content}</div>`;
            
            if (extraPos === 'back' && extra) {
                html += `<div class="text-gray-500 dark:text-gray-400 italic text-lg font-content">${extra}</div>`;
            }
            return html;
        }
    },
    
    'chinese': {
        // ... (Keys/Fields bleiben gleich) ...
        nameKey: 'tpl.chn.name',
        descKey: 'tpl.chn.desc',
        fields: [
            { id: 'front', label: 'field.german', placeholder: 'ph.haus', type: 'text', required: true },
            { id: 'back', label: 'field.hanzi', placeholder: 'ph.fangzi', type: 'text', required: true },
            { id: 'extra', label: 'field.pinyin', placeholder: 'ph.pinyin', type: 'text', required: true, hasAction: true, actionLabel: 'btn.convert', actionHandler: (inputEl) => { inputEl.value = convertPinyinTones(inputEl.value); } }
        ],
        modes: {
            'de_zh': 'mode.chn.de_zh',
            'zh_de': 'mode.chn.zh_de',
            'py_de': 'mode.chn.py_de'
        },
        renderFront: (card, mode) => {
            const de = renderVal(card, 'front', 'german');
            const hanzi = renderVal(card, 'back', 'chinese');
            const pinyin = renderVal(card, 'extra', 'pinyin'); // Pinyin braucht meist kein Rich Text, aber schadet nicht

            if (!mode || mode === 'de_zh') return `<div class="text-3xl font-bold dark:text-gray-100 font-content">${de}</div>`;
            if (mode === 'zh_de') return `<div class="text-5xl font-bold font-serif dark:text-gray-100 font-content">${hanzi}</div>`;
            if (mode === 'py_de') return `<div class="text-3xl font-bold text-blue-600 dark:text-blue-400 font-content">${pinyin}</div>`;
        },
        renderBack: (card, mode) => {
            const de = renderVal(card, 'front', 'german');
            const hanzi = renderVal(card, 'back', 'chinese');
            const pinyin = renderVal(card, 'extra', 'pinyin');

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
        // ... (Keys/Fields bleiben gleich) ...
        nameKey: 'tpl.math.name',
        descKey: 'tpl.math.desc',
        fields: [
            { id: 'front', label: 'field.problem', placeholder: 'ph.deriv', type: 'text', required: true },
            { id: 'back', label: 'field.solution', placeholder: 'ph.sol2x', type: 'text', required: true },
            { id: 'extra', label: 'field.hint', placeholder: 'ph.rule', type: 'text', required: false }
        ],
        renderFront: (card, direction, extraPos) => {
            // Math rendert oft LaTeX, aber Text drumherum kann formatiert sein
            const content = direction === 'rev' ? renderVal(card, 'back', 'chinese') : renderVal(card, 'front', 'german');
            const extra = renderVal(card, 'extra', 'hint');
            
            let html = `<div class="text-2xl dark:text-gray-100 font-content">${content}</div>`;
            
            if (extraPos === 'front' && extra) {
                 html += `<div class="text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-600 pt-2 mt-4 font-content">Hint: ${extra}</div>`;
            }
            return html;
        },
        renderBack: (card, direction, extraPos) => {
            const content = direction === 'rev' ? renderVal(card, 'front', 'german') : renderVal(card, 'back', 'chinese');
            const extra = renderVal(card, 'extra', 'hint');

            let html = `<div class="text-2xl mb-4 text-blue-700 dark:text-blue-400 font-content">${content}</div>`;

            if (extraPos === 'back' && extra) {
                 html += `<div class="text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-600 pt-2 mt-2 font-content">Hint: ${extra}</div>`;
            }
            return html;
        }
    }
};