import { cafeProject } from '../src/data/cafe.scene.js';
import { writeFileSync } from 'node:fs';
writeFileSync(new URL('../src/data/cafe.scene.json', import.meta.url), JSON.stringify(cafeProject, null, 2) + '\n');
console.log('Wrote src/data/cafe.scene.json');
