import React from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import LandingPage from './components/Landing/LandingPage';

function App() {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <LandingPage />
    </div>
  );
}

export default App;