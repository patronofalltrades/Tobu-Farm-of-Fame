/**
 * Seed Firestore with demo Tobu entries.
 * Requires GOOGLE_APPLICATION_CREDENTIALS or firebase login.
 * Usage: npm run seed
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../data/seed-demo.json');

interface SeedEntry {
  winner_name: string;
  story: string;
  date: string;
  term: 1 | 2 | 3;
  submitted_by: string;
}

const entries = JSON.parse(readFileSync(dataPath, 'utf8')) as SeedEntry[];

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

async function main() {
  const col = db.collection('tobus');
  for (const entry of entries) {
    await col.add({
      ...entry,
      bull_pattern_seed: entry.winner_name,
      reactions: {},
      status: 'approved',
      created_at: Timestamp.now(),
    });
    console.log(`Seeded: ${entry.winner_name} — ${entry.date}`);
  }
  console.log(`Done. ${entries.length} entries added.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
