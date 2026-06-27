import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { SidebarProvider } from './components/Sidebar/SidebarContext';
import PublicLayout from './layouts/PublicLayout';
import AuthenticatedLayout from './layouts/AuthenticatedLayout';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import ModeratorPage from './pages/ModeratorPage';
import SuperAdminPage from './pages/SuperAdminPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import ProtectedRoute from './components/ProtectedRoute';
import LoginModal from './components/LoginModal/LoginModal';
import RegistrationPage from './pages/RegistrationPage';
import TeamAndSportsPage from './pages/TeamAndSportsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicLayout />} />

          <Route
            element={
              <SidebarProvider>
                <AuthenticatedLayout />
              </SidebarProvider>
            }
          >
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
               path="/profile"
               element={
                 <ProtectedRoute>
                   <ProfilePage />
                 </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/moderator"
              element={
                <ProtectedRoute allowedRoles={["moderator", "admin", "superadmin"]}>
                  <ModeratorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute allowedRoles={["superadmin"]}>
                  <SuperAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/registration"
              element={
                <ProtectedRoute>
                  <RegistrationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <TeamAndSportsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <LoginModal />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;