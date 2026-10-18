/**
 * Editor shell. Control IDs are shared with ui/inspector.js.
 * Keep these identifiers stable when changing markup.
 */
const paths = {
    aperture: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3.6 9h16.8M9 3.6v16.8"/><path d="m9 9 6 6m0-6-6 6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    camera: '<path d="M14 4h-4l-2 3H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4l-2-3Z"/><circle cx="12" cy="13" r="3"/>',
    restart: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    arrowDown: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
    sliders: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    play: '<path d="m9 6 9 6-9 6V6Z"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    panelRight: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v5m0-8h.01"/>',
    external: '<path d="M14 3h7v7m0-7-9 9"/><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
};
export function icon(name, size = 16) {
    const path = paths[name];
    if (!path)
        throw new Error(`Unknown icon ${name}`);
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
export function renderWorkspace() {
    return `
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-left">
        <a class="brand" href="/" aria-label="Framecraft home">${icon('aperture', 20)}<span>framecraft</span></a>
        <div class="topbar-divider"></div>
        <nav class="breadcrumbs" aria-label="Breadcrumb"><span>Workspace</span>${icon('chevron', 12)}<strong>Café Lumière</strong><span class="crumb-sub">/ Scene 01</span></nav>
      </div>
      <div class="topbar-right">
        <span id="schema-status" class="schema-status" role="status"><span class="status-dot"></span>Checking schema</span>
        <span class="topbar-divider"></span>
        <button id="camera-reset" class="icon-button" title="Reset camera position" aria-label="Reset camera">${icon('restart')}</button>
        <button id="export-frame" class="button button-dark">${icon('arrowDown', 15)}<span>Export frame</span></button>
      </div>
    </header>

    <div class="editor-layout">
      <aside class="project-sidebar" id="scene-panel" aria-label="Project navigation">
        <div class="project-sidebar-header"><span class="sidebar-label">PROJECT</span><h2>Café Lumière</h2><p>Storyboard study · Scene 01</p></div>
        <div class="sidebar-divider"></div>
        <div class="side-section-header"><span>Shots</span><span class="side-count">02</span></div>
        <div class="scene-nav">
          <button class="scene-item active" data-shot="shot_01" title="Go to establishing shot"><span class="scene-item-icon">${icon('camera', 15)}</span><span class="scene-item-body"><strong>Establishing</strong><small>Shot 01 · 0–4 s</small></span><span class="scene-active-mark"></span></button>
          <button class="scene-item" data-shot="shot_02" title="Go to Maya closeup"><span class="scene-item-icon">${icon('camera', 15)}</span><span class="scene-item-body"><strong>Maya's morning</strong><small>Shot 02 · 4–8 s</small></span><span class="scene-active-mark"></span></button>
        </div>
        <div class="sidebar-divider mid"></div>
        <div class="side-section-header"><span>Scene contents</span><span class="side-count">17</span></div>
        <div class="asset-list" aria-label="Scene inventory">
          <div class="asset-item">${icon('layers', 14)}<span>Scene geometry</span><span>17</span></div>
          <div class="asset-item">${icon('grid', 14)}<span>Assets</span><span>14</span></div>
          <div class="asset-item">${icon('camera', 14)}<span>Cameras</span><span>02</span></div>
        </div>
        <div class="sidebar-foot">
          <div class="sidebar-foot-title">Working scene</div>
          <p>Layout in meters · 24 fps<br>Validated against Schema v1</p>
          <a class="inline-link" href="https://threejs.org/docs/pages/WebGLRenderer.html" target="_blank" rel="noopener noreferrer">Renderer documentation ${icon('external', 12)}</a>
        </div>
      </aside>

      <main class="workspace">
        <div class="workspace-bar">
          <div class="workspace-bar-left"><button class="icon-button layout-toggle" id="toggle-scenes" title="Show or hide project sidebar" aria-expanded="true" aria-controls="scene-panel">${icon('panel', 17)}</button><span class="bar-divider"></span><div class="view-title">Perspective viewport <span class="view-title-detail">/ Camera preview</span></div></div>
          <div class="workspace-bar-right"><span class="fps-readout" id="fps-value">— FPS</span><span class="bar-divider"></span><span class="viewport-spec">WebGL · PBR</span><button class="icon-button layout-toggle" id="toggle-inspector" title="Show or hide properties" aria-expanded="true" aria-controls="properties-panel">${icon('panelRight', 17)}</button></div>
        </div>
        <section class="viewport-frame" aria-label="Café 3D editor">
          <div class="viewport" id="viewport" aria-label="Interactive Three.js café scene"></div>
          <div class="viewport-top"><div class="camera-chip">${icon('camera', 14)}<span id="active-shot-label">01 / ESTABLISHING</span></div><div class="viewport-mode" id="gpu-status">LIVE · WEBGL</div></div>
          <div class="viewport-bottom"><div class="viewport-gesture">Drag to orbit <span>·</span> Scroll to zoom</div><div class="viewport-badge" id="tone-badge">AgX / 1.05×</div></div>
          <div class="viewport-loading" id="viewport-loading"><div class="loading-spinner"></div><strong>Loading café scene</strong><small>Preparing materials and lighting…</small></div>
        </section>
        <section class="timeline" aria-label="Shot timeline">
          <div class="timeline-heading"><div class="timeline-heading-left">${icon('layers', 15)}<strong>Timeline</strong><span class="timeline-subtitle">2 shots · 8 seconds</span></div><span class="timeline-fps">24 FPS</span></div>
          <div class="timeline-ruler"><span>00:00</span><span>00:02</span><span>00:04</span><span>00:06</span><span>00:08</span></div>
          <div class="timeline-content"><div class="track-label">${icon('camera', 14)} <span>Camera</span></div><div class="shot-track" id="shots">
            <button class="shot active" data-shot="shot_01"><span class="shot-numeric">01</span><span class="shot-name">Establishing</span><small>00:00–00:04</small></button>
            <button class="shot" data-shot="shot_02"><span class="shot-numeric">02</span><span class="shot-name">Maya's morning</span><small>00:04–00:08</small></button>
          </div></div>
          <div class="timeline-footer"><span>${icon('info', 13)} Select a shot to move the camera</span><span>T4.2 · Renderer baseline</span></div>
        </section>
      </main>

      <aside class="inspector" id="properties-panel" aria-label="Rendering properties">
        <div class="inspector-header"><div><strong>Properties</strong><span>Renderer</span></div>${icon('sliders', 17)}</div>
        <div class="inspector-scroll">
          <section class="inspect-section">
            <h2>${icon('monitor', 15)} Color</h2>
            <div class="field-heading"><label>Tone mapping</label><span class="field-value">Output transform</span></div>
            <div class="segmented" role="group" aria-label="Tone mapping"><button data-tone="None" type="button">None</button><button data-tone="ACES" type="button">ACES</button><button class="selected" data-tone="AgX" type="button">AgX</button></div>
            <div class="field-heading exposure-head"><label for="exposure">Exposure</label><output id="exposure-value" for="exposure">1.05</output></div>
            <input type="range" id="exposure" min="0.35" max="2.5" step="0.05" value="1.05" aria-label="Exposure" />
            <div class="range-labels"><span>0.35</span><span>1.00</span><span>2.50</span></div>
            <div class="info-row"><span>Output color space</span><strong>sRGB</strong></div>
          </section>
          <section class="inspect-section">
            <h2>${icon('sun', 15)} Lighting</h2>
            <label class="toggle-row"><span><strong>Environment</strong><small id="hdri-origin">Loading studio HDR…</small></span><input id="toggle-hdri" type="checkbox" checked /><span class="switch"></span></label>
            <label class="toggle-row"><span><strong>Key light</strong><small>Warm directional</small></span><input id="toggle-sun" type="checkbox" checked /><span class="switch"></span></label>
            <label class="toggle-row"><span><strong>Soft shadows</strong><small>Variance shadow map</small></span><input id="toggle-shadows" type="checkbox" checked /><span class="switch"></span></label>
            <label class="toggle-row last"><span><strong>Film grain + vignette</strong><small>Post-processing</small></span><input id="toggle-film" type="checkbox" /><span class="switch"></span></label>
          </section>
          <section class="inspect-section">
            <h2>${icon('grid', 15)} Quality</h2>
            <div class="quality-options" role="group" aria-label="Quality preset"><button data-quality="Draft" type="button"><strong>Draft</strong><small>Fast</small></button><button data-quality="Review" class="selected" type="button"><strong>Review</strong><small>Balanced</small></button><button data-quality="Capture" type="button"><strong>Capture</strong><small>High</small></button></div>
            <div class="quality-detail" id="quality-detail">1024 px shadows · ≤ 1.5× pixel ratio</div>
          </section>
          <section class="inspect-section export-section">
            <h2>${icon('image', 15)} Render studies</h2>
            <p class="section-description">Controlled comparisons of the same scene.</p>
            <button id="export-comparison" class="export-row">${icon('image', 15)} <span>Color response</span><small>3 frames</small>${icon('arrowDown', 14)}</button>
            <button id="export-lighting" class="export-row">${icon('sun', 15)} <span>Environment lighting</span><small>2 frames</small>${icon('arrowDown', 14)}</button>
            <button id="export-shadows" class="export-row">${icon('layers', 15)} <span>Contact shadows</span><small>2 frames</small>${icon('arrowDown', 14)}</button>
            <button id="export-report" class="button button-dark report-button">${icon('arrowDown', 15)} Export comparison report <span>7 frames</span></button>
          </section>
          <section class="inspect-section schema-section"><div class="schema-head">${icon('check', 15)} Schema validation</div><p id="validation-text">Checking references…</p></section>
        </div>
        <div class="inspector-bottom"><span class="ready-led"></span><span id="system-status" role="status">Starting renderer…</span></div>
      </aside>
    </div>
  </div>`;
}
