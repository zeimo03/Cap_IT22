import React from 'react';
import Sidebar from './components/Sidebar';
import LandingPage from './components/LandingPage';

function App() {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <LandingPage />
    </div>
  );
}

export default App;