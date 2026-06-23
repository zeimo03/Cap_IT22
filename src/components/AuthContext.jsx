import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    screen: 'login', // 'login' | 'signup' | 'forgotPassword' | 'newPassword'
  });

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

  return (
    <AuthContext.Provider value={{ authModal, openAuthModal, closeAuthModal, switchScreen }}>
      {children}
    </AuthContext.Provider>
  );
}