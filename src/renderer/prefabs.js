import * as THREE from 'three';
/**
 * Procedural geometry for the café fixture. Scene instance IDs are defined in
 * the project data; each instance may contain multiple meshes.
 */
const PALETTE = { cream: '#e8ded0', ivory: '#f4e8d6', oak: '#b28b61', walnut: '#665040', brass: '#b69a6a', ink: '#273631', linen: '#c7b59d', terracotta: '#a97459' };
const std = (color, roughness = .65, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const physical = (color, roughness = .4, metalness = 0, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness, metalness, ...extra });
const MAT = {
    oak: std('#ffffff', .54), walnut: std('#ffffff', .62),
    brass: std(PALETTE.brass, .25, .78), darkBrass: std('#735b3c', .32, .65),
    chrome: std('#d3dce0', .17, .92), black: std('#303534', .4, .3),
    ivory: physical('#eee4d8', .24, 0, { clearcoat: .84, clearcoatRoughness: .09 }),
    white: physical('#f6eee2', .14, 0, { clearcoat: .9, clearcoatRoughness: .08 }),
    glass: physical('#c6dce0', .08, 0, { transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: .06 }),
    green: std('#344c3d', .79), blackboard: std('#273932', .82),
    cream: std(PALETTE.cream, .84), charcoal: std('#303333', .68),
    coffee: physical('#3f2519', .15, 0, { clearcoat: 1 }),
    crema: std('#c18e55', .53)
};
const textureCache = new Map();
function texture(name, rx = 1, ry = 1) {
    if (typeof document === 'undefined')
        return null; // tests run directly in Node
    const key = `${name}:${rx}:${ry}`;
    if (textureCache.has(key))
        return textureCache.get(key);
    const t = new THREE.TextureLoader().load(`/textures/${name}`, undefined, undefined, e => console.warn('Optional café texture missing', name, e));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    textureCache.set(key, t);
    return t;
}
function patterned(file, rx = 1, ry = 1, roughness = .72, metalness = 0) {
    const map = texture(file, rx, ry);
    return std(map ? '#ffffff' : '#a68a72', roughness, metalness, map ? { map } : {});
}
function mesh(g, geometry, material, x = 0, y = 0, z = 0, cast = true, receive = true) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = cast && !(material.transparent && material.opacity < 0.7);
    m.receiveShadow = receive;
    g.add(m);
    return m;
}
function box(g, m, x, y, z, w, h, d, cast = true) { return mesh(g, new THREE.BoxGeometry(w, h, d), m, x, y, z, cast); }
function sphere(g, m, x, y, z, rx, ry, rz, detail = 20) { const a = mesh(g, new THREE.SphereGeometry(1, detail, Math.max(12, Math.round(detail * .65))), m, x, y, z); a.scale.set(rx, ry, rz); return a; }
function cylinder(g, m, x, y, z, rt, rb, h, segments = 32) { return mesh(g, new THREE.CylinderGeometry(rt, rb, h, segments), m, x, y, z); }
function rod(g, m, from, to, r = .022) { const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a); const p = mesh(g, new THREE.CylinderGeometry(r, r, d.length(), 10), m, ...a.add(b).multiplyScalar(.5).toArray()); p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return p; }
function arc(g, m, points, r = .012) { const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))); return mesh(g, new THREE.TubeGeometry(curve, Math.max(18, points.length * 8), r, 7, false), m); }
function torus(g, m, x, y, z, r, t = .008, rotationX = Math.PI / 2) { const a = mesh(g, new THREE.TorusGeometry(r, t, 8, 60), m, x, y, z); a.rotation.x = rotationX; return a; }
function plane(g, m, x, y, z, w, h, rotY = 0) { const p = mesh(g, new THREE.PlaneGeometry(w, h), m, x, y, z, false, false); p.rotation.y = rotY; return p; }
function labelTexture(name) { const map = texture(name); return new THREE.MeshBasicMaterial({ color: '#ffffff', map: map || null, side: THREE.DoubleSide }); }
function windowSet(g) {
    // Rear wall picture windows: full-size atmospheric city backplates with mullions.
    const backlit = labelTexture('window_city.jpg');
    plane(g, backlit, -2.55, 2.10, -3.868, 3.38, 2.34);
    box(g, MAT.oak, -2.55, 3.33, -3.845, 3.69, .13, .13);
    box(g, MAT.oak, -2.55, .88, -3.845, 3.69, .15, .13);
    for (const x of [-4.37, -3.13, -1.89, -.73])
        box(g, MAT.oak, x, 2.11, -3.832, .09, 2.52, .16);
    box(g, MAT.oak, -2.55, 2.0, -3.827, 3.68, .075, .16);
    // West-facing tall glazing makes the space feel open from the establishing shot.
    const x = -4.48;
    for (let k = 0; k < 3; k++) {
        const z = -2.7 + k * 1.55;
        plane(g, backlit, x, 2.03, z, 1.45, 2.47, Math.PI / 2);
        for (const zz of [z - .76, z + .76])
            box(g, MAT.oak, x + .018, 2.03, zz, .09, 2.55, .10);
        box(g, MAT.oak, x + .024, .77, z, .10, .12, 1.57);
        box(g, MAT.oak, x + .024, 3.30, z, .10, .14, 1.57);
        box(g, MAT.oak, x + .025, 1.88, z, .09, .06, 1.55);
    }
    // A narrow translucent finish catches reflected highlights on glazing.
    const film = physical('#d2dfe0', .11, 0, { transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide });
    plane(g, film, -4.437, 2.05, -1.16, 4.52, 2.47, Math.PI / 2);
}
function architecture(g) {
    MAT.oak.map = texture('warm_oak.jpg', 2, 1);
    MAT.walnut.map = texture('walnut.jpg', 2, 1);
    const plaster = patterned('lime_plaster.jpg', 2, 1, .93);
    const wainscot = patterned('walnut.jpg', 2, 2, .6);
    box(g, plaster, 0, 1.86, -4.07, 9.45, 3.76, .18);
    // Missing front/right walls are intentional: this is a camera-facing stage set.
    box(g, plaster, -4.64, 3.55, -.10, .22, .58, 8.15);
    box(g, wainscot, 0, .63, -3.94, 9.32, 1.22, .09);
    box(g, MAT.brass, 0, 1.25, -3.873, 9.25, .025, .04);
    box(g, MAT.oak, 0, .13, -3.875, 9.34, .17, .10);
    for (let x = -4.25; x < 4.5; x += .52)
        box(g, MAT.walnut, x, .68, -3.88, .018, 1.07, .035);
    // Cornice and beams create realistic spatial scale.
    box(g, MAT.walnut, 0, 3.74, -3.87, 9.35, .15, .34);
    for (const x of [-3.6, -.5, 2.5])
        box(g, MAT.walnut, x, 3.67, -.2, .12, .19, 7.55);
    windowSet(g);
    // Deep green entrance to the far right, with a glazed insert and antique handle.
    box(g, MAT.charcoal, 4.01, 1.35, -3.84, 1.05, 2.5, .07);
    box(g, MAT.brass, 4.01, 1.38, -3.78, .85, 2.23, .035);
    box(g, MAT.green, 4.01, 1.38, -3.744, .79, 2.17, .036);
    plane(g, labelTexture('window_city.jpg'), 4.02, 1.88, -3.715, .58, .99);
    rod(g, MAT.brass, [4.34, 1.08, -3.65], [4.34, 1.43, -3.65], .019);
    box(g, MAT.brass, 4.01, .28, -3.72, .77, .08, .025);
    // Light-weight framed wall art grouping, now using actual picture planes.
    for (const [x, y, w, h, c] of [[.15, 2.55, .7, .69, '#aa7c5b'], [1.05, 2.49, .65, .76, '#697861']]) {
        const paper = std('#e5dac7');
        const ink = std(c, .85);
        box(g, MAT.brass, x, y, -3.82, w + .09, h + .09, .06);
        box(g, paper, x, y, -3.775, w, h, .025);
        sphere(g, ink, x - .08, y + .05, -3.755, w * .28, h * .31, .006);
        sphere(g, std('#c4a877'), x + .11, y - .10, -3.749, w * .12, h * .20, .006);
    }
    // Lit brand sign sits over the bar, readable in the wide shot.
    box(g, MAT.walnut, 2.4, 3.15, -3.77, 3.25, .62, .14);
    plane(g, labelTexture('cafe_sign.png'), 2.4, 3.15, -3.68, 3.08, .76);
    // Black menu board between gallery wall and service corner.
    box(g, MAT.walnut, 2.27, 2.20, -3.73, 1.17, 1.30, .12);
    plane(g, labelTexture('menu_board.png'), 2.27, 2.20, -3.65, 1.05, 1.15);
    // Architecture-level small planters add scale and lush green silhouette.
    for (const [x, z] of [[-3.95, -3.55], [-.30, -3.58]]) {
        box(g, MAT.walnut, x, 1.27, z, .58, .065, .31);
        for (let i = 0; i < 3; i++) {
            const px = x - .18 + i * .18;
            sphere(g, MAT.green, px, 1.55, z, .15, .28, .13);
            arc(g, MAT.green, [[px, 1.31, z], [px + .08, 1.53, z - .02], [px + .18, 1.66, z - .1]], .009);
        }
    }
}
function floor(g) {
    const limestone = patterned('limestone_tiles.jpg', 3.4, 3.1, .93);
    box(g, limestone, 0, -.075, 0, 9.5, .15, 8.4, false);
    // A tactile woven rug separates the intimate seating vignette from the bar.
    const rug = patterned('woven_linen.jpg', 3, 2, .99);
    box(g, rug, -.55, .011, .79, 3.52, .013, 2.73, false);
    const border = std('#8c6954', .91);
    for (const z of [-.55, 2.14])
        box(g, border, -.55, .023, z, 3.53, .004, .038, false);
    for (const x of [-2.29, 1.18])
        box(g, border, x, .023, .79, .038, .004, 2.72, false);
    for (let i = 0; i < 23; i++)
        for (const s of [-1, 1]) {
            rod(g, border, [-2.27 + i * .153, .018, .79 + s * 1.37], [-2.27 + i * .153, .018, .79 + s * 1.48], .004);
        }
    // Light pool / entrance threshold defines room scale without fake lighting.
    box(g, MAT.brass, 3.94, .016, 3.4, 1.0, .009, .014, false);
}
function table(g) {
    const oak = patterned('warm_oak.jpg', 2, 1, .4), linen = patterned('woven_linen.jpg', 1, 1, .91);
    cylinder(g, MAT.walnut, 0, .46, 0, .073, .09, .83);
    cylinder(g, MAT.brass, 0, .045, 0, .40, .38, .04, 50);
    cylinder(g, MAT.walnut, 0, .845, 0, .74, .73, .13, 72);
    cylinder(g, oak, 0, .923, 0, .737, .737, .018, 72);
    torus(g, MAT.brass, 0, .925, 0, .732, .008);
    // Linen napkin deliberately lifted off the surface so contact shadows appear.
    const napkin = box(g, linen, -.35, .941, .34, .32, .013, .29);
    napkin.rotation.y = -.27;
    const hem = box(g, MAT.ivory, -.39, .951, .39, .25, .002, .003);
    hem.rotation.y = -.27;
    const spoon = mesh(g, new THREE.CapsuleGeometry(.012, .20, 3, 8), MAT.chrome, .12, .96, .32);
    spoon.rotation.z = Math.PI / 2.9;
    spoon.rotation.y = .22;
    sphere(g, MAT.chrome, .24, .954, .23, .055, .011, .032);
    // Hand-glazed tiny sugar bowl and lid, with a metal knob.
    cylinder(g, MAT.ivory, -.24, .961, -.39, .087, .073, .084, 38);
    cylinder(g, MAT.brass, -.24, 1.010, -.39, .084, .084, .012, 38);
    sphere(g, MAT.brass, -.24, 1.031, -.39, .023, .021, .023);
    // A folded menu card catches highlights on its slightly waxed surface.
    const menu = box(g, physical('#e3ceb0', .55), .37, .949, -.27, .26, .01, .19);
    menu.rotation.y = .5;
    box(g, MAT.brass, .37, .957, -.27, .2, .002, .008);
}
function chair(g) {
    const frame = patterned('warm_oak.jpg', 1, 1, .52), cushion = patterned('woven_linen.jpg', 1, 1, .95);
    const seat = box(g, frame, 0, .45, 0, .55, .06, .53);
    box(g, cushion, 0, .5, .006, .48, .045, .47);
    for (const x of [-.22, .22])
        for (const z of [-.19, .19])
            rod(g, MAT.walnut, [x, .42, z], [x * 1.10, .055, z * 1.25], .028);
    // Bentwood chair with open cane back rather than a simple block.
    for (const s of [-1, 1])
        arc(g, frame, [[s * .245, .47, -.23], [s * .28, .80, -.28], [s * .25, 1.12, -.27], [s * .13, 1.20, -.265]], .034);
    const back = box(g, cushion, 0, .99, -.28, .42, .28, .025);
    back.rotation.x = -.10;
    arc(g, MAT.walnut, [[-.25, 1.12, -.28], [0, 1.24, -.27], [.25, 1.12, -.28]], .026);
}
function mug(g) {
    const cup = MAT.white;
    const section = [[0, 0], [.073, 0], [.086, .014], [.094, .075], [.102, .183], [.106, .195], [.095, .199], [.089, .185], [.082, .041], [0, .033]];
    mesh(g, new THREE.LatheGeometry(section.map(([r, y]) => new THREE.Vector2(r, y)), 64), cup, 0, 0, 0);
    torus(g, MAT.ivory, 0, .196, 0, .102, .006);
    cylinder(g, MAT.coffee, 0, .173, 0, .085, .085, .004, 48);
    // Heart-shaped latte art, drawn in real geometry on the coffee surface.
    const foam = std('#e5bf8e', .56);
    const p = [[0, .178, -.01], [-.045, .178, -.040], [-.065, .178, -.009], [0, .178, .054], [.065, .178, -.009], [.045, .178, -.040], [0, .178, -.01]];
    arc(g, foam, p, .0045);
    rod(g, foam, [0, .179, .052], [0, .179, .077], .003);
    arc(g, cup, [[.09, .155, 0], [.16, .17, 0], [.184, .11, 0], [.156, .055, 0], [.09, .065, 0]], .017);
    torus(g, MAT.brass, 0, .004, 0, .076, .002);
}
function saucer(g) {
    cylinder(g, MAT.white, 0, .014, 0, .176, .18, .025, 56);
    torus(g, MAT.brass, 0, .024, 0, .162, .003);
}
function espressoMachine(g) {
    const chrome = MAT.chrome, ink = MAT.charcoal, brass = MAT.brass;
    // All dimensions relative to the countertop at y=1.13.
    box(g, chrome, 0, .19, 0, .72, .39, .39);
    box(g, ink, 0, .408, -.028, .73, .088, .42);
    box(g, chrome, 0, .46, -.10, .72, .055, .24);
    for (const x of [-.22, .22]) {
        cylinder(g, ink, x, .35, .235, .088, .088, .045);
        cylinder(g, brass, x, .295, .27, .027, .027, .11);
        rod(g, ink, [x, .29, .29], [x + .11, .26, .34], .026);
        box(g, ink, x, .09, .23, .18, .05, .19);
    }
    box(g, chrome, 0, .038, .245, .65, .025, .20);
    for (let k = 0; k < 8; k++)
        box(g, ink, -.27 + k * .076, .052, .255, .012, .003, .15);
    for (let i = 0; i < 4; i++)
        sphere(g, brass, -.28 + i * .18, .415, .11, .023, .022, .015);
    rod(g, chrome, [.31, .29, .30], [.42, .13, .38], .012);
    cylinder(g, chrome, .40, .10, .38, .042, .039, .04);
}
function counter(g) {
    const base = patterned('walnut.jpg', 3, 2, .53), stone = patterned('marble_counter.jpg', 3, 1, .21);
    box(g, base, 0, .55, 0, 3.03, 1.10, .92);
    // Architectural vertical cabinet slats with recessed shadows.
    for (let x = -1.43; x < 1.51; x += .12) {
        box(g, MAT.walnut, x, .58, .475, .018, .91, .015);
        if (Math.round((x + 1.43) * 100) % 3 === 0)
            box(g, MAT.brass, x, .58, .483, .003, .83, .006);
    }
    box(g, stone, 0, 1.135, 0, 3.16, .11, 1.08);
    box(g, MAT.brass, 0, 1.195, .50, 3.13, .012, .026);
    // Espresso system on a stone counter is the primary metal reflection target.
    const machine = new THREE.Group();
    machine.position.set(.33, 1.19, -.16);
    machine.rotation.y = -.14;
    g.add(machine);
    espressoMachine(machine);
    // Industrial grinder to the right, with translucent bean hopper.
    cylinder(g, MAT.charcoal, 1.03, 1.31, -.13, .14, .16, .23, 30);
    box(g, MAT.chrome, 1.03, 1.49, -.13, .24, .18, .23);
    cylinder(g, MAT.glass, 1.03, 1.69, -.13, .115, .083, .24, 28);
    cylinder(g, MAT.brass, 1.03, 1.825, -.13, .112, .112, .016, 28);
    sphere(g, std('#654535', .83), 1.03, 1.66, -.13, .085, .045, .085);
    // Cup stack and handmade brown bottle.
    for (let i = 0; i < 3; i++)
        cylinder(g, MAT.white, -1.07, 1.22 + i * .078, .07, .072, .078, .08, 30);
    cylinder(g, physical('#4e604f', .24, 0, { clearcoat: .8 }), -1.20, 1.37, -.30, .075, .08, .27, 24);
    cylinder(g, MAT.brass, -1.20, 1.53, -.30, .028, .028, .08, 20);
    // Warm pendant under-counter illumination with small non-shadow-casting lights.
    const p = new THREE.PointLight('#ffbd79', 3.5, 3.1, 2);
    p.position.set(0, .78, .74);
    g.add(p);
}
function leaf(g, mat, x, y, z, r = .12, angle = 0) {
    const vertices = new Float32Array([0, 0, 0, -.54 * r, .10 * r, 0, -.17 * r, r * 2, 0, .54 * r, .10 * r, 0, .17 * r, r * 2, 0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3, 3, 2, 4]);
    geo.computeVertexNormals();
    const l = mesh(g, geo, mat, x, y, z);
    l.rotation.y = angle;
    l.rotation.x = -.37;
    l.castShadow = true;
    return l;
}
function plant(g) {
    const terracotta = std(PALETTE.terracotta, .89);
    cylinder(g, terracotta, 0, .24, 0, .23, .17, .44, 20);
    cylinder(g, terracotta, 0, .47, 0, .26, .26, .043, 20);
    cylinder(g, std('#45392f', .97), 0, .50, 0, .22, .22, .01, 20);
    const greens = [std('#3d6c51', .73, 0, { side: THREE.DoubleSide }), std('#618063', .79, 0, { side: THREE.DoubleSide }), std('#345b47', .68, 0, { side: THREE.DoubleSide })];
    for (let i = 0; i < 22; i++) {
        const a = i * 2.399, y = .80 + (i % 7) * .11, dist = .20 + .13 * (i % 3);
        const tip = [Math.cos(a) * dist * 1.3, y, Math.sin(a) * dist * 1.3];
        arc(g, MAT.green, [[0, .50, 0], [tip[0] * .57, y - .11, tip[2] * .57], tip], .012);
        const l = leaf(g, greens[i % 3], ...tip, .16 + (i % 4) * .02, a);
        l.rotation.z = Math.cos(a) * .28;
    }
}
function pendant(g) {
    rod(g, MAT.black, [0, 3.78, 0], [0, 2.89, 0], .012);
    const shade = MAT.darkBrass;
    const profile = [[0, 2.94], [.065, 2.94], [.13, 2.9], [.32, 2.75], [.43, 2.65], [.405, 2.64], [.24, 2.73], [.065, 2.88]];
    mesh(g, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 44), shade);
    torus(g, MAT.brass, 0, 2.64, 0, .403, .007);
    sphere(g, new THREE.MeshBasicMaterial({ color: '#ffe1a8' }), 0, 2.665, 0, .17, .063, .17);
    const lamp = new THREE.PointLight(0xffd0a0, 7, 3.6, 2);
    lamp.position.set(0, 2.56, 0);
    g.add(lamp);
}
function shelf(g) {
    const walnut = patterned('walnut.jpg', 2, 1, .55);
    for (const y of [1.57, 2.16, 2.75]) {
        box(g, walnut, 0, y, 0, 2.83, .067, .40);
        for (let i = 0; i < 6; i++) {
            const x = -1.15 + i * .46;
            if (y === 1.57) {
                cylinder(g, MAT.white, x, y + .14, 0, .075, .085, .24, 28);
                torus(g, MAT.brass, x, y + .266, 0, .077, .003);
            }
            else if (y === 2.16) {
                box(g, std(i % 2 ? '#ba8c69' : '#e0c49d', .93), x, y + .16, -.016, .21, .29, .14);
                box(g, MAT.ivory, x, y + .16, .064, .115, .12, .003);
            }
            else {
                const vase = std(i % 2 ? '#6e8472' : '#a8735a', .42);
                cylinder(g, vase, x, y + .14, .02, .067, .09, .23, 26);
                if (i % 3 === 0)
                    sphere(g, MAT.green, x, y + .35, .02, .13, .19, .10);
            }
        }
    }
    for (const x of [-1.38, 1.38])
        box(g, MAT.black, x, 2.13, 0, .038, 1.53, .35);
}
function display(g) {
    const board = patterned('warm_oak.jpg', 1, 1, .57);
    box(g, board, 0, .06, 0, .84, .10, .54);
    // Bakery case: clear panels, fine frame, and distinct croissant silhouettes.
    box(g, MAT.glass, 0, .38, -.235, .82, .54, .015, false);
    box(g, MAT.glass, -.40, .38, 0, .01, .54, .46, false);
    box(g, MAT.glass, .40, .38, 0, .01, .54, .46, false);
    box(g, MAT.glass, 0, .65, 0, .82, .015, .47, false);
    for (const x of [-.4, .4])
        for (const z of [-.23, .23])
            rod(g, MAT.brass, [x, .11, z], [x, .64, z], .009);
    for (let i = 0; i < 3; i++) {
        const x = -.245 + i * .24;
        const pastry = std(i === 1 ? '#a36c3e' : '#c28c4e', .65);
        sphere(g, pastry, x, .18, 0, .115, .073, .1);
        for (let j = 0; j < 4; j++) {
            const cut = box(g, std('#dfae6f', .81), x - .07 + j * .045, .245, .005, .012, .009, .12);
            cut.rotation.z = -.22;
        }
    }
}
function wallArt(g) {
    // Gallery picture with bevelled frame, real matboard and warm abstract painting.
    box(g, MAT.walnut, 0, 2.33, 0, 1.13, .98, .074);
    box(g, MAT.brass, 0, 2.33, .045, 1.01, .86, .023);
    box(g, MAT.ivory, 0, 2.33, .06, .94, .81, .025);
    sphere(g, std('#b77050'), -.16, 2.31, .077, .26, .20, .007);
    sphere(g, std('#6f8b77'), .13, 2.12, .08, .22, .20, .007);
    sphere(g, std('#c8ae79'), .21, 2.51, .086, .14, .13, .008);
}
function avatar(g, asset, spec) {
    // Cinematic set dressing with anatomically coherent, minimally stylised
    // mannequins. True photorealistic humans require licensed rigged GLB assets.
    const isLeo = asset.id === 'asset_leo';
    const skin = physical(spec?.palette?.skin || '#bc826b', .81), top = patterned('woven_linen.jpg', 1, 1, .91);
    top.color.set(spec?.palette?.clothes || '#a66c4e');
    const hair = std(spec?.palette?.accent || '#332b32', .88), trousers = std(isLeo ? '#3d4644' : '#50423a', .86), shoes = std('#362d28', .55);
    const height = isLeo ? 1.78 : 1.68;
    // Scoped to actual human scale; the natural seated pose gives cleaner framing.
    const hipY = isLeo ? .98 : .65;
    sphere(g, trousers, 0, hipY, 0, .235, .19, .18);
    const torso = sphere(g, top, 0, hipY + .37, 0, .265, .37, .175);
    torso.rotation.x = .07;
    cylinder(g, skin, 0, hipY + .70, 0, .073, .078, .14);
    sphere(g, skin, 0, hipY + .94, 0, .158, .207, .153, 32);
    sphere(g, hair, 0, hipY + 1.070, -.026, .164, .11, .156, 28);
    // Jawline, facial contours and small nose avoid featureless sphere faces.
    sphere(g, skin, 0, hipY + .873, .151, .048, .066, .046);
    for (const side of [-1, 1]) {
        sphere(g, skin, side * .163, hipY + .93, .01, .028, .063, .039);
        sphere(g, hair, side * .071, hipY + .97, .145, .022, .011, .006);
        sphere(g, skin, side * .073, hipY + .959, .152, .009, .009, .006);
        rod(g, top, [side * .23, hipY + .59, 0], [side * .32, hipY + .25, .1], .082);
        sphere(g, skin, side * .33, hipY + .21, .11, .065, .083, .067);
    }
    if (isLeo) {
        // apron on standing barista
        box(g, MAT.charcoal, 0, hipY + .32, .193, .35, .47, .018);
        for (const s of [-1, 1])
            rod(g, MAT.brass, [s * .12, hipY + .57, .19], [s * .15, hipY + .31, .20], .008);
        for (const s of [-1, 1]) {
            rod(g, trousers, [s * .12, .89, 0], [s * .12, .12, .06], .105);
            box(g, shoes, s * .12, .075, .14, .21, .14, .32);
        }
    }
    else {
        // pleated dress or trousers naturally bend at knees in a seated pose.
        for (const s of [-1, 1]) {
            rod(g, trousers, [s * .13, .66, .02], [s * .13, .43, .34], .10);
            rod(g, trousers, [s * .13, .43, .34], [s * .13, .14, .39], .085);
            box(g, shoes, s * .13, .075, .48, .17, .13, .31);
        }
        for (const s of [-1, 1])
            sphere(g, hair, s * .12, hipY + .87, -.09, .075, .19, .12);
    }
    // Height encoded on CharacterSpec; geometry is intentionally authored in meters.
    g.userData.authoredHeight = height;
}
export function createPrefab(asset, spec) {
    const g = new THREE.Group();
    g.name = asset.label;
    g.userData.assetId = asset.id;
    const source = asset.source;
    if (source.kind === 'gltf')
        throw new Error('GLTF assets require the later async GLTFLoader integration; this café demo uses locally authored procedural set dressing.');
    if (source.kind === 'primitive') {
        const dims = asset.dimensions_m || [1, 1, 1];
        const geos = { box: () => new THREE.BoxGeometry(...dims), sphere: () => new THREE.SphereGeometry(.5, 28, 18), cylinder: () => new THREE.CylinderGeometry(.5, .5, 1, 28), plane: () => new THREE.PlaneGeometry(1, 1) };
        mesh(g, geos[source.shape](), std(asset.material?.color || '#bbb', asset.material?.roughness ?? .6, asset.material?.metalness ?? 0));
        return g;
    }
    const lookup = { avatar: () => avatar(g, asset, spec), 'cafe-table': () => table(g), 'cafe-chair': () => chair(g), 'ceramic-mug': () => mug(g), counter: () => counter(g), plant: () => plant(g), floor: () => floor(g), architecture: () => architecture(g), pendant: () => pendant(g), 'pastry-display': () => display(g), shelf: () => shelf(g), 'wall-art': () => wallArt(g), 'cup-saucer': () => saucer(g) };
    if (!lookup[source.generator])
        throw new Error(`Unknown procedural generator ${source.generator}`);
    lookup[source.generator]();
    return g;
}
export function addSceneFromProject(scene, project, sceneId) {
    const layout = project.scene_layouts.find(item => item.scene_id === sceneId);
    if (!layout)
        throw new Error(`Scene layout not found: ${sceneId}`);
    const assets = new Map(project.asset_manifest.assets.map(a => [a.id, a]));
    const specs = new Map(project.character_specs.map(c => [c.id, c]));
    const groups = new Map();
    layout.instances.filter(instance => instance.visible !== false).forEach(instance => {
        const asset = assets.get(instance.asset_id);
        if (!asset)
            throw new Error(`Missing asset ${instance.asset_id}`);
        const obj = createPrefab(asset, specs.get(instance.entity_id));
        obj.name = instance.id;
        obj.position.fromArray(instance.transform.position);
        obj.rotation.set(...instance.transform.rotation_deg.map(THREE.MathUtils.degToRad), 'XYZ');
        obj.scale.fromArray(instance.transform.scale);
        obj.traverse(child => {
            if (child.isMesh) {
                child.castShadow = asset.id !== 'asset_floor' && child.castShadow;
                child.receiveShadow = child.receiveShadow !== false;
            }
        });
        groups.set(instance.id, obj);
        scene.add(obj);
    });
    return { layout, groups };
}
