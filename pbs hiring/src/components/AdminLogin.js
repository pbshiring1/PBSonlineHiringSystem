import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      localStorage.setItem('isAdmin', 'true');
      navigate('/admin-dashboard'); // Redirect to admin dashboard after login
    } else {
      setError('Invalid admin credentials.');
    }
  };

  return (
    <div className="admin-login-root">
      <form className="admin-login-form" onSubmit={handleSubmit}>
        <h2 className="admin-login-title">Admin Login</h2>
        <p className="admin-login-subtitle">Enter your admin credentials</p>
        
        <div className="admin-login-field">
          <label>Admin Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter username"
            required
            autoFocus
          />
          <div className="admin-login-hint">Username: <b>admin</b> | Password: <b>admin123</b></div>
        </div>
        
        <div className="admin-login-field" style={{ position: 'relative' }}>
          <label>Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            style={{ paddingRight: '40px' }}
          />
          {password && (
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(prev => !prev)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.73-1.67 1.87-3.21 3.3-4.5" />
                  <path d="M22.54 11.88c-.64-1.6-1.7-3.06-3.04-4.24A10.94 10.94 0 0 0 12 4c-.86 0-1.69.1-2.47.29" />
                  <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                  <path d="M1 1l22 22" />
                </svg>
              )}
            </button>
          )}
        </div>
        
        {error && <div className="admin-login-error">{error}</div>}
        
        <button className="admin-login-btn" type="submit">Login as Admin</button>
        
        <div className="admin-login-back">
          <a href="/login" className="admin-login-back-link">← Back to User Login</a>
        </div>
      </form>
    </div>
  );
};

export default AdminLogin;