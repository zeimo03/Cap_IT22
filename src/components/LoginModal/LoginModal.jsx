import React, { useContext, useState } from 'react';
import { AuthContext } from '../AuthContext';
import { FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import './LoginModal.css';
import srcLogo from '../img/SRCLogo.png';

function LoginScreen({ onSwitchScreen }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login:', { email, password });
  };

  return (
    <div className="auth-modal-content login-screen">
      <div className="auth-logo">
        <img src={srcLogo} alt="SRC Logo" />
      </div>

      <h2 className="auth-title">Login to Dashboard</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <button type="submit" className="auth-btn auth-btn-primary">
          Log In
        </button>
      </form>

      <div className="auth-footer">
        <button
          type="button"
          className="auth-link"
          onClick={() => onSwitchScreen('forgotPassword')}
        >
          Forgot Password?
        </button>
      </div>

      <div className="auth-divider">or</div>

      <div className="auth-action">
        <span>Don't have an account?</span>
        <button
          type="button"
          className="auth-link-action"
          onClick={() => onSwitchScreen('signup')}
        >
          Create an account
        </button>
      </div>
    </div>
  );
}

function SignUpScreen({ onSwitchScreen }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // Handle signup logic here
    console.log('Sign up:', formData);
  };

  return (
    <div className="auth-modal-content signup-screen">
      <div className="auth-logo">
        <img src={srcLogo} alt="SRC Logo" />
      </div>

      <h2 className="auth-title">Sign up to Dashboard</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="name">Create Name</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Enter your name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Create Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="password-input-wrapper">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <button type="submit" className="auth-btn auth-btn-primary">
          Log in
        </button>
      </form>

      <div className="auth-action">
        <button
          type="button"
          className="auth-link"
          onClick={() => onSwitchScreen('login')}
        >
          Forgot Password?
        </button>
      </div>
    </div>
  );
}

function ForgotPasswordScreen({ onSwitchScreen }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle forgot password logic here
    console.log('Forgot password:', { email });
    // After validation, switch to new password screen
    onSwitchScreen('newPassword');
  };

  return (
    <div className="auth-modal-content forgot-password-screen">
      <div className="auth-logo">
        <img src={srcLogo} alt="SRC Logo" />
      </div>

      <h2 className="auth-title">Forgot Password</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Enter your email</label>
          <input
            type="email"
            id="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="auth-btn auth-btn-primary">
          Continue
        </button>
      </form>

      <div className="auth-action">
        <button
          type="button"
          className="auth-link"
          onClick={() => onSwitchScreen('login')}
        >
          Back to login
        </button>
      </div>
    </div>
  );
}

function NewPasswordScreen({ onSwitchScreen }) {
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setPasswords({
      ...passwords,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    // Handle password reset logic here
    console.log('New password:', passwords);
    // After successful reset, switch back to login
    onSwitchScreen('login');
  };

  return (
    <div className="auth-modal-content new-password-screen">
      <div className="auth-logo">
        <img src={srcLogo} alt="SRC Logo" />
      </div>

      <h2 className="auth-title">New Password</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="newPassword">Create New Password</label>
          <div className="password-input-wrapper">
            <input
              type={showNewPassword ? 'text' : 'password'}
              id="newPassword"
              name="newPassword"
              placeholder="Enter new password"
              value={passwords.newPassword}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowNewPassword(!showNewPassword)}
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {showNewPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="password-input-wrapper">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={passwords.confirmPassword}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <button type="submit" className="auth-btn auth-btn-primary">
          Change
        </button>
      </form>
    </div>
  );
}

export default function LoginModal() {
  const { authModal, closeAuthModal, switchScreen } = useContext(AuthContext);

  if (!authModal.isOpen) return null;

  return (
    <>
      {/* Background Overlay */}
      <div className="auth-modal-backdrop" onClick={closeAuthModal} />

      {/* Modal Container */}
      <div className="auth-modal-container">
        {/* Building Background */}
        <div className="auth-modal-background">
          <img src="/src/assets/SRCBuilding.png" alt="Santa Rita College" />
        </div>

        {/* Modal Card */}
        <div className="auth-modal-card">
          {/* Close Button */}
          <button
            className="auth-modal-close"
            onClick={closeAuthModal}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>

          {/* Screen Content */}
          {authModal.screen === 'login' && (
            <LoginScreen onSwitchScreen={switchScreen} />
          )}
          {authModal.screen === 'signup' && (
            <SignUpScreen onSwitchScreen={switchScreen} />
          )}
          {authModal.screen === 'forgotPassword' && (
            <ForgotPasswordScreen onSwitchScreen={switchScreen} />
          )}
          {authModal.screen === 'newPassword' && (
            <NewPasswordScreen onSwitchScreen={switchScreen} />
          )}
        </div>
      </div>
    </>
  );
}