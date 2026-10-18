import './styles/main.css';
import { cafeProject } from './data/cafe.scene.js';
import { validateProject } from './schema/project.schema.js';
import { createSceneRenderer } from './renderer/createRenderer.js';
import { wireInspector } from './ui/inspector.js';
import { renderWorkspace } from './ui/workspace.js';
import { wirePanelToggles } from './ui/panels.js';
const validation = validateProject(cafeProject);
const $ = id => document.getElementById(id);
const app = $('app');
app.innerHTML = renderWorkspace();
wirePanelToggles(document);
const setSystemStatus = (message) => { $('system-status').textContent = message; };
$('schema-status').textContent = validation.success ? 'SCHEMA V1 · VALID' : 'SCHEMA ERRORS';
$('schema-status').classList.toggle('schema-error', !validation.success);
$('validation-text').textContent = validation.success ? `${cafeProject.bible.characters.length} characters · ${cafeProject.asset_manifest.assets.length} assets · ${cafeProject.shots.length} shots · references intact` : validation.errors.map(e => `${e.path}: ${e.message}`).join(' | ');
if (!validation.success) {
    $('viewport-loading').innerHTML = '<div class="loader-mark">!</div><div>Schema failed validation</div><small>Open the console to inspect the errors.</small>';
    console.error(validation.errors);
    throw new Error('Invalid project scene data');
}
// Bind controls before asynchronous WebGL/HDRI initialization.
// Controls remain responsive during loading and on initialization failure.
const inspector = wireInspector(document, setSystemStatus);
window.framecraft = { project: validation.data, renderer: null, validation, inspector };
try {
    const appRenderer = await createSceneRenderer({ host: $('viewport'), project: validation.data, onStatus: setSystemStatus });
    inspector.attach(appRenderer);
    $('viewport-loading').remove();
    $('gpu-status').textContent = 'WEBGL · HDRI · PBR';
    $('hdri-origin').textContent = appRenderer.environmentSource;
    appRenderer.ready.then(source => {
        $('hdri-origin').textContent = source;
        setSystemStatus(`Environment ready · ${source}`);
    }).catch(error => setSystemStatus(`Environment warning: ${error.message}`));
    window.framecraft = { project: validation.data, renderer: appRenderer, validation, inspector };
}
catch (error) {
    console.error(error);
    $('viewport-loading')?.classList.add('failed');
    if ($('viewport-loading'))
        $('viewport-loading').innerHTML = `<div class="loader-mark">!</div><div>WebGL initialization failed</div><small>${error.message.replace(/[<>&]/g, '')}</small>`;
    setSystemStatus(`Renderer error: ${error.message} (inspector remains responsive)`);
    window.framecraft = { project: validation.data, renderer: null, validation, inspector };
}
