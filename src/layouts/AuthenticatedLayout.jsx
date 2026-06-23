import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';

export default function AuthenticatedLayout() {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="authenticated-main">
        <Outlet />
      </main>
    </div>
  );
}
