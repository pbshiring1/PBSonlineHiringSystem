import React, { useState } from 'react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import './Settings.css';

const Settings = ({ onClose, userName, userEmail }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // Handle account deletion logic here
      console.log('Account deletion requested');
    }
  };

  const handleChangeEmail = () => {
    // Handle email change logic here
    console.log('Email change requested to:', newEmail);
    setShowChangeEmail(false);
    setNewEmail('');
  };

  const handleCancelChangeEmail = () => {
    setShowChangeEmail(false);
    setNewEmail('');
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }
    
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No authenticated user found');
      }
      
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      // Reset form and close modal
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      setPasswordError('');
      
      alert('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('Password is too weak');
      } else if (error.code === 'auth/requires-recent-login') {
        setPasswordError('Please log out and log back in before changing your password');
      } else {
        setPasswordError(error.message || 'Failed to change password');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancelChangePassword = () => {
    setShowChangePassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h1 className="settings-title">Settings</h1>
          <button className="exit-button" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="settings-tabs">
          <button 
            className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <span className="tab-icon">👤</span>
            Account
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'account' && (
            <div className="settings-section">
              <div className="settings-card">
                <div className="card-content">
                  <div className="card-label">Email</div>
                  <div className="card-value">{userEmail}</div>
                </div>
                <button className="edit-button" onClick={() => setShowChangeEmail(true)}>
                  <span className="edit-icon">✏️</span>
                </button>
              </div>
              
              <div className="settings-card">
                <button className="change-password-button" onClick={() => setShowChangePassword(true)}>
                  Change Password
                </button>
              </div>
              
              <div className="settings-card">
                <div className="card-content">
                  <div className="card-label">Delete account</div>
                </div>
                <button className="delete-button" onClick={handleDeleteAccount}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Email Modal */}
      {showChangeEmail && (
        <div className="change-email-overlay" onClick={handleCancelChangeEmail}>
          <div className="change-email-modal" onClick={(e) => e.stopPropagation()}>
            <div className="change-email-header">
              <h2 className="change-email-title">Change your email</h2>
              <button className="close-button" onClick={handleCancelChangeEmail}>
                ✕
              </button>
            </div>
            
            <div className="change-email-content">
              <p className="change-email-info">
                Email is used to sign in to Jobstreet and to be contacted by employers.
              </p>
              
              <div className="email-input-group">
                <label className="email-input-label">New email address</label>
                <input
                  type="email"
                  className="email-input-field"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                />
              </div>
            </div>
            
            <div className="change-email-actions">
              <button className="cancel-button" onClick={handleCancelChangeEmail}>
                Cancel
              </button>
              <button className="continue-button" onClick={handleChangeEmail}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="change-password-overlay" onClick={handleCancelChangePassword}>
          <div className="change-password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="change-password-header">
              <h2 className="change-password-title">Change your password</h2>
              <button className="close-button" onClick={handleCancelChangePassword}>
                ✕
              </button>
            </div>
            
            <div className="change-password-content">
              <p className="change-password-info">
                For security reasons, you'll need to enter your current password to change it.
              </p>
              
              {passwordError && (
                <div className="password-error">
                  {passwordError}
                </div>
              )}
              
              <div className="password-input-group">
                <label className="password-input-label">Current password</label>
                <input
                  type="password"
                  className="password-input-field"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              
              <div className="password-input-group">
                <label className="password-input-label">New password</label>
                <input
                  type="password"
                  className="password-input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              
              <div className="password-input-group">
                <label className="password-input-label">Confirm new password</label>
                <input
                  type="password"
                  className="password-input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            
            <div className="change-password-actions">
              <button className="cancel-button" onClick={handleCancelChangePassword}>
                Cancel
              </button>
              <button 
                className="continue-button" 
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
