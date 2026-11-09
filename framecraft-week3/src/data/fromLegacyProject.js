/**
 * Convert one scene of a v1 Framecraft project (bible + layouts + shots) into a
 * storyboard scene file. The v1 contracts stay the source for the existing
 * renderer studies; the storyboard file is what the editor opens and saves.
 */
const SET_CATEGORIES = new Set(['environment', 'architecture', 'light-fixture']);
const LOCKED_GENERATORS = new Set(['floor', 'architecture']);

export function toObjectId(instanceId) {
    return `obj_${instanceId.replace(/^instance_/, '')}`;
}

export function fromLegacyProject(project, sceneId, { title = 'Untitled project', sceneNumber = 1 } = {}) {
    const scene = project.bible.scenes.find(s => s.id === sceneId);
    const layout = project.scene_layouts.find(l => l.scene_id === sceneId);
    if (!scene || !layout)
        throw new Error(`Scene ${sceneId} not found in project`);
    const assets = new Map(project.asset_manifest.assets.map(a => [a.id, a]));
    const specs = new Map(project.character_specs.map(c => [c.id, c]));
    const props = new Map(project.bible.props.map(p => [p.id, p]));
    const objects = layout.instances.filter(i => i.visible !== false).map(instance => {
        const asset = assets.get(instance.asset_id);
        if (!asset)
            throw new Error(`Missing asset ${instance.asset_id}`);
        const kind = instance.entity_type === 'character' ? 'character' : (SET_CATEGORIES.has(asset.category) ? 'set' : 'prop');
        const assetRef = asset.source.kind === 'procedural'
            ? { kind: 'procedural', generator: asset.source.generator }
            : asset.source.kind === 'gltf'
                ? { kind: 'gltf', uri: asset.source.uri }
                : { kind: 'block', size_m: asset.dimensions_m ?? [1, 1, 1], color: asset.material?.color ?? '#9aa0a6' };
        const obj = {
            id: toObjectId(instance.id),
            kind,
            label: asset.label,
            asset: assetRef,
            transform: structuredClone(instance.transform),
            locked: assetRef.kind === 'procedural' && LOCKED_GENERATORS.has(assetRef.generator),
            source: { tag: 'user' },
        };
        if (kind === 'character') {
            const spec = specs.get(instance.entity_id);
            obj.label = spec?.display_name ?? asset.label;
            obj.character = {
                name: spec?.display_name ?? instance.entity_id,
                height_m: spec?.height_m ?? 1.75,
                // The v1 café authored Leo standing at the counter and Maya seated.
                pose: instance.entity_id === 'char_leo' ? 'standing' : 'seated',
                ...(spec?.palette ? { palette: spec.palette } : {}),
            };
        }
        const prop = instance.entity_id && props.get(instance.entity_id);
        if (prop)
            obj.source = { tag: prop.tag === 'STATED' ? 'stated' : 'inferred', line: prop.line_number };
        return obj;
    });
    const shots = project.shots.filter(s => s.scene_id === sceneId).map((shot, i) => {
        const pose = layout.camera_poses.find(p => p.shot_id === shot.id);
        return {
            id: shot.id,
            number: i + 1,
            lens_mm: shot.focal_length_mm,
            aspect: '16:9',
            time: '12:00',
            light_note: '',
            script_line: '',
            description: shot.description,
            camera: { position: [...pose.position], target: [...pose.target] },
        };
    });
    const heading = `${scene.interior_exterior ?? 'INT'}. ${scene.location.toUpperCase()} - ${(scene.time_of_day ?? 'DAY').toUpperCase()}`;
    return {
        format: 'framecraft.storyboard',
        version: 1,
        project: { id: project.bible.script_id, title },
        scene: {
            id: scene.id,
            number: sceneNumber,
            heading,
            location: scene.location,
            int_ext: scene.interior_exterior,
            time_of_day: scene.time_of_day,
            source_line: scene.line_number,
        },
        sensor: { id: 'super35', width_mm: 24.89, height_mm: 18.66 },
        objects,
        lights: [],
        shots,
    };
}
