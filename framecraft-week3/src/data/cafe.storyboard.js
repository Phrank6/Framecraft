import { cafeProject } from './cafe.scene.js';
import { fromLegacyProject } from './fromLegacyProject.js';

/**
 * The café test scene as a storyboard file: the Week 1 café layout plus the
 * lights (Linda's spec) and four saved shots (Yasin's fields).
 * Matches examples/cafe.fountain, scene 1.
 */
const base = fromLegacyProject(cafeProject, 'scene_cafe', { title: 'Morning Coffee', sceneNumber: 1 });

const shotText = {
    shot_01: { time: '09:00', light_note: 'Morning sun through west windows, soft fill', script_line: 'Soft light through tall windows.' },
    shot_02: { time: '09:00', light_note: 'Warm window key on Maya, soft', script_line: 'MAYA: One flat white, please.' },
};

export const cafeStoryboard = {
    ...base,
    scene: { ...base.scene, heading: 'INT. NEIGHBORHOOD CAFE - MORNING', location: 'NEIGHBORHOOD CAFE', time_of_day: 'MORNING' },
    lights: [
        // UCLA, Oct 15 2026, 09:00 PDT — NOAA: azimuth 118.8°, elevation 22.7°
        { id: 'light_sun', type: 'sun', lat: 34.0689, lon: -118.4452, date: '2026-10-15T09:00:00-07:00', intensity: 2.8, kelvin: 5200, softness: 0.3 },
        { id: 'light_window_west', type: 'window', position: [-4.3, 2.0, -1.2], target: [-1.5, 1.0, 1.0], intensity: 3, kelvin: 6500, softness: 0.8 },
        { id: 'light_pendant_left', type: 'lamp', position: [-1.05, 2.56, 0.2], intensity: 1.2, kelvin: 2700, softness: 0.5 },
        { id: 'light_key_maya', type: 'fixture', position: [0.6, 2.4, 2.6], target: [-1.48, 1.2, 1.38], intensity: 1.5, kelvin: 3200, softness: 0.6 },
    ],
    shots: [
        ...base.shots.map(s => ({ ...s, ...shotText[s.id] })),
        { id: 'shot_03', number: 3, lens_mm: 85, aspect: '16:9', time: '09:00', light_note: 'Practical pendant behind, warm rim', script_line: 'LEO: Morning. The usual?', description: 'Close-up — Leo at the counter.', camera: { position: [0.3, 1.9, 1.25], target: [2.4, 1.78, -1.45] } },
        { id: 'shot_04', number: 4, lens_mm: 24, aspect: '2.39:1', time: '09:00', light_note: 'Wide, sun pools on the floor', script_line: 'Maya wraps both hands around the cup and smiles.', description: 'Wide view from the counter end across the room.', camera: { position: [4.1, 1.75, 0.2], target: [-1.6, 1.0, 0.9] } },
    ],
};
