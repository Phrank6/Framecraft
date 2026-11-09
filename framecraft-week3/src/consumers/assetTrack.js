/** Example cross-team consumer: asset ingestion does not need a WebGL context. */
import { AssetManifestSchema, CharacterSpecSchema } from '../schema/index.js';
export function listCharacterAssets(project) {
    const manifest = AssetManifestSchema.parse(project.asset_manifest);
    const assets = new Map(manifest.assets.map(asset => [asset.id, asset]));
    return project.character_specs.map(spec => {
        const character = CharacterSpecSchema.parse(spec);
        const asset = assets.get(character.asset_id);
        if (!asset)
            throw new Error(`Asset missing for character ${character.id}`);
        return { characterId: character.id, assetId: asset.id, source: asset.source };
    });
}
