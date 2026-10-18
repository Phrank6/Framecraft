/**
 * Renderer inspector bindings. Event handlers are registered before the
 * renderer is initialized; selected values are applied on attachment.
 */
export function wireInspector(root, onStatus = () => { }) {
    const $ = id => root.getElementById(id);
    const desired = {
        tone: 'AgX', exposure: 1.05, quality: 'Review',
        hdri: true, sun: true, shadows: true, film: false, shot: 'shot_01'
    };
    let appRenderer = null;
    let actions = 0;
    const act = (label, fn) => {
        actions += 1;
        try {
            if (appRenderer)
                fn(appRenderer);
            onStatus(`${label}${appRenderer ? ' · applied' : ' · queued until renderer is ready'}`);
        }
        catch (error) {
            console.error(`Framecraft control failed: ${label}`, error);
            onStatus(`${label} failed: ${error.message}`);
        }
    };
    const select = (selector, attribute, value, cssClass) => {
        root.querySelectorAll(selector).forEach(button => {
            const active = button.dataset[attribute] === value;
            button.classList.toggle(cssClass, active);
            button.setAttribute('aria-pressed', String(active));
        });
    };
    const toneBadge = () => { $('tone-badge').textContent = `${desired.tone} / ${desired.exposure.toFixed(2)}×`; };
    const shotLabels = { shot_01: '01 / ESTABLISHING', shot_02: '02 / MAYA CLOSEUP' };
    const setQualityDetail = preset => {
        if (!preset)
            return;
        $('quality-detail').innerHTML = `${preset.shadowResolution} px shadows <span>·</span> ≤ ${preset.pixelRatioCap}× pixel ratio`;
    };
    root.querySelectorAll('[data-tone]').forEach(button => button.addEventListener('click', () => {
        desired.tone = button.dataset.tone;
        select('[data-tone]', 'tone', desired.tone, 'selected');
        toneBadge();
        act(`Tone mapping: ${desired.tone}`, r => r.setTone(desired.tone));
    }));
    $('exposure').addEventListener('input', event => {
        desired.exposure = Number(event.target.value);
        $('exposure-value').textContent = desired.exposure.toFixed(2);
        toneBadge();
        act(`Exposure: ${desired.exposure.toFixed(2)}`, r => r.setExposure(desired.exposure));
    });
    for (const [id, name, method] of [
        ['toggle-hdri', 'hdri', 'setEnvironment'],
        ['toggle-sun', 'sun', 'setSun'],
        ['toggle-shadows', 'shadows', 'setShadows'],
        ['toggle-film', 'film', 'setFilm']
    ]) {
        $(id).addEventListener('change', event => {
            desired[name] = event.target.checked;
            act(`${name}: ${desired[name] ? 'on' : 'off'}`, r => r[method](desired[name]));
        });
    }
    root.querySelectorAll('[data-quality]').forEach(button => button.addEventListener('click', () => {
        desired.quality = button.dataset.quality;
        select('[data-quality]', 'quality', desired.quality, 'selected');
        act(`Quality: ${desired.quality}`, r => setQualityDetail(r.setQuality(desired.quality)));
    }));
    root.querySelectorAll('[data-shot]').forEach(button => button.addEventListener('click', () => {
        desired.shot = button.dataset.shot;
        select('[data-shot]', 'shot', desired.shot, 'active');
        $('active-shot-label').textContent = shotLabels[desired.shot] || desired.shot;
        act(`Shot: ${desired.shot}`, r => r.setShot(desired.shot));
    }));
    $('camera-reset').addEventListener('click', () => act('Camera reset', r => r.setShot(desired.shot)));
    $('export-frame').addEventListener('click', () => act('Export current frame', r => {
        r.screenshot(`framecraft-${desired.shot}-${desired.quality.toLowerCase()}.png`);
    }));
    $('export-comparison').addEventListener('click', () => act('Export tone study', r => r.compare()));
    $('export-lighting').addEventListener('click', () => act('Export HDRI study', r => r.exportStudy('environment')));
    $('export-shadows').addEventListener('click', () => act('Export shadow study', r => r.exportStudy('shadows')));
    $('export-report').addEventListener('click', () => act('Export all three studies', r => r.exportStudy('all')));
    for (const name of ['tone', 'quality'])
        select(`[data-${name}]`, name, desired[name], 'selected');
    select('[data-shot]', 'shot', desired.shot, 'active');
    toneBadge();
    onStatus('Controls connected · starting WebGL renderer…');
    return {
        /** Sync whatever the user selected during slow HDRI initialization. */
        attach(renderer) {
            appRenderer = renderer;
            renderer.setTone(desired.tone);
            renderer.setExposure(desired.exposure);
            setQualityDetail(renderer.setQuality(desired.quality));
            renderer.setEnvironment(desired.hdri);
            renderer.setSun(desired.sun);
            renderer.setShadows(desired.shadows);
            renderer.setFilm(desired.film);
            renderer.setShot(desired.shot, true);
            onStatus('Renderer ready · inspector controls enabled');
        },
        getState: () => ({ ...desired }),
        getActionCount: () => actions,
        isAttached: () => appRenderer !== null
    };
}
