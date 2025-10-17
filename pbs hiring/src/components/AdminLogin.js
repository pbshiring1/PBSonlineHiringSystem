import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
        
        <div className="admin-login-field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />
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