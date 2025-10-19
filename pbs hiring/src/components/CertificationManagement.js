import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './CertificationManagement.css';
import logoImg from './pic/488604347_2675430962655935_1675751460889163498_n-removebg-preview.png';
import userIcon from './pic/user (2).png';
import Settings from './Settings';
import { getUserData, updateUserProfile, uploadApplicantDocumentSimple, getApplicantDocuments, getApplicantDocumentContent, deleteApplicantDocument } from '../firebase';
import { auth } from '../firebase';

const CertificationManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uploadedFilesCount, setUploadedFilesCount] = useState(0);

  // Get selected job from location state
  const selectedJob = location.state?.selectedJob || '';
  
  // Jobs that require certification
  const jobsRequiringCertification = [
    'ELECTRONICS ENGINEER',
    'ELECTRICAL ENGINEER', 
    'NETWORK TECHNICIAN'
  ];
  
  // Check if current job requires certification
  const requiresCertification = jobsRequiringCertification.includes(selectedJob.toUpperCase());

  // Header: user/profile state
  const [showDropdown, setShowDropdown] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', email: '', phone: '' });

  // State for user information - initialize with localStorage data
  const [userInfo, setUserInfo] = useState(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(storedUserInfo);
        console.log('CertificationManagement - Initializing userInfo with:', parsedUserInfo);
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

  // Function to load existing documents from Firebase
  const loadExistingDocuments = async () => {
    try {
      if (auth.currentUser) {
        const documents = await getApplicantDocuments(auth.currentUser.uid);
        const certificationDocs = documents.filter(doc => doc.documentType === 'certification');
        setUploadedDocuments(certificationDocs);
        console.log('Loaded existing certification documents:', certificationDocs);
      }
    } catch (error) {
      console.error('Error loading existing documents:', error);
    }
  };

  useEffect(() => {
    // Fetch user data from Firebase on component mount
    fetchUserDataFromFirebase();
    
    // Load existing documents
    loadExistingDocuments();
  }, []);

  // Separate useEffect for userInfo changes
  useEffect(() => {
    // Set user info from userInfo state
    setUserName(userInfo.name || '');
    setUserEmail(userInfo.email || '');
    console.log('CertificationManagement - User photoURL:', userInfo.photoURL);
  }, [userInfo]);

  // Close dropdown on outside click, Escape key, or window resize (for responsiveness)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showDropdown && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    const handleResize = () => {
      if (showDropdown) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [showDropdown]);

  const handleLogout = () => {
    setError('');
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

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (error) {
      setError('');
    }
    validateAndSetFiles(files);
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (error) {
      setError('');
    }
    validateAndSetFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = async () => {
        let maxWidth = 1200;
        let maxHeight = 800;
        let quality = 0.6;
        const targetSize = 800 * 1024; // 800KB target
        
        const compress = (width, height, q) => {
          return new Promise((res) => {
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(res, 'image/jpeg', q);
          });
        };
        
        let { width, height } = img;
        let ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
        
        let compressed = await compress(width, height, quality);
        
        // If still too large, reduce further
        while (compressed.size > targetSize && (quality > 0.1 || maxWidth > 400)) {
          if (quality > 0.1) {
            quality -= 0.1;
          } else {
            maxWidth *= 0.8;
            maxHeight *= 0.8;
            ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
            width = img.width * ratio;
            height = img.height * ratio;
          }
          compressed = await compress(width, height, quality);
        }
        
        resolve(compressed);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const validateAndSetFiles = async (files) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    let validFiles = [];
    let errorMsg = '';
    
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        errorMsg = 'Files must be in PDF, JPG or PNG format only.';
        break;
      } else if (file.size > maxSize) {
        errorMsg = 'Maximum file size is 5MB.';
        break;
      } else {
        let processedFile = file;
        
        // Compress images if they're larger than 500KB
        if ((file.type === 'image/jpeg' || file.type === 'image/png') && file.size > 500 * 1024) {
          try {
            const compressedBlob = await compressImage(file);
            processedFile = new File([compressedBlob], file.name.replace(/\.(png|jpg|jpeg)$/i, '.jpg'), { type: 'image/jpeg' });
            console.log(`Compressed ${file.name} from ${(file.size / 1024).toFixed(0)}KB to ${(processedFile.size / 1024).toFixed(0)}KB`);
          } catch (error) {
            console.warn('Failed to compress image:', error);
          }
        }
        
        validFiles.push(processedFile);
      }
    }
    
    if (errorMsg) {
      console.log('Setting error:', errorMsg);
      setError(errorMsg);
      return;
    } else {
      setError('');
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
    if (error) {
      setError('');
    }
  };

  const handleBack = () => {
    setError('');
    navigate('/pre-screening', { 
      state: { 
        showAdditionalInfo: true,
        showPreScreeningQuestions: true 
      } 
    });
  };

  const handleSkip = () => {
    // Navigate directly to ID verification if certification is not required
    navigate('/id-verification', { 
      state: { 
        selectedJob: selectedJob 
      } 
    });
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigate('/id-verification', { 
      state: { 
        selectedJob: selectedJob 
      } 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError('Please upload at least one valid certification file.');
      return;
    }
    
    setIsUploading(true);
    setError('');
    
    try {
      if (auth.currentUser) {
        console.log('Starting upload process for user:', auth.currentUser.uid);
        console.log('Files to upload (multiple allowed in single submission):', selectedFiles);

        // Before uploading, delete any existing certification documents for this user
        try {
          const existingDocs = await getApplicantDocuments(auth.currentUser.uid);
          const existingCerts = existingDocs.filter(doc => doc.documentType === 'certification');
          if (existingCerts.length > 0) {
            console.log('Found existing certification documents, deleting before upload:', existingCerts.map(d => d.id));
            for (const docItem of existingCerts) {
              try {
                await deleteApplicantDocument(docItem.id);
              } catch (delErr) {
                console.warn('Failed to delete existing certification doc', docItem.id, delErr);
              }
            }
          }
        } catch (preCheckErr) {
          console.warn('Error checking/deleting existing certification documents (proceeding with upload):', preCheckErr);
        }

        // Upload each selected file after cleanup
        const uploadedDocs = [];
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          try {
            setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
            const uploadPromise = uploadApplicantDocumentSimple(auth.currentUser.uid, file, 'certification');
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Upload timeout after 10 seconds')), 10000)
            );
            const uploadedDoc = await Promise.race([uploadPromise, timeoutPromise]);
            uploadedDocs.push(uploadedDoc);
          } catch (fileError) {
            console.error(`Error uploading file ${file.name}:`, fileError);
            throw new Error(`Failed to upload ${file.name}: ${fileError.message}`);
          }
        }

        // Replace any existing state with the new batch
        setUploadedDocuments(uploadedDocs);
        setSelectedFiles([]);
        setUploadProgress(100);
        setUploadedFilesCount(uploadedDocs.length);
        
        // Show success modal instead of alert
        setShowSuccessModal(true);
      } else {
        setError('User not authenticated. Please log in again.');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setError(`Failed to upload files: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="cert-mgmt-container">
      {/* Header */}
      <header className="pre-screening-header">
        <div className="header-left">
          <img src={logoImg} alt="PBS Logo" className="pre-screening-logo" />
          <div className="company-info">
            <span className="company-name">PBS ENGINEERING SERVICES</span>
          </div>
        </div>
        <nav className="pre-screening-nav">
          <a href="#" className="active" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>DASHBOARD</a>
          <div className="profile-dropdown" ref={dropdownRef}>
            <div
              className="profile-header"
              role="button"
              aria-haspopup="menu"
              aria-expanded={showDropdown}
              aria-controls="profile-menu"
              tabIndex={0}
              onClick={() => setShowDropdown(!showDropdown)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowDropdown((prev) => !prev);
                }
              }}
            >
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
                    onLoad={() => console.log('CertificationManagement - Profile picture loaded:', userInfo.photoURL || userIcon)}
                    onError={(e) => {
                      console.log('CertificationManagement - Profile picture failed to load, using fallback');
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
              <div className="dropdown-menu" id="profile-menu" role="menu">
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
                        console.log('CertificationManagement - Dropdown profile picture failed to load, using fallback');
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
                  <button onClick={handleProfileClick} role="menuitem">
                    <span className="menu-icon">👤</span>
                    Profile
                  </button>
                  <button onClick={handleSettingsClick} role="menuitem">
                    <span className="menu-icon">⚙️</span>
                    Settings
                  </button>
                  <hr className="dropdown-separator" />
                  <button onClick={handleLogout} className="logout-btn" role="menuitem">
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
      <div className="cert-mgmt-main">
        <div className="cert-mgmt-header-container">
          <h1 className="cert-mgmt-main-title">Upload Certification</h1>
          <h2 className="cert-mgmt-title">New Certificate</h2>
          <div className="cert-mgmt-subtitle">
            {requiresCertification ? (
              <p>Upload your professional certification to enhance your profile and job prospects</p>
            ) : (
              <p>This position does not require professional certification, but you may upload relevant certificates to enhance your application. You can also skip this step.</p>
            )}
            <p><strong>Selected Job: {selectedJob || 'No job selected'}</strong></p>
          </div>
        </div>
        <div className="upload-section">
          <div
            className={`upload-drop-area${error ? ' has-error' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={selectedFiles.length === 0 ? handleBrowseClick : undefined}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileChange}
            />
            {selectedFiles.length === 0 ? (
              <>
                <div className="upload-icon">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none"><path d="M12 16V4M12 4L7 9M12 4L7 9M12 4l5 5" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="16" width="18" height="4" rx="2" fill="#222" fillOpacity="0.1"/></svg>
                </div>
                <div className="upload-text">
                  <strong>Drag & Drop Files</strong>
                  <div>or click to browse files (PDF, JPG, PNG)</div>
                  <button type="button" className="browse-btn" onClick={handleBrowseClick}>Browse Files</button>
                </div>
              </>
            ) : (
              <div className="file-card-list">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="file-card">
                    <div className="file-card-thumb">
                      {file.type === 'application/pdf' ? (
                        <div className="file-thumb-icon">
                          <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#1976d2" strokeWidth="2"/>
                            <polyline points="14,2 14,8 20,8" stroke="#1976d2" strokeWidth="2"/>
                            <path d="M9 13h6" stroke="#1976d2" strokeWidth="2"/>
                            <path d="M9 17h6" stroke="#1976d2" strokeWidth="2"/>
                            <path d="M9 9h1" stroke="#1976d2" strokeWidth="2"/>
                          </svg>
                        </div>
                      ) : (
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt="File preview" 
                          className="file-thumb-img"
                        />
                      )}
                    </div>
                    <div className="file-card-info">
                      <div className="file-card-name">{file.name}</div>
                      <div className="file-card-type">{file.type}</div>
                      <div className="file-card-size">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    <div className="file-card-actions">
                      <button 
                        className="file-action-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                          if (error) {
                            setError('');
                          }
                        }}
                        title="Remove file"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedFiles.length > 0 && (
              <div className="upload-more-container">
                <button 
                  className="browse-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBrowseClick();
                  }}
                >
                  Upload More Files
                </button>
              </div>
            )}
          </div>
          {error && <div className="error-wrapper"><div className="error-message">{error}</div></div>}
        </div>
        

        <div className="cert-guidelines">
          <h3>Certification Guidelines</h3>
          <ul>
            <li>Files must be in PDF, JPG or PNG format</li>
            <li>Maximum file size is 5MB</li>
            <li>Certification must be clearly visible and include your name</li>
          </ul>
        </div>

        {/* Action Buttons - Now inside main container */}
        <div className="cert-mgmt-actions">
          <button className="back-btn" onClick={handleBack} disabled={isUploading}>← BACK</button>
          {requiresCertification ? (
            <button 
              className="submit-btn required-cert" 
              onClick={handleSubmit} 
              disabled={isUploading}
            >
              {isUploading ? 'UPLOADING...' : 'CONTINUE →'}
            </button>
          ) : (
            <>
              {selectedFiles.length === 0 ? (
                <button 
                  className="skip-btn" 
                  onClick={handleSkip}
                  disabled={isUploading}
                >
                  SKIP
                </button>
              ) : (
                <button 
                  className="submit-btn" 
                  onClick={handleSubmit} 
                  disabled={isUploading}
                >
                  {isUploading ? 'UPLOADING...' : 'CONTINUE →'}
                </button>
              )}
            </>
          )}
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
        <div className="upload-success-overlay" onClick={handleSuccessModalClose}>
          <div className="upload-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-checkmark">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="success-title">Upload Successful!</h2>
            <p className="success-message">Your certification files have been uploaded successfully.</p>
            <div className="success-details">
              <div className="success-file-count">
                {uploadedFilesCount} file{uploadedFilesCount !== 1 ? 's' : ''} uploaded
              </div>
              <div className="success-file-info">
                Your documents are now being processed and will be reviewed by our team.
              </div>
            </div>
            <button className="success-close-btn" onClick={handleSuccessModalClose}>
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificationManagement; 