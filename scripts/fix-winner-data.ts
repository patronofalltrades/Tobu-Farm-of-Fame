/**
 * One-off curator fix (2026-07-15), matching docs/tobu-winners-full-list.md:
 *   1. Rename "Thomas Reeves" → "Thomas Grainger Reeves" (winner_name +
 *      bull_pattern_seed on both win docs).
 *   2. New commentary on his 2nd win ("start of the Bad Thomas era").
 *   3. New commentary on Lasse Daene's win (word-of-mouth mix-up).
 *
 * Firestore rules only allow reaction/status updates from clients, so this
 * script must run inside a temporary rules window that additionally permits
 * curator-field updates (see the deploy/revert steps in the session log).
 * Usage: npx tsx scripts/fix-winner-data.ts
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

try {
  const env = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../.env'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch { /* .env not found, assume vars are already set */ }

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);
const col = collection(db, 'tobus');

const NEW_NAME = 'Thomas Grainger Reeves';
const THOMAS_2ND_COMMENTARY =
  'Blamed the team instead of himself, again. This is the start of the Bad Thomas era.';
const LASSE_COMMENTARY =
  'Meant word of mouth, said "mouth to mouth communication" — which is the one that involves ' +
  'a sloppy kiss, not a marketing channel. The section rewarded the accidental romance.';

async function main() {
  const thomasSnap = await getDocs(query(col, where('winner_name', '==', 'Thomas Reeves')));
  for (const d of thomasSnap.docs) {
    const date = d.data().date as string;
    const patch: Record<string, string> = {
      winner_name: NEW_NAME,
      bull_pattern_seed: NEW_NAME,
    };
    if (date === '2026-05-15') patch.commentary = THOMAS_2ND_COMMENTARY;
    await updateDoc(d.ref, patch);
    console.log(`Updated Thomas doc ${d.id} (${date})${patch.commentary ? ' + commentary' : ''}`);
  }
  if (thomasSnap.empty) console.log('No "Thomas Reeves" docs found (already renamed?)');

  const lasseSnap = await getDocs(query(col, where('winner_name', '==', 'Lasse Daene')));
  for (const d of lasseSnap.docs) {
    await updateDoc(d.ref, { commentary: LASSE_COMMENTARY });
    console.log(`Updated Lasse doc ${d.id} (${d.data().date as string}) commentary`);
  }
  if (lasseSnap.empty) console.log('No "Lasse Daene" docs found');

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
