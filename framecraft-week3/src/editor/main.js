import './editor.css';
import { createViewport } from './viewport.js';
import { createSceneStore, ops } from './sceneStore.js';
import { CATALOG, CHARACTER_TEMPLATES, GREY_BLOCK, objectFromCatalog, catalogItem } from './catalog.js';
import { cafeStoryboard } from '../data/cafe.storyboard.js';
import { parseStoryboardJSON, serializeStoryboard, validateStoryboard } from '../schema/storyboard.schema.js';
import { LENS_SET_MM, horizontalFOV } from '../camera/lens.js';
import { parseFountain, toSceneList } from '../script/fountain.js';
import { extractOffline } from '../script/extract.js';
import { breakdownToStoryboard } from '../script/toStoryboard.js';
import cafeScript from '../../examples/cafe.fountain?raw';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const AUTOSAVE_KEY = 'framecraft.storyboard.autosave.v1';

document.querySelector('#app').innerHTML = `
<div class="app">
  <header class="top">
    <div class="brand"><span class="brand-mark"></span>framecraft</div>
    <div class="crumb" id="crumb"></div>
    <div class="spacer"></div>
    <button class="btn" id="btn-script" title="Paste or open a Fountain script">Import script</button>
    <button class="btn" id="btn-open" title="Open a .storyboard.json scene file">Open</button>
    <button class="btn" id="btn-save" title="Download this scene as a .storyboard.json file">Save</button>
    <button class="btn" id="btn-undo" title="Undo (Ctrl/⌘+Z)">Undo</button>
    <button class="btn" id="btn-redo" title="Redo (Ctrl/⌘+Shift+Z)">Redo</button>
    <input type="file" id="file-open" accept=".json,application/json" hidden />
  </header>
  <div class="main">
    <aside class="side">
      <section class="sec"><h3>Scenes <span id="scene-count"></span></h3><div class="list" id="scene-list"></div></section>
      <section class="sec"><h3>In this scene <span id="object-count"></span></h3><div class="list" id="object-list"></div></section>
      <section class="sec"><h3>Add</h3>
        <div class="field"><span>Prop</span><select id="add-prop">${CATALOG.map(c => `<option value="${c.id}">${esc(c.label)}${c.asset.kind === 'block' ? ' (grey block)' : ''}</option>`).join('')}</select></div>
        <div class="btns"><button class="btn small" id="btn-add-prop">Add prop</button><button class="btn small" id="btn-add-standing">Add standing character</button><button class="btn small" id="btn-add-seated">Add seated character</button></div>
        <div class="field" style="margin-top:12px"><span>Grey block</span><input id="block-name" placeholder="Name, e.g. Piano" /></div>
        <div class="field"><span>Size (m)</span><div class="xyz"><input id="block-w" type="number" step="0.05" value="0.5" title="Width" /><input id="block-h" type="number" step="0.05" value="0.5" title="Height" /><input id="block-d" type="number" step="0.05" value="0.5" title="Depth" /></div></div>
        <div class="btns"><button class="btn small" id="btn-add-block">Add grey block</button></div>
        <p class="muted">New items appear where the camera is looking, on the floor.</p>
      </section>
    </aside>
    <div class="center">
      <div class="viewport-wrap">
        <div class="viewport" id="viewport"></div>
        <div class="frame-overlay" id="frame-overlay"><div class="frame"></div><div class="frame-label" data-frame-label></div></div>
        <div class="hud">Drag: orbit · Right-drag: pan · Scroll: dolly · Click: select · <kbd>W</kbd> move · <kbd>E</kbd> rotate · <kbd>Del</kbd> delete · <kbd>Ctrl</kbd>+<kbd>D</kbd> duplicate · <kbd>Ctrl</kbd>+<kbd>Z</kbd> undo · <kbd>Esc</kbd> deselect</div>
        <div class="toast" id="toast"></div>
        <div id="banner-slot"></div>
      </div>
      <div class="shots" id="shot-strip"></div>
    </div>
    <aside class="side right">
      <section class="sec"><h3>Camera</h3>
        <div class="seg" id="lens-seg">${LENS_SET_MM.map(mm => `<button data-lens="${mm}">${mm} mm</button>`).join('')}</div>
        <div class="field"><span>Other lens</span><input id="lens-custom" type="number" min="8" max="300" step="1" /></div>
        <div class="seg" id="aspect-seg"><button data-aspect="16:9">16:9</button><button data-aspect="2.39:1">2.39:1 scope</button></div>
        <div class="readout" id="lens-readout"></div>
        <div class="btns"><button class="btn primary small" id="btn-new-shot">Save view as new shot</button><button class="btn small" id="btn-update-shot" disabled>Update shot</button></div>
      </section>
      <section class="sec" id="shot-panel"></section>
      <section class="sec" id="selection-panel"></section>
      <section class="sec"><h3>Lights <span class="muted" style="text-transform:none;letter-spacing:0">read-only</span></h3><div id="light-list"></div>
        <p class="muted">Light editing is Linda's module (Week 4). Today the editor shows the saved light spec with a simple stand-in renderer.</p></section>
    </aside>
  </div>
</div>
<dialog id="script-dialog"><form method="dialog" class="dlg">
  <header><h2>Import a script</h2><div class="spacer"></div><span class="muted" id="ai-status">Checking for AI server…</span></header>
  <div class="body">
    <div>
      <div class="btns" style="margin:0 0 8px"><button type="button" class="btn small" id="btn-sample">Use the café test script</button><label class="btn small">Open .fountain / .txt<input type="file" id="file-script" accept=".fountain,.txt,.spmd,text/plain" hidden /></label></div>
      <textarea id="script-text" placeholder="Paste a screenplay in Fountain format (INT. / EXT. scene headings, CHARACTER names in capitals)…"></textarea>
    </div>
    <div><div class="btns" style="margin:0 0 8px"><button type="button" class="btn small" id="btn-parse">Read script</button><label class="check" style="margin:0"><input type="checkbox" id="use-ai" disabled /> Use Claude (AI server)</label></div>
      <div id="script-preview"><p class="empty">Read a script to see its scenes, characters and props. Blue = stated in the script, orange = inferred.</p></div></div>
  </div>
  <footer><span class="muted">Each scene becomes a starter layout of grey blocks and characters that you then fix by hand.</span><div class="spacer"></div><button class="btn" value="cancel">Close</button><button type="button" class="btn primary" id="btn-build" disabled>Build scenes</button></footer>
</form></dialog>`;

// ---------------- state ----------------
const scenes = []; // { key, title, store }
let active = null;
let activeShotId = null;
let selectedId = null;
const thumbs = new Map(); // `${scene key}|${shot id}` -> { key, url }; the old image stays until the new one is ready
let thumbTimer = 0;

const toast = (msg, kind = '') => {
    const t = $('#toast');
    t.textContent = msg;
    t.className = `toast show ${kind}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.className = 'toast'; }, kind === 'error' ? 5000 : 2200);
};

const viewport = createViewport({
    host: $('#viewport'),
    overlay: $('#frame-overlay'),
    onSelect: id => { selectedId = id; renderObjectList(); renderSelection(); },
    onTransformCommit: (id, transform, mode) => safeEdit(`${mode === 'rotate' ? 'Rotate' : 'Move'} ${labelOf(id)}`, d => ops.setTransform(d, id, transform)),
    onStatus: msg => console.info(msg),
});
window.framecraft = { viewport, scenes, get active() { return active; } };

function labelOf(id) { return active?.store.doc.objects.find(o => o.id === id)?.label ?? id; }

function safeEdit(label, fn) {
    try {
        const out = active.store.edit(label, fn);
        return out;
    }
    catch (error) {
        toast(error.message, 'error');
        // Put the 3D object back where the file says it is.
        viewport.sync(active.store.doc);
        return undefined;
    }
}

function addScene(title, doc, { activate = true } = {}) {
    const store = createSceneStore(doc);
    const entry = { key: `${doc.scene.id}#${scenes.length}`, title, store };
    store.subscribe((d, reason) => onDocChange(entry, reason));
    scenes.push(entry);
    if (activate)
        activate_(entry);
    else
        renderSceneList();
    return entry;
}

function activate_(entry) {
    active = entry;
    selectedId = null;
    viewport.select(null);
    viewport.setSensor(entry.store.doc.sensor.width_mm);
    viewport.sync(entry.store.doc);
    const first = entry.store.doc.shots[0];
    if (first)
        goToShot(first.id, true);
    else
        activeShotId = null;
    renderAll();
    queueThumbs(true);
}

function onDocChange(entry, reason) {
    if (entry !== active)
        return;
    viewport.sync(entry.store.doc);
    if (activeShotId && !entry.store.doc.shots.some(s => s.id === activeShotId))
        activeShotId = null;
    if (reason.type === 'undo')
        toast(`Undid: ${reason.label}`);
    else if (reason.type === 'redo')
        toast(`Redid: ${reason.label}`);
    renderAll();
    queueThumbs();
    autosave();
}

// ---------------- rendering the panels ----------------
function renderAll() {
    renderCrumb();
    renderSceneList();
    renderObjectList();
    renderSelection();
    renderCamera();
    renderShotPanel();
    renderShotStrip();
    renderLights();
    renderUndo();
}

function renderCrumb() {
    const d = active.store.doc;
    $('#crumb').innerHTML = `<strong>${esc(d.project.title)}</strong> · Scene ${d.scene.number} · ${esc(d.scene.heading)}`;
}

function renderUndo() {
    const s = active.store;
    $('#btn-undo').disabled = !s.canUndo();
    $('#btn-redo').disabled = !s.canRedo();
    $('#btn-undo').title = s.canUndo() ? `Undo: ${s.undoLabel()} (Ctrl/⌘+Z)` : 'Nothing to undo';
    $('#btn-redo').title = s.canRedo() ? `Redo: ${s.redoLabel()} (Ctrl/⌘+Shift+Z)` : 'Nothing to redo';
}

function renderSceneList() {
    $('#scene-count').textContent = scenes.length;
    $('#scene-list').innerHTML = scenes.map((s, i) => `<button class="row ${s === active ? 'active' : ''}" data-scene="${i}"><span class="name">${esc(s.title)}</span><small>${s.store.doc.shots.length} shots</small></button>`).join('');
}

const SOURCE_TEXT = { stated: 'stated', inferred: 'inferred', user: 'by hand' };
function renderObjectList() {
    const d = active.store.doc;
    $('#object-count').textContent = d.objects.length;
    const order = { character: 0, prop: 1, set: 2 };
    const sorted = [...d.objects].sort((a, b) => order[a.kind] - order[b.kind] || a.label.localeCompare(b.label));
    $('#object-list').innerHTML = sorted.map(o => `<button class="row ${o.id === selectedId ? 'active' : ''}" data-object="${o.id}" ${o.locked ? 'title="Locked set piece"' : ''}><span class="dot ${o.kind}"></span><span class="name">${esc(o.label)}${o.locked ? ' 🔒' : ''}</span><span class="tag ${o.source.tag}">${SOURCE_TEXT[o.source.tag]}</span></button>`).join('') || '<p class="empty">Empty scene.</p>';
}

function renderSelection() {
    const panel = $('#selection-panel');
    const o = selectedId && active.store.doc.objects.find(x => x.id === selectedId);
    if (!o) {
        panel.innerHTML = `<h3>Selection</h3><p class="muted">Click an object in the view or the list. The floor and walls are locked.</p>`;
        return;
    }
    const t = o.transform;
    const src = o.source.tag === 'stated' ? `Stated in the script${o.source.line ? `, line ${o.source.line}` : ''}` : o.source.tag === 'inferred' ? 'Inferred (a guess — check it)' : 'Placed by hand';
    const n = v => +(+v).toFixed(3);
    panel.innerHTML = `<h3>Selection <span class="tag ${o.source.tag}">${SOURCE_TEXT[o.source.tag]}</span></h3>
      <div class="field"><span>Name</span><input id="sel-label" value="${esc(o.label)}" /></div>
      ${o.character ? `<div class="field"><span>Height (m)</span><input id="sel-height" type="number" step="0.01" min="0.5" max="2.6" value="${o.character.height_m}" /></div>
      <div class="field"><span>Pose</span><select id="sel-pose"><option value="standing" ${o.character.pose === 'standing' ? 'selected' : ''}>Standing</option><option value="seated" ${o.character.pose === 'seated' ? 'selected' : ''}>Seated</option></select></div>` : ''}
      <div class="field"><span>Position</span><div class="xyz">${t.position.map((v, i) => `<input data-pos="${i}" type="number" step="0.05" value="${n(v)}" ${o.locked ? 'disabled' : ''} title="${'XYZ'[i]} (m)" />`).join('')}</div></div>
      <div class="field"><span>Turn (°)</span><input id="sel-rot" type="number" step="5" value="${n(t.rotation_deg[1])}" ${o.locked ? 'disabled' : ''} /></div>
      <div class="field"><span>Scale</span><input id="sel-scale" type="number" step="0.05" min="0.05" value="${n(t.scale[0])}" ${o.locked ? 'disabled' : ''} /></div>
      <p class="muted">${esc(src)}${o.source.note ? ` · ${esc(o.source.note)}` : ''}</p>
      ${o.locked ? '<p class="muted">Locked set piece.</p>' : `<div class="seg" style="margin-top:6px"><button data-mode="translate" class="${viewport.state.mode === 'translate' ? 'on' : ''}">Move (W)</button><button data-mode="rotate" class="${viewport.state.mode === 'rotate' ? 'on' : ''}">Rotate (E)</button></div>
      <label class="check"><input type="checkbox" id="sel-vertical" ${viewport.state.allowVertical ? 'checked' : ''} /> Allow moving up/down (e.g. onto a table)</label>
      <div class="btns"><button class="btn small" id="sel-dup">Duplicate</button><button class="btn small danger" id="sel-del">Delete</button></div>`}`;
}

function currentLens() { return viewport.state.lens; }
function renderCamera() {
    document.querySelectorAll('#lens-seg [data-lens]').forEach(b => b.classList.toggle('on', Number(b.dataset.lens) === currentLens()));
    document.querySelectorAll('#aspect-seg [data-aspect]').forEach(b => b.classList.toggle('on', b.dataset.aspect === viewport.state.aspect));
    $('#lens-custom').value = currentLens();
    const s = active.store.doc.sensor;
    $('#lens-readout').textContent = `${currentLens()} mm on ${s.id === 'super35' ? 'Super 35' : s.id} (${s.width_mm} mm wide) → ${horizontalFOV(currentLens(), s.width_mm).toFixed(1)}° horizontal view`;
    const shot = activeShot();
    $('#btn-update-shot').disabled = !shot;
    $('#btn-update-shot').textContent = shot ? `Update shot ${shot.number}` : 'Update shot';
}

function activeShot() { return activeShotId ? active.store.doc.shots.find(s => s.id === activeShotId) : null; }

function renderShotPanel() {
    const shot = activeShot();
    const panel = $('#shot-panel');
    if (!shot) {
        panel.innerHTML = `<h3>Shot</h3><p class="muted">No shot selected. Frame a view and press “Save view as new shot”.</p>`;
        return;
    }
    panel.innerHTML = `<h3>Shot ${shot.number} <button class="btn small danger" id="shot-del">Delete shot</button></h3>
      <div class="field"><span>Time</span><input id="shot-time" type="time" value="${shot.time}" /></div>
      <div class="field"><span>Light note</span><input id="shot-light" value="${esc(shot.light_note)}" placeholder="e.g. warm key from window, soft" /></div>
      <div class="field"><span>Script line</span><textarea id="shot-line" placeholder="e.g. MAYA: One flat white, please.">${esc(shot.script_line)}</textarea></div>
      <div class="field"><span>Notes</span><input id="shot-desc" value="${esc(shot.description)}" /></div>
      <p class="muted">Saved camera: ${shot.lens_mm} mm · ${shot.aspect}. Move the view and press “Update shot ${shot.number}” to re-frame it.</p>`;
}

function renderShotStrip() {
    const shots = [...active.store.doc.shots].sort((a, b) => a.number - b.number);
    $('#shot-strip').innerHTML = shots.map(s => `<button class="shot-card ${s.id === activeShotId ? 'active' : ''}" data-shot="${s.id}" title="${esc(s.description || s.script_line)}">
        <div class="thumb">${thumbs.get(thumbSlot(s))?.url ? `<img alt="Shot ${s.number}" src="${thumbs.get(thumbSlot(s)).url}" />` : '<span class="muted">rendering…</span>'}</div>
        <div class="meta"><strong>Shot ${s.number}</strong><span>${s.lens_mm} mm · ${s.aspect} · ${s.time}</span></div></button>`).join('') +
        `<button class="new-shot" id="btn-new-shot-2"><strong>+ New shot</strong><span class="muted">from current view</span></button>`;
}

function renderLights() {
    $('#light-list').innerHTML = active.store.doc.lights.map(l => `<div class="light-row"><span>${esc(l.id.replace(/^light_/, '').replace(/_/g, ' '))} · ${l.type}</span><span>${l.kelvin} K · soft ${l.softness}</span></div>`).join('') || '<p class="empty">No lights in this scene.</p>';
}

// Thumbnails depend on the scene content + the shot. Key = scene revision + shot JSON.
let revision = 0;
function thumbSlot(shot) { return `${active.key}|${shot.id}`; }
function thumbKey(shot) { return `${revision}|${JSON.stringify(shot)}`; }
function queueThumbs(immediate = false) {
    revision++;
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(renderThumbs, immediate ? 600 : 350);
}
function renderThumbs() {
    if (viewport.isCameraMoving()) {
        thumbTimer = setTimeout(renderThumbs, 200);
        return;
    }
    for (const shot of active.store.doc.shots) {
        const key = thumbKey(shot);
        if (thumbs.get(thumbSlot(shot))?.key !== key)
            thumbs.set(thumbSlot(shot), { key, url: viewport.renderShot(shot, 352) });
    }
    renderShotStrip();
}

// ---------------- camera & shots ----------------
function goToShot(id, instant = false) {
    const shot = active.store.doc.shots.find(s => s.id === id);
    if (!shot)
        return;
    activeShotId = id;
    viewport.goTo(shot.camera, { lens: shot.lens_mm, aspect: shot.aspect, instant });
    renderCamera();
    renderShotPanel();
    renderShotStrip();
}

function saveNewShot() {
    const id = safeEdit('Save new shot', d => ops.addShot(d, { camera: viewport.getCamera(), lens_mm: currentLens(), aspect: viewport.state.aspect }));
    if (id) {
        activeShotId = id;
        renderAll();
        toast(`Saved shot ${active.store.doc.shots.find(s => s.id === id).number}`);
    }
}

function updateShotCamera() {
    const shot = activeShot();
    if (!shot)
        return;
    safeEdit(`Re-frame shot ${shot.number}`, d => ops.updateShot(d, shot.id, { camera: viewport.getCamera(), lens_mm: currentLens(), aspect: viewport.state.aspect }));
    toast(`Updated shot ${shot.number}`);
}

function setLens(mm) {
    if (!(mm >= 8 && mm <= 300))
        return toast('Lens must be between 8 and 300 mm', 'error');
    viewport.setLens(mm);
    renderCamera();
}

// ---------------- adding objects ----------------
function dropPoint() {
    const { target } = viewport.getCamera();
    return [+target[0].toFixed(2), 0, +target[2].toFixed(2)];
}
function addAndSelect(label, obj) {
    const id = safeEdit(label, d => ops.addObject(d, obj));
    if (id) {
        viewport.select(id);
        toast(label);
    }
}
function addCharacter(pose) {
    const n = active.store.doc.objects.filter(o => o.kind === 'character').length + 1;
    const t = CHARACTER_TEMPLATES[pose];
    addAndSelect(`Add ${pose} character`, { id: `obj_char_${n}`, label: `Character ${n}`, ...structuredClone(t), character: { ...t.character, name: `Character ${n}` }, transform: { position: dropPoint(), rotation_deg: [0, 0, 0], scale: [1, 1, 1] }, locked: false, source: { tag: 'user' } });
}

// ---------------- files ----------------
function download(name, text, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function sceneFileName(doc) {
    const slug = doc.scene.location.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `scene-${String(doc.scene.number).padStart(2, '0')}-${slug}.storyboard.json`;
}

function autosave() {
    try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ saved: new Date().toISOString(), scenes: scenes.map(s => ({ title: s.title, doc: s.store.doc })), active: scenes.indexOf(active) }));
    }
    catch { /* storage unavailable (private window, sandbox) — autosave is a convenience only */ }
}
function readAutosave() {
    try {
        const raw = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) ?? 'null');
        if (!raw?.scenes?.length)
            return null;
        const ok = raw.scenes.every(s => validateStoryboard(s.doc).success);
        return ok ? raw : null;
    }
    catch {
        return null;
    }
}

// ---------------- script import ----------------
let parsedScript = null;
let aiAvailable = false;
async function checkAi() {
    try {
        const res = await fetch('api/health', { signal: AbortSignal.timeout(1500) });
        const data = res.ok ? await res.json() : null;
        aiAvailable = Boolean(data?.ai);
        $('#ai-status').textContent = data ? (data.ai ? `AI server ready · ${data.model}` : 'AI server running, but no API key set — using offline rules') : 'No AI server — using offline rules';
    }
    catch {
        aiAvailable = false;
        $('#ai-status').textContent = 'No AI server — using offline rules';
    }
    $('#use-ai').disabled = !aiAvailable;
    $('#use-ai').checked = aiAvailable;
}

async function breakdownFor(scene) {
    if ($('#use-ai').checked && aiAvailable) {
        const res = await fetch('api/extract', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scene }) });
        const data = await res.json();
        if (!res.ok)
            throw new Error(data.error ?? `AI server error ${res.status}`);
        return data.breakdown;
    }
    return extractOffline(scene);
}

async function readScript() {
    const text = $('#script-text').value;
    if (!text.trim())
        return toast('Paste a script first', 'error');
    const list = toSceneList(parseFountain(text));
    if (!list.scenes.length) {
        $('#script-preview').innerHTML = '<p class="empty">No scene headings found. Each scene must start with INT. or EXT. (or a line starting with a dot).</p>';
        $('#btn-build').disabled = true;
        return;
    }
    $('#script-preview').innerHTML = '<p class="empty">Reading scenes…</p>';
    try {
        const items = [];
        for (const scene of list.scenes)
            items.push({ scene, breakdown: await breakdownFor(scene) });
        parsedScript = { title: list.title, items };
        const chip = (text, tag, line) => `<span class="chip ${tag}" title="${tag}${line ? `, line ${line}` : ''}">${esc(text)}${line ? ` <small>L${line}</small>` : ''}</span>`;
        $('#script-preview').innerHTML = `<p class="muted">“${esc(list.title)}” · ${items.length} scene${items.length > 1 ? 's' : ''}</p>` + items.map(({ scene, breakdown: b }) => `<div class="scene-preview"><h4>${scene.number}. ${esc(scene.heading)}</h4>
          <div class="muted">Characters</div><div class="chips">${b.characters.map(c => chip(c.name, c.tag, c.line)).join('') || '<span class="muted">none</span>'}</div>
          <div class="muted" style="margin-top:4px">Props</div><div class="chips">${b.props.map(p => chip(p.name, p.tag, p.line)).join('') || '<span class="muted">none</span>'}</div>
          <div class="muted" style="margin-top:4px">${b.actions.length} action line${b.actions.length === 1 ? '' : 's'} with characters</div></div>`).join('');
        $('#btn-build').disabled = false;
    }
    catch (error) {
        $('#script-preview').innerHTML = `<p class="empty">Could not read the script: ${esc(error.message)}</p>`;
    }
}

function buildScenes() {
    if (!parsedScript)
        return;
    let first = null;
    for (const { scene, breakdown } of parsedScript.items) {
        const doc = breakdownToStoryboard({ projectTitle: parsedScript.title, scene, breakdown });
        const entry = addScene(`${scene.number}. ${scene.heading}`, doc, { activate: false });
        first ??= entry;
    }
    $('#script-dialog').close();
    activate_(first);
    autosave();
    toast(`Built ${parsedScript.items.length} scene(s). Grey blocks and characters are a starting point — move them where they belong.`);
}

// ---------------- events ----------------
document.addEventListener('click', e => {
    const t = e.target.closest('button, [data-scene], [data-object], [data-shot]');
    if (!t)
        return;
    if (t.dataset.scene !== undefined)
        return activate_(scenes[Number(t.dataset.scene)]);
    if (t.dataset.object)
        return viewport.select(t.dataset.object);
    if (t.dataset.shot)
        return goToShot(t.dataset.shot);
    if (t.dataset.lens)
        return setLens(Number(t.dataset.lens));
    if (t.dataset.aspect) {
        viewport.setAspect(t.dataset.aspect);
        return renderCamera();
    }
    if (t.dataset.mode) {
        viewport.setMode(t.dataset.mode);
        return renderSelection();
    }
    switch (t.id) {
        case 'btn-undo': return active.store.undo();
        case 'btn-redo': return active.store.redo();
        case 'btn-new-shot': case 'btn-new-shot-2': return saveNewShot();
        case 'btn-update-shot': return updateShotCamera();
        case 'shot-del': {
            const shot = activeShot();
            if (shot)
                safeEdit(`Delete shot ${shot.number}`, d => ops.deleteShot(d, shot.id));
            return;
        }
        case 'sel-dup': {
            const id = safeEdit(`Duplicate ${labelOf(selectedId)}`, d => ops.duplicateObject(d, selectedId));
            if (id)
                viewport.select(id);
            return;
        }
        case 'sel-del': return safeEdit(`Delete ${labelOf(selectedId)}`, d => ops.deleteObject(d, selectedId));
        case 'btn-add-prop': {
            const item = catalogItem($('#add-prop').value);
            return addAndSelect(`Add ${item.label}`, objectFromCatalog(item, { position: dropPoint() }));
        }
        case 'btn-add-standing': return addCharacter('standing');
        case 'btn-add-seated': return addCharacter('seated');
        case 'btn-add-block': {
            const name = $('#block-name').value.trim() || 'Block';
            const size = ['#block-w', '#block-h', '#block-d'].map(s => Number($(s).value));
            if (size.some(v => !(v > 0)))
                return toast('Block sizes must be above 0', 'error');
            const obj = objectFromCatalog(GREY_BLOCK(name, size), { position: dropPoint() });
            obj.id = `obj_${name}`;
            return addAndSelect(`Add ${name}`, obj);
        }
        case 'btn-save': {
            download(sceneFileName(active.store.doc), serializeStoryboard(active.store.doc));
            return toast('Scene file downloaded');
        }
        case 'btn-open': return $('#file-open').click();
        case 'btn-script': {
            $('#script-dialog').showModal();
            return checkAi();
        }
        case 'btn-sample': $('#script-text').value = cafeScript; return;
        case 'btn-parse': return readScript();
        case 'btn-build': return buildScenes();
    }
});

$('#file-open').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file)
        return;
    try {
        const doc = parseStoryboardJSON(await file.text());
        addScene(`${doc.scene.number}. ${doc.scene.heading}`, doc);
        autosave();
        toast(`Opened ${file.name}`);
    }
    catch (error) {
        toast(error.message, 'error');
    }
});
$('#file-script').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file)
        $('#script-text').value = await file.text();
});

$('#lens-custom').addEventListener('change', e => setLens(Number(e.target.value)));

// Inspector fields commit on change (one undo step per field change).
document.addEventListener('change', e => {
    const el = e.target;
    const o = selectedId && active.store.doc.objects.find(x => x.id === selectedId);
    const shot = activeShot();
    if (el.id === 'sel-vertical') {
        viewport.setAllowVertical(el.checked);
        return;
    }
    if (o && el.id === 'sel-label' && el.value.trim())
        return safeEdit(`Rename ${o.label}`, d => { d.objects.find(x => x.id === o.id).label = el.value.trim(); });
    if (o && el.id === 'sel-height')
        return safeEdit(`Height of ${o.label}`, d => { d.objects.find(x => x.id === o.id).character.height_m = Number(el.value); });
    if (o && el.id === 'sel-pose')
        return safeEdit(`Pose of ${o.label}`, d => { d.objects.find(x => x.id === o.id).character.pose = el.value; });
    if (o && el.dataset.pos !== undefined) {
        const p = [...o.transform.position];
        p[Number(el.dataset.pos)] = Number(el.value);
        return safeEdit(`Move ${o.label}`, d => ops.setTransform(d, o.id, { position: p }));
    }
    if (o && el.id === 'sel-rot')
        return safeEdit(`Rotate ${o.label}`, d => ops.setTransform(d, o.id, { rotation_deg: [o.transform.rotation_deg[0], Number(el.value), o.transform.rotation_deg[2]] }));
    if (o && el.id === 'sel-scale' && Number(el.value) > 0)
        return safeEdit(`Scale ${o.label}`, d => ops.setTransform(d, o.id, { scale: [1, 1, 1].map(() => Number(el.value)) }));
    if (shot && ['shot-time', 'shot-light', 'shot-line', 'shot-desc'].includes(el.id)) {
        const key = { 'shot-time': 'time', 'shot-light': 'light_note', 'shot-line': 'script_line', 'shot-desc': 'description' }[el.id];
        return safeEdit(`Edit shot ${shot.number} ${key.replace('_', ' ')}`, d => ops.updateShot(d, shot.id, { [key]: el.value }));
    }
});

document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || $('#script-dialog').open;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        return e.shiftKey ? active.store.redo() : active.store.undo();
    }
    if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault();
        return active.store.redo();
    }
    if (typing)
        return;
    if (mod && e.key.toLowerCase() === 'd' && selectedId) {
        e.preventDefault();
        const id = safeEdit(`Duplicate ${labelOf(selectedId)}`, d => ops.duplicateObject(d, selectedId));
        if (id)
            viewport.select(id);
        return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId)
        return safeEdit(`Delete ${labelOf(selectedId)}`, d => ops.deleteObject(d, selectedId));
    if (e.key === 'Escape')
        return viewport.select(null);
    if (e.key.toLowerCase() === 'w') {
        viewport.setMode('translate');
        return renderSelection();
    }
    if (e.key.toLowerCase() === 'e') {
        viewport.setMode('rotate');
        return renderSelection();
    }
});

// ---------------- start ----------------
addScene('Café test scene (hand-built)', structuredClone(cafeStoryboard));
const saved = readAutosave();
if (saved) {
    $('#banner-slot').innerHTML = `<div class="banner"><span>Restore your last session (${saved.scenes.length} scene${saved.scenes.length > 1 ? 's' : ''}, ${new Date(saved.saved).toLocaleString()})?</span><button class="btn small primary" id="restore-yes">Restore</button><button class="btn small" id="restore-no">Start fresh</button></div>`;
    $('#restore-yes').addEventListener('click', () => {
        scenes.length = 0;
        saved.scenes.forEach(s => addScene(s.title, s.doc, { activate: false }));
        activate_(scenes[Math.min(Math.max(saved.active, 0), scenes.length - 1)]);
        $('#banner-slot').innerHTML = '';
    });
    $('#restore-no').addEventListener('click', () => { $('#banner-slot').innerHTML = ''; });
}
