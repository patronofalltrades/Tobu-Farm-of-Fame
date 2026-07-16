/**
 * Generates the low-poly GLB art assets for the farm.
 * Mesh convention (tasks/tech-farm-visual-rehaul.md §3):
 *  - origin at ground level between the feet, +Y up, +Z forward
 *  - bull feet rest at y = 0 exactly
 *  - bull COLOR_0.r encodes leg weight (1 = leg, 0 = rigid body) for the walk shader
 *  - landmarks carry palette materials; the bull stays neutral white so
 *    per-instance coat colors apply at runtime via instanceColor
 * No NORMAL attribute is exported on purpose: three's GLTFLoader flat-shades
 * primitives without normals, which is exactly the toy look we want.
 * Run: node scripts/generate-models.mjs
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/models');
fs.mkdirSync(outDir, { recursive: true });

const io = new NodeIO();

// Barcelona / Senyera palette + supporting naturals
const PALETTE = {
  red: 0xd50032,
  yellow: 0xffcd00,
  blue: 0x004d98,
  white: 0xffffff,
  cream: 0xf5e9d0,
  wood: 0x8b5a2b,
  darkWood: 0x6b4423,
  plush: 0xa9746e,
  dark: 0x3a2e2a,
  // Mama Tobu's coat: near-black, not pure 0x000000 — flat shading needs a
  // little reflectance headroom or the silhouette reads as a hole.
  blackCoat: 0x26211e,
  // Natural scenery tones (greens/browns/grays — NOT the senyera palette)
  trunk: 0x7a5230,
  leaf: 0x4f8f3a,
  leafDark: 0x3d7330,
  bushGreen: 0x5c9a3f,
  bushDark: 0x477c31,
  rockGray: 0x9198a0,
  rockDark: 0x6f767e,
  // Farmstead tones (prd-proper-farm): straw for hay, stone/metal silo,
  // stylized flat water for the trough (and the pond decal reuses the hex).
  straw: 0xd9a94f,
  strawDark: 0xb9873a,
  siloCream: 0xe8e0cf,
  water: 0x4fa3d1,
};

/**
 * Box/prism builder grouping geometry per material so landmarks can carry
 * their palette in the GLB. Vertex colors ride along for the bull's leg
 * weights (COLOR_0.r).
 */
class MeshBuilder {
  /**
   * @param vertexColors export COLOR_0 (only the bull wants it — it encodes
   * leg weights consumed by mergeGltfMeshes, which strips it before render.
   * On directly-rendered landmarks COLOR_0 would multiply materials to black.)
   */
  constructor(vertexColors = false) {
    this.vertexColors = vertexColors;
    this.groups = new Map(); // materialKey -> {positions, colors, indices}
  }

  group(key) {
    if (!this.groups.has(key)) {
      this.groups.set(key, { positions: [], colors: [], indices: [] });
    }
    return this.groups.get(key);
  }

  box(mat, sx, sy, sz, tx, ty, tz, { color = [0, 0, 0], ry = 0 } = {}) {
    const g = this.group(mat);
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const cos = Math.cos(ry), sin = Math.sin(ry);
    const base = g.positions.length / 3;
    const corners = [
      [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
      [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz],
    ];
    for (const [x, y, z] of corners) {
      const rx = x * cos + z * sin;
      const rz = -x * sin + z * cos;
      g.positions.push(rx + tx, y + ty, rz + tz);
      g.colors.push(...color);
    }
    const faces = [
      0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 7, 3, 0, 4, 7,
      1, 2, 6, 1, 6, 5, 3, 6, 2, 3, 7, 6, 0, 1, 5, 0, 5, 4,
    ];
    for (const f of faces) g.indices.push(base + f);
  }

  /**
   * Low-poly cylinder with its axle along X (wheels). Two vertex rings in
   * the YZ plane + end-cap fans; materials are double-sided so winding is
   * forgiving, same as every other primitive here.
   */
  cylinder(mat, radius, width, segments, tx, ty, tz, { color = [0, 0, 0] } = {}) {
    const g = this.group(mat);
    const base = g.positions.length / 3;
    const hw = width / 2;
    for (const x of [-hw, hw]) {
      for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        g.positions.push(x + tx, Math.cos(a) * radius + ty, Math.sin(a) * radius + tz);
        g.colors.push(...color);
      }
    }
    const cL = base + segments * 2;
    g.positions.push(-hw + tx, ty, tz);
    g.colors.push(...color);
    const cR = cL + 1;
    g.positions.push(hw + tx, ty, tz);
    g.colors.push(...color);
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const l0 = base + i, l1 = base + j;
      const r0 = base + segments + i, r1 = base + segments + j;
      g.indices.push(l0, l1, r0, l1, r1, r0); // side wall
      g.indices.push(cL, l1, l0);             // left cap
      g.indices.push(cR, r0, r1);             // right cap
    }
  }

  /**
   * Vertical low-poly cylinder (silo, well ring) — two rings in the XZ
   * plane + top/bottom cap fans. Same double-sided, flat-shaded treatment
   * as the X-axis wheel cylinder above.
   */
  cylinderY(mat, radius, height, segments, tx, ty, tz, { color = [0, 0, 0] } = {}) {
    const g = this.group(mat);
    const base = g.positions.length / 3;
    const hh = height / 2;
    for (const y of [-hh, hh]) {
      for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        g.positions.push(Math.cos(a) * radius + tx, y + ty, Math.sin(a) * radius + tz);
        g.colors.push(...color);
      }
    }
    const cB = base + segments * 2;
    g.positions.push(tx, -hh + ty, tz);
    g.colors.push(...color);
    const cT = cB + 1;
    g.positions.push(tx, hh + ty, tz);
    g.colors.push(...color);
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      const b0 = base + i, b1 = base + j;
      const t0 = base + segments + i, t1 = base + segments + j;
      g.indices.push(b0, b1, t0, b1, t1, t0); // side wall
      g.indices.push(cB, b1, b0);             // bottom cap
      g.indices.push(cT, t0, t1);             // top cap
    }
  }

  /** Triangular prism, ridge along X (rooftops). */
  prism(mat, sx, sy, sz, tx, ty, tz, { color = [0, 0, 0] } = {}) {
    const g = this.group(mat);
    const hx = sx / 2, hz = sz / 2;
    const base = g.positions.length / 3;
    const verts = [
      [-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz],
      [-hx, sy, 0], [hx, sy, 0],
    ];
    for (const [x, y, z] of verts) {
      g.positions.push(x + tx, y + ty, z + tz);
      g.colors.push(...color);
    }
    const faces = [
      0, 1, 5, 0, 5, 4, 3, 5, 2, 3, 4, 5, 0, 4, 3, 1, 2, 5, 0, 3, 2, 0, 2, 1,
    ];
    for (const f of faces) g.indices.push(base + f);
  }

  build(doc, buffer, name) {
    const scene = doc.createScene(name);
    const mesh = doc.createMesh();
    for (const [matKey, g] of this.groups) {
      const material = doc.createMaterial(matKey)
        .setBaseColorFactor(hexToLinearRgba(PALETTE[matKey] ?? PALETTE.white))
        .setRoughnessFactor(1)
        .setMetallicFactor(0)
        // Double-sided: the prism's gable end-caps are wound inward and got
        // backface-culled, making roofs read as hollow. Cheap fix for tiny
        // flat-shaded meshes; no visual downside at this poly count.
        .setDoubleSided(true);
      const posAcc = doc.createAccessor().setType('VEC3')
        .setArray(new Float32Array(g.positions)).setBuffer(buffer);
      const idxAcc = doc.createAccessor().setType('SCALAR')
        .setArray(new Uint16Array(g.indices)).setBuffer(buffer);
      const prim = doc.createPrimitive()
        .setAttribute('POSITION', posAcc)
        .setIndices(idxAcc)
        .setMaterial(material);
      if (this.vertexColors) {
        const colAcc = doc.createAccessor().setType('VEC3')
          .setArray(new Float32Array(g.colors)).setBuffer(buffer);
        prim.setAttribute('COLOR_0', colAcc);
      }
      mesh.addPrimitive(prim);
    }
    scene.addChild(doc.createNode().setMesh(mesh));
  }
}

async function write(name, builder) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  builder.build(doc, buffer, name);
  const file = path.join(outDir, `${name}.glb`);
  await io.write(file, doc);
  console.log(`Wrote ${file} (${fs.statSync(file).size} bytes)`);
}

/** GLTF baseColorFactor is linear; convert sRGB hex. */
function hexToLinearRgba(hex) {
  const srgbToLinear = (c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return [
    srgbToLinear(((hex >> 16) & 0xff) / 255),
    srgbToLinear(((hex >> 8) & 0xff) / 255),
    srgbToLinear((hex & 0xff) / 255),
    1,
  ];
}

const LEG = { color: [1, 0, 0] };  // COLOR_0.r = 1 → walk shader swings these

/** The Tobu bull. Feet at y=0, faces +Z. Neutral white for instanceColor. */
function bull() {
  const b = new MeshBuilder(true);
  b.box('white', 0.82, 0.62, 1.35, 0, 0.78, -0.02);            // torso
  b.box('white', 0.7, 0.5, 0.5, 0, 0.85, 0.55);                // shoulder hump
  b.box('white', 0.5, 0.48, 0.42, 0, 1.02, 0.82);              // head
  b.box('white', 0.36, 0.26, 0.22, 0, 0.9, 1.05);              // snout
  b.box('white', 0.3, 0.09, 0.09, -0.26, 1.24, 0.82, { ry: 0.25 });  // horns
  b.box('white', 0.3, 0.09, 0.09, 0.26, 1.24, 0.82, { ry: -0.25 });
  b.box('white', 0.16, 0.07, 0.12, -0.34, 1.08, 0.78);         // ears
  b.box('white', 0.16, 0.07, 0.12, 0.34, 1.08, 0.78);
  b.box('white', 0.1, 0.3, 0.1, 0, 0.82, -0.72);               // tail
  for (const [x, z] of [[-0.28, 0.42], [0.28, 0.42], [-0.28, -0.42], [0.28, -0.42]]) {
    b.box('white', 0.2, 0.47, 0.2, x, 0.235, z, LEG);           // legs
    b.box('white', 0.24, 0.1, 0.24, x, 0.05, z, LEG);           // hooves
  }
  return b;
}

/** Classic brown barn: wood-brown body, solid dark-brown roof, white trim.
 *  Detail pass (prd-farm-polish-v2 P0-2): eave overhang, siding plank
 *  lines, gable-end window, chimney. Same flat-shaded toy conventions. */
function barn() {
  const b = new MeshBuilder();
  b.box('wood', 4.2, 2.4, 3.4, 0, 1.2, 0);            // classic brown body
  b.prism('darkWood', 4.7, 1.5, 4.1, 0, 2.4, 0);      // solid dark roof, eave overhang
  b.box('white', 1.2, 1.5, 0.15, 0, 0.75, 1.72);      // door
  b.box('yellow', 0.7, 0.7, 0.12, 0, 2.75, 1.78);     // hayloft window
  b.box('white', 0.16, 0.9, 0.16, -1.6, 0.45, 1.74);  // door posts
  b.box('white', 0.16, 0.9, 0.16, 1.6, 0.45, 1.74);
  b.box('white', 4.3, 0.18, 3.5, 0, 2.34, 0);         // eave trim band
  for (const y of [0.55, 1.0, 1.45, 1.9]) {           // siding plank lines
    b.box('dark', 4.26, 0.05, 3.46, 0, y, 0);
  }
  b.box('white', 0.08, 0.62, 0.62, 2.13, 1.5, -0.4);  // gable window frame
  b.box('yellow', 0.08, 0.5, 0.5, 2.17, 1.5, -0.4);   // gable window pane
  b.box('rockGray', 0.35, 0.9, 0.35, 1.2, 3.35, 0.6); // stone chimney (pokes through roof)
  b.box('dark', 0.45, 0.1, 0.45, 1.2, 3.85, 0.6);     // chimney cap
  return b;
}

/** Wooden signpost with yellow boards. */
function signpost() {
  const b = new MeshBuilder();
  b.box('wood', 0.22, 2.2, 0.22, 0, 1.1, 0);
  b.box('yellow', 1.7, 0.55, 0.14, 0.15, 1.9, 0.05, { ry: 0.12 });
  b.box('yellow', 1.3, 0.45, 0.14, -0.12, 1.25, 0.03, { ry: -0.18 });
  b.box('darkWood', 0.5, 0.12, 0.5, 0, 0.06, 0);
  return b;
}

/** Mama Tobu: black bull mascot with a red Senyera scarf
 *  (prd-farm-navigation-behavior-fixes US-007). Cream horns/snout, white
 *  eyes, and the scarf stay as accents so she still reads as THE mascot
 *  rather than one more black-coated herd bull. */
function mascot() {
  const b = new MeshBuilder();
  b.box('blackCoat', 1.5, 1.1, 1.9, 0, 0.85, -0.05);    // fat torso
  b.box('blackCoat', 1.0, 0.9, 0.8, 0, 1.5, 0.85, {});  // big head
  b.box('cream', 0.7, 0.45, 0.3, 0, 1.25, 1.28);        // snout
  b.box('cream', 0.55, 0.16, 0.16, -0.55, 1.95, 0.85, { ry: 0.3 });  // horns
  b.box('cream', 0.55, 0.16, 0.16, 0.55, 1.95, 0.85, { ry: -0.3 });
  b.box('blackCoat', 0.24, 0.12, 0.2, -0.62, 1.66, 0.8); // ears
  b.box('blackCoat', 0.24, 0.12, 0.2, 0.62, 1.66, 0.8);
  b.box('red', 1.06, 0.28, 0.86, 0, 1.12, 0.85);        // scarf
  for (const [x, z] of [[-0.5, 0.75], [0.5, 0.75]]) {
    b.box('blackCoat', 0.34, 0.4, 0.5, x, 0.2, z);      // front paws
  }
  for (const [x, z] of [[-0.55, -0.6], [0.55, -0.6]]) {
    b.box('blackCoat', 0.36, 0.5, 0.4, x, 0.25, z);     // haunches
  }
  b.box('blackCoat', 0.14, 0.5, 0.14, 0, 0.9, -1.05);   // tail
  b.box('white', 0.12, 0.12, 0.06, -0.22, 1.62, 1.26);  // eyes (white on black)
  b.box('white', 0.12, 0.12, 0.06, 0.22, 1.62, 1.26);
  return b;
}

/** Chunky low-poly deciduous tree: brown trunk + diamond canopy blocks. */
function tree() {
  const b = new MeshBuilder();
  b.box('trunk', 0.42, 1.7, 0.42, 0, 0.85, 0);
  b.box('leaf', 1.9, 1.5, 1.9, 0, 2.15, 0, { ry: 0.6 });
  b.box('leafDark', 1.35, 1.15, 1.35, 0.1, 3.0, -0.05, { ry: -0.4 });
  b.box('leaf', 0.9, 0.8, 0.9, -0.15, 3.6, 0.1, { ry: 0.25 });
  return b;
}

/** Low round bush: two clustered green blocks. */
function bush() {
  const b = new MeshBuilder();
  b.box('bushGreen', 1.25, 0.95, 1.2, 0, 0.47, 0, { ry: 0.5 });
  b.box('bushDark', 0.85, 0.72, 0.85, 0.42, 0.86, 0.18, { ry: -0.3 });
  b.box('bushGreen', 0.7, 0.6, 0.7, -0.4, 0.75, -0.2, { ry: 0.8 });
  return b;
}

/** Angular boulder cluster in cool grays. */
function rock() {
  const b = new MeshBuilder();
  b.box('rockGray', 1.05, 0.62, 0.95, 0, 0.31, 0, { ry: 0.4 });
  b.box('rockDark', 0.62, 0.5, 0.6, 0.34, 0.55, -0.22, { ry: -0.5 });
  b.box('rockGray', 0.5, 0.34, 0.5, -0.34, 0.4, 0.24, { ry: 0.9 });
  return b;
}

/** Classic red tractor, parked. Origin at ground, faces +Z (hood forward). */
/** Tractor body only — round wheels are a separate GLB (wheel.glb) cloned
 *  at two scales by Farm.tsx (prd-tractor-behavior-and-mascot-scale US-002). */
function tractor() {
  const b = new MeshBuilder();
  b.box('red', 0.9, 0.55, 1.5, 0, 0.85, 0.35);          // hood
  b.box('red', 1.0, 0.75, 0.9, 0, 0.95, -0.75);         // cab base
  b.box('dark', 0.55, 0.5, 0.12, 0, 1.55, -1.12);       // seat back
  b.box('dark', 0.55, 0.12, 0.5, 0, 1.35, -0.9);        // seat
  b.box('dark', 0.08, 0.35, 0.08, 0, 1.35, -0.35);      // steering column
  b.box('dark', 0.3, 0.06, 0.3, 0, 1.55, -0.3);         // steering wheel
  b.box('dark', 0.1, 0.6, 0.1, 0.28, 1.4, 0.75);        // exhaust stack
  b.box('yellow', 0.94, 0.1, 1.54, 0, 1.16, 0.35);      // hood trim stripe
  b.box('yellow', 0.5, 0.28, 0.1, 0, 0.72, 1.12);       // front grille
  b.box('dark', 1.0, 0.16, 0.5, 0, 0.44, -0.75);        // rear axle housing
  b.box('dark', 0.8, 0.12, 0.3, 0, 0.3, 0.75);          // front axle
  return b;
}

/** One round wheel, axle along X, origin at hub center. Dark tire + yellow
 *  hub; 10 segments reads as round at farm camera distance while staying
 *  unmistakably low-poly. Cloned at two scales for rear/front wheels. */
function wheel() {
  const b = new MeshBuilder();
  b.cylinder('dark', 0.5, 0.28, 10, 0, 0, 0);     // tire
  b.cylinder('yellow', 0.2, 0.34, 10, 0, 0, 0);   // hub (slightly proud)
  return b;
}

/** One fence segment: two posts + two rails, 7 units wide along X. */
function fence() {
  const b = new MeshBuilder();
  b.box('wood', 0.22, 1.0, 0.22, -3.5, 0.5, 0);
  b.box('wood', 0.22, 1.0, 0.22, 3.5, 0.5, 0);
  b.box('yellow', 7, 0.12, 0.08, 0, 0.78, 0);
  b.box('yellow', 7, 0.12, 0.08, 0, 0.42, 0);
  return b;
}

// --- Farmstead props (prd-proper-farm US-001) ---

/** Grain silo: tall body, rim band, shallow cream dome cap. */
function silo() {
  const b = new MeshBuilder();
  b.cylinderY('rockGray', 1.05, 3.2, 12, 0, 1.6, 0);      // body
  b.cylinderY('rockDark', 1.12, 0.22, 12, 0, 3.05, 0);    // rim band
  b.cylinderY('siloCream', 0.82, 0.5, 12, 0, 3.45, 0);    // dome step
  b.cylinderY('siloCream', 0.4, 0.35, 10, 0, 3.8, 0);     // cap knob
  b.box('darkWood', 0.5, 0.9, 0.12, 0, 0.45, 1.05);       // little hatch
  return b;
}

/** Round hay bale lying on its side (axle already along X). */
function hay() {
  const b = new MeshBuilder();
  b.cylinder('straw', 0.55, 0.95, 12, 0, 0.55, 0);        // bale
  b.cylinder('strawDark', 0.56, 0.18, 12, 0, 0.55, 0);    // binding band
  return b;
}

/** Water trough: wood shell, water surface just below the rim. */
function trough() {
  const b = new MeshBuilder();
  b.box('darkWood', 2.0, 0.55, 1.0, 0, 0.275, 0);         // outer shell
  b.box('water', 1.76, 0.1, 0.76, 0, 0.52, 0);            // water face
  b.box('wood', 0.16, 0.62, 1.0, -0.94, 0.31, 0);         // end caps proud
  b.box('wood', 0.16, 0.62, 1.0, 0.94, 0.31, 0);
  return b;
}

/** Stone well: ring, two posts, gable roof, crossbar. */
function well() {
  const b = new MeshBuilder();
  b.cylinderY('rockGray', 0.72, 0.85, 10, 0, 0.425, 0);   // stone ring
  b.cylinderY('dark', 0.55, 0.06, 10, 0, 0.88, 0);        // dark mouth
  b.box('wood', 0.14, 1.1, 0.14, -0.6, 1.1, 0);           // posts
  b.box('wood', 0.14, 1.1, 0.14, 0.6, 1.1, 0);
  b.box('darkWood', 1.3, 0.09, 0.09, 0, 1.35, 0);         // crossbar
  b.prism('red', 1.8, 0.55, 1.5, 0, 1.85, 0);             // little senyera roof
  return b;
}

console.log('Generating models…');
await write('bull', bull());
await write('barn', barn());
await write('signpost', signpost());
await write('mascot', mascot());
await write('fence', fence());
await write('tree', tree());
await write('bush', bush());
await write('rock', rock());
await write('tractor', tractor());
await write('wheel', wheel());
await write('silo', silo());
await write('hay', hay());
await write('trough', trough());
await write('well', well());
console.log('Done.');
