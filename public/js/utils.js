// public/js/utils.js

const pinyinToneMap = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'], 'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'], 'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'], 'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    'A': ['Ā', 'Á', 'Ǎ', 'À', 'A'], 'E': ['Ē', 'É', 'Ě', 'È', 'E'],
    'I': ['Ī', 'Í', 'Ǐ', 'Ì', 'I'], 'O': ['Ō', 'Ó', 'Ǒ', 'Ò', 'O'],
    'U': ['Ū', 'Ú', 'Ǔ', 'Ù', 'U'], 'Ü': ['Ǖ', 'Ǘ', 'Ǚ', 'Ǜ', 'Ü']
};

export function convertPinyinTones(text) {
    const globalPinyinRegex = /([a-zA-ZüÜ]+)(\d)/g;
    return text.replace(globalPinyinRegex, (match, word, toneNum) => {
        const tone = parseInt(toneNum);
        if (tone < 1 || tone > 5) return match;
        const toneIndex = (tone === 5) ? 4 : tone - 1;

        word = word.replace(/v/g, 'ü').replace(/V/g, 'Ü');
        
        let vowelToReplace = '';
        if (word.includes('a') || word.includes('A')) vowelToReplace = word.includes('a') ? 'a' : 'A';
        else if (word.includes('e') || word.includes('E')) vowelToReplace = word.includes('e') ? 'e' : 'E';
        else if (word.includes('ou') || word.includes('OU')) vowelToReplace = word.includes('ou') ? 'o' : 'O';
        else {
            const vowels = 'aeiouüAEIOUÜ';
            for (let i = word.length - 1; i >= 0; i--) {
                if (vowels.includes(word[i])) {
                    vowelToReplace = word[i];
                    break;
                }
            }
        }

        if (vowelToReplace && pinyinToneMap[vowelToReplace]) {
            return word.replace(vowelToReplace, pinyinToneMap[vowelToReplace][toneIndex]);
        }
        return word;
    });
}

/**
 * Wandelt Shortcodes in HTML um und sanitizes den Rest.
 * Unterstützt: [b], [i], [red], [blue], [green], [orange]
 */
export function parseRichText(text) {
    if (!text) return '';

    // 1. Basic Sanitization: Verhindere echte HTML Tags (XSS Schutz)
    let clean = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    // 2. Parse Newlines
    clean = clean.replace(/\n/g, '<br>');

    // 3. Parse Custom Tags
    // Bold & Italic
    clean = clean.replace(/\[b\](.*?)\[\/b\]/g, '<strong>$1</strong>');
    clean = clean.replace(/\[i\](.*?)\[\/i\]/g, '<em>$1</em>');

    // Colors (Tailwind Klassen für Light/Dark Mode)
    // Unterstützt: [red], [blue], [green], [orange]
    const colorMap = {
        'red': 'text-red-600 dark:text-red-400',
        'blue': 'text-blue-600 dark:text-blue-400',
        'green': 'text-emerald-600 dark:text-emerald-400',
        'orange': 'text-orange-600 dark:text-orange-400'
    };

    Object.keys(colorMap).forEach(color => {
        // Regex für z.B. [red]...[/red]
        const regex = new RegExp(`\\[${color}\\](.*?)\\[\\/${color}\\]`, 'g');
        clean = clean.replace(regex, `<span class="${colorMap[color]} font-bold">$1</span>`);
    });

    return clean;
}