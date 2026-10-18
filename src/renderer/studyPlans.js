/**
 * Controlled, reproducible visual studies. Each row keeps framing and all
 * non-experimental parameters constant. Contrast comes from a diagnostic
 * lighting setup, never from secretly adjusting the AFTER image.
 * exposure is a THREE linear exposure multiplier, not exposure value (EV).
 */
export const VISUAL_STUDIES = Object.freeze({
    tone: {
        title: '01 / HIGHLIGHT ROLL-OFF',
        subtitle: 'Same camera · exposure 1.75× · sRGB output · HDRI + sun + shadows',
        shot: 'shot_02',
        baseline: { tone: 'AgX', exposure: 1.75, environment: true, sun: true, shadows: true, sunIntensity: 3.2, environmentIntensity: 0.85, film: false },
        panels: [
            { label: 'NONE  /  UNMAPPED', caption: 'Highlight clipping on the ceramic, glass and metal', override: { tone: 'None' } },
            { label: 'ACES  /  FILMIC', caption: 'More compressed highlights and punchier midtone contrast', override: { tone: 'ACES' } },
            { label: 'AgX  /  SOFT ROLL-OFF', caption: 'Smooth highlight transition and retained color separation', override: { tone: 'AgX' } },
        ]
    },
    environment: {
        title: '02 / IMAGE-BASED LIGHTING',
        subtitle: 'Same camera · 1.15× exposure · identical key light · only IBL changes',
        shot: 'shot_02',
        baseline: { tone: 'AgX', exposure: 1.15, environment: true, sun: true, shadows: true, sunIntensity: 0.90, environmentIntensity: 1.15, film: false },
        panels: [
            { label: 'BEFORE  /  HDRI OFF', caption: 'Dark fill areas; weaker physically based metal reflections', override: { environment: false } },
            { label: 'AFTER  /  HDRI ON', caption: 'Environment fill and more realistic roughness-dependent reflections', override: { environment: true } }
        ]
    },
    shadows: {
        title: '03 / CONTACT & SOFT SHADOWS',
        subtitle: 'Same camera · 1.05× exposure · identical lights · only shadow maps change',
        shot: 'shot_01',
        baseline: { tone: 'AgX', exposure: 1.05, environment: true, sun: true, shadows: true, sunIntensity: 3.5, environmentIntensity: 0.55, film: false },
        panels: [
            { label: 'BEFORE  /  SHADOWS OFF', caption: 'Floating furniture and weak contact cues', override: { shadows: false } },
            { label: 'AFTER  /  SOFT SHADOWS ON', caption: 'Table legs, chair feet and objects anchored to the floor', override: { shadows: true } }
        ]
    }
});
export const STUDY_ORDER = Object.freeze(['tone', 'environment', 'shadows']);
export function getStudyFrames(name) {
    const study = VISUAL_STUDIES[name];
    if (!study)
        throw new Error(`Unknown comparison study: ${name}`);
    return study.panels.map(panel => ({ label: panel.label, caption: panel.caption, shot: study.shot, ...study.baseline, ...panel.override }));
}
export function assertControlledStudy(name) {
    const study = VISUAL_STUDIES[name];
    const frames = getStudyFrames(name);
    const key = { tone: 'tone', environment: 'environment', shadows: 'shadows' }[name];
    for (let i = 1; i < frames.length; i++) {
        for (const field of ['shot', 'tone', 'exposure', 'environment', 'sun', 'shadows', 'sunIntensity', 'environmentIntensity', 'film']) {
            if (field !== key && frames[i][field] !== frames[0][field])
                throw new Error(`${name}: uncontrolled variable ${field}`);
        }
    }
    return true;
}
