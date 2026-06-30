import React, { createContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updatePassword as firebaseUpdatePassword,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createUserProfile, getUserProfile } from '../services/firestoreService';

// ════════════════════════════════════════════════════════════════════════════════
// STAFF ACCOUNTS CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════
// Staff roles are managed through Firestore. To grant a role to an account, go to
// Firebase Console → Firestore Database → and add a document using the staff
// member's email (lowercase) as the Document ID, inside one of these collections:
//   • "superadmins"  → Super Admin access
//   • "admins"       → Admin access
//   • "moderators"   → Moderator access
// Anyone whose email is not present in any of these collections is treated as a
// regular student/player account.
// ════════════════════════════════════════════════════════════════════════════════

const ROLE_COLLECTIONS = [
  { role: 'superadmin', collection: 'superadmins' },
  { role: 'admin', collection: 'admins' },
  { role: 'moderator', collection: 'moderators' },
];

export const AuthContext = createContext({
  authModal: { isOpen: false, screen: 'login' },
  openAuthModal: () => {},
  closeAuthModal: () => {},
  switchScreen: () => {},
  currentUser: null,
  userProfile: null,
  userRole: 'guest',
  isAdmin: false,
  authLoading: false,
  login: async () => {},
  signup: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    screen: 'login',
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  /**
   * Check the "superadmins", "admins", and "moderators" Firestore collections
   * (document ID = lowercase email) to resolve a staff role for this email.
   * Returns 'superadmin' | 'admin' | 'moderator' | 'student'.
   * This is the single source of truth for role/security checks — a user
   * cannot claim a privileged role unless their email exists in Firestore.
   */
  const resolveStaffRole = async (email) => {
    if (!db || !email) return 'student';
    const lower = email.toLowerCase();
    for (const { role, collection } of ROLE_COLLECTIONS) {
      try {
        const snap = await getDoc(doc(db, collection, lower));
        if (snap.exists()) return role;
      } catch (error) {
        console.warn(`Failed to check ${collection} status:`, error);
      }
    }
    return 'student';
  };

  useEffect(() => {
    if (!auth) {
      console.warn('Firebase Auth not initialized. Auth features unavailable.');
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && db) {
        try {
          const profile = await getUserProfile(user.uid);
          // Resolve staff role from Firestore (superadmins / admins / moderators)
          const staffRole = await resolveStaffRole(user.email);
          const isAdminRole = staffRole === 'admin' || staffRole === 'superadmin';

          if (profile) {
            setUserProfile({
              ...profile,
              role: staffRole !== 'student' ? staffRole : (profile.role || 'student'),
              isAdmin: isAdminRole,
            });
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.warn('Failed to load user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  const openAuthModal = (screen = 'login') => {
    setAuthModal({ isOpen: true, screen });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, screen: 'login' });
  };

  const switchScreen = (screen) => {
    setAuthModal({ isOpen: true, screen });
  };

  /**
   * @param {string} email
   * @param {string} password
   * Signs the person in and automatically resolves their *real* role by
   * checking Firestore (superadmins / admins / moderators / else student).
   * The person never has to pick a role — the system already knows it.
   * Returns { user, role }.
   */
  const login = async (email, password) => {
    if (!auth) throw new Error('Firebase Auth not configured. Please add Firebase credentials to .env');
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    const resolvedRole = await resolveStaffRole(user.email);
    return { user, role: resolvedRole };
  };

  /**
   * @param {string} name
   * @param {string} email
   * @param {string} password
   * @param {object} [extra] Optional player/student details captured at sign-up:
   *   { gender, gradeLevel, section }
   */
  const signup = async (name, email, password, extra = {}) => {
    if (!auth) throw new Error('Firebase Auth not configured. Please add Firebase credentials to .env');
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    if (db) {
      const staffRole = await resolveStaffRole(email);
      const profileData = {
        name,
        email,
        gender: extra.gender || '',
        gradeLevel: extra.gradeLevel || '',
        section: extra.section || '',
        role: staffRole,
        isAdmin: staffRole === 'admin' || staffRole === 'superadmin',
      };
      await createUserProfile(user.uid, profileData);
      setUserProfile(profileData);
    }
    return user;
  };

  const resetPassword = async (email) => {
    if (!auth) throw new Error('Firebase Auth not configured. Please add Firebase credentials to .env');
    await sendPasswordResetEmail(auth, email);
  };

  const updatePassword = async (newPassword) => {
    if (!auth) throw new Error('Firebase Auth not configured. Please add Firebase credentials to .env');
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user available. Please log in first.');
    await firebaseUpdatePassword(user, newPassword);
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        authModal,
        openAuthModal,
        closeAuthModal,
        switchScreen,
        currentUser,
        userProfile,
        userRole: userProfile?.role ?? 'guest',
        isAdmin: userProfile?.isAdmin ?? false,
        authLoading,
        login,
        signup,
        resetPassword,
        updatePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}