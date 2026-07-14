/**
 * Seed Firestore with real Tobu winners from the IESE MBA 2027 Barcelona section.
 * Uses the Firebase client SDK + .env credentials — no service account needed.
 * Usage: npm run seed:real            (data/seed-real.json — Term 1)
 *        npm run seed:term23          (data/seed-term-2-3.json — Terms 2–3)
 *        tsx scripts/seed-real.ts <file.json>
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc } from 'firebase/firestore';
// Load .env manually (no dotenv dependency needed)
import { readFileSync as _readEnv } from 'node:fs';
try {
  const env = _readEnv(join(dirname(fileURLToPath(import.meta.url)), '../.env'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch { /* .env not found, assume vars are already set */ }

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataFile = process.argv[2] ?? 'seed-real.json';
const dataPath = join(__dirname, '../data', dataFile);

interface SeedEntry {
  winner_name: string;
  story: string;
  commentary?: string;
  date: string;
  term: 1 | 2 | 3;
  submitted_by: string;
}

const entries = JSON.parse(readFileSync(dataPath, 'utf8')) as SeedEntry[];

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

async function main() {
  const col = collection(db, 'tobus');
  for (const entry of entries) {
    // Rules require status:'pending' on create, then allow pending→approved update.
    const ref = await addDoc(col, {
      ...entry,
      bull_pattern_seed: entry.winner_name,
      reactions: {},
      status: 'pending',
      created_at: Date.now(),
    });
    await updateDoc(ref, { status: 'approved' });
    console.log(`Seeded: ${entry.winner_name} — ${entry.date}`);
  }
  console.log(`\nDone. ${entries.length} entries added.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
