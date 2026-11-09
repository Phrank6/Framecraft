/**
 * What the editor can place. Procedural pieces are the hand-modelled café set
 * from Week 1. Everything else is a labelled grey block at real size until a
 * proper model (Poly Haven or Tripo) replaces it — the label shows what it is.
 *
 * `words` are the script words that map to the item (used by the offline
 * extractor and to help the AI pick catalog items).
 */
const P = (id, label, generator, words) => ({ id, label, kind: 'prop', asset: { kind: 'procedural', generator }, words });
const B = (id, label, size_m, words, color = '#a7adb3') => ({ id, label, kind: 'prop', asset: { kind: 'block', size_m, color }, words });

export const CATALOG = Object.freeze([
    P('table', 'Café table', 'cafe-table', ['table', 'tables', 'desk']),
    P('chair', 'Café chair', 'cafe-chair', ['chair', 'chairs', 'seat']),
    P('mug', 'Coffee mug', 'ceramic-mug', ['mug', 'cup', 'coffee', 'flat white', 'latte', 'espresso', 'tea']),
    P('saucer', 'Saucer', 'cup-saucer', ['saucer']),
    P('counter', 'Counter', 'counter', ['counter', 'bar', 'register']),
    P('display', 'Pastry display', 'pastry-display', ['pastry', 'pastries', 'display', 'croissant']),
    P('plant', 'Plant', 'plant', ['plant', 'plants', 'fern', 'pot']),
    P('shelf', 'Shelves', 'shelf', ['shelf', 'shelves', 'bookcase']),
    P('pendant', 'Pendant light', 'pendant', ['pendant', 'ceiling light', 'chandelier']),
    P('art', 'Wall art', 'wall-art', ['painting', 'poster', 'picture', 'wall art']),
    B('sofa', 'Sofa', [2.0, 0.85, 0.9], ['sofa', 'couch']),
    B('bed', 'Bed', [1.6, 0.6, 2.0], ['bed']),
    B('door', 'Door', [0.9, 2.1, 0.08], ['door', 'doorway'], '#b8a48f'),
    B('window', 'Window', [1.4, 1.4, 0.08], ['window', 'windows'], '#a9c1c9'),
    B('lamp_post', 'Lamp post', [0.25, 4.0, 0.25], ['lamp post', 'streetlight', 'street light']),
    B('lamp', 'Table lamp', [0.3, 0.5, 0.3], ['lamp', 'desk lamp'], '#d8c7a0'),
    B('bicycle', 'Bicycle', [1.75, 1.05, 0.5], ['bicycle', 'bike']),
    B('car', 'Car', [4.5, 1.45, 1.8], ['car', 'taxi', 'sedan'], '#8e979e'),
    B('laptop', 'Laptop', [0.33, 0.02, 0.23], ['laptop', 'computer']),
    B('phone', 'Phone', [0.075, 0.01, 0.15], ['phone', 'cellphone', 'smartphone']),
    B('book', 'Book', [0.15, 0.04, 0.23], ['book', 'notebook', 'novel']),
    B('bag', 'Bag', [0.4, 0.35, 0.18], ['bag', 'backpack', 'purse', 'handbag']),
    B('bottle', 'Bottle', [0.08, 0.3, 0.08], ['bottle', 'wine', 'beer']),
    B('glass', 'Glass', [0.08, 0.12, 0.08], ['glass', 'tumbler']),
    B('paper_cup', 'Paper cup', [0.09, 0.14, 0.09], ['paper cup', 'to-go cup', 'takeaway cup']),
    B('box', 'Box', [0.5, 0.4, 0.4], ['box', 'crate', 'package']),
    B('umbrella', 'Umbrella', [0.1, 0.9, 0.1], ['umbrella']),
    B('tv', 'TV', [1.2, 0.7, 0.08], ['tv', 'television', 'screen']),
    B('bench', 'Bench', [1.6, 0.45, 0.45], ['bench']),
]);

export const CHARACTER_TEMPLATES = Object.freeze({
    standing: { kind: 'character', asset: { kind: 'procedural', generator: 'avatar' }, character: { name: 'Character', height_m: 1.75, pose: 'standing' } },
    seated: { kind: 'character', asset: { kind: 'procedural', generator: 'avatar' }, character: { name: 'Character', height_m: 1.7, pose: 'seated' } },
});

export const GREY_BLOCK = (label, size_m = [0.5, 0.5, 0.5]) => ({ id: 'block', label, kind: 'prop', asset: { kind: 'block', size_m, color: '#a7adb3' }, words: [] });

export function catalogItem(id) {
    return CATALOG.find(item => item.id === id) ?? null;
}

/** Longest-phrase-first matching of catalog words in a line of text. */
export function matchCatalog(text) {
    const lower = ` ${text.toLowerCase().replace(/[^a-z0-9'\- ]+/g, ' ')} `;
    const hits = [];
    const used = [];
    const phrases = CATALOG.flatMap(item => item.words.map(word => ({ item, word }))).sort((a, b) => b.word.length - a.word.length);
    for (const { item, word } of phrases) {
        let from = 0;
        while (true) {
            const at = lower.indexOf(` ${word} `, from);
            if (at < 0)
                break;
            const span = [at, at + word.length + 2];
            if (!used.some(([s, e]) => span[0] < e && s < span[1])) {
                used.push(span);
                hits.push({ item, word, at });
            }
            from = at + 1;
        }
    }
    return hits.sort((a, b) => a.at - b.at);
}

/** Build a storyboard object from a catalog item. */
export function objectFromCatalog(item, { position = [0, 0, 0], rotation_deg = [0, 0, 0], label, source = { tag: 'user' } } = {}) {
    return {
        id: `obj_${item.id}`,
        kind: item.kind,
        label: label ?? item.label,
        asset: structuredClone(item.asset),
        transform: { position, rotation_deg, scale: [1, 1, 1] },
        locked: false,
        source,
    };
}
