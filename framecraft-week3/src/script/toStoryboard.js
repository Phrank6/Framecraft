import { CATALOG, objectFromCatalog, GREY_BLOCK } from '../editor/catalog.js';
import { validateStoryboard } from '../schema/storyboard.schema.js';
import { titleCase } from './extract.js';

/**
 * Turn one scene's breakdown into a first, editable storyboard scene.
 * This is a starter layout by simple rules (a row of characters, props on a
 * grid, small items on the first table). Smart placement is next week's AI
 * layout step; the user fixes this one by hand in the editor.
 */
const TABLETOP = new Set(['mug', 'saucer', 'laptop', 'phone', 'book', 'glass', 'bottle', 'paper_cup']);
const TIME_BY_WORD = [[/dawn|sunrise/, '06:30'], [/morning/, '09:00'], [/noon|midday/, '12:00'], [/afternoon/, '15:00'], [/dusk|sunset|evening|golden/, '18:00'], [/night|midnight/, '21:00'], [/day/, '12:00']];

export function timeForScene(timeOfDay) {
    const t = (timeOfDay ?? '').toLowerCase();
    return TIME_BY_WORD.find(([re]) => re.test(t))?.[1] ?? '12:00';
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'x';

export function breakdownToStoryboard({ projectTitle, scene, breakdown, lat = 34.0689, lon = -118.4452, date = '2026-10-15' }) {
    const objects = [];
    const ids = new Set();
    const uid = base => {
        let id = base, n = 2;
        while (ids.has(id))
            id = `${base}_${n++}`;
        ids.add(id);
        return id;
    };
    objects.push({ id: uid('obj_floor'), kind: 'set', label: 'Floor', asset: { kind: 'block', size_m: [10, 0.02, 8], color: '#c9c2b8' }, transform: { position: [0, -0.01, 0], rotation_deg: [0, 0, 0], scale: [1, 1, 1] }, locked: true, source: { tag: 'inferred', note: 'Every scene starts on a 10 × 8 m floor' } });

    let table = null;
    let gridIndex = 0;
    const gridPos = () => {
        const i = gridIndex++;
        const col = i % 4, row = Math.floor(i / 4);
        return [-2.25 + col * 1.5, 0, -2 + row * 1.5];
    };
    let tabletopIndex = 0;
    for (const prop of breakdown.props) {
        const item = prop.catalog_id ? CATALOG.find(c => c.id === prop.catalog_id) : null;
        const base = item ?? GREY_BLOCK(titleCase(prop.name));
        const source = { tag: prop.tag, ...(prop.line ? { line: prop.line } : {}), ...(prop.placement_hint ? { note: prop.placement_hint } : {}) };
        let position;
        if (item && TABLETOP.has(item.id) && table) {
            const top = table.asset.kind === 'procedural' ? 0.93 : 0.76;
            const k = tabletopIndex++;
            position = [table.transform.position[0] + 0.18 * (k % 3) - 0.18, top, table.transform.position[2] + 0.12 * Math.floor(k / 3)];
        }
        else
            position = gridPos();
        const obj = objectFromCatalog(base, { position, label: item ? item.label : titleCase(prop.name), source });
        obj.id = uid(`obj_${slug(item?.id ?? prop.name)}`);
        objects.push(obj);
        if (item?.id === 'table' && !table)
            table = obj;
    }
    breakdown.characters.forEach((c, i) => {
        objects.push({
            id: uid(`obj_char_${slug(c.name)}`), kind: 'character', label: titleCase(c.name),
            asset: { kind: 'procedural', generator: 'avatar' },
            transform: { position: [-1 + i * 1.0, 0, 1.6], rotation_deg: [0, 0, 0], scale: [1, 1, 1] },
            character: { name: titleCase(c.name), height_m: 1.75, pose: 'standing' },
            locked: false,
            source: { tag: c.tag, ...(c.line ? { line: c.line } : {}), ...(c.description ? { note: c.description } : {}) },
        });
    });

    const time = timeForScene(scene.time_of_day);
    const offset = '-07:00';
    const lights = [{ id: 'light_sun', type: 'sun', lat, lon, date: `${date}T${time}:00${offset}`, intensity: 2.5, kelvin: 5600, softness: 0.3 }];
    if (scene.int_ext !== 'EXT')
        lights.push({ id: 'light_key', type: 'fixture', position: [2.5, 2.6, 3], target: [0, 1, 0.5], intensity: 1.5, kelvin: 3200, softness: 0.6 });
    const firstLine = breakdown.actions[0];
    const doc = {
        format: 'framecraft.storyboard', version: 1,
        project: { id: `project_${slug(projectTitle)}`, title: projectTitle },
        scene: { id: `scene_${String(scene.number).padStart(2, '0')}_${slug(scene.location).slice(0, 24)}`, number: scene.number, heading: scene.heading, location: scene.location, int_ext: scene.int_ext, time_of_day: scene.time_of_day, source_line: scene.line },
        sensor: { id: 'super35', width_mm: 24.89, height_mm: 18.66 },
        objects,
        lights,
        shots: [{ id: 'shot_01', number: 1, lens_mm: 35, aspect: '16:9', time, light_note: '', script_line: firstLine ? firstLine.description.slice(0, 140) : '', description: 'Wide shot (starter camera)', camera: { position: [4.5, 2.2, 6.5], target: [0, 1, 0] } }],
    };
    const result = validateStoryboard(doc);
    if (!result.success)
        throw new Error(`Generated scene is invalid: ${result.errors.map(e => `${e.path} ${e.message}`).join('; ')}`);
    return result.data;
}
