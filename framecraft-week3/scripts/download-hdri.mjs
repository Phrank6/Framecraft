import { mkdir, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
/** Studio Small 09 by Sergej Majboroda, Poly Haven, CC0. */
const url = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr';
const directory = new URL('../public/hdri/', import.meta.url);
const target = new URL('studio_small_09_1k.hdr', directory);
const temp = new URL('studio_small_09_1k.hdr.part', directory);
console.log('Downloading CC0 photographed HDR panorama from Poly Haven…');
try {
    const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
    if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const header = new TextDecoder().decode(bytes.slice(0, 24));
    if (!header.startsWith('#?RADIANCE') && !header.startsWith('#?RGBE'))
        throw new Error('Not a Radiance HDR file');
    await mkdir(fileURLToPath(directory), { recursive: true });
    await writeFile(fileURLToPath(temp), bytes);
    await rename(fileURLToPath(temp), fileURLToPath(target));
    console.log(`Ready: ${fileURLToPath(target)} (${bytes.length} bytes)`);
}
catch (error) {
    console.error('Could not download HDR photograph:', error.message);
    console.error('The bundled synthetic Radiance HDR remains available, so the demo still works.');
    process.exitCode = 1;
}
