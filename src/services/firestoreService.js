import { collection, getDocs, doc, setDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function fetchCollectionData(collectionName, orderByField) {
  if (!db) {
    console.warn(`Firestore not initialized. Cannot fetch ${collectionName}.`);
    return [];
  }
  const collectionRef = collection(db, collectionName);
  const collectionQuery = orderByField ? query(collectionRef, orderBy(orderByField, 'asc')) : collectionRef;
  const snapshot = await getDocs(collectionQuery);

  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

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
