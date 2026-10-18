import { z } from 'zod';
import { BibleSchema } from './bible.schema.js';
import { CharacterSpecsSchema } from './character.schema.js';
import { AssetManifestSchema } from './asset.schema.js';
import { SceneLayoutsSchema } from './layout.schema.js';
import { ShotSchema } from './shot.schema.js';
import { TimelineSchema } from './timeline.schema.js';
function addUniqueChecks(arr, kind, path, ctx) {
    const ids = new Set();
    arr.forEach((row, i) => {
        const id = row.id ?? row.beat_id;
        if (ids.has(id))
            ctx.addIssue({ code: 'custom', path: [...path, i, row.id ? 'id' : 'beat_id'], message: `Duplicate ${kind} ID: ${id}` });
        ids.add(id);
    });
    return ids;
}
function assertReference(ref, known, type, path, ctx) {
    if (!known.has(ref))
        ctx.addIssue({ code: 'custom', path, message: `Unknown ${type} reference: ${ref}` });
}
function verifyPrefix(id, prefix, path, ctx) {
    if (!id.startsWith(prefix) || !/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(id)) {
        ctx.addIssue({ code: 'custom', path, message: `Expected stable ${prefix} ID (lowercase words separated by underscores), got ${id}` });
    }
}
/** Cross-contract validation: Zod local checks + project graph integrity checks. */
export const FramecraftProjectSchema = z.strictObject({
    version: z.literal('1.0.0'),
    bible: BibleSchema,
    character_specs: CharacterSpecsSchema,
    asset_manifest: AssetManifestSchema,
    scene_layouts: SceneLayoutsSchema,
    shots: z.array(ShotSchema).min(1),
    timeline: TimelineSchema,
}).superRefine((p, ctx) => {
    const chars = addUniqueChecks(p.bible.characters, 'character', ['bible', 'characters'], ctx);
    const props = addUniqueChecks(p.bible.props, 'prop', ['bible', 'props'], ctx);
    const scenes = addUniqueChecks(p.bible.scenes, 'scene', ['bible', 'scenes'], ctx);
    const actions = addUniqueChecks(p.bible.actions, 'action', ['bible', 'actions'], ctx);
    addUniqueChecks(p.bible.emotions, 'emotion', ['bible', 'emotions'], ctx);
    addUniqueChecks(p.bible.story_beats, 'beat', ['bible', 'story_beats'], ctx);
    const assets = addUniqueChecks(p.asset_manifest.assets, 'asset', ['asset_manifest', 'assets'], ctx);
    const specs = addUniqueChecks(p.character_specs, 'character spec', ['character_specs'], ctx);
    const shots = addUniqueChecks(p.shots, 'shot', ['shots'], ctx);
    const layouts = addUniqueChecks(p.scene_layouts, 'layout', ['scene_layouts'], ctx);
    addUniqueChecks(p.timeline.clips, 'timeline clip', ['timeline', 'clips'], ctx);
    addUniqueChecks(p.timeline.events, 'timeline event', ['timeline', 'events'], ctx);
    const groups = [[p.bible.characters, 'char_', ['bible', 'characters']], [p.bible.props, 'prop_', ['bible', 'props']], [p.bible.scenes, 'scene_', ['bible', 'scenes']], [p.bible.actions, 'action_', ['bible', 'actions']], [p.bible.emotions, 'emotion_', ['bible', 'emotions']], [p.bible.story_beats, 'beat_', ['bible', 'story_beats']], [p.character_specs, 'char_', ['character_specs']], [p.asset_manifest.assets, 'asset_', ['asset_manifest', 'assets']], [p.shots, 'shot_', ['shots']], [p.scene_layouts, 'layout_', ['scene_layouts']]];
    for (const [items, prefix, path] of groups)
        items.forEach((item, i) => verifyPrefix(item.id ?? item.beat_id, prefix, [...path, i, item.id ? 'id' : 'beat_id'], ctx));
    verifyPrefix(p.bible.script_id, 'script_', ['bible', 'script_id'], ctx);
    verifyPrefix(p.asset_manifest.id, 'manifest_', ['asset_manifest', 'id'], ctx);
    verifyPrefix(p.timeline.id, 'timeline_', ['timeline', 'id'], ctx);
    for (const [i, c] of p.character_specs.entries()) {
        assertReference(c.id, chars, 'Bible character', ['character_specs', i, 'id'], ctx);
        assertReference(c.asset_id, assets, 'asset', ['character_specs', i, 'asset_id'], ctx);
        const characterAsset = p.asset_manifest.assets.find(a => a.id === c.asset_id);
        if (characterAsset && characterAsset.category !== 'character')
            ctx.addIssue({ code: 'custom', path: ['character_specs', i, 'asset_id'], message: `Expected a character category asset for ${c.id}` });
    }
    for (const [i, c] of p.bible.characters.entries()) {
        assertReference(c.id, specs, 'CharacterSpec', ['bible', 'characters', i, 'id'], ctx);
        if (c.line_number > p.bible.total_lines)
            ctx.addIssue({ code: 'custom', path: ['bible', 'characters', i, 'line_number'], message: 'line_number exceeds total_lines' });
    }
    for (const [i, scene] of p.bible.scenes.entries()) {
        scene.character_ids.forEach((id, j) => assertReference(id, chars, 'character', ['bible', 'scenes', i, 'character_ids', j], ctx));
        scene.prop_ids.forEach((id, j) => assertReference(id, props, 'prop', ['bible', 'scenes', i, 'prop_ids', j], ctx));
    }
    for (const [group, list] of [['actions', p.bible.actions], ['emotions', p.bible.emotions], ['story_beats', p.bible.story_beats]]) {
        list.forEach((item, i) => {
            assertReference(item.scene_id, scenes, 'scene', ['bible', group, i, 'scene_id'], ctx);
            if (item.character_id)
                assertReference(item.character_id, chars, 'character', ['bible', group, i, 'character_id'], ctx);
            item.character_ids?.forEach((id, j) => assertReference(id, chars, 'character', ['bible', group, i, 'character_ids', j], ctx));
            item.prop_ids?.forEach((id, j) => assertReference(id, props, 'prop', ['bible', group, i, 'prop_ids', j], ctx));
            if (item.line_number > p.bible.total_lines)
                ctx.addIssue({ code: 'custom', path: ['bible', group, i, 'line_number'], message: 'line_number exceeds total_lines' });
        });
    }
    const allInstanceIds = new Set();
    const shotCameras = new Set();
    const layoutScenes = new Set();
    p.scene_layouts.forEach((layout, i) => {
        assertReference(layout.scene_id, scenes, 'scene', ['scene_layouts', i, 'scene_id'], ctx);
        layoutScenes.add(layout.scene_id);
        addUniqueChecks(layout.instances, 'instance', ['scene_layouts', i, 'instances'], ctx);
        addUniqueChecks(layout.camera_poses, 'camera pose', ['scene_layouts', i, 'camera_poses'], ctx);
        layout.instances.forEach((instance, j) => {
            verifyPrefix(instance.id, 'instance_', ['scene_layouts', i, 'instances', j, 'id'], ctx);
            if (allInstanceIds.has(instance.id))
                ctx.addIssue({ code: 'custom', path: ['scene_layouts', i, 'instances', j, 'id'], message: `Duplicate global instance ID: ${instance.id}` });
            allInstanceIds.add(instance.id);
            assertReference(instance.asset_id, assets, 'asset', ['scene_layouts', i, 'instances', j, 'asset_id'], ctx);
            if (instance.entity_type === 'character') {
                if (!instance.entity_id)
                    ctx.addIssue({ code: 'custom', path: ['scene_layouts', i, 'instances', j, 'entity_id'], message: 'Character instance must have entity_id' });
                else
                    assertReference(instance.entity_id, chars, 'character', ['scene_layouts', i, 'instances', j, 'entity_id'], ctx);
            }
            if (instance.entity_type === 'prop' && instance.entity_id)
                assertReference(instance.entity_id, props, 'prop', ['scene_layouts', i, 'instances', j, 'entity_id'], ctx);
        });
        layout.camera_poses.forEach((camera, j) => {
            verifyPrefix(camera.id, 'camera_', ['scene_layouts', i, 'camera_poses', j, 'id'], ctx);
            assertReference(camera.shot_id, shots, 'shot', ['scene_layouts', i, 'camera_poses', j, 'shot_id'], ctx);
            const shot = p.shots.find(s => s.id === camera.shot_id);
            if (shot && shot.scene_id !== layout.scene_id)
                ctx.addIssue({ code: 'custom', path: ['scene_layouts', i, 'camera_poses', j, 'shot_id'], message: 'Camera and shot refer to different scenes' });
            if (shotCameras.has(camera.shot_id))
                ctx.addIssue({ code: 'custom', path: ['scene_layouts', i, 'camera_poses', j, 'shot_id'], message: `More than one camera for shot ${camera.shot_id}` });
            shotCameras.add(camera.shot_id);
        });
    });
    p.shots.forEach((shot, i) => {
        assertReference(shot.scene_id, scenes, 'scene', ['shots', i, 'scene_id'], ctx);
        const parentScene = p.bible.scenes.find(s => s.id === shot.scene_id);
        if (shot.line_number > p.bible.total_lines)
            ctx.addIssue({ code: 'custom', path: ['shots', i, 'line_number'], message: 'line_number exceeds total_lines' });
        shot.character_ids.forEach((id, j) => { assertReference(id, chars, 'character', ['shots', i, 'character_ids', j], ctx); if (parentScene && !parentScene.character_ids.includes(id))
            ctx.addIssue({ code: 'custom', path: ['shots', i, 'character_ids', j], message: `Character ${id} is not in scene ${shot.scene_id}` }); });
        shot.prop_ids.forEach((id, j) => { assertReference(id, props, 'prop', ['shots', i, 'prop_ids', j], ctx); if (parentScene && !parentScene.prop_ids.includes(id))
            ctx.addIssue({ code: 'custom', path: ['shots', i, 'prop_ids', j], message: `Prop ${id} is not in scene ${shot.scene_id}` }); });
        if (!shotCameras.has(shot.id))
            ctx.addIssue({ code: 'custom', path: ['shots', i, 'id'], message: `Missing camera pose for shot ${shot.id}` });
        if (!layoutScenes.has(shot.scene_id))
            ctx.addIssue({ code: 'custom', path: ['shots', i, 'scene_id'], message: 'No layout for shot scene' });
    });
    const sorted = [...p.timeline.clips].sort((a, b) => a.start_seconds - b.start_seconds);
    sorted.forEach((clip, i) => {
        const original = p.timeline.clips.indexOf(clip);
        verifyPrefix(clip.id, 'clip_', ['timeline', 'clips', original, 'id'], ctx);
        assertReference(clip.shot_id, shots, 'shot', ['timeline', 'clips', original, 'shot_id'], ctx);
        const shot = p.shots.find(s => s.id === clip.shot_id);
        if (shot && Math.abs(shot.duration_seconds - clip.duration_seconds) > 0.0001)
            ctx.addIssue({ code: 'custom', path: ['timeline', 'clips', original, 'duration_seconds'], message: 'Clip duration differs from referenced Shot' });
        if (clip.start_seconds + clip.duration_seconds > p.timeline.duration_seconds + 1e-6)
            ctx.addIssue({ code: 'custom', path: ['timeline', 'clips', original], message: 'Clip extends past end of timeline' });
        if (i > 0) {
            const prev = sorted[i - 1];
            if (prev.start_seconds + prev.duration_seconds > clip.start_seconds + 1e-6)
                ctx.addIssue({ code: 'custom', path: ['timeline', 'clips', original], message: `Clip overlaps ${prev.id}` });
        }
    });
    p.timeline.events.forEach((event, i) => {
        verifyPrefix(event.id, 'event_', ['timeline', 'events', i, 'id'], ctx);
        assertReference(event.action_id, actions, 'action', ['timeline', 'events', i, 'action_id'], ctx);
        if (event.start_seconds + event.duration_seconds > p.timeline.duration_seconds + 1e-6)
            ctx.addIssue({ code: 'custom', path: ['timeline', 'events', i], message: 'Event extends past timeline' });
    });
});
export function validateProject(input) {
    const result = FramecraftProjectSchema.safeParse(input);
    return result.success ? { success: true, data: result.data, errors: [] } : {
        success: false,
        data: null,
        errors: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
    };
}
