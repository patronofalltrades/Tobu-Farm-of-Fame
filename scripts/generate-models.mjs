/**
 * Generates low-poly GLB assets for the farm.
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

/** Unit box centered at origin, scaled and translated. */
function addBox(doc, scene, buffer, sx, sy, sz, tx, ty, tz) {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const positions = new Float32Array([
    -hx + tx, -hy + ty, -hz + tz, hx + tx, -hy + ty, -hz + tz, hx + tx, hy + ty, -hz + tz,
    -hx + tx, hy + ty, -hz + tz, -hx + tx, -hy + ty, hz + tz, hx + tx, -hy + ty, hz + tz,
    hx + tx, hy + ty, hz + tz, -hx + tx, hy + ty, hz + tz,
  ]);
  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 3, 1, 5, 6, 1, 6, 2, 3, 7, 6, 3, 6, 2,
    0, 1, 5, 0, 5, 4,
  ]);
  const posAcc = doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer);
  const idxAcc = doc.createAccessor().setType('SCALAR').setArray(indices).setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute('POSITION', posAcc).setIndices(idxAcc);
  const mesh = doc.createMesh().addPrimitive(prim);
  scene.addChild(doc.createNode().setMesh(mesh));
}

async function write(name, document) {
  const file = path.join(outDir, `${name}.glb`);
  await io.write(file, document);
  console.log(`Wrote ${file} (${fs.statSync(file).size} bytes)`);
}

async function bull() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Bull');
  addBox(doc, scene, buffer, 1, 0.9, 1.4, 0, 0.55, 0);
  addBox(doc, scene, buffer, 0.7, 0.65, 0.75, 0, 1.05, 0.75);
  for (const [x, z] of [[-0.32, 0.45], [0.32, 0.45], [-0.32, -0.45], [0.32, -0.45]]) {
    addBox(doc, scene, buffer, 0.22, 0.45, 0.22, x, 0.22, z);
  }
  await write('bull', doc);
}

async function barn() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Barn');
  addBox(doc, scene, buffer, 4, 2.5, 4, 0, 1.25, 0);
  await write('barn', doc);
}

async function signpost() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Signpost');
  addBox(doc, scene, buffer, 0.2, 2, 0.2, 0, 1, 0);
  addBox(doc, scene, buffer, 1.6, 0.8, 0.12, 0, 1.85, 0);
  await write('signpost', doc);
}

async function mascot() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Mascot');
  addBox(doc, scene, buffer, 1.4, 1.2, 2, 0, 0.75, 0);
  addBox(doc, scene, buffer, 1, 0.95, 1.1, 0, 1.45, 1.05);
  await write('mascot', doc);
}

console.log('Generating models…');
await bull();
await barn();
await signpost();
await mascot();
console.log('Done.');
