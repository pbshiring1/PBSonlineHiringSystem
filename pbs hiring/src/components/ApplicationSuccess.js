import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './ApplicationSuccess.css';
import { sendApplicationConfirmationEmail, sendHRNotificationEmail, generateApplicationId, saveApplicationData, testEmailJSConfiguration, testBasicEmailJS, verifyEmailJSCredentials } from '../services/emailService';
import { auth } from '../firebase';

const ApplicationSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [emailStatus, setEmailStatus] = useState('sending'); // 'sending', 'sent', 'failed'
  const [applicationId, setApplicationId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Get user data from localStorage
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const selectedJob = location.state?.selectedJob || 'Selected Position';

  useEffect(() => {
    // Send confirmation email when component mounts
    sendConfirmationEmail();
  }, []);

  const sendConfirmationEmail = async () => {
    try {
      if (!auth.currentUser) {
        console.error('No authenticated user found');
        setEmailStatus('failed');
        setErrorMessage('No authenticated user found');
        return;
      }

      // First verify EmailJS credentials
      console.log('Verifying EmailJS credentials...');
      const verification = verifyEmailJSCredentials();
      console.log('Credential verification:', verification);
      
      if (!verification.isValid) {
        setEmailStatus('failed');
        setErrorMessage(`EmailJS configuration issues: ${verification.issues.join(', ')}`);
        return;
      }
      
      // Then test basic EmailJS connectivity
      console.log('Testing basic EmailJS connectivity...');
      const basicTest = await testBasicEmailJS();
      if (!basicTest) {
        setEmailStatus('failed');
        setErrorMessage('EmailJS basic connectivity test failed. Please check your EmailJS Service ID and Public Key.');
        return;
      }
      
      // Then test full configuration
      console.log('Testing full EmailJS configuration...');
      const configTest = await testEmailJSConfiguration();
      if (!configTest) {
        setEmailStatus('failed');
        setErrorMessage('EmailJS template configuration test failed. Please check your EmailJS template variables.');
        return;
      }

      // Generate unique application ID
      const appId = generateApplicationId();
      setApplicationId(appId);

      // Prepare application data
      const applicationData = {
        name: userInfo.name || 'Applicant',
        email: userInfo.email || auth.currentUser.email,
        selectedJob: selectedJob,
        applicationId: appId,
        submittedAt: new Date()
      };

      console.log('Application data:', applicationData);

      // Save application data to Firebase
      await saveApplicationData(auth.currentUser.uid, applicationData);

      // Send confirmation email to applicant
      const emailSent = await sendApplicationConfirmationEmail(applicationData);
      
      if (emailSent) {
        setEmailStatus('sent');
        setErrorMessage('');
        console.log('Confirmation email sent successfully');
        
        // Also send notification to HR (optional)
        try {
          await sendHRNotificationEmail(applicationData);
          console.log('HR notification email sent successfully');
        } catch (hrError) {
          console.warn('HR notification email failed:', hrError);
          // Don't fail the whole process if HR email fails
        }
      } else {
        setEmailStatus('failed');
        setErrorMessage('Failed to send confirmation email. Please check the console for details.');
        console.error('Failed to send confirmation email');
      }
    } catch (error) {
      console.error('Error in sendConfirmationEmail:', error);
      setEmailStatus('failed');
      setErrorMessage(`Error: ${error.message}`);
    }
  };

  const handleReturnHome = () => {
    navigate('/dashboard'); // Navigate to applicant dashboard
  };

  const handleRetryEmail = () => {
    setEmailStatus('sending');
    setErrorMessage('');
    sendConfirmationEmail();
  };

  return (
    <div className="application-success-container">
      <div className="success-content">
        {/* Success Icon */}
        <div className="success-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
            <path 
              d="M9 12l2 2 4-4" 
              stroke="#28a745" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Main Heading */}
        <h1 className="success-heading">Application Submitted!</h1>

        {/* Application ID */}
        {applicationId && (
          <div className="application-id-section">
            <p className="application-id-label">Application ID:</p>
            <p className="application-id-value">{applicationId}</p>
          </div>
        )}

        {/* Thank You Message */}
        <p className="thank-you-message">
          Thank you for your submission. We've received your application and will review it shortly.
        </p>

        {/* Email Status */}
        <div className="email-status-section">
          {emailStatus === 'sending' && (
            <div className="email-status sending">
              <div className="loading-spinner"></div>
              <span>Sending confirmation email...</span>
            </div>
          )}
          {emailStatus === 'sent' && (
            <div className="email-status sent">
              <span className="checkmark">✓</span>
              <span>Confirmation email sent to {userInfo.email}</span>
            </div>
          )}
          {emailStatus === 'failed' && (
            <div className="email-status failed">
              <span className="error-icon">⚠</span>
              <div>
                <div>Failed to send email. Please contact support.</div>
                {errorMessage && (
                  <div className="error-details" style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#dc3545' }}>
                    {errorMessage}
                  </div>
                )}
                <button 
                  onClick={handleRetryEmail}
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Retry Email
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Next Steps Section */}
        <div className="next-steps-section">
          <h3 className="next-steps-heading">
            <span className="checkmark">✓</span>
            What happens next?
          </h3>
          <ul className="next-steps-list">
            <li>You'll receive a confirmation email within 5 minutes</li>
            <li>We'll contact you with updates via email</li>
          </ul>
        </div>

        {/* Return to Homepage Button */}
        <button className="return-home-btn" onClick={handleReturnHome}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="home-icon">
            <path 
              d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" 
              stroke="#495057" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <polyline 
              points="9,22 9,12 15,12 15,22" 
              stroke="#495057" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          Go to My Account
        </button>
      </div>
    </div>
  );
};

export default ApplicationSuccess;
