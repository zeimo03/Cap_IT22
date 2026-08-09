import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { db } from '../firebase';

/* ─────────────────────────────────────────────
   Generic collection fetcher
───────────────────────────────────────────── */
export async function fetchCollectionData(collectionName, orderByField) {
  if (!db) {
    console.warn(`Firestore not initialized. Cannot fetch ${collectionName}.`);
    return [];
  }
  const collectionRef   = collection(db, collectionName);
  const collectionQuery = orderByField
    ? query(collectionRef, orderBy(orderByField, 'asc'))
    : collectionRef;
  const snapshot = await getDocs(collectionQuery);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

/* ─────────────────────────────────────────────
   User profile helpers
───────────────────────────────────────────── */
export async function createUserProfile(uid, profile) {
  if (!db) {
    console.warn('Firestore not initialized. Cannot create user profile.');
    return;
  }
  const profileDoc = doc(db, 'users', uid);
  await setDoc(profileDoc, {
    ...profile,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid) {
  if (!db) {
    console.warn('Firestore not initialized. Cannot fetch user profile.');
    return null;
  }
  const profileDoc = doc(db, 'users', uid);
  const snapshot   = await getDoc(profileDoc);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

/* ─────────────────────────────────────────────
   Staff allowlist lookup.

   Used by the sign-up form's "Admin / Moderator / Super Admin"
   path: staff don't fill out the full student form, they just
   enter the gmail they were pre-registered with + a password.
   We look that email up in the SAME collections AuthContext uses
   to resolve roles (`admins` / `moderators` / `superadmins`, doc id
   = lowercase email) — this is the one place staff emails are
   managed (Firebase Console → Firestore → admins/moderators/superadmins),
   so sign-up and login always agree on who's authorized.

   Expected doc shape (doc id = lowercase email):
     { email: 'someone@gmail.com' }  — additional fields like name are optional.

   @param {string} email
   @param {string} role  one of 'admin' | 'moderator' | 'superadmin'
   @returns {object|null} the matching doc if the email is cleared for that role, else null
───────────────────────────────────────────── */
const ROLE_TO_COLLECTION = {
  admin: 'admins',
  moderator: 'moderators',
  superadmin: 'superadmins',
};

export async function findStaffAllowlistEntry(email, role) {
  if (!db) {
    console.warn('Firestore not initialized. Cannot verify staff email.');
    return null;
  }
  const collectionName = ROLE_TO_COLLECTION[role];
  if (!collectionName) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const snapshot = await getDoc(doc(db, collectionName, normalizedEmail));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

/* ─────────────────────────────────────────────
   Upload a single file to Firebase Storage.
   Returns the public download URL.
   Returns null silently if no file provided
   (uploads are optional for the student).
───────────────────────────────────────────── */
async function uploadFile(file, storagePath) {
  if (!file) return null;
  const storage = getStorage();
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

/* ─────────────────────────────────────────────
   Create a player registration document.

   @param {string}    uid        Firebase Auth UID
   @param {string}    email      Firebase Auth email
   @param {object}    formData   All form fields
   @param {File|null} photoFile  Optional photo upload
   @param {File|null} waiverFile Optional waiver upload

   Files are uploaded to Firebase Storage under
   registrations/{uid}/{timestamp}_photo|waiver.
   URLs (or null) are saved in the Firestore doc.
───────────────────────────────────────────── */
export async function createRegistration(uid, email, formData, photoFile, waiverFile) {
  if (!db) throw new Error('Firestore not initialized.');

  // Upload both files in parallel — either can be null (optional)
  const timestamp = Date.now();
  const [photoURL, waiverURL] = await Promise.all([
    uploadFile(photoFile,  `registrations/${uid}/${timestamp}_photo`),
    uploadFile(waiverFile, `registrations/${uid}/${timestamp}_waiver`),
  ]);

  const registrationData = {
    // Auth info
    uid,
    email,

    // Personal info
    fullName:         formData.fullName         || '',
    dob:              formData.dob              || '',
    age:              formData.age              || '',
    gender:           formData.gender           || '',
    contactNumber:    formData.contactNumber    || '',
    studentEmail:     formData.email            || '',
    address:          formData.address          || '',
    emergencyContact: formData.emergencyContact || '',

    // Academic info
    gradeLevel: formData.gradeLevel || '',
    section:    formData.section    || '',

    // Sport info
    teamName: formData.teamName || '',
    sport:    formData.sport    || '',
    position: formData.position || '',

    // Extra
    message: formData.message || '',

    // File URLs — null if student skipped the upload
    photoURL,
    waiverURL,

    // Metadata
    status:    'pending',
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'registrations'), registrationData);
  return docRef;
}

/* ─────────────────────────────────────────────
   Sports & Teams management (per school level)
   Stored at: sportsTeamsConfig/{level}
   level: 'elementary' | 'highSchool' | 'college'
───────────────────────────────────────────── */
export async function getSportsTeamsConfig(level) {
  if (!db) {
    console.warn('Firestore not initialized. Cannot load sports/teams config.');
    return { sports: [], teams: [] };
  }

  const configRef = doc(db, 'sportsTeamsConfig', level);
  const snapshot = await getDoc(configRef);

  if (!snapshot.exists()) {
    return { sports: [], teams: [] };
  }

  const data = snapshot.data();

  return {
    sports: data.sports || [],
    teams: data.teams || [],
  };
}

export async function saveSportsConfig(level, sports) {
  if (!db) throw new Error('Firestore not initialized.');

  const configRef = doc(db, 'sportsTeamsConfig', level);

  await setDoc(
    configRef,
    {
      sports,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveTeamsConfig(level, teams) {
  if (!db) throw new Error('Firestore not initialized.');

  const configRef = doc(db, 'sportsTeamsConfig', level);

  await setDoc(
    configRef,
    {
      teams,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/* ─────────────────────────────────────────────
   Match schedules (per school level)
   Stored at: matchSchedules/{level} → { matches: [...] }

   A "match" produced by MatchSchedulesFormatPanel's generator looks like:
   {
     id, sport, category, format, round,
     teamA, teamB,           // team names
     teamALogo, teamBLogo,   // base64 or URL, copied from Sports & Teams
     date, time, location,   // filled in later via Edit / Add Schedule
     status: 'scheduled',
   }
───────────────────────────────────────────── */
export async function getMatchSchedules(level) {
  if (!db) {
    console.warn('Firestore not initialized. Cannot load match schedules.');
    return [];
  }
  const configRef = doc(db, 'matchSchedules', level);
  const snapshot  = await getDoc(configRef);
  if (!snapshot.exists()) return [];
  return snapshot.data().matches || [];
}

/**
 * Persists a freshly generated round-robin / bracket schedule.
 * Called when the admin clicks "Save Generated Schedule".
 * Merges with (rather than replaces) any existing matches for
 * other sport/category combinations at this level.
 */
export async function saveGeneratedSchedule(level, matches) {
  if (!db) throw new Error('Firestore not initialized.');

  const configRef = doc(db, 'matchSchedules', level);
  const existing  = await getMatchSchedules(level);
  const sport      = matches[0]?.sport;
  const category   = matches[0]?.category;

  const merged = [
    ...existing.filter(m => !(m.sport === sport && m.category === category)),
    ...matches,
  ];

  await setDoc(
    configRef,
    { matches: merged, updatedAt: serverTimestamp() },
    { merge: true }
  );

  return merged;
}

/**
 * Adds (or updates) a single manually-entered match — the
 * "Add Schedule" / "Edit" flow, as opposed to the bulk generator.
 */
export async function upsertMatchSchedule(level, match) {
  if (!db) throw new Error('Firestore not initialized.');

  const existing = await getMatchSchedules(level);
  const idx = existing.findIndex(m => m.id === match.id);
  const merged = idx >= 0
    ? existing.map(m => (m.id === match.id ? match : m))
    : [...existing, match];

  const configRef = doc(db, 'matchSchedules', level);
  await setDoc(
    configRef,
    { matches: merged, updatedAt: serverTimestamp() },
    { merge: true }
  );

  return merged;
}

/**
 * Removes a single match schedule by id — used by the "Delete Schedule"
 * action in the Edit Match Schedule modal.
 */
export async function deleteMatchSchedule(level, matchId) {
  if (!db) throw new Error('Firestore not initialized.');

  const existing = await getMatchSchedules(level);
  const merged = existing.filter(m => m.id !== matchId);

  const configRef = doc(db, 'matchSchedules', level);
  await setDoc(
    configRef,
    { matches: merged, updatedAt: serverTimestamp() },
    { merge: true }
  );

  return merged;
}