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
// ADMINISTRATOR ACCOUNTS CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════
// Admin emails are now managed through Firestore.
// To add/remove admins, go to your Firebase Console → Firestore Database → 
// "admins" collection, and add/remove documents using the admin's email as the
// Document ID.
// ════════════════════════════════════════════════════════════════════════════════

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
   * Check Firestore "admins" collection to see if an email is an admin.
   * The document ID in the "admins" collection should be the email address.
   */
  const checkAdminStatus = async (email) => {
    if (!db || !email) return false;
    try {
      const adminDoc = await getDoc(doc(db, 'admins', email.toLowerCase()));
      return adminDoc.exists();
    } catch (error) {
      console.warn('Failed to check admin status:', error);
      return false;
    }
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
          // Check Firestore admins collection
          const adminStatus = await checkAdminStatus(user.email);

          if (profile) {
            setUserProfile({
              ...profile,
              isAdmin: adminStatus,
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

  const login = async (email, password) => {
    if (!auth) throw new Error('Firebase Auth not configured. Please add Firebase credentials to .env');
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  };

  const signup = async (name, email, password) => {
    if (!auth) throw new Error('Firebase Auth not configured. Please add Firebase credentials to .env');
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    if (db) {
      const adminStatus = await checkAdminStatus(email);
      const profileData = {
        name,
        email,
        role: 'student',
        isAdmin: adminStatus,
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