import { cafeProject } from '../src/data/cafe.scene.js';
import { validateProject } from '../src/schema/project.schema.js';
const { success, errors } = validateProject(cafeProject);
if (!success) {
    console.error('FAILED: Café scene did not validate');
    for (const { path, message } of errors)
        console.error(`  ${path}: ${message}`);
    process.exitCode = 1;
}
else {
    console.log('PASS: Café scene validates against all six contracts + cross-references');
    console.log(`  ${cafeProject.bible.characters.length} characters | ${cafeProject.asset_manifest.assets.length} assets | ${cafeProject.scene_layouts[0].instances.length} instances | ${cafeProject.shots.length} shots`);
}
