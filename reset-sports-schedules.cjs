/**
 * reset-sports-schedules.js
 *
 * Resets the Sports & Teams config and Match Schedules for
 * elementary / highSchool / college back to empty, AND clears all
 * player registrations. Does NOT touch `users` (login accounts) or
 * `staffAllowlist`.
 *
 * Collections touched:
 *   sportsTeamsConfig/elementary  -> { sports: [], teams: [] }
 *   sportsTeamsConfig/highSchool  -> { sports: [], teams: [] }
 *   sportsTeamsConfig/college     -> { sports: [], teams: [] }
 *   matchSchedules/elementary     -> deleted
 *   matchSchedules/highSchool     -> deleted
 *   matchSchedules/college        -> deleted
 *   registrations/*               -> ALL documents deleted
 *
 * Note: this only deletes the Firestore registration documents. Any
 * uploaded photo/waiver files still sitting in Firebase Storage under
 * registrations/{uid}/... are NOT deleted by this script.
 *
 * ─── SETUP (one-time) ────────────────────────────────────────────
 * 1. npm install firebase-admin
 * 2. Get a service account key:
 *      Firebase Console → Project Settings → Service Accounts
 *      → "Generate new private key" → save as serviceAccountKey.json
 *      IN THE SAME FOLDER AS THIS SCRIPT. Do NOT commit it to git.
 *
 * ─── USAGE ───────────────────────────────────────────────────────
 *   node reset-sports-schedules.cjs            # dry run, shows what would happen
 *   node reset-sports-schedules.cjs --yes       # actually performs the reset
 */

const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const DRY_RUN = !process.argv.includes('--yes');
const LEVELS = ['elementary', 'highSchool', 'college'];

const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// Firestore batches max out at 500 writes, so chunk large collections
async function deleteCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const docs = snapshot.docs;
  if (docs.length === 0) return 0;

  const CHUNK_SIZE = 450;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const batch = db.batch();
    docs.slice(i, i + CHUNK_SIZE).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return docs.length;
}

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no data will change (pass --yes to actually reset)\n' : '⚠️  LIVE RUN — this will modify Firestore\n');

  for (const level of LEVELS) {
    // Sports & Teams config -> reset to empty shape (keeps the doc, matches
    // what getSportsTeamsConfig() returns when a level has never been configured)
    const configRef = db.collection('sportsTeamsConfig').doc(level);
    console.log(`sportsTeamsConfig/${level}  ->  { sports: [], teams: [] }`);
    if (!DRY_RUN) {
      await configRef.set({
        sports: [],
        teams: [],
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Match schedules -> delete the whole doc (getMatchSchedules() already
    // treats a missing doc as "no matches", so this is equivalent to empty)
    const scheduleRef = db.collection('matchSchedules').doc(level);
    console.log(`matchSchedules/${level}     ->  deleted`);
    if (!DRY_RUN) {
      await scheduleRef.delete();
    }
  }

  // Player registrations -> delete every document in the collection
  const regSnapshot = await db.collection('registrations').get();
  console.log(`registrations                ->  ${regSnapshot.size} document(s) deleted`);
  if (!DRY_RUN) {
    await deleteCollection('registrations');
  }

  console.log(DRY_RUN
    ? '\nNothing was changed. Re-run with --yes to apply.'
    : '\n✅ Done. Sports/teams, schedules, and registrations are reset; users were left untouched.');
}

main().catch((err) => {
  console.error('❌ Reset failed:', err.message);
  process.exit(1);
});
