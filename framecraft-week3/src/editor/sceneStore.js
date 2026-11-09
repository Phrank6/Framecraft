import { validateStoryboard } from '../schema/storyboard.schema.js';

/**
 * Editable storyboard scene with undo/redo.
 *
 * Every user change goes through `edit(label, fn)`: fn receives a draft copy of
 * the document and changes it; the store validates the result and records the
 * previous version, so one call = one undo step. A gizmo drag is therefore
 * recorded once, when the drag ends, not once per mouse move.
 */
export function createSceneStore(initialDoc, { limit = 200 } = {}) {
    const first = validateStoryboard(initialDoc);
    if (!first.success)
        throw new Error(`Invalid scene: ${first.errors.map(e => `${e.path} ${e.message}`).join('; ')}`);
    let doc = first.data;
    const past = [];
    const future = [];
    const listeners = new Set();
    const notify = (reason) => listeners.forEach(fn => fn(doc, reason));

    function edit(label, mutate) {
        const draft = structuredClone(doc);
        const returned = mutate(draft);
        const result = validateStoryboard(draft);
        if (!result.success)
            throw new Error(`${label}: ${result.errors.map(e => `${e.path} ${e.message}`).join('; ')}`);
        past.push({ label, doc });
        if (past.length > limit)
            past.shift();
        future.length = 0;
        doc = result.data;
        notify({ type: 'edit', label });
        return returned;
    }

    function undo() {
        const step = past.pop();
        if (!step)
            return null;
        future.push({ label: step.label, doc });
        doc = step.doc;
        notify({ type: 'undo', label: step.label });
        return step.label;
    }

    function redo() {
        const step = future.pop();
        if (!step)
            return null;
        past.push({ label: step.label, doc });
        doc = step.doc;
        notify({ type: 'redo', label: step.label });
        return step.label;
    }

    /** Replace the whole document (e.g. "Open file"); clears history. */
    function load(nextDoc) {
        const result = validateStoryboard(nextDoc);
        if (!result.success)
            throw new Error(`Invalid scene: ${result.errors.map(e => `${e.path} ${e.message}`).join('; ')}`);
        doc = result.data;
        past.length = 0;
        future.length = 0;
        notify({ type: 'load' });
    }

    return {
        get doc() { return doc; },
        edit, undo, redo, load,
        canUndo: () => past.length > 0,
        canRedo: () => future.length > 0,
        undoLabel: () => past.at(-1)?.label ?? null,
        redoLabel: () => future.at(-1)?.label ?? null,
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    };
}

// ---- Edit helpers: plain functions that change a draft document ----

export function uniqueId(doc, base) {
    const taken = new Set([...doc.objects, ...doc.lights, ...doc.shots].map(x => x.id));
    const clean = base.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'item';
    const root = clean.includes('_') ? clean : `${clean}_1`;
    if (!taken.has(root))
        return root;
    const stem = root.replace(/_\d+$/, '');
    for (let n = 2; ; n++) {
        const id = `${stem}_${n}`;
        if (!taken.has(id))
            return id;
    }
}

export function findObject(doc, id) {
    const obj = doc.objects.find(o => o.id === id);
    if (!obj)
        throw new Error(`No object ${id}`);
    return obj;
}

export const ops = {
    setTransform(draft, id, transform) {
        const obj = findObject(draft, id);
        if (obj.locked)
            throw new Error(`${obj.label} is locked`);
        obj.transform = { ...obj.transform, ...structuredClone(transform) };
    },
    addObject(draft, obj) {
        const id = uniqueId(draft, obj.id ?? `obj_${obj.label}`);
        draft.objects.push({ ...structuredClone(obj), id });
        return id;
    },
    deleteObject(draft, id) {
        const obj = findObject(draft, id);
        if (obj.locked)
            throw new Error(`${obj.label} is locked`);
        draft.objects = draft.objects.filter(o => o.id !== id);
    },
    duplicateObject(draft, id, offset = [0.5, 0, 0.5]) {
        const obj = findObject(draft, id);
        if (obj.locked)
            throw new Error(`${obj.label} is locked`);
        const copy = structuredClone(obj);
        copy.id = uniqueId(draft, obj.id.replace(/_\d+$/, '') + '_copy');
        copy.label = `${obj.label} (copy)`;
        copy.transform.position = obj.transform.position.map((v, i) => +(v + offset[i]).toFixed(4));
        copy.source = { tag: 'user' };
        draft.objects.push(copy);
        return copy.id;
    },
    addShot(draft, { camera, lens_mm, aspect = '16:9', time, light_note = '', script_line = '', description = '' }) {
        const number = draft.shots.reduce((max, s) => Math.max(max, s.number), 0) + 1;
        const id = uniqueId(draft, `shot_${String(number).padStart(2, '0')}`);
        draft.shots.push({ id, number, lens_mm, aspect, time: time ?? draft.shots.at(-1)?.time ?? '12:00', light_note, script_line, description, camera: structuredClone(camera) });
        return id;
    },
    updateShot(draft, id, patch) {
        const shot = draft.shots.find(s => s.id === id);
        if (!shot)
            throw new Error(`No shot ${id}`);
        Object.assign(shot, structuredClone(patch));
    },
    deleteShot(draft, id) {
        draft.shots = draft.shots.filter(s => s.id !== id);
        // Renumber so the storyboard reads 1, 2, 3 … without gaps.
        draft.shots.sort((a, b) => a.number - b.number).forEach((s, i) => { s.number = i + 1; });
    },
};
