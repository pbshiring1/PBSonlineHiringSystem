import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth, createUserDocument, getUserRole } from '../firebase';
import './Login.css';
import logoImg from './pic/488604347_2675430962655935_1675751460889163498_n-removebg-preview.png';
import googleLogo from './pic/Google-Logo-PNG-File-180x180.png';
import backgroundImg from './pic/architectural-blueprints.jpg';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [showPassword, setShowPassword] = useState(true);

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      setForgotPasswordMessage('Please enter your email address');
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordMessage('');

    try {
      console.log('Attempting to send password reset email to:', forgotPasswordEmail);
      
      await sendPasswordResetEmail(auth, forgotPasswordEmail);
      
      console.log('Password reset email sent successfully');
      setForgotPasswordMessage('Password reset email sent! Check your inbox.');
      setForgotPasswordEmail('');
      
    } catch (error) {
      console.error('Password reset error details:', {
        code: error.code,
        message: error.message,
        email: forgotPasswordEmail
      });
      
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = `Error: ${error.message}`;
      }
      
      setForgotPasswordMessage(errorMessage);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({}); // Clear previous errors
    
    try {
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const user = userCredential.user;
      console.log('User logged in successfully:', user);
      
      // Create user document if it doesn't exist (with default role 'employee')
      await createUserDocument(user, 'employee');
      
      // Get the actual user role from Firestore
      const userRole = await getUserRole(user.uid) || 'employee';
      
      // Store user info in localStorage
      const userInfo = {
        email: user.email,
        uid: user.uid,
        name: user.displayName || user.email.split('@')[0].toUpperCase(),
        photoURL: user.photoURL || null,
        role: userRole
      };
      
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      localStorage.setItem('isAuthenticated', 'true');
      
      // Set role-specific flags for backward compatibility
      if (userRole === 'admin') {
        localStorage.setItem('isAdmin', 'true');
      } else if (userRole === 'employer') {
        localStorage.setItem('isEmployer', 'true');
      }
      
      // Navigate based on role
      switch (userRole) {
        case 'admin':
          navigate('/admin-dashboard');
          break;
        case 'employer':
          navigate('/employer-dashboard');
          break;
        default:
          navigate('/dashboard');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Failed to login. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. If you signed up with Google, please use "Sign in with Google" instead.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        default:
          errorMessage = error.message || 'Failed to login. Please try again.';
      }
      
      setErrors({
        submit: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrors({});
    
    try {
      const provider = new GoogleAuthProvider();
      
      // Add additional scopes if needed
      provider.addScope('email');
      provider.addScope('profile');
      
      // Set custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      console.log('Attempting Google sign-in...');
      const result = await signInWithPopup(auth, provider);
      
      const user = result.user;
      console.log('Google sign-in successful:', user);
      
      // Create user document if it doesn't exist (with default role 'employee')
      await createUserDocument(user, 'employee');
      
      // Get the actual user role from Firestore
      const userRole = await getUserRole(user.uid) || 'employee';
      
      // Store user info in localStorage
      const userInfo = {
        email: user.email,
        uid: user.uid,
        name: user.displayName || user.email.split('@')[0].toUpperCase(),
        photoURL: user.photoURL || null,
        role: userRole
      };
      
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      localStorage.setItem('isAuthenticated', 'true');
      
      // Set role-specific flags for backward compatibility
      if (userRole === 'admin') {
        localStorage.setItem('isAdmin', 'true');
      } else if (userRole === 'employer') {
        localStorage.setItem('isEmployer', 'true');
      }
      
      // Navigate based on role
      switch (userRole) {
        case 'admin':
          navigate('/admin-dashboard');
          break;
        case 'employer':
          navigate('/employer-dashboard');
          break;
        default:
          navigate('/dashboard');
      }
      
    } catch (error) {
      console.error('Google sign-in error details:', {
        code: error.code,
        message: error.message,
        email: error.email,
        credential: error.credential
      });
      
      let errorMessage = 'Google sign-in failed. Please try again.';
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign-in was cancelled. Please try again.';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup was blocked by your browser. Please allow popups and try again.';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Sign-in was cancelled. Please try again.';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with this email using a different sign-in method.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Google sign-in is not enabled. Please contact support.';
          break;
        case 'auth/unauthorized-domain':
          errorMessage = 'This domain is not authorized for Google sign-in.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          break;
        default:
          errorMessage = `Google sign-in failed: ${error.message}`;
      }
      
      setErrors({
        submit: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="login-container">
        <div className="login-left" style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${backgroundImg})`,
          backgroundSize: 'contain',
          backgroundPosition: 'left center',
          backgroundRepeat: 'no-repeat'
        }}>
          <div className="pbs-logo-container">
            <img src={logoImg} alt="PBS Logo" className="pbs-logo-img" />
            <div className="pbs-company-name">
              <div className="pbs-engineering-text">PBS ENGINEERING</div>
              <div className="pbs-services-text">SERVICES</div>
            </div>
            <div className="pbs-tagline">
              Delivering innovative engineering solutions with precision and excellence. Your trusted partner in technical advancement.
            </div>
          </div>
        </div>
        <div className="login-right reset-password-container">
          <h1 className="welcome-text">Reset Password</h1>
          <p className="subtitle-text">Enter your email to receive a password reset link</p>
          
          {forgotPasswordMessage && (
            <div className={`message ${forgotPasswordMessage.includes('sent') ? 'success-message' : 'error-message'}`}>
              {forgotPasswordMessage}
            </div>
          )}
          
          <div className="form-group">
            <input
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              placeholder="EMAIL ADDRESS"
              required
              autoComplete="new-password"
              autoSave="off"
              data-lpignore="true"
              data-form-type="other"
            />
          </div>
          
          <button 
            className="login-btn"
            onClick={handleForgotPassword}
            disabled={forgotPasswordLoading}
          >
            {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
          
          <button 
            className="back-btn"
            onClick={() => setShowForgotPassword(false)}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      {/* Left Section with Illustration */}
      <div className="login-left" style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${backgroundImg})`,
        backgroundSize: 'contain',
        backgroundPosition: 'left center',
        backgroundRepeat: 'no-repeat'
      }}>
        <div className="pbs-logo-container">
          <img src={logoImg} alt="PBS Logo" className="pbs-logo-img" />
          <div className="pbs-company-name">
            <div className="pbs-engineering-text">PBS ENGINEERING</div>
            <div className="pbs-services-text">SERVICES</div>
          </div>
          <div className="pbs-tagline">
            Delivering innovative engineering solutions with precision and excellence. Your trusted partner in technical advancement.
          </div>
        </div>
      </div>

      {/* Right Section with Login Form */}
      <div className="login-right">
        <h1 className="welcome-text">Welcome Back</h1>
        <p className="subtitle-text">Please enter your details to sign in</p>
        {errors.submit && (
          <div className="error-message">
            {errors.submit}
          </div>
        )}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="EMAIL OR USERNAME"
              required
              autoComplete="new-password"
              autoSave="off"
              data-lpignore="true"
              data-form-type="other"
            />
            <label htmlFor="email"></label>
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>
          <div className="form-group">
            <div className="password-input-wrapper" style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                placeholder="PASSWORD"
                required
                autoComplete="new-password"
                autoSave="off"
                data-lpignore="true"
                data-form-type="other"
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(prev => !prev)}
                className="toggle-password"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#6b7280',
                  zIndex: 1
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
            </div>
            <label htmlFor="password"></label>
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>
          
          <div className="forgot-password">
            <button 
              type="button" 
              className="forgot-password-link"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot Password?
            </button>
          </div>
          
          <div className="divider-container">
            <hr className="divider" />
            <span className="divider-text">or</span>
            <hr className="divider" />
          </div>
          <button type="button" className="google-btn" onClick={handleGoogleSignIn}>
            <img src={googleLogo} alt="Google logo" className="google-logo" />
            Sign in with google
          </button>
          <button 
            type="submit" 
            className="login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <div className="signup-link">
          Don't have an account? <Link to="/signup" className="signup-text">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login; 