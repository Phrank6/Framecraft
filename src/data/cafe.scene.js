/** This example is the single canonical source of truth for both validation and rendering. */
const stated = (line_number) => ({ line_number, tag: 'STATED' });
const inferred = (line_number) => ({ line_number, tag: 'INFERRED' });
const t = (position, rotation_deg = [0, 0, 0], scale = [1, 1, 1]) => ({ position, rotation_deg, scale });
const procedural = (id, label, category, generator, color = '#ffffff') => ({ id, label, category, source: { kind: 'procedural', generator }, material: { color, roughness: 0.56, metalness: 0 } });
const instance = (id, asset_id, position, rotation_deg = [0, 0, 0], scale = [1, 1, 1], entity_type = 'environment', entity_id) => ({ id, asset_id, entity_type, ...(entity_id ? { entity_id } : {}), transform: t(position, rotation_deg, scale) });
export const cafeProject = {
    version: '1.0.0',
    bible: {
        script_id: 'script_morning_coffee',
        format: 'PlainText',
        total_lines: 15,
        scenes: [{ id: 'scene_cafe', location: 'Neighborhood café', interior_exterior: 'INT', time_of_day: 'morning', character_ids: ['char_maya', 'char_leo'], prop_ids: ['prop_mug', 'prop_table'], ...stated(1) }],
        characters: [{ id: 'char_maya', name: 'Maya', ...stated(2) }, { id: 'char_leo', name: 'Leo', ...stated(3) }],
        props: [{ id: 'prop_mug', name: 'Ceramic coffee cup', ...stated(7) }, { id: 'prop_table', name: 'Round oak café table', ...stated(6) }],
        actions: [
            { id: 'action_maya_enters', scene_id: 'scene_cafe', character_ids: ['char_maya'], prop_ids: [], description: 'Maya enters the café and takes her place by the window.', ...stated(4) },
            { id: 'action_maya_lifts_cup', scene_id: 'scene_cafe', character_ids: ['char_maya'], prop_ids: ['prop_mug'], description: 'Maya reaches for her coffee and smiles.', ...stated(9) },
        ],
        emotions: [{ id: 'emotion_maya_relief', scene_id: 'scene_cafe', character_id: 'char_maya', emotion: 'calm', reason: 'A quiet morning after a busy week', ...inferred(8) }],
        story_beats: [{ beat_id: 'beat_arrival', scene_id: 'scene_cafe', description: 'A small, reassuring pause in the morning.', ...inferred(4) }],
    },
    character_specs: [
        { id: 'char_maya', asset_id: 'asset_maya', display_name: 'Maya', height_m: 1.68, description: 'Ochre jumper, dark hair, warm skin', rig: 'static', palette: { skin: '#bf8364', clothes: '#cd7c48', accent: '#332b32' } },
        { id: 'char_leo', asset_id: 'asset_leo', display_name: 'Leo', height_m: 1.78, description: 'Café attendant in a dark apron', rig: 'static', palette: { skin: '#c79174', clothes: '#47615a', accent: '#242a30' } },
    ],
    asset_manifest: {
        id: 'manifest_cafe',
        assets: [
            procedural('asset_maya', 'Maya — stylized character', 'character', 'avatar', '#c9845e'),
            procedural('asset_leo', 'Leo — stylized character', 'character', 'avatar', '#5d6a64'),
            procedural('asset_floor', 'Stone floor', 'environment', 'floor', '#8e8277'),
            procedural('asset_architecture', 'Café walls, door and windows', 'architecture', 'architecture', '#dfd2bc'),
            procedural('asset_table', 'Oak café table', 'prop', 'cafe-table', '#906344'),
            procedural('asset_chair', 'Bentwood café chair', 'prop', 'cafe-chair', '#81614d'),
            procedural('asset_mug', 'Glazed ceramic coffee cup', 'prop', 'ceramic-mug', '#ece0cc'),
            procedural('asset_counter', 'Wood counter', 'environment', 'counter', '#704d39'),
            procedural('asset_plant', 'Houseplant in clay pot', 'environment', 'plant', '#5c7752'),
            procedural('asset_pendant', 'Pendant ceiling light', 'light-fixture', 'pendant', '#f2d6a8'),
            procedural('asset_display', 'Pastry display', 'prop', 'pastry-display', '#ac875a'),
            procedural('asset_shelf', 'Coffee supplies shelves', 'environment', 'shelf', '#8f6348'),
            procedural('asset_art', 'Wall art', 'environment', 'wall-art', '#bd8c72'),
            procedural('asset_saucer', 'Saucer', 'prop', 'cup-saucer', '#e1d5c1'),
        ],
    },
    scene_layouts: [{
            id: 'layout_cafe', scene_id: 'scene_cafe', units: 'meters', coordinate_system: 'right-handed-y-up',
            instances: [
                instance('instance_floor', 'asset_floor', [0, -0.04, 0]),
                instance('instance_arch', 'asset_architecture', [0, 0, 0]),
                instance('instance_table', 'asset_table', [-0.55, 0, 0.7], [0, 0, 0], [1, 1, 1], 'prop', 'prop_table'),
                instance('instance_chair_maya', 'asset_chair', [-1.48, 0, 1.35], [0, 45, 0]),
                instance('instance_chair_guest', 'asset_chair', [0.43, 0, 1.24], [0, -35, 0]),
                instance('instance_mug', 'asset_mug', [-0.37, 0.94, 0.64], [0, 15, 0], [1, 1, 1], 'prop', 'prop_mug'),
                instance('instance_saucer', 'asset_saucer', [-0.37, 0.923, 0.64]),
                instance('instance_maya', 'asset_maya', [-1.48, 0, 1.38], [0, 42, 0], [1, 1, 1], 'character', 'char_maya'),
                instance('instance_leo', 'asset_leo', [2.4, 0, -1.45], [0, -45, 0], [1, 1, 1], 'character', 'char_leo'),
                instance('instance_counter', 'asset_counter', [2.25, 0, -1.0]),
                instance('instance_display', 'asset_display', [1.6, 1.13, -1.02]),
                instance('instance_plant_window', 'asset_plant', [-3.15, 0, -2.1]),
                instance('instance_plant_front', 'asset_plant', [3.4, 0, 2.55], [0, 30, 0], [0.65, 0.75, 0.65]),
                instance('instance_pendant_left', 'asset_pendant', [-1.05, 0.0, 0.2]),
                instance('instance_pendant_right', 'asset_pendant', [2.35, 0.0, -0.8]),
                instance('instance_shelf', 'asset_shelf', [2.2, 0, -3.45]),
                instance('instance_art', 'asset_art', [0.1, 0, -3.62]),
            ],
            camera_poses: [
                { id: 'camera_wide', shot_id: 'shot_01', position: [6.7, 3.7, 8.2], target: [0.15, 1.25, -0.45], fov_deg: 39 },
                { id: 'camera_close', shot_id: 'shot_02', position: [1.6, 2.18, 4.12], target: [-0.86, 1.18, 0.69], fov_deg: 34 },
            ],
        }],
    shots: [
        { id: 'shot_01', scene_id: 'scene_cafe', character_ids: ['char_maya', 'char_leo'], prop_ids: ['prop_mug', 'prop_table'], description: 'Wide establishing shot — an inviting neighborhood café at golden hour.', focal_length_mm: 35, duration_seconds: 4, ...inferred(1) },
        { id: 'shot_02', scene_id: 'scene_cafe', character_ids: ['char_maya'], prop_ids: ['prop_mug'], description: 'Medium shot — Maya and her first morning coffee.', focal_length_mm: 50, duration_seconds: 4, ...inferred(9) },
    ],
    timeline: {
        id: 'timeline_morning_coffee', fps: 24, duration_seconds: 8,
        clips: [
            { id: 'clip_establishing', shot_id: 'shot_01', start_seconds: 0, duration_seconds: 4 },
            { id: 'clip_maya', shot_id: 'shot_02', start_seconds: 4, duration_seconds: 4 },
        ],
        events: [
            { id: 'event_enters', action_id: 'action_maya_enters', start_seconds: 0, duration_seconds: 2 },
            { id: 'event_lifts_cup', action_id: 'action_maya_lifts_cup', start_seconds: 5.5, duration_seconds: 1.4 },
        ],
    },
};
