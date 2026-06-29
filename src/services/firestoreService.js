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