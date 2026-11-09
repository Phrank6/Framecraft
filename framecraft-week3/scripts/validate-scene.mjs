import { readFileSync } from 'node:fs';
import { cafeProject } from '../src/data/cafe.scene.js';
import { validateProject } from '../src/schema/project.schema.js';
import { validateStoryboard } from '../src/schema/storyboard.schema.js';

// 1. Week 1 project contracts (six schemas + cross-references)
const { success, errors } = validateProject(cafeProject);
if (!success) {
    console.error('FAILED: Café project did not validate');
    for (const { path, message } of errors)
        console.error(`  ${path}: ${message}`);
    process.exitCode = 1;
}
else {
    console.log('PASS: Café project validates against all six contracts + cross-references');
    console.log(`  ${cafeProject.bible.characters.length} characters | ${cafeProject.asset_manifest.assets.length} assets | ${cafeProject.scene_layouts[0].instances.length} instances | ${cafeProject.shots.length} shots`);
}

// 2. Storyboard scene files (the format the editor opens and saves). Pass extra files as arguments.
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['examples/cafe.storyboard.json'];
for (const file of files) {
    let doc;
    try {
        doc = JSON.parse(readFileSync(file, 'utf8'));
    }
    catch (error) {
        console.error(`FAILED: ${file} is not readable JSON (${error.message})`);
        process.exitCode = 1;
        continue;
    }
    const result = validateStoryboard(doc);
    if (!result.success) {
        console.error(`FAILED: ${file}`);
        for (const { path, message } of result.errors)
            console.error(`  ${path || '(root)'}: ${message}`);
        process.exitCode = 1;
    }
    else
        console.log(`PASS: ${file} · ${result.data.objects.length} objects | ${result.data.lights.length} lights | ${result.data.shots.length} shots`);
}
