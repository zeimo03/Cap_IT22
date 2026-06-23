import React from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import LandingPage from './components/Landing/LandingPage';
import LoginModal from './components/LoginModal/LoginModal';
import { SidebarProvider } from './components/Sidebar/SidebarContext';
import { AuthProvider } from './components/AuthContext';

function App() {
  return (
    <SidebarProvider>
      <AuthProvider>
        <div className="dashboard-container">
          <Sidebar />
          <LandingPage />
        </div>
        <LoginModal />
      </AuthProvider>
    </SidebarProvider>
  );
}

export default App;