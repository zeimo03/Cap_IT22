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
import { createUserProfile } from '../services/firestoreService';

export const AuthContext = createContext({
  authModal: { isOpen: false, screen: 'login' },
  openAuthModal: () => {},
  closeAuthModal: () => {},
  switchScreen: () => {},
  currentUser: null,
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
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      console.warn('Firebase Auth not initialized. Auth features unavailable.');
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const openAuthModal = (screen = 'login') => {
    setAuthModal({
      isOpen: true,
      screen,
    });
  };

  const closeAuthModal = () => {
    setAuthModal({
      isOpen: false,
      screen: 'login',
    });
  };

  const switchScreen = (screen) => {
    setAuthModal({
      isOpen: true,
      screen,
    });
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
      await createUserProfile(user.uid, { name, email, role: 'student' });
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
    if (!user) {
      throw new Error('No authenticated user available. Please log in first.');
    }
    await firebaseUpdatePassword(user, newPassword);
  };

  const logout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        authModal,
        openAuthModal,
        closeAuthModal,
        switchScreen,
        currentUser,
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
