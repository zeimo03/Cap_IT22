import React, { createContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
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
  resendVerificationEmail: async () => {},
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
          } else if (staffRole !== 'student') {
            // No `users/{uid}` profile doc (e.g. it was deleted, or this
            // account never went through the sign-up flow that creates
            // one) — but their email IS listed in admins/moderators/
            // superadmins, so they're still staff. Don't demote them to
            // a guest just because the profile doc is missing.
            setUserProfile({
              role: staffRole,
              isAdmin: isAdminRole,
              email: user.email,
              name: user.displayName || '',
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

    // Every account signs up with a gmail address, and every sign-up
    // gets a verification link sent to it. Don't let anyone in until
    // that link has been clicked.
    if (!user.emailVerified) {
      await signOut(auth);
      const error = new Error(
        `Please verify your email before logging in. We sent a verification link to ${email} — check your gmail inbox (and spam folder).`
      );
      error.code = 'auth/email-not-verified';
      throw error;
    }

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

    // Send the gmail verification link right away. The account exists
    // in Firebase Auth already, but login() will refuse access until
    // the person clicks the link.
    try {
      await sendEmailVerification(user);
    } catch (error) {
      console.warn('Failed to send verification email:', error);
    }

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
    }

    // Sign back out immediately — createUserWithEmailAndPassword leaves
    // the new account signed in, but we don't want a freshly-created,
    // unverified account to have live access. They'll log back in
    // (via login(), which enforces the verified-email check) once
    // they've clicked the gmail link.
    setUserProfile(null);
    await signOut(auth);

    return user;
  };

  /**
   * Signs in just long enough to re-send the gmail verification link,
   * then signs back out. Used by the "Resend verification email" link
   * shown after a login attempt fails because the account isn't
   * verified yet.
   */
  const resendVerificationEmail = async (email, password) => {
    if (!auth) throw new Error('Firebase Auth not configured. Please add Firebase credentials to .env');
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    if (user.emailVerified) {
      await signOut(auth);
      throw new Error('This email is already verified — please log in.');
    }
    await sendEmailVerification(user);
    await signOut(auth);
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
        resendVerificationEmail,
        resetPassword,
        updatePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}