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
        .setMetallicFactor(0);
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

/** Red barn, blue gambrel roof, white trim — full Barcelona palette. */
function barn() {
  const b = new MeshBuilder();
  b.box('red', 4.2, 2.4, 3.4, 0, 1.2, 0);
  b.prism('blue', 4.4, 1.5, 3.8, 0, 2.4, 0);
  b.box('white', 1.2, 1.5, 0.15, 0, 0.75, 1.72);      // door
  b.box('yellow', 0.7, 0.7, 0.12, 0, 2.75, 1.78);     // hayloft window
  b.box('white', 0.16, 0.9, 0.16, -1.6, 0.45, 1.74);  // door posts
  b.box('white', 0.16, 0.9, 0.16, 1.6, 0.45, 1.74);
  b.box('white', 4.3, 0.18, 3.5, 0, 2.34, 0);         // eave trim band
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

/** Mascot: the big plushie Tobu with a red Senyera scarf. */
function mascot() {
  const b = new MeshBuilder();
  b.box('plush', 1.5, 1.1, 1.9, 0, 0.85, -0.05);        // fat torso
  b.box('plush', 1.0, 0.9, 0.8, 0, 1.5, 0.85, {});      // big head
  b.box('cream', 0.7, 0.45, 0.3, 0, 1.25, 1.28);        // snout
  b.box('cream', 0.55, 0.16, 0.16, -0.55, 1.95, 0.85, { ry: 0.3 });  // horns
  b.box('cream', 0.55, 0.16, 0.16, 0.55, 1.95, 0.85, { ry: -0.3 });
  b.box('plush', 0.24, 0.12, 0.2, -0.62, 1.66, 0.8);    // ears
  b.box('plush', 0.24, 0.12, 0.2, 0.62, 1.66, 0.8);
  b.box('red', 1.06, 0.28, 0.86, 0, 1.12, 0.85);        // scarf
  for (const [x, z] of [[-0.5, 0.75], [0.5, 0.75]]) {
    b.box('plush', 0.34, 0.4, 0.5, x, 0.2, z);          // front paws
  }
  for (const [x, z] of [[-0.55, -0.6], [0.55, -0.6]]) {
    b.box('plush', 0.36, 0.5, 0.4, x, 0.25, z);         // haunches
  }
  b.box('plush', 0.14, 0.5, 0.14, 0, 0.9, -1.05);       // tail
  b.box('dark', 0.12, 0.12, 0.06, -0.22, 1.62, 1.26);   // eyes
  b.box('dark', 0.12, 0.12, 0.06, 0.22, 1.62, 1.26);
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

console.log('Generating models…');
await write('bull', bull());
await write('barn', barn());
await write('signpost', signpost());
await write('mascot', mascot());
await write('fence', fence());
console.log('Done.');
