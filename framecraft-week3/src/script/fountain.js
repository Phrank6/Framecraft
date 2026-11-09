/**
 * Small Fountain screenplay parser (https://fountain.io/syntax).
 *
 * Written in-house instead of using fountain-js so that every element keeps its
 * source line number (needed for "stated in the script, line N" tags).
 * Covers: title page, scene headings (INT./EXT./EST./INT./EXT./I/E and forced
 * ".HEADING"), action, character (with extensions and forced "@"), dualogue
 * caret, parenthetical, dialogue, transitions, centered text, sections,
 * synopses, notes [[ ]], boneyard /* *\/, page breaks and lyrics.
 * Not covered: emphasis markup is kept as plain text (*, _ are stripped).
 */
const HEADING = /^(?:\.(?!\.)(.+)|((?:INT|EXT|EST|INT\.?\/EXT|I\/E)[. ].+))$/i;
const TRANSITION = /^(?:>\s*(.+?)(?<!<)$|([A-Z0-9 '\-.]+TO:))$/;
const CHARACTER = /^(?:@(.+)|([A-Z][A-Z0-9 '\-.]*[A-Z0-9.)'](?:\s*\(.*\))?))\s*(\^)?$/;

function stripEmphasis(text) {
    return text.replace(/\\([*_])/g, '$1').replace(/(\*{1,3}|_)(?=\S)(.+?)(?<=\S)\1/g, '$2');
}

function removeNotesAndBoneyard(source) {
    // Keep newlines so that line numbers stay correct.
    const blank = m => m.replace(/[^\n]/g, '');
    return source.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/\[\[[\s\S]*?\]\]/g, blank);
}

export function parseHeading(text) {
    const clean = text.replace(/^\./, '').replace(/\s*#[^#]+#\s*$/, '').trim();
    const m = clean.match(/^(INT\.?\s*\/\s*EXT|I\/E|INT|EXT|EST)\.?\s+(.*)$/i);
    let intExt = null, rest = clean;
    if (m) {
        const k = m[1].toUpperCase().replace(/\s/g, '');
        intExt = k.startsWith('INT/') || k.startsWith('INT./') || k === 'I/E' ? 'INT/EXT' : k === 'EST' ? 'EXT' : k;
        rest = m[2];
    }
    const parts = rest.split(/\s+-\s+/);
    const time = parts.length > 1 ? parts.pop().trim() : null;
    return { int_ext: intExt, location: parts.join(' - ').trim() || clean, time_of_day: time };
}

export function characterName(cue) {
    return cue.replace(/^@/, '').replace(/\^$/, '').replace(/\s*\(.*?\)\s*/g, ' ').trim().toUpperCase();
}

export function parseFountain(source) {
    const text = removeNotesAndBoneyard(source.replace(/\r\n?/g, '\n').replace(/\t/g, '    '));
    const lines = text.split('\n');
    const title = {};
    let i = 0;
    // Title page: "Key: value" lines at the very top, ended by a blank line.
    if (/^[A-Za-z][A-Za-z ]*:/.test(lines[0] ?? '')) {
        let key = null;
        for (; i < lines.length && lines[i].trim() !== ''; i++) {
            const kv = lines[i].match(/^([A-Za-z][A-Za-z ]*):\s*(.*)$/);
            if (kv) {
                key = kv[1].trim().toLowerCase();
                title[key] = kv[2].trim();
            }
            else if (key)
                title[key] = `${title[key]}\n${lines[i].trim()}`.trim();
        }
    }
    const elements = [];
    let inDialogue = null;
    for (; i < lines.length; i++) {
        const raw = lines[i];
        const line = raw.trim();
        const lineNo = i + 1;
        const prevBlank = i === 0 || lines[i - 1].trim() === '';
        const nextBlank = i + 1 >= lines.length || lines[i + 1].trim() === '';
        if (line === '') {
            inDialogue = null;
            continue;
        }
        if (inDialogue) {
            if (/^\(.*\)$/.test(line))
                elements.push({ type: 'parenthetical', text: line, line: lineNo, character: inDialogue });
            else
                elements.push({ type: 'dialogue', text: stripEmphasis(line), line: lineNo, character: inDialogue });
            continue;
        }
        if (/^={3,}$/.test(line)) {
            elements.push({ type: 'page_break', text: '', line: lineNo });
            continue;
        }
        if (line.startsWith('#')) {
            elements.push({ type: 'section', text: line.replace(/^#+\s*/, ''), depth: line.match(/^#+/)[0].length, line: lineNo });
            continue;
        }
        if (line.startsWith('=')) {
            elements.push({ type: 'synopsis', text: line.replace(/^=\s*/, ''), line: lineNo });
            continue;
        }
        if (line.startsWith('~')) {
            elements.push({ type: 'lyrics', text: line.replace(/^~\s*/, ''), line: lineNo });
            continue;
        }
        if (/^>.*<$/.test(line)) {
            elements.push({ type: 'centered', text: line.slice(1, -1).trim(), line: lineNo });
            continue;
        }
        if (line.startsWith('!')) {
            elements.push({ type: 'action', text: stripEmphasis(line.slice(1)), line: lineNo });
            continue;
        }
        if (prevBlank && HEADING.test(line)) {
            elements.push({ type: 'scene_heading', text: line.replace(/^\./, '').trim(), line: lineNo, ...parseHeading(line) });
            continue;
        }
        if (prevBlank && nextBlank && TRANSITION.test(line)) {
            const m = line.match(TRANSITION);
            elements.push({ type: 'transition', text: (m[1] ?? m[2]).trim(), line: lineNo });
            continue;
        }
        if (prevBlank && !nextBlank && CHARACTER.test(line)) {
            const name = characterName(line);
            elements.push({ type: 'character', text: line.replace(/^@/, ''), name, dual: line.endsWith('^'), line: lineNo });
            inDialogue = name;
            continue;
        }
        elements.push({ type: 'action', text: stripEmphasis(raw.replace(/^\s{0,3}/, '').trimEnd()), line: lineNo });
    }
    return { title, elements, total_lines: lines.length };
}

/**
 * Group parsed elements into scenes. Anything before the first heading is
 * ignored (cold-open text without a heading has no place to build).
 */
export function toSceneList(parsed) {
    const scenes = [];
    let current = null;
    for (const el of parsed.elements) {
        if (el.type === 'scene_heading') {
            current = { number: scenes.length + 1, heading: el.text.toUpperCase(), int_ext: el.int_ext, location: el.location.toUpperCase(), time_of_day: el.time_of_day ? el.time_of_day.toUpperCase() : null, line: el.line, elements: [], speakers: [] };
            scenes.push(current);
            continue;
        }
        if (!current)
            continue;
        current.elements.push(el);
        if (el.type === 'character' && !current.speakers.includes(el.name))
            current.speakers.push(el.name);
    }
    return { title: parsed.title.title ?? 'Untitled', scenes };
}
