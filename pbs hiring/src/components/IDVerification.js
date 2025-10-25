import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './IDVerification.css';
import logoImg from './pic/488604347_2675430962655935_1675751460889163498_n-removebg-preview.png';
import userIcon from './pic/user (2).png';
import Settings from './Settings';
import { getUserData, updateUserProfile, uploadApplicantDocumentSimple, getApplicantDocuments, deleteApplicantDocument } from '../firebase';
import { 
  sendApplicationConfirmationEmail, 
  sendHRNotificationEmail, 
  generateApplicationId, 
  saveApplicationData, 
  testEmailJSConfiguration, 
  testBasicEmailJS, 
  verifyEmailJSCredentials 
} from '../services/emailService';
import { auth } from '../firebase';

const IDVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  
  // Get selected job from location state
  const selectedJob = location.state?.selectedJob || '';
  const [files, setFiles] = useState({
    front: null,
    back: null,
    resume: null,
    barangayClearance: null,
    nbiPoliceClearance: null,
    birthCertificatePSA: null
  });
  const [error, setError] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idType, setIdType] = useState('');

  // Header: user/profile state
  const [showDropdown, setShowDropdown] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', email: '', phone: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uploadedFilesCount, setUploadedFilesCount] = useState(0);
  const [showAppSubmitModal, setShowAppSubmitModal] = useState(false);
  const [emailStatus, setEmailStatus] = useState('sending');
  const [applicationId, setApplicationId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // State for user information - initialize with localStorage data
  const [userInfo, setUserInfo] = useState(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(storedUserInfo);
        console.log('IDVerification - Initializing userInfo with:', parsedUserInfo);
        return parsedUserInfo;
      } catch (error) {
        console.error('Error parsing user info from localStorage:', error);
      }
    }
    return {
      name: '',
      email: '',
      role: 'employee',
      photoURL: null
    };
  });

  // Function to fetch user data from Firebase
  const fetchUserDataFromFirebase = async () => {
    try {
      if (auth.currentUser) {
        const userData = await getUserData(auth.currentUser.uid);
        console.log('Fetched user data from Firebase:', userData);
        
        // Update user info state
        const updatedUserInfo = {
          ...userData,
          name: auth.currentUser.displayName || userData.name || '',
          email: userData.email || '',
          photoURL: userData.photoURL || null
        };
        setUserInfo(updatedUserInfo);
        
        // Update localStorage with the complete user info including photoURL
        localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
        
        setUserName(userData.name || 'User');
        setUserEmail(userData.email || '');
      }
    } catch (error) {
      console.error('Error fetching user data from Firebase:', error);
    }
  };

  useEffect(() => {
    // Fetch user data from Firebase on component mount
    fetchUserDataFromFirebase();
  }, []);

  // Separate useEffect for userInfo changes
  useEffect(() => {
    // Set user info from userInfo state
    setUserName(userInfo.name || '');
    setUserEmail(userInfo.email || '');
    console.log('IDVerification - User photoURL:', userInfo.photoURL);
  }, [userInfo]);

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleProfileClick = async () => {
    try {
      if (auth.currentUser) {
        // Fetch user data from Firebase
        const userData = await getUserData(auth.currentUser.uid);
        console.log('Fetched profile data from Firebase:', userData);
        
        // Load current profile data from Firebase
        setProfileData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phoneNumber || '',
          location: userData.location || '',
          bio: userData.bio || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile data from Firebase:', error);
      // Fallback to localStorage if Firebase fails
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const { name, email } = JSON.parse(userInfo);
        setProfileData({
          name: name || '',
          email: email || '',
          phone: localStorage.getItem('userPhone') || '',
          location: localStorage.getItem('userLocation') || '',
          bio: localStorage.getItem('userBio') || ''
        });
      }
    }
    setShowDropdown(false);
    setShowProfileEdit(true);
  };

  const handleProfileSave = async () => {
    if (profileData.phone && profileData.phone.length !== 10) {
      alert('Phone number must be exactly 10 digits after +63');
      return;
    }
    
    try {
      if (auth.currentUser) {
        // Save profile data to Firebase
        const profileUpdateData = {
          displayName: profileData.name,
          name: profileData.name,
          email: profileData.email,
          phoneNumber: profileData.phone,
          countryCode: '+63', // Default to +63 for Philippines
          location: profileData.location,
          bio: profileData.bio,
          updatedAt: new Date()
        };
        
        await updateUserProfile(auth.currentUser.uid, profileUpdateData);
        console.log('Profile data saved to Firebase successfully');
        
        // Update local state
        const updatedUserInfo = { 
          ...userInfo, 
          name: profileData.name, 
          email: profileData.email 
        };
        setUserInfo(updatedUserInfo);
        setUserName(profileData.name);
        setUserEmail(profileData.email);
        
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error saving profile data to Firebase:', error);
      alert('Error updating profile. Please try again.');
      return;
    }
    
    setShowProfileEdit(false);
  };

  const handleProfileCancel = () => {
    setShowProfileEdit(false);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setShowAppSubmitModal(true);
    setEmailStatus('sending');
    setErrorMessage('');
    // kick off email sending flow when opening modal
    sendConfirmationEmail();
  };

  const patterns = {
    drivers_license: /^[A-Z]\d{2}-\d{2}-\d{6}$/,
    phil_id: /^\d{16}$/,
    umid: /^\d{12}$/,
    passport: /^[A-Z]\d{8}$/
  };

  const validateID = (type, value) => {
    if (!patterns[type]) return false;
    return patterns[type].test(value);
  };

  const sendConfirmationEmail = async () => {
    try {
      if (!auth.currentUser) {
        console.error('No authenticated user found');
        setEmailStatus('failed');
        setErrorMessage('No authenticated user found');
        return;
      }

      // Verify EmailJS credentials
      const verification = verifyEmailJSCredentials();
      if (!verification.isValid) {
        setEmailStatus('failed');
        setErrorMessage(`EmailJS configuration issues: ${verification.issues.join(', ')}`);
        return;
      }

      // Test basic connectivity
      const basicTest = await testBasicEmailJS();
      if (!basicTest) {
        setEmailStatus('failed');
        setErrorMessage('EmailJS basic connectivity test failed. Please check your EmailJS Service ID and Public Key.');
        return;
      }

      // Test full configuration
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
        selectedJob: selectedJob || '',
        applicationId: appId,
        submittedAt: new Date()
      };

      // Save application data
      await saveApplicationData(auth.currentUser.uid, applicationData);

      // Send confirmation email
      const emailSent = await sendApplicationConfirmationEmail(applicationData);
      if (emailSent) {
        setEmailStatus('sent');
        setErrorMessage('');
        // Fire-and-forget HR notification
        try { await sendHRNotificationEmail(applicationData); } catch (_) {}
      } else {
        setEmailStatus('failed');
        setErrorMessage('Failed to send confirmation email. Please try again.');
      }
    } catch (error) {
      console.error('Error in sendConfirmationEmail:', error);
      setEmailStatus('failed');
      setErrorMessage(`Error: ${error.message}`);
    }
  };

  const handleRetryEmail = () => {
    setEmailStatus('sending');
    setErrorMessage('');
    sendConfirmationEmail();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    const uploadOrder = ['front','back','resume','barangayClearance','nbiPoliceClearance','birthCertificatePSA'];
    const nextKey = uploadOrder.find((k) => !files[k]) || null;
    if (!nextKey) {
      setError('All files are already uploaded. Remove one to replace.');
      return;
    }
    await validateAndSetFile(file, nextKey);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    const uploadOrder = ['front','back','resume','barangayClearance','nbiPoliceClearance','birthCertificatePSA'];
    const nextKey = uploadOrder.find((k) => !files[k]) || null;
    if (!nextKey) {
      setError('All files are already uploaded. Remove one to replace.');
      return;
    }
    await validateAndSetFile(file, nextKey);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const compressImage = (file, maxSizeKB = 300) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 1200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = 0.8;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (blob.size <= maxSizeKB * 1024 || quality <= 0.1) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              quality -= 0.1;
              tryCompress();
            }
          }, 'image/jpeg', quality);
        };
        tryCompress();
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const validateAndSetFile = async (file, side) => {
    if (!file) return;
    
    // Different validation for resume vs ID files
    if (side === 'resume') {
      // Resume only accepts PDF
      if (file.type !== 'application/pdf') {
        setError('Resume must be a PDF file.');
        setFiles(prev => ({ ...prev, [side]: null }));
        return;
      }
    } else {
      // Other documents accept PDF, JPG, or PNG
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setError('This document must be PDF, JPG, or PNG.');
        setFiles(prev => ({ ...prev, [side]: null }));
        return;
      }
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB.');
      setFiles(prev => ({ ...prev, [side]: null }));
      return;
    }
    
    // Compress images if they're too large
    let processedFile = file;
    if (file.type.startsWith('image/') && file.size > 300 * 1024) {
      try {
        processedFile = await compressImage(file);
      } catch (error) {
        console.warn('Image compression failed, using original:', error);
      }
    }
    
    setError('');
    setFiles(prev => ({ ...prev, [side]: processedFile }));
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  const handleNext = async (e) => {
    e.preventDefault();
    if (!files.front) {
      setError('Please upload the front page of your ID.');
      return;
    }
    if (!files.back) {
      setError('Please upload the back page of your ID.');
      return;
    }
    if (!files.resume) {
      setError('Please upload your resume.');
      return;
    }

    
    setIsUploading(true);
    setError('');
    
    try {
      if (auth.currentUser) {
        console.log('Starting ID upload process for user:', auth.currentUser.uid);
        
        // Before uploading, delete existing related documents if any exist
        try {
          const existingDocs = await getApplicantDocuments(auth.currentUser.uid);
          const toDelete = existingDocs.filter(d => [
            'id-front',
            'id-back',
            'resume',
            'barangay-clearance',
            'nbi-police-clearance',
            'birth-certificate-psa'
          ].includes(d.documentType));
          if (toDelete.length > 0) {
            console.log('Found existing ID/resume documents, deleting before upload:', toDelete.map(d => ({ id: d.id, type: d.documentType })));
            for (const docItem of toDelete) {
              try {
                await deleteApplicantDocument(docItem.id);
              } catch (delErr) {
                console.warn('Failed to delete existing doc', docItem.id, docItem.documentType, delErr);
              }
            }
          }
        } catch (preCheckErr) {
          console.warn('Error checking/deleting existing ID/resume documents (proceeding with upload):', preCheckErr);
        }
        
        // Upload required and optional documents to Firebase
        const uploadEntries = [
          ['front', 'id-front'],
          ['back', 'id-back'],
          ['resume', 'resume'],
          ['barangayClearance', 'barangay-clearance'],
          ['nbiPoliceClearance', 'nbi-police-clearance'],
          ['birthCertificatePSA', 'birth-certificate-psa']
        ];
        const uploadPromises = uploadEntries
          .filter(([key]) => !!files[key])
          .map(([key, type]) => uploadApplicantDocumentSimple(auth.currentUser.uid, files[key], type));
        
        const uploadedDocs = await Promise.all(uploadPromises);
        console.log('ID files uploaded successfully:', uploadedDocs);
        
        // Set uploaded files count and show success modal
        setUploadedFilesCount(uploadedDocs.length);
        setShowSuccessModal(true);
      } else {
        setError('User not authenticated. Please log in again.');
      }
    } catch (error) {
      console.error('Error uploading ID files:', error);
      setError(`Failed to upload ID files: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="id-verification-container">
      {/* Header with dashboard and profile dropdown */}
      <header className="pre-screening-header">
        <div className="header-left">
          <img src={logoImg} alt="PBS Logo" className="pre-screening-logo" />
          <div className="company-info">
            <span className="company-name">PBS ENGINEERING SERVICES</span>
          </div>
        </div>
        <nav className="pre-screening-nav">
          <a href="#" className="active" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>DASHBOARD</a>
          <div className="profile-dropdown">
            <div className="profile-header" onClick={() => setShowDropdown(!showDropdown)}>
              <div className="profile-info">
                <div className="profile-picture">
                  <img 
                    src={userInfo.photoURL || userIcon} 
                    alt="User Avatar" 
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                    onLoad={() => console.log('IDVerification - Profile picture loaded:', userInfo.photoURL || userIcon)}
                    onError={(e) => {
                      console.log('IDVerification - Profile picture failed to load, using fallback');
                      if (userInfo.photoURL && e.target.src !== userIcon) {
                        e.target.src = userIcon;
                      }
                    }}
                  />
                </div>
                <div className="profile-details">
                  <div className="profile-name">{userName || 'Rheynier Riparip'}</div>
                  <div className="profile-email">{userEmail || 'rheynier@example.com'}</div>
                </div>
              </div>
            </div>
            {showDropdown && (
              <div className="dropdown-menu">
                <div className="dropdown-user-info">
                  <div className="profile-picture">
                    <img 
                      src={userInfo.photoURL || userIcon} 
                      alt="User Avatar" 
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        console.log('IDVerification - Dropdown profile picture failed to load, using fallback');
                        if (userInfo.photoURL && e.target.src !== userIcon) {
                          e.target.src = userIcon;
                        }
                      }}
                    />
                  </div>
                  <div className="profile-details">
                    <div className="profile-name">{userName || 'Rheynier Riparip'}</div>
                    <div className="profile-email">{userEmail || 'rheynier@example.com'}</div>
                  </div>
                </div>
                <div className="dropdown-menu-items">
                  <button onClick={handleProfileClick}>
                    <span className="menu-icon">👤</span>
                    Profile
                  </button>
                  <button onClick={handleSettingsClick}>
                    <span className="menu-icon">⚙️</span>
                    Settings
                  </button>
                  <hr className="dropdown-separator" />
                  <button onClick={handleLogout} className="logout-btn">
                    <span className="menu-icon">➡️</span>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="id-verification-main">
        <div className="id-verification-header-container">
          <h1 className="id-verification-title">Applicant Documents</h1>
          <h2 className="id-verification-title-secondary">Upload your Valid ID, Resume, Barangay Clearance, and NBI or Police Clearance.</h2>
          <p className="id-verification-subtitle">Please upload a government issued ID (front and Back) for verification</p>
          <p className="id-verification-subtitle"><strong>Selected Job: {selectedJob || 'No job selected'}</strong></p>
        </div>
        <div className="id-upload-section">
          {/* Single upload area for both sides */}
          <div
            className={`upload-drop-area${error ? ' has-error' : ''}${Object.values(files).some(Boolean) ? ' has-files' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={handleBrowseClick}
            role="button"
            tabIndex={0}
            aria-label="Upload identification and resume files"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleBrowseClick();
              }
            }}
          >
            {(() => {
              const order = ['front','back','resume','barangayClearance','nbiPoliceClearance','birthCertificatePSA'];
              const nextKey = order.find((k) => !files[k]);
              const accept = nextKey === 'resume' ? '.pdf' : '.pdf,.jpg,.jpeg,.png';
              const labelMap = {
                front: 'Front ID',
                back: 'Back ID',
                resume: 'Resume',
                barangayClearance: 'Barangay Clearance',
                nbiPoliceClearance: 'NBI/Police Clearance',
                birthCertificatePSA: 'Birth Certificate (PSA)'
              };
              return (
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
                  accept={accept}
              onChange={handleFileChange}
                  aria-label={`Upload ${labelMap[nextKey] || 'document'} file`}
            />
              );
            })()}
            {(!Object.values(files).some(Boolean)) ? (
              <>
                <div className="upload-icon">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none"><path d="M12 16V4M12 4L7 9M12 4l5 5" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="16" width="18" height="4" rx="2" fill="#222" fillOpacity="0.1"/></svg>
                </div>
                <div className="upload-text">
                  <strong>Drag & Drop Files</strong>
                  <div>
                    or click to browse files (PDF, JPG, PNG for IDs and clearances; PDF only for Resume)
                  </div>
                  <button type="button" className="browse-btn" onClick={handleBrowseClick} aria-label="Browse files">Browse Files</button>
                </div>
              </>
            ) : (
              <div className="file-card-list">
                {files.front && (
                  <div className="file-card">
                    <div className="file-card-thumb">
                      {files.front.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(files.front)} alt={files.front.name} className="file-thumb-img" />
                      ) : (
                        <div className="file-thumb-icon">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#e3e3e3"/><text x="12" y="17" textAnchor="middle" fontSize="10" fill="#888">{files.front.type === 'application/pdf' ? 'PDF' : 'DOC'}</text></svg>
                        </div>
                      )}
                    </div>
                    <div className="file-card-info">
                      <div className="file-card-name">{files.front.name}</div>
                      <div className="file-card-type">{files.front.type === 'application/pdf' ? 'PDF Document' : files.front.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'Microsoft Word' : files.front.type.replace('image/', '').toUpperCase()}</div>
                    </div>
                    <div className="file-card-actions">
                      <button 
                        className="file-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles(prev => ({ ...prev, front: null }));
                          if (error) setError('');
                        }}
                        title="Remove file"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                {files.back && (
                  <div className="file-card">
                    <div className="file-card-thumb">
                      {files.back.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(files.back)} alt={files.back.name} className="file-thumb-img" />
                      ) : (
                        <div className="file-thumb-icon">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#e3e3e3"/><text x="12" y="17" textAnchor="middle" fontSize="10" fill="#888">{files.back.type === 'application/pdf' ? 'PDF' : 'DOC'}</text></svg>
                        </div>
                      )}
                    </div>
                    <div className="file-card-info">
                      <div className="file-card-name">{files.back.name}</div>
                      <div className="file-card-type">{files.back.type === 'application/pdf' ? 'PDF Document' : files.back.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'Microsoft Word' : files.back.type.replace('image/', '').toUpperCase()}</div>
                    </div>
                    <div className="file-card-actions">
                      <button 
                        className="file-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles(prev => ({ ...prev, back: null }));
                          if (error) setError('');
                        }}
                        title="Remove file"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                {files.resume && (
                  <div className="file-card">
                    <div className="file-card-thumb">
                      {files.resume.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(files.resume)} alt={files.resume.name} className="file-thumb-img" />
                      ) : (
                        <div className="file-thumb-icon">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#e3e3e3"/><text x="12" y="17" textAnchor="middle" fontSize="10" fill="#888">{files.resume.type === 'application/pdf' ? 'PDF' : 'DOC'}</text></svg>
                        </div>
                      )}
                    </div>
                    <div className="file-card-info">
                      <div className="file-card-name">{files.resume.name}</div>
                      <div className="file-card-type">{files.resume.type === 'application/pdf' ? 'PDF Document' : files.resume.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'Microsoft Word' : files.resume.type.replace('image/', '').toUpperCase()}</div>
                    </div>
                    <div className="file-card-actions">
                      <button 
                        className="file-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles(prev => ({ ...prev, resume: null }));
                          if (error) setError('');
                        }}
                        title="Remove file"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                {files.barangayClearance && (
                  <div className="file-card">
                    <div className="file-card-thumb">
                      {files.barangayClearance.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(files.barangayClearance)} alt={files.barangayClearance.name} className="file-thumb-img" />
                      ) : (
                        <div className="file-thumb-icon">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#e3e3e3"/><text x="12" y="17" textAnchor="middle" fontSize="10" fill="#888">{files.barangayClearance.type === 'application/pdf' ? 'PDF' : 'DOC'}</text></svg>
                        </div>
                      )}
                    </div>
                    <div className="file-card-info">
                      <div className="file-card-name">{files.barangayClearance.name}</div>
                      <div className="file-card-type">{files.barangayClearance.type === 'application/pdf' ? 'PDF Document' : files.barangayClearance.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'Microsoft Word' : files.barangayClearance.type.replace('image/', '').toUpperCase()}</div>
                    </div>
                    <div className="file-card-actions">
                      <button 
                        className="file-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles(prev => ({ ...prev, barangayClearance: null }));
                          if (error) setError('');
                        }}
                        title="Remove file"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                {files.nbiPoliceClearance && (
                  <div className="file-card">
                    <div className="file-card-thumb">
                      {files.nbiPoliceClearance.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(files.nbiPoliceClearance)} alt={files.nbiPoliceClearance.name} className="file-thumb-img" />
                      ) : (
                        <div className="file-thumb-icon">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#e3e3e3"/><text x="12" y="17" textAnchor="middle" fontSize="10" fill="#888">{files.nbiPoliceClearance.type === 'application/pdf' ? 'PDF' : 'DOC'}</text></svg>
                        </div>
                      )}
                    </div>
                    <div className="file-card-info">
                      <div className="file-card-name">{files.nbiPoliceClearance.name}</div>
                      <div className="file-card-type">{files.nbiPoliceClearance.type === 'application/pdf' ? 'PDF Document' : files.nbiPoliceClearance.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'Microsoft Word' : files.nbiPoliceClearance.type.replace('image/', '').toUpperCase()}</div>
                    </div>
                    <div className="file-card-actions">
                      <button 
                        className="file-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles(prev => ({ ...prev, nbiPoliceClearance: null }));
                          if (error) setError('');
                        }}
                        title="Remove file"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                {files.birthCertificatePSA && (
                  <div className="file-card">
                    <div className="file-card-thumb">
                      {files.birthCertificatePSA.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(files.birthCertificatePSA)} alt={files.birthCertificatePSA.name} className="file-thumb-img" />
                      ) : (
                        <div className="file-thumb-icon">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#e3e3e3"/><text x="12" y="17" textAnchor="middle" fontSize="10" fill="#888">{files.birthCertificatePSA.type === 'application/pdf' ? 'PDF' : 'DOC'}</text></svg>
                        </div>
                      )}
                    </div>
                    <div className="file-card-info">
                      <div className="file-card-name">{files.birthCertificatePSA.name}</div>
                      <div className="file-card-type">{files.birthCertificatePSA.type === 'application/pdf' ? 'PDF Document' : files.birthCertificatePSA.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'Microsoft Word' : files.birthCertificatePSA.type.replace('image/', '').toUpperCase()}</div>
                    </div>
                    <div className="file-card-actions">
                      <button 
                        className="file-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles(prev => ({ ...prev, birthCertificatePSA: null }));
                          if (error) setError('');
                        }}
                        title="Remove file"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                {(() => {
                  const order = ['front','back','resume','barangayClearance','nbiPoliceClearance','birthCertificatePSA'];
                  const nextKey = order.find((k) => !files[k]);
                  const labelMap = {
                    front: 'Front ID',
                    back: 'Back ID',
                    resume: 'Resume',
                    barangayClearance: 'Barangay Clearance',
                    nbiPoliceClearance: 'NBI/Police Clearance',
                    birthCertificatePSA: 'Birth Certificate (PSA)'
                  };
                  if (!nextKey) return null;
                  return (
                  <div className="browse-button-container">
                  <button 
                    className="browse-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBrowseClick();
                    }}
                  >
                      Upload {labelMap[nextKey]} File
                  </button>
                  </div>
                  );
                })()}
              </div>
            )}
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="id-guidelines">
            <h3>Acceptable ID Types :</h3>
            <ul>
              <li>Driver's License</li>
              <li>Phil ID</li>
              <li>UMID</li>
              <li>Passport</li>
            </ul>
          </div>
        </div>
        
        <div className="id-verification-actions">
          <button className="back-btn" onClick={() => navigate(-1)} disabled={isUploading}>← BACK</button>
          <button 
            className="submit-btn" 
            onClick={handleNext} 
            disabled={isUploading}
          >
            {isUploading ? 'UPLOADING...' : 'CONTINUE →'}
          </button>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <div className="profile-edit-overlay" onClick={handleProfileCancel}>
          <div className="profile-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-edit-header">
              <h3>Edit Profile</h3>
            </div>
            <div className="profile-edit-content">
              <div className="profile-picture-section">
                <div className="profile-picture-container">
                  <img 
                    src={userInfo.photoURL || userIcon} 
                    alt="Profile Preview" 
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
                <div className="profile-picture-info">
                  <div className="profile-picture-label">Profile Picture</div>
                  <div className="profile-picture-subtitle">Google profile picture (read-only)</div>
                </div>
              </div>
              
              <div className="profile-edit-field">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  placeholder="Rheynier Riparip"
                />
              </div>
              <div className="profile-edit-field">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  placeholder="rheynierriparip30@gmail.com"
                />
              </div>
              <div className="profile-edit-field">
                <label>Phone Number</label>
                <div className="phone-input-container">
                  <span className="phone-prefix">+63</span>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setProfileData({...profileData, phone: value});
                    }}
                    placeholder="91234567890"
                    maxLength="10"
                  />
                </div>
              </div>
            </div>
            <div className="profile-edit-actions">
              <button className="profile-edit-cancel" onClick={handleProfileCancel}>
                Cancel
              </button>
              <button className="profile-edit-save" onClick={handleProfileSave}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Settings 
          onClose={() => setShowSettings(false)}
          userName={userName}
          userEmail={userEmail}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="upload-success-overlay">
          <div className="upload-success-modal">
            <div className="success-checkmark">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="success-title">Upload Successful!</h2>
            <div className="success-message-banner">
              Your ID verification documents and resume have been uploaded successfully.
            </div>
            <div className="success-file-count">
              {uploadedFilesCount} file{uploadedFilesCount !== 1 ? 's' : ''} uploaded
            </div>
            <p className="success-processing">
              Your documents are now being processed and will be reviewed by our team.
            </p>
            <button className="success-close-btn" onClick={handleSuccessModalClose}>
              CONTINUE
            </button>
          </div>
        </div>
      )}

      {/* Application Submitted Modal (fresh UI) */}
      {showAppSubmitModal && (
        <div className="app-submit-overlay" role="dialog" aria-modal="true">
          <div className="app-submit-modal">
            <div className="app-submit-header">
              <div className="app-submit-badge" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="app-submit-title">Application Submitted</div>
                <div className="app-submit-subtitle">We’re processing your submission and sending a confirmation.</div>
              </div>
            </div>

            {applicationId && (
              <div className="app-submit-appid" aria-live="polite">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" opacity="0.6"/><path d="M7 8h10M7 12h6M7 16h4" stroke="currentColor" opacity="0.8"/></svg>
                <span>ID: {applicationId}</span>
              </div>
            )}

            <div className={`app-submit-status ${emailStatus}`} aria-live="polite">
              {emailStatus === 'sending' && <div className="app-submit-spinner" aria-label="Sending email" />}
              {emailStatus === 'sent' && <span>Confirmation email sent to {userInfo.email || auth.currentUser?.email}</span>}
              {emailStatus === 'failed' && <span>Failed to send email.</span>}
            </div>
            {emailStatus === 'failed' && !!errorMessage && (
              <div className="app-submit-error-details">{errorMessage}</div>
            )}

            <div className="app-submit-actions">
              {emailStatus === 'failed' && (
                <button className="app-submit-secondary" onClick={handleRetryEmail}>Retry Email</button>
              )}
              <button 
                className="app-submit-primary" 
                onClick={() => { setShowAppSubmitModal(false); navigate('/dashboard'); }}
              >
                Go to My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IDVerification; 