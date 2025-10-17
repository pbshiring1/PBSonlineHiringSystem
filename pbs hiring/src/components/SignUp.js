import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { auth, createUserDocument } from '../firebase';
import './SignUp.css';
import backgroundImg from './pic/architectural-blueprints.jpg';
import logoImg from './pic/488604347_2675430962655935_1675751460889163498_n-removebg-preview.png';
import googleLogo from './pic/Google-Logo-PNG-File-180x180.png';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);

  // Password validation according to Firebase rules
  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return errors;
  };

  const validateForm = () => {
    const newErrors = {};
    
    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordErrors = validatePassword(formData.password);
      if (passwordErrors.length > 0) {
        newErrors.password = passwordErrors.join(', ');
      }
    }
    
    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
    
    // Real-time password validation
    if (name === 'password') {
      if (value && validatePassword(value).length > 0) {
        setErrors(prev => ({
          ...prev,
          password: validatePassword(value).join(', ')
        }));
      } else if (value) {
        setErrors(prev => ({
          ...prev,
          password: ''
        }));
      }
    }
    
    // Real-time confirm password validation
    if (name === 'confirmPassword') {
      if (value && formData.password && value !== formData.password) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: 'Passwords do not match'
        }));
      } else if (value && formData.password && value === formData.password) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});
    
    try {
      // Create user with Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const user = userCredential.user;
      console.log('User created successfully:', user);
      
      // Update Firebase Auth displayName
      const fullName = `${formData.firstName} ${formData.lastName}`;
      await updateProfile(user, {
        displayName: fullName
      });
      
      // Create user document in Firestore with default role 'applicant'
      await createUserDocument(user, 'applicant');
      
      // Store user info in localStorage
      const userInfo = {
        email: user.email,
        uid: user.uid,
        name: fullName,
        role: 'applicant'
      };
      
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      localStorage.setItem('isAuthenticated', 'true');
      
      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Sign up error:', error);
      
      let errorMessage = 'Failed to create account. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Please follow the password requirements.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          break;
        default:
          errorMessage = error.message || 'Failed to create account. Please try again.';
      }
      
      setErrors({
        submit: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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
      
      console.log('Attempting Google sign-up...');
      const result = await signInWithPopup(auth, provider);
      
      const user = result.user;
      console.log('Google sign-up successful:', user);
      
      // Create user document in Firestore with default role 'applicant'
      await createUserDocument(user, 'applicant');
      
      // Store user info in localStorage
      const userInfo = {
        email: user.email,
        uid: user.uid,
        name: user.displayName || user.email.split('@')[0].toUpperCase(),
        photoURL: user.photoURL || null,
        role: 'applicant'
      };
      
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      localStorage.setItem('isAuthenticated', 'true');
      
      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Google sign-up error details:', {
        code: error.code,
        message: error.message,
        email: error.email,
        credential: error.credential
      });
      
      let errorMessage = 'Google sign-up failed. Please try again.';
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign-up was cancelled. Please try again.';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup was blocked by your browser. Please allow popups and try again.';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Sign-up was cancelled. Please try again.';
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
          errorMessage = `Google sign-up failed: ${error.message}`;
      }
      
      setErrors({
        submit: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* Right Section with Sign Up Form */}
      <div className="login-right">
        <h1 className="welcome-text">Create Account</h1>
        
        
        {errors.submit && (
          <div className="error-message">
            {errors.submit}
          </div>
        )}
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="name-fields">
            <div className="form-group">
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={errors.firstName ? 'error' : ''}
                placeholder="FIRST NAME"
                required
              />
              <label htmlFor="firstName"></label>
              {errors.firstName && <span className="error-text">{errors.firstName}</span>}
            </div>
            <div className="form-group">
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={errors.lastName ? 'error' : ''}
                placeholder="LAST NAME"
                required
              />
              <label htmlFor="lastName"></label>
              {errors.lastName && <span className="error-text">{errors.lastName}</span>}
            </div>
          </div>
          <div className="form-group">
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="EMAIL ADDRESS"
              required
            />
            <label htmlFor="email"></label>
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>
          
          <div className="form-group">
            <div className="password-input-wrapper" style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="signup-password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                placeholder="PASSWORD"
                required
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
                  cursor: 'pointer'
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
            <label htmlFor="signup-password"></label>
            {errors.password && <span className="error-text">{errors.password}</span>}
            <div className="password-requirements">
              <small>Password must be at least 6 characters with numbers and special characters (!@#$%^&*(),.?\":{}|<></>) </small>
            </div>
          </div>
          
          <div className="form-group">
            <div className="password-input-wrapper" style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="signup-confirm-password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="CONFIRM PASSWORD"
                required
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirmPassword(prev => !prev)}
                className="toggle-password"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer'
                }}
              >
                {showConfirmPassword ? (
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
            <label htmlFor="signup-confirm-password"></label>
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>
          <div className="divider-container">
            <hr className="divider" />
            <span className="divider-text">or</span>
            <hr className="divider" />
          </div>
          <button 
            type="button" 
            className="google-btn"
            onClick={handleGoogleSignUp}
            disabled={isLoading}
          >
            <img src={googleLogo} alt="Google logo" className="google-logo" />
            Sign up with google
          </button>
          <button 
            type="submit" 
            className="login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Sign up'}
          </button>
        </form>
        <div className="signup-link">
          Already have an account? <Link to="/login" className="signup-text">Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp; 
