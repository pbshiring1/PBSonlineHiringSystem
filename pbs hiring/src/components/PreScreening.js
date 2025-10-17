import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PreScreening.css';
import logoImg from './pic/488604347_2675430962655935_1675751460889163498_n-removebg-preview.png';
import userIcon from './pic/user (2).png';
import Settings from './Settings';
import { getApplicantPersonalInfo, saveApplicantPersonalInfo, updateApplicantProfile, saveApplicantExamResults } from '../firebase';
import { auth } from '../firebase';

const PreScreening = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState('personal-info'); // 'personal-info' or 'questions'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    suffix: '',
    email: '',
    countryCode: '+63',
    phoneNumber: '',
    educationalAttainment: '',
    dateOfBirth: '',
    yearsOfExperience: '',
    province: '',
    city: ''
  });

  const [focusedFields, setFocusedFields] = useState({
    firstName: false,
    lastName: false,
    middleName: false,
    suffix: false,
    email: false,
    phoneNumber: false,
    educationalAttainment: false,
    dateOfBirth: false,
    yearsOfExperience: false,
    province: false,
    city: false
  });

  // Inline error for age input
  const [ageError, setAgeError] = useState('');

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Additional essay answers
  const [essayAnswers, setEssayAnswers] = useState({
    experienceSummary: '',
    motivation: ''
  });

  // Track radio answers for questions step
  const [questionsAnswers, setQuestionsAnswers] = useState({
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: '', q9: '', q10: ''
  });

  const [currentPage, setCurrentPage] = useState(0);
  const questionsPerPage = 2; // Show 2 questions per page to fit screen

  // Scoring system configuration
  const scoringSystem = {
    q1: { A: 0, B: 3, C: 2, D: 1 }, // Safety rules
    q2: { A: 3, B: 2, C: 1, D: 0 }, // Reliability
    q3: { A: 3, B: 2, C: 1, D: 0 }, // Instructions clarity
    q4: { A: 3, B: 1, C: 0, D: 2 }, // Safety vs speed
    q5: { A: 3, B: 1, C: 0, D: 2 }, // Teamwork
    q6: { A: 2, B: 1, C: 0, D: 3 }, // Tools handling
    q7: { A: 3, B: 1, C: 0, D: 2 }, // Leave permission
    q8: { A: 1, B: 3, C: 0, D: 0 }, // Error handling
    q9: { A: 3, B: 2, C: 1, D: 0 }, // Growth trait
    q10: { A: 1, B: 3, C: 0, D: 2 } // Materials shortage
  };

  // Questions data
  const examQuestions = [
    {
      id: 'q1',
      question: 'If you see a co-worker not following safety rules, what should you do?',
      options: [
        { value: 'A', text: 'Continue working, it\'s not your concern' },
        { value: 'B', text: 'Report to supervisor immediately' },
        { value: 'C', text: 'Remind them politely and continue working' },
        { value: 'D', text: 'Wait to see if it causes a problem' }
      ]
    },
    {
      id: 'q2',
      question: 'How do you best show reliability at work?',
      options: [
        { value: 'A', text: 'Arrive on time, prepared for work' },
        { value: 'B', text: 'Stay late to finish tasks if needed' },
        { value: 'C', text: 'Work fast even if you arrive late' },
        { value: 'D', text: 'Never take breaks during shifts' }
      ]
    },
    {
      id: 'q3',
      question: 'If instructions from your supervisor are unclear, what would you do?',
      options: [
        { value: 'A', text: 'Ask for clarification' },
        { value: 'B', text: 'Try to figure it out alone to save time' },
        { value: 'C', text: 'Follow what your co-worker is doing' },
        { value: 'D', text: 'Do only the parts you understand' }
      ]
    },
    {
      id: 'q4',
      question: 'When you are given a task that must be done quickly but seems unsafe, how should you respond?',
      options: [
        { value: 'A', text: 'Complete it safely, even if slower' },
        { value: 'B', text: 'Do it fast since it\'s urgent' },
        { value: 'C', text: 'Wait for another person to do it' },
        { value: 'D', text: 'Inform your supervisor before starting' }
      ]
    },
    {
      id: 'q5',
      question: 'When working with different trades (electricians, welders, masons, etc.), what ensures success?',
      options: [
        { value: 'A', text: 'Teamwork and cooperation' },
        { value: 'B', text: 'Finishing your own work only' },
        { value: 'C', text: 'Competing to be the fastest' },
        { value: 'D', text: 'Avoiding communication to stay focused' }
      ]
    },
    {
      id: 'q6',
      question: 'How should company tools and equipment be handled?',
      options: [
        { value: 'A', text: 'Return them properly after use' },
        { value: 'B', text: 'Keep them close in case you need them again' },
        { value: 'C', text: 'Share them freely with anyone outside' },
        { value: 'D', text: 'Use company property responsibly' }
      ]
    },
    {
      id: 'q7',
      question: 'If you need to leave the site during working hours, what is the most proper step?',
      options: [
        { value: 'A', text: 'Ask permission first' },
        { value: 'B', text: 'Inform your coworker only' },
        { value: 'C', text: 'Leave quickly and return fast' },
        { value: 'D', text: 'Wait until lunch break to go' }
      ]
    },
    {
      id: 'q8',
      question: 'If you make an error in your work, how should you handle it?',
      options: [
        { value: 'A', text: 'Fix it quietly without telling anyone' },
        { value: 'B', text: 'Be honest and admit mistakes' },
        { value: 'C', text: 'Wait until someone else notices' },
        { value: 'D', text: 'Blame unclear instructions' }
      ]
    },
    {
      id: 'q9',
      question: 'What is the most valuable trait for long-term growth in a company?',
      options: [
        { value: 'A', text: 'Willingness to learn and improve' },
        { value: 'B', text: 'Following instructions only' },
        { value: 'C', text: 'Doing only what you are trained for' },
        { value: 'D', text: 'Avoiding new skills to stay efficient' }
      ]
    },
    {
      id: 'q10',
      question: 'If you run out of materials while working, what should you do?',
      options: [
        { value: 'A', text: 'Stop working until more arrive' },
        { value: 'B', text: 'Inform supervisor and suggest a solution' },
        { value: 'C', text: 'Borrow from another team without asking' },
        { value: 'D', text: 'Continue with whatever is available' }
      ]
    }
  ];

  // Errors for questions step only
  const [errors, setErrors] = useState({ questions: {} });

  // Convert numeric years to display range for the dropdown
  const convertYearsToRange = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const str = String(value);
    if (str.includes('-') || str.includes('+')) return str; // already a range
    const num = Number(str);
    if (Number.isNaN(num)) return '';
    if (num <= 2) return '0-2';
    if (num <= 4) return '3-4';
    if (num <= 6) return '5-6';
    if (num <= 8) return '7-8';
    if (num <= 10) return '9-10';
    return '10+';
  };

  // Step container ref for auto-scroll
  const stepContainerRef = useRef(null);

  // Profile dropdown and user info
  const [showDropdown, setShowDropdown] = useState(false);
  
  // State for user information - initialize with localStorage data
  const [userInfo, setUserInfo] = useState(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(storedUserInfo);
        console.log('PreScreening - Initializing userInfo with:', parsedUserInfo);
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
  
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Profile edit modal state
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const clearQuestionError = (key) => {
    setErrors((prev) => {
      const current = prev?.questions || {};
      if (!current[key]) return prev;
      const nextQuestions = { ...current };
      delete nextQuestions[key];
      return { ...prev, questions: nextQuestions };
    });
  };

  // Calculate exam score
  const calculateExamScore = () => {
    let totalScore = 0;
    const questionScores = {};
    
    examQuestions.forEach(question => {
      const answer = questionsAnswers[question.id];
      if (answer) {
        const points = scoringSystem[question.id][answer] || 0;
        questionScores[question.id] = {
          answer,
          points,
          maxPoints: 3
        };
        totalScore += points;
      }
    });
    
    return { totalScore, questionScores, maxTotalScore: 30 };
  };

  // Get ranking based on score
  const getRanking = (score) => {
    if (score >= 26) return 'Excellent Candidate';
    if (score >= 21) return 'Strong Candidate';
    if (score >= 15) return 'Average Candidate';
    return 'Weak Candidate';
  };

  // Function to fetch applicant personal info from applicantInfo
  const fetchUserDataFromFirebase = async () => {
    try {
      if (auth.currentUser) {
        const personal = await getApplicantPersonalInfo(auth.currentUser.uid);
        console.log('Fetched applicant personal info:', personal);

        // Fallbacks from auth if some fields are missing
        const fallbackName = auth.currentUser.displayName || (auth.currentUser.email ? auth.currentUser.email.split('@')[0] : '');
        const fallbackEmail = auth.currentUser.email || '';

        // Parse Gmail displayName if personal info is empty
        let firstName = personal.firstName || '';
        let lastName = personal.lastName || '';
        
        if (!firstName && !lastName && fallbackName) {
          const nameParts = fallbackName.trim().split(' ');
          if (nameParts.length >= 2) {
            firstName = nameParts[0];
            lastName = nameParts[nameParts.length - 1];
          } else if (nameParts.length === 1) {
            firstName = nameParts[0];
          }
        }

        // Update form data with fetched personal info
        // Extract phone number without +63 prefix if it exists
        let phoneNumber = personal.phoneNumber || '';
        if (phoneNumber.startsWith('+63')) {
          phoneNumber = phoneNumber.substring(3);
        }
        
        setFormData(prev => ({
          ...prev,
          firstName: firstName,
          lastName: lastName,
          middleName: personal.middleName || '',
          suffix: personal.suffix || '',
          email: personal.email || fallbackEmail || '',
          phoneNumber: phoneNumber,
          countryCode: personal.countryCode || '+63',
          educationalAttainment: personal.educationalAttainment || '',
          dateOfBirth: personal.dateOfBirth || '',
          yearsOfExperience: personal.yearsOfExperience || ''
        }));

        // Only keep minimal info in userInfo for header display
        const updatedUserInfo = {
          name: auth.currentUser.displayName || fallbackName || '',
          email: personal.email || fallbackEmail || '',
          photoURL: auth.currentUser.photoURL || null,
          role: JSON.parse(localStorage.getItem('userInfo') || '{}').role || 'applicant'
        };
        setUserInfo(updatedUserInfo);
        localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
      }
    } catch (error) {
      console.error('Error fetching user data from Firebase:', error);
    }
  };

  // Function to save pre-screening personal info to applicantInfo
  const saveToFirebase = useCallback(async () => {
    try {
      if (auth.currentUser && formData.phoneNumber && formData.educationalAttainment && formData.province && formData.city) {
        const preScreeningData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          middleName: formData.middleName,
          suffix: formData.suffix,
          email: formData.email,
          phoneNumber: `+63${formData.phoneNumber}`, // Store with +63 prefix
          countryCode: formData.countryCode,
          educationalAttainment: formData.educationalAttainment,
          birthday: formData.dateOfBirth,
          yearsOfExperience: formData.yearsOfExperience,
          province: formData.province,
          city: formData.city
        };

        console.log('📤 Saving to Firebase:', preScreeningData);
        await saveApplicantPersonalInfo(auth.currentUser.uid, preScreeningData);
        console.log('✅ Pre-screening personal info saved to applicantInfo successfully');
      } else {
        console.log('⚠️ Not saving to Firebase - missing required data:', {
          hasUser: !!auth.currentUser,
          hasPhone: !!formData.phoneNumber,
          hasEducation: !!formData.educationalAttainment,
          hasProvince: !!formData.province,
          hasCity: !!formData.city
        });
      }
    } catch (error) {
      console.error('❌ Error saving pre-screening data to Firebase:', error);
    }
  }, [formData.firstName, formData.lastName, formData.middleName, formData.suffix, formData.email, formData.phoneNumber, formData.countryCode, formData.educationalAttainment, formData.dateOfBirth, formData.yearsOfExperience, formData.province, formData.city]);

  useEffect(() => {
    // Fetch user data from Firebase on component mount
    fetchUserDataFromFirebase();
  }, []);

  // Separate useEffect for userInfo changes
  useEffect(() => {
    // Set user info from userInfo state
    setUserName(userInfo.name || '');
    setUserEmail(userInfo.email || '');
    console.log('PreScreening - User photoURL:', userInfo.photoURL);
  }, [userInfo]);

  // Auto-save to Firebase when phone number, educational attainment, dateOfBirth, years of experience, province, and city are filled
  useEffect(() => {
    console.log('🔄 Form data changed:', {
      phoneNumber: formData.phoneNumber,
      educationalAttainment: formData.educationalAttainment,
      dateOfBirth: formData.dateOfBirth,
      yearsOfExperience: formData.yearsOfExperience,
      province: formData.province,
      city: formData.city
    });
    
    if (formData.phoneNumber && formData.educationalAttainment && formData.dateOfBirth && formData.yearsOfExperience && formData.province && formData.city) {
      console.log('✅ All required fields filled - triggering auto-save');
      saveToFirebase();
    } else {
      console.log('⚠️ Auto-save not triggered - missing required fields');
    }
  }, [formData.phoneNumber, formData.educationalAttainment, formData.dateOfBirth, formData.yearsOfExperience, formData.province, formData.city, saveToFirebase]);

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
        // Fetch personal/profile data from applicantInfo
        const personal = await getApplicantPersonalInfo(auth.currentUser.uid);
        console.log('Fetched profile data from applicantInfo:', personal);

        const fullName = [personal.firstName, personal.middleName, personal.lastName, personal.suffix]
          .filter(Boolean)
          .join(' ');
        setProfileData({
          name: fullName || userInfo.name || '',
          email: personal.email || userInfo.email || '',
          phone: personal.phoneNumber || '',
          // location and bio may be stored under a separate profile section; fallback to local values if any
          location: userInfo.location || localStorage.getItem('userLocation') || '',
          bio: userInfo.bio || localStorage.getItem('userBio') || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile data from Firebase:', error);
      // Fallback to localStorage if Firebase fails
      setProfileData({
        name: userInfo.name || '',
        email: userInfo.email || '',
        phone: localStorage.getItem('userPhone') || '',
        location: localStorage.getItem('userLocation') || '',
        bio: localStorage.getItem('userBio') || ''
      });
    }
    setShowDropdown(false);
    setShowProfileEdit(true);
  };

  const handleProfileSave = async () => {
    // Validate phone number (must be exactly 10 digits after +63)
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
        
        await updateApplicantProfile(auth.currentUser.uid, profileUpdateData);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10 && (value === '' || value.startsWith('9'))) {
      console.log('📱 Phone number updated:', value, '-> Will be stored as:', `+63${value}`);
      setFormData(prev => ({
        ...prev,
        phoneNumber: value
      }));
    }
  };

  const handleFocus = (fieldName) => {
    setFocusedFields(prev => ({
      ...prev,
      [fieldName]: true
    }));
  };

  const handleBlur = (fieldName) => {
    setFocusedFields(prev => ({
      ...prev,
      [fieldName]: false
    }));
  };

  const isLabelFloating = (fieldName) => {
    return focusedFields[fieldName] || formData[fieldName] !== '';
  };

  const getInputClassName = (fieldName) => {
    return isLabelFloating(fieldName) ? 'has-content' : '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate phone number format
    const phoneRegex = /^9\d{9}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      alert('Phone number must be exactly 10 digits starting with 9');
      return;
    }
    
    // Validate age from date of birth
    const age = calculateAge(formData.dateOfBirth);
    if (!age || age < 20 || age > 65) {
      setAgeError(!age || age < 20 ? 'Age must be 20 or above.' : 'Age must be 65 or below.');
      alert('Age must be between 20 and 65 years old');
      return;
    }
    
    // Validate years of experience
    if (!formData.yearsOfExperience) {
      alert('Please select your years of experience');
      return;
    }
    
    // Transition to questions and auto-scroll to top of container
    setCurrentStep('questions');
    setTimeout(() => {
      if (stepContainerRef.current) {
        stepContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 0);
  };

  const handleQuestionsSubmit = async () => {
    const newQuestionsErrors = {};

    // Validate all exam questions are answered with per-question numbering
    examQuestions.forEach((question, index) => {
      if (!questionsAnswers[question.id]) {
        newQuestionsErrors[question.id] = `Please answer question ${index + 1} before continuing.`;
      }
    });

    if (Object.keys(newQuestionsErrors).length > 0) {
      setErrors(prev => ({ ...prev, questions: newQuestionsErrors }));
      setCurrentStep('questions');
      setTimeout(() => {
        if (stepContainerRef.current) {
          stepContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 0);
      return;
    }

    // Calculate exam score
    const { totalScore, questionScores, maxTotalScore } = calculateExamScore();
    const ranking = getRanking(totalScore);

    try {
      if (auth.currentUser) {
        // Save exam results to applicantInfo collection
        const examData = {
          uid: auth.currentUser.uid,
          firstName: formData.firstName,
          lastName: formData.lastName,
          middleName: formData.middleName,
          suffix: formData.suffix,
          email: formData.email,
          phoneNumber: `+63${formData.phoneNumber}`, // Store with +63 prefix
          countryCode: formData.countryCode,
          educationalAttainment: formData.educationalAttainment,
          birthday: formData.dateOfBirth,
          yearsOfExperience: formData.yearsOfExperience,
          province: formData.province,
          city: formData.city,
          examAnswers: questionsAnswers,
          examScores: questionScores,
          totalScore,
          maxTotalScore,
          ranking,
          examCompletedAt: new Date()
        };

        await saveApplicantExamResults(auth.currentUser.uid, examData);
        console.log('Exam results saved successfully:', { totalScore, ranking });
      }
    } catch (error) {
      console.error('Error saving exam results:', error);
      alert('Error saving exam results. Please try again.');
      return;
    }

    // Clear question errors and proceed
    setErrors(prev => ({ ...prev, questions: {} }));
    
    // Get selected job from location state
    const selectedJob = location.state?.selectedJob || '';
    navigate('/certification-management', { 
      state: { 
        selectedJob: selectedJob 
      } 
    });
  };

  const handleBack = () => {
    if (currentStep === 'questions') {
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
      } else {
        setCurrentStep('personal-info');
        setTimeout(() => {
          if (stepContainerRef.current) {
            stepContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 0);
      }
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="pre-screening-container">
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
                    onLoad={() => console.log('PreScreening - Profile picture loaded:', userInfo.photoURL || userIcon)}
                    onError={(e) => {
                      console.log('PreScreening - Profile picture failed to load, using fallback');
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
                        console.log('PreScreening - Dropdown profile picture failed to load, using fallback');
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

      {/* Personal Information Container */}
      <div className={`personal-info-container ${currentStep === 'personal-info' ? 'active' : 'hidden'}`}>
        <h1 className="pre-screening-main-title">Personal Information</h1>
        <p className="pre-screening-subtitle">Please provide your basic contact information to continue</p>
        <div className="selected-position">
          <span className="selected-position-text">SELECTED POSITION: {(location.state?.selectedJob || 'TECHNICIAN').toString().toUpperCase()}</span>
        </div>
        
        <form onSubmit={handleSubmit} className="pre-screening-form" id="preScreeningForm">
          {/* Personal Name Section */}
          <div className="form-section">
            <div className="section-header">
              <h3 className="section-title">Personal Name</h3>
            </div>
            <div className="name-row">
              <div className="form-group">
                <label htmlFor="firstName">FIRST NAME *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  onFocus={() => handleFocus('firstName')}
                  onBlur={() => handleBlur('firstName')}
                  placeholder=""
                  className={getInputClassName('firstName')}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="middleName">MIDDLE NAME</label>
                <input
                  type="text"
                  id="middleName"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  onFocus={() => handleFocus('middleName')}
                  onBlur={() => handleBlur('middleName')}
                  placeholder=""
                  className={getInputClassName('middleName')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">LAST NAME *</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  onFocus={() => handleFocus('lastName')}
                  onBlur={() => handleBlur('lastName')}
                  placeholder=""
                  className={getInputClassName('lastName')}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="suffix">SUFFIX</label>
                <select
                  id="suffix"
                  name="suffix"
                  value={formData.suffix}
                  onChange={handleInputChange}
                  onFocus={() => handleFocus('suffix')}
                  onBlur={() => handleBlur('suffix')}
                  className={getInputClassName('suffix')}
                >
                  <option value="">None</option>
                  <option value="Jr.">Jr.</option>
                  <option value="Sr.">Sr.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                  <option value="V">V</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="form-section">
            <div className="section-header">
              <h3 className="section-title">Contact Information</h3>
            </div>
            <div className="contact-row">
              <div className="form-group">
                <label htmlFor="phoneNumber">PHONE NUMBER *</label>
                <div className="phone-input-container">
                  <span className="phone-prefix">+63</span>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="09XXXXXXXXX"
                    maxLength="10"
                    className="phone-number-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">EMAIL ADDRESS *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onFocus={() => handleFocus('email')}
                  onBlur={() => handleBlur('email')}
                  placeholder=""
                  className={`${getInputClassName('email')} disabled-input`}
                  required
                  disabled
                  readOnly
                />
              </div>

              <div className="form-group">
                <label htmlFor="dateOfBirth">DATE OF BIRTH *</label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  onFocus={() => handleFocus('dateOfBirth')}
                  onBlur={() => handleBlur('dateOfBirth')}
                  className={getInputClassName('dateOfBirth')}
                  min={new Date(new Date().getFullYear() - 65, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                  max={new Date(new Date().getFullYear() - 20, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                  required
                />
                {ageError && (
                  <div className="error-message" style={{ color: '#e11d48', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    {ageError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Background Information Section */}
          <div className="form-section">
            <div className="section-header">
              <h3 className="section-title">Background Information</h3>
            </div>
            <div className="background-row">
              <div className="form-group">
                <label htmlFor="educationalAttainment">EDUCATIONAL ATTAINMENT *</label>
                <select
                  id="educationalAttainment"
                  name="educationalAttainment"
                  value={formData.educationalAttainment}
                  onChange={handleInputChange}
                  onFocus={() => handleFocus('educationalAttainment')}
                  onBlur={() => handleBlur('educationalAttainment')}
                  className={getInputClassName('educationalAttainment')}
                  required
                >
                  <option value="" disabled>Select educational level</option>
                  <option value="elementary">Elementary</option>
                  <option value="high-school">High School</option>
                  <option value="vocational">Vocational/Technical</option>
                  <option value="associate">Associate Degree</option>
                  <option value="bachelor">Bachelor's Degree</option>
                  <option value="master">Master's Degree</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="yearsOfExperience">YEARS OF EXPERIENCE *</label>
                <input
                  type="number"
                  id="yearsOfExperience"
                  name="yearsOfExperience"
                  value={formData.yearsOfExperience}
                  onChange={handleInputChange}
                  onFocus={() => handleFocus('yearsOfExperience')}
                  onBlur={() => handleBlur('yearsOfExperience')}
                  placeholder=""
                  className={getInputClassName('yearsOfExperience')}
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="province">PROVINCE *</label>
                <select
                  id="province"
                  name="province"
                  value={formData.province || ''}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      province: e.target.value,
                      city: ''
                    }));
                  }}
                  onFocus={() => handleFocus('province')}
                  onBlur={() => handleBlur('province')}
                  className={getInputClassName('province')}
                  required
                >
                  <option value="" disabled>Select province</option>
                  <option value="Abra">Abra</option>
                  <option value="Agusan del Norte">Agusan del Norte</option>
                <option value="Agusan del Sur">Agusan del Sur</option>
                <option value="Aklan">Aklan</option>
                <option value="Albay">Albay</option>
                <option value="Antique">Antique</option>
                <option value="Apayao">Apayao</option>
                <option value="Aurora">Aurora</option>
                <option value="Basilan">Basilan</option>
                <option value="Bataan">Bataan</option>
                <option value="Batanes">Batanes</option>
                <option value="Batangas">Batangas</option>
                <option value="Benguet">Benguet</option>
                <option value="Biliran">Biliran</option>
                <option value="Bohol">Bohol</option>
                <option value="Bukidnon">Bukidnon</option>
                <option value="Bulacan">Bulacan</option>
                <option value="Cagayan">Cagayan</option>
                <option value="Camarines Norte">Camarines Norte</option>
                <option value="Camarines Sur">Camarines Sur</option>
                <option value="Camiguin">Camiguin</option>
                <option value="Capiz">Capiz</option>
                <option value="Catanduanes">Catanduanes</option>
                <option value="Cavite">Cavite</option>
                <option value="Cebu">Cebu</option>
                <option value="Cotabato">Cotabato</option>
                <option value="Davao de Oro">Davao de Oro</option>
                <option value="Davao del Norte">Davao del Norte</option>
                <option value="Davao del Sur">Davao del Sur</option>
                <option value="Davao Occidental">Davao Occidental</option>
                <option value="Davao Oriental">Davao Oriental</option>
                <option value="Dinagat Islands">Dinagat Islands</option>
                <option value="Eastern Samar">Eastern Samar</option>
                <option value="Guimaras">Guimaras</option>
                <option value="Ifugao">Ifugao</option>
                <option value="Ilocos Norte">Ilocos Norte</option>
                <option value="Ilocos Sur">Ilocos Sur</option>
                <option value="Iloilo">Iloilo</option>
                <option value="Isabela">Isabela</option>
                <option value="Kalinga">Kalinga</option>
                <option value="La Union">La Union</option>
                <option value="Laguna">Laguna</option>
                <option value="Lanao del Norte">Lanao del Norte</option>
                <option value="Lanao del Sur">Lanao del Sur</option>
                <option value="Leyte">Leyte</option>
                <option value="Maguindanao">Maguindanao</option>
                <option value="Marinduque">Marinduque</option>
                <option value="Masbate">Masbate</option>
                <option value="Metro Manila">Metro Manila</option>
                <option value="Misamis Occidental">Misamis Occidental</option>
                <option value="Misamis Oriental">Misamis Oriental</option>
                <option value="Mountain Province">Mountain Province</option>
                <option value="Negros Occidental">Negros Occidental</option>
                <option value="Negros Oriental">Negros Oriental</option>
                <option value="Northern Samar">Northern Samar</option>
                <option value="Nueva Ecija">Nueva Ecija</option>
                <option value="Nueva Vizcaya">Nueva Vizcaya</option>
                <option value="Occidental Mindoro">Occidental Mindoro</option>
                <option value="Oriental Mindoro">Oriental Mindoro</option>
                <option value="Palawan">Palawan</option>
                <option value="Pampanga">Pampanga</option>
                <option value="Pangasinan">Pangasinan</option>
                <option value="Quezon">Quezon</option>
                <option value="Quirino">Quirino</option>
                <option value="Rizal">Rizal</option>
                <option value="Romblon">Romblon</option>
                <option value="Samar">Samar</option>
                <option value="Sarangani">Sarangani</option>
                <option value="Siquijor">Siquijor</option>
                <option value="Sorsogon">Sorsogon</option>
                <option value="South Cotabato">South Cotabato</option>
                <option value="Southern Leyte">Southern Leyte</option>
                <option value="Sultan Kudarat">Sultan Kudarat</option>
                <option value="Sulu">Sulu</option>
                <option value="Surigao del Norte">Surigao del Norte</option>
                <option value="Surigao del Sur">Surigao del Sur</option>
                <option value="Tarlac">Tarlac</option>
                <option value="Tawi-Tawi">Tawi-Tawi</option>
                <option value="Zambales">Zambales</option>
                <option value="Zamboanga del Norte">Zamboanga del Norte</option>
                <option value="Zamboanga del Sur">Zamboanga del Sur</option>
                <option value="Zamboanga Sibugay">Zamboanga Sibugay</option>
              </select>
            </div>
            
              <div className="form-group">
                <label htmlFor="city">CITY/MUNICIPALITY *</label>
                <select
                  id="city"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleInputChange}
                  onFocus={() => handleFocus('city')}
                  onBlur={() => handleBlur('city')}
                  className={getInputClassName('city')}
                  required
                  disabled={!formData.province}
                >
                <option value="" disabled></option>
                {formData.province === 'Abra' && (
                  <>
                    <option value="Bangued">Bangued</option>
                    <option value="Boliney">Boliney</option>
                    <option value="Bucay">Bucay</option>
                    <option value="Bucloc">Bucloc</option>
                    <option value="Daguioman">Daguioman</option>
                    <option value="Danglas">Danglas</option>
                    <option value="Dolores">Dolores</option>
                    <option value="La Paz">La Paz</option>
                    <option value="Lacub">Lacub</option>
                    <option value="Lagangilang">Lagangilang</option>
                    <option value="Lagayan">Lagayan</option>
                    <option value="Langiden">Langiden</option>
                    <option value="Licuan-Baay">Licuan-Baay</option>
                    <option value="Luba">Luba</option>
                    <option value="Malibcong">Malibcong</option>
                    <option value="Manabo">Manabo</option>
                    <option value="Penarrubia">Penarrubia</option>
                    <option value="Pidigan">Pidigan</option>
                    <option value="Pilar">Pilar</option>
                    <option value="Sallapadan">Sallapadan</option>
                    <option value="San Isidro">San Isidro</option>
                    <option value="San Juan">San Juan</option>
                    <option value="San Quintin">San Quintin</option>
                    <option value="Tayum">Tayum</option>
                    <option value="Tineg">Tineg</option>
                    <option value="Tubo">Tubo</option>
                    <option value="Villaviciosa">Villaviciosa</option>
                  </>
                )}
                {formData.province === 'Agusan del Norte' && (
                  <>
                    <option value="Buenavista">Buenavista</option>
                    <option value="Butuan">Butuan</option>
                    <option value="Cabadbaran">Cabadbaran</option>
                    <option value="Carmen">Carmen</option>
                    <option value="Jabonga">Jabonga</option>
                    <option value="Kitcharao">Kitcharao</option>
                    <option value="Las Nieves">Las Nieves</option>
                    <option value="Magallanes">Magallanes</option>
                    <option value="Nasipit">Nasipit</option>
                    <option value="Remedios T. Romualdez">Remedios T. Romualdez</option>
                    <option value="Santiago">Santiago</option>
                    <option value="Tubay">Tubay</option>
                  </>
                )}
                {formData.province === 'Agusan del Sur' && (
                  <>
                    <option value="Bayugan">Bayugan</option>
                    <option value="Bunawan">Bunawan</option>
                    <option value="Esperanza">Esperanza</option>
                    <option value="La Paz">La Paz</option>
                    <option value="Loreto">Loreto</option>
                    <option value="Prosperidad">Prosperidad</option>
                    <option value="Rosario">Rosario</option>
                    <option value="San Francisco">San Francisco</option>
                    <option value="San Luis">San Luis</option>
                    <option value="Santa Josefa">Santa Josefa</option>
                    <option value="Sibagat">Sibagat</option>
                    <option value="Talacogon">Talacogon</option>
                    <option value="Trento">Trento</option>
                    <option value="Veruela">Veruela</option>
                  </>
                )}
                {formData.province === 'Aklan' && (
                  <>
                    <option value="Altavas">Altavas</option>
                    <option value="Balete">Balete</option>
                    <option value="Banga">Banga</option>
                    <option value="Batan">Batan</option>
                    <option value="Buruanga">Buruanga</option>
                    <option value="Ibajay">Ibajay</option>
                    <option value="Kalibo">Kalibo</option>
                    <option value="Lezo">Lezo</option>
                    <option value="Libacao">Libacao</option>
                    <option value="Madalag">Madalag</option>
                    <option value="Makato">Makato</option>
                    <option value="Malay">Malay</option>
                    <option value="Malinao">Malinao</option>
                    <option value="Nabas">Nabas</option>
                    <option value="New Washington">New Washington</option>
                    <option value="Numancia">Numancia</option>
                    <option value="Tangalan">Tangalan</option>
                  </>
                )}
                {formData.province === 'Albay' && (
                  <>
                    <option value="Bacacay">Bacacay</option>
                    <option value="Camalig">Camalig</option>
                    <option value="Daraga">Daraga</option>
                    <option value="Guinobatan">Guinobatan</option>
                    <option value="Jovellar">Jovellar</option>
                    <option value="Legazpi">Legazpi</option>
                    <option value="Libon">Libon</option>
                    <option value="Ligao">Ligao</option>
                    <option value="Malilipot">Malilipot</option>
                    <option value="Malinao">Malinao</option>
                    <option value="Manito">Manito</option>
                    <option value="Oas">Oas</option>
                    <option value="Pio Duran">Pio Duran</option>
                    <option value="Polangui">Polangui</option>
                    <option value="Rapu-Rapu">Rapu-Rapu</option>
                    <option value="Santo Domingo">Santo Domingo</option>
                    <option value="Tabaco">Tabaco</option>
                    <option value="Tiwi">Tiwi</option>
                  </>
                )}
                {formData.province === 'Antique' && (
                  <>
                    <option value="Anini-y">Anini-y</option>
                    <option value="Barbaza">Barbaza</option>
                    <option value="Belison">Belison</option>
                    <option value="Bugasong">Bugasong</option>
                    <option value="Caluya">Caluya</option>
                    <option value="Culasi">Culasi</option>
                    <option value="Hamtic">Hamtic</option>
                    <option value="Laua-an">Laua-an</option>
                    <option value="Libertad">Libertad</option>
                    <option value="Pandan">Pandan</option>
                    <option value="Patnongon">Patnongon</option>
                    <option value="San Jose">San Jose</option>
                    <option value="San Remigio">San Remigio</option>
                    <option value="Sebaste">Sebaste</option>
                    <option value="Sibalom">Sibalom</option>
                    <option value="Tibiao">Tibiao</option>
                    <option value="Tobias Fornier">Tobias Fornier</option>
                    <option value="Valderrama">Valderrama</option>
                  </>
                )}
                {formData.province === 'Apayao' && (
                  <>
                    <option value="Calanasan">Calanasan</option>
                    <option value="Conner">Conner</option>
                    <option value="Flora">Flora</option>
                    <option value="Kabugao">Kabugao</option>
                    <option value="Luna">Luna</option>
                    <option value="Pudtol">Pudtol</option>
                    <option value="Santa Marcela">Santa Marcela</option>
                  </>
                )}
                {formData.province === 'Aurora' && (
                  <>
                    <option value="Baler">Baler</option>
                    <option value="Casiguran">Casiguran</option>
                    <option value="Dilasag">Dilasag</option>
                    <option value="Dinalungan">Dinalungan</option>
                    <option value="Dingalan">Dingalan</option>
                    <option value="Dipaculao">Dipaculao</option>
                    <option value="Maria Aurora">Maria Aurora</option>
                    <option value="San Luis">San Luis</option>
                  </>
                )}
                {formData.province === 'Basilan' && (
                  <>
                    <option value="Akbar">Akbar</option>
                    <option value="Al-Barka">Al-Barka</option>
                    <option value="Hadji Mohammad Ajul">Hadji Mohammad Ajul</option>
                    <option value="Hadji Muhtamad">Hadji Muhtamad</option>
                    <option value="Isabela">Isabela</option>
                    <option value="Lamitan">Lamitan</option>
                    <option value="Lantawan">Lantawan</option>
                    <option value="Maluso">Maluso</option>
                    <option value="Sumisip">Sumisip</option>
                    <option value="Tabuan-Lasa">Tabuan-Lasa</option>
                    <option value="Tipo-Tipo">Tipo-Tipo</option>
                    <option value="Tuburan">Tuburan</option>
                    <option value="Ungkaya Pukan">Ungkaya Pukan</option>
                  </>
                )}
                {formData.province === 'Bataan' && (
                  <>
                    <option value="Abucay">Abucay</option>
                    <option value="Bagac">Bagac</option>
                    <option value="Balanga">Balanga</option>
                    <option value="Dinalupihan">Dinalupihan</option>
                    <option value="Hermosa">Hermosa</option>
                    <option value="Limay">Limay</option>
                    <option value="Mariveles">Mariveles</option>
                    <option value="Morong">Morong</option>
                    <option value="Orani">Orani</option>
                    <option value="Orion">Orion</option>
                    <option value="Pilar">Pilar</option>
                    <option value="Samal">Samal</option>
                  </>
                )}
                {formData.province === 'Batanes' && (
                  <>
                    <option value="Basco">Basco</option>
                    <option value="Itbayat">Itbayat</option>
                    <option value="Ivana">Ivana</option>
                    <option value="Mahatao">Mahatao</option>
                    <option value="Sabtang">Sabtang</option>
                    <option value="Uyugan">Uyugan</option>
                  </>
                )}
                {formData.province === 'Batangas' && (
                  <>
                    <option value="Batangas City">Batangas City</option>
                    <option value="Calaca">Calaca</option>
                    <option value="Lemery">Lemery</option>
                    <option value="Lipa">Lipa</option>
                    <option value="Nasugbu">Nasugbu</option>
                    <option value="Rosario">Rosario</option>
                    <option value="San Jose">San Jose</option>
                    <option value="Santo Tomas">Santo Tomas</option>
                    <option value="Tanauan">Tanauan</option>
                    <option value="Taysan">Taysan</option>
                  </>
                )}
                {formData.province === 'Benguet' && (
                  <>
                    <option value="Atok">Atok</option>
                    <option value="Baguio">Baguio</option>
                    <option value="Bakun">Bakun</option>
                    <option value="Bokod">Bokod</option>
                    <option value="Buguias">Buguias</option>
                    <option value="Itogon">Itogon</option>
                    <option value="Kabayan">Kabayan</option>
                    <option value="Kapangan">Kapangan</option>
                    <option value="Kibungan">Kibungan</option>
                    <option value="La Trinidad">La Trinidad</option>
                    <option value="Mankayan">Mankayan</option>
                    <option value="Sablan">Sablan</option>
                    <option value="Tuba">Tuba</option>
                    <option value="Tublay">Tublay</option>
                  </>
                )}
                {formData.province === 'Biliran' && (
                  <>
                    <option value="Almeria">Almeria</option>
                    <option value="Biliran">Biliran</option>
                    <option value="Cabucgayan">Cabucgayan</option>
                    <option value="Caibiran">Caibiran</option>
                    <option value="Culaba">Culaba</option>
                    <option value="Kawayan">Kawayan</option>
                    <option value="Maripipi">Maripipi</option>
                    <option value="Naval">Naval</option>
                  </>
                )}
                {formData.province === 'Bohol' && (
                  <>
                    <option value="Alburquerque">Alburquerque</option>
                    <option value="Alicia">Alicia</option>
                    <option value="Anda">Anda</option>
                    <option value="Antequera">Antequera</option>
                    <option value="Baclayon">Baclayon</option>
                    <option value="Balilihan">Balilihan</option>
                    <option value="Batuan">Batuan</option>
                    <option value="Bien Unido">Bien Unido</option>
                    <option value="Bilar">Bilar</option>
                    <option value="Buenavista">Buenavista</option>
                    <option value="Calape">Calape</option>
                    <option value="Candijay">Candijay</option>
                    <option value="Carmen">Carmen</option>
                    <option value="Catigbian">Catigbian</option>
                    <option value="Clarin">Clarin</option>
                    <option value="Corella">Corella</option>
                    <option value="Cortes">Cortes</option>
                    <option value="Dagohoy">Dagohoy</option>
                    <option value="Danao">Danao</option>
                    <option value="Dauis">Dauis</option>
                    <option value="Dimiao">Dimiao</option>
                    <option value="Duero">Duero</option>
                    <option value="Garcia Hernandez">Garcia Hernandez</option>
                    <option value="Guindulman">Guindulman</option>
                    <option value="Inabanga">Inabanga</option>
                    <option value="Jagna">Jagna</option>
                    <option value="Jetafe">Jetafe</option>
                    <option value="Lila">Lila</option>
                    <option value="Loay">Loay</option>
                    <option value="Loboc">Loboc</option>
                    <option value="Loon">Loon</option>
                    <option value="Mabini">Mabini</option>
                    <option value="Maribojoc">Maribojoc</option>
                    <option value="Panglao">Panglao</option>
                    <option value="Pilar">Pilar</option>
                    <option value="President Carlos P. Garcia">President Carlos P. Garcia</option>
                    <option value="Sagbayan">Sagbayan</option>
                    <option value="San Isidro">San Isidro</option>
                    <option value="San Miguel">San Miguel</option>
                    <option value="Sevilla">Sevilla</option>
                    <option value="Sierra Bullones">Sierra Bullones</option>
                    <option value="Sikatuna">Sikatuna</option>
                    <option value="Tagbilaran">Tagbilaran</option>
                    <option value="Talibon">Talibon</option>
                    <option value="Trinidad">Trinidad</option>
                    <option value="Tubigon">Tubigon</option>
                    <option value="Ubay">Ubay</option>
                    <option value="Valencia">Valencia</option>
                  </>
                )}
                {formData.province === 'Bukidnon' && (
                  <>
                    <option value="Baungon">Baungon</option>
                    <option value="Cabanglasan">Cabanglasan</option>
                    <option value="Damulog">Damulog</option>
                    <option value="Dangcagan">Dangcagan</option>
                    <option value="Don Carlos">Don Carlos</option>
                    <option value="Impasugong">Impasugong</option>
                    <option value="Kadingilan">Kadingilan</option>
                    <option value="Kalilangan">Kalilangan</option>
                    <option value="Kibawe">Kibawe</option>
                    <option value="Kitaotao">Kitaotao</option>
                    <option value="Lantapan">Lantapan</option>
                    <option value="Libona">Libona</option>
                    <option value="Malaybalay">Malaybalay</option>
                    <option value="Malitbog">Malitbog</option>
                    <option value="Manolo Fortich">Manolo Fortich</option>
                    <option value="Maramag">Maramag</option>
                    <option value="Pangantucan">Pangantucan</option>
                    <option value="Quezon">Quezon</option>
                    <option value="San Fernando">San Fernando</option>
                    <option value="Sumilao">Sumilao</option>
                    <option value="Talakag">Talakag</option>
                    <option value="Valencia">Valencia</option>
                  </>
                )}
                {formData.province === 'Bulacan' && (
                  <>
                    <option value="Angat">Angat</option>
                    <option value="Balagtas">Balagtas</option>
                    <option value="Baliuag">Baliuag</option>
                    <option value="Bocaue">Bocaue</option>
                    <option value="Bulakan">Bulakan</option>
                    <option value="Bustos">Bustos</option>
                    <option value="Calumpit">Calumpit</option>
                    <option value="Dona Remedios Trinidad">Dona Remedios Trinidad</option>
                    <option value="Guiguinto">Guiguinto</option>
                    <option value="Hagonoy">Hagonoy</option>
                    <option value="Malolos">Malolos</option>
                    <option value="Marilao">Marilao</option>
                    <option value="Meycauayan">Meycauayan</option>
                    <option value="Norzagaray">Norzagaray</option>
                    <option value="Obando">Obando</option>
                    <option value="Pandi">Pandi</option>
                    <option value="Paombong">Paombong</option>
                    <option value="Plaridel">Plaridel</option>
                    <option value="Pulilan">Pulilan</option>
                    <option value="San Ildefonso">San Ildefonso</option>
                    <option value="San Jose del Monte">San Jose del Monte</option>
                    <option value="San Miguel">San Miguel</option>
                    <option value="San Rafael">San Rafael</option>
                    <option value="Santa Maria">Santa Maria</option>
                  </>
                )}
                {formData.province === 'Cebu' && (
                  <>
                    <option value="Cebu City">Cebu City</option>
                    <option value="Lapu-Lapu">Lapu-Lapu</option>
                    <option value="Mandaue">Mandaue</option>
                    <option value="Talisay">Talisay</option>
                    <option value="Toledo">Toledo</option>
                    <option value="Danao">Danao</option>
                    <option value="Carcar">Carcar</option>
                    <option value="Naga">Naga</option>
                    <option value="Bogo">Bogo</option>
                  </>
                )}
                {formData.province === 'Davao del Sur' && (
                  <>
                    <option value="Davao City">Davao City</option>
                    <option value="Digos">Digos</option>
                    <option value="Samal">Samal</option>
                  </>
                )}
                {formData.province === 'Laguna' && (
                  <>
                    <option value="Calamba">Calamba</option>
                    <option value="Santa Rosa">Santa Rosa</option>
                    <option value="Biñan">Biñan</option>
                    <option value="San Pedro">San Pedro</option>
                    <option value="Cabuyao">Cabuyao</option>
                    <option value="San Pablo">San Pablo</option>
                    <option value="Los Baños">Los Baños</option>
                  </>
                )}
                {formData.province === 'Cavite' && (
                  <>
                    <option value="Bacoor">Bacoor</option>
                    <option value="Dasmariñas">Dasmariñas</option>
                    <option value="Imus">Imus</option>
                    <option value="General Trias">General Trias</option>
                    <option value="Trece Martires">Trece Martires</option>
                    <option value="Tagaytay">Tagaytay</option>
                  </>
                )}
                {formData.province === 'Rizal' && (
                  <>
                    <option value="Antipolo">Antipolo</option>
                    <option value="Angono">Angono</option>
                    <option value="Baras">Baras</option>
                    <option value="Binangonan">Binangonan</option>
                    <option value="Cainta">Cainta</option>
                    <option value="Cardona">Cardona</option>
                    <option value="Jalajala">Jalajala</option>
                    <option value="Morong">Morong</option>
                    <option value="Pililla">Pililla</option>
                    <option value="Rodriguez">Rodriguez</option>
                    <option value="San Mateo">San Mateo</option>
                    <option value="Tanay">Tanay</option>
                    <option value="Taytay">Taytay</option>
                    <option value="Teresa">Teresa</option>
                  </>
                )}
                {formData.province === 'Pampanga' && (
                  <>
                    <option value="San Fernando">San Fernando</option>
                    <option value="Angeles">Angeles</option>
                    <option value="Mabalacat">Mabalacat</option>
                    <option value="Apalit">Apalit</option>
                    <option value="Arayat">Arayat</option>
                    <option value="Bacolor">Bacolor</option>
                    <option value="Candaba">Candaba</option>
                    <option value="Floridablanca">Floridablanca</option>
                    <option value="Guagua">Guagua</option>
                    <option value="Lubao">Lubao</option>
                    <option value="Macabebe">Macabebe</option>
                    <option value="Magalang">Magalang</option>
                    <option value="Masantol">Masantol</option>
                    <option value="Mexico">Mexico</option>
                    <option value="Minalin">Minalin</option>
                    <option value="Porac">Porac</option>
                    <option value="Sasmuan">Sasmuan</option>
                    <option value="Santa Ana">Santa Ana</option>
                    <option value="Santa Rita">Santa Rita</option>
                    <option value="Santo Tomas">Santo Tomas</option>
                  </>
                )}
                {formData.province === 'Batangas' && (
                  <>
                    <option value="Batangas City">Batangas City</option>
                    <option value="Lipa">Lipa</option>
                    <option value="Tanauan">Tanauan</option>
                    <option value="Santo Tomas">Santo Tomas</option>
                    <option value="Calaca">Calaca</option>
                    <option value="Lemery">Lemery</option>
                    <option value="Nasugbu">Nasugbu</option>
                    <option value="Rosario">Rosario</option>
                    <option value="San Jose">San Jose</option>
                    <option value="Taysan">Taysan</option>
                  </>
                )}
                {formData.province === 'Iloilo' && (
                  <>
                    <option value="Iloilo City">Iloilo City</option>
                    <option value="Passi">Passi</option>
                    <option value="Ajuy">Ajuy</option>
                    <option value="Alimodian">Alimodian</option>
                    <option value="Anilao">Anilao</option>
                    <option value="Badiangan">Badiangan</option>
                    <option value="Balasan">Balasan</option>
                    <option value="Banate">Banate</option>
                    <option value="Barotac Nuevo">Barotac Nuevo</option>
                    <option value="Barotac Viejo">Barotac Viejo</option>
                    <option value="Batad">Batad</option>
                    <option value="Bingawan">Bingawan</option>
                    <option value="Cabatuan">Cabatuan</option>
                    <option value="Calinog">Calinog</option>
                    <option value="Carles">Carles</option>
                    <option value="Concepcion">Concepcion</option>
                    <option value="Dingle">Dingle</option>
                    <option value="Duenas">Duenas</option>
                    <option value="Dumangas">Dumangas</option>
                    <option value="Estancia">Estancia</option>
                    <option value="Guimbal">Guimbal</option>
                    <option value="Igbaras">Igbaras</option>
                    <option value="Janiuay">Janiuay</option>
                    <option value="Lambunao">Lambunao</option>
                    <option value="Leganes">Leganes</option>
                    <option value="Lemery">Lemery</option>
                    <option value="Leon">Leon</option>
                    <option value="Maasin">Maasin</option>
                    <option value="Miagao">Miagao</option>
                    <option value="Mina">Mina</option>
                    <option value="New Lucena">New Lucena</option>
                    <option value="Oton">Oton</option>
                    <option value="Pavia">Pavia</option>
                    <option value="Pototan">Pototan</option>
                    <option value="San Dionisio">San Dionisio</option>
                    <option value="San Enrique">San Enrique</option>
                    <option value="San Joaquin">San Joaquin</option>
                    <option value="San Miguel">San Miguel</option>
                    <option value="San Rafael">San Rafael</option>
                    <option value="Santa Barbara">Santa Barbara</option>
                    <option value="Sara">Sara</option>
                    <option value="Tigbauan">Tigbauan</option>
                    <option value="Tubungan">Tubungan</option>
                    <option value="Zarraga">Zarraga</option>
                  </>
                )}
                {formData.province === 'Misamis Oriental' && (
                  <>
                    <option value="Cagayan de Oro">Cagayan de Oro</option>
                    <option value="Gingoog">Gingoog</option>
                    <option value="Alubijid">Alubijid</option>
                    <option value="Balingasag">Balingasag</option>
                    <option value="Balingoan">Balingoan</option>
                    <option value="Binuangan">Binuangan</option>
                    <option value="Claveria">Claveria</option>
                    <option value="El Salvador">El Salvador</option>
                    <option value="Gitagum">Gitagum</option>
                    <option value="Initao">Initao</option>
                    <option value="Jasaan">Jasaan</option>
                    <option value="Kinoguitan">Kinoguitan</option>
                    <option value="Lagonglong">Lagonglong</option>
                    <option value="Laguindingan">Laguindingan</option>
                    <option value="Libertad">Libertad</option>
                    <option value="Lugait">Lugait</option>
                    <option value="Magsaysay">Magsaysay</option>
                    <option value="Manticao">Manticao</option>
                    <option value="Medina">Medina</option>
                    <option value="Naawan">Naawan</option>
                    <option value="Opol">Opol</option>
                    <option value="Salay">Salay</option>
                    <option value="Sugbongcogon">Sugbongcogon</option>
                    <option value="Tagoloan">Tagoloan</option>
                    <option value="Talisayan">Talisayan</option>
                    <option value="Villanueva">Villanueva</option>
                  </>
                )}
                {formData.province === 'Quezon' && (
                  <>
                    <option value="Lucena">Lucena</option>
                    <option value="Tayabas">Tayabas</option>
                    <option value="Candelaria">Candelaria</option>
                    <option value="Sariaya">Sariaya</option>
                    <option value="Tiaong">Tiaong</option>
                    <option value="San Antonio">San Antonio</option>
                    <option value="Dolores">Dolores</option>
                    <option value="Pagbilao">Pagbilao</option>
                    <option value="Padre Burgos">Padre Burgos</option>
                    <option value="Atimonan">Atimonan</option>
                    <option value="Agdangan">Agdangan</option>
                    <option value="Unisan">Unisan</option>
                    <option value="Plaridel">Plaridel</option>
                    <option value="Gumaca">Gumaca</option>
                    <option value="Lopez">Lopez</option>
                    <option value="Calauag">Calauag</option>
                    <option value="Guinayangan">Guinayangan</option>
                    <option value="Tagkawayan">Tagkawayan</option>
                    <option value="Buenavista">Buenavista</option>
                    <option value="San Narciso">San Narciso</option>
                    <option value="San Andres">San Andres</option>
                    <option value="Mulanay">Mulanay</option>
                    <option value="San Francisco">San Francisco</option>
                    <option value="Catanauan">Catanauan</option>
                    <option value="General Luna">General Luna</option>
                    <option value="Macalelon">Macalelon</option>
                    <option value="Pitogo">Pitogo</option>
                    <option value="Alabat">Alabat</option>
                    <option value="Quezon">Quezon</option>
                    <option value="Perez">Perez</option>
                    <option value="Calintaan">Calintaan</option>
                    <option value="Infanta">Infanta</option>
                    <option value="Real">Real</option>
                    <option value="General Nakar">General Nakar</option>
                    <option value="Mauban">Mauban</option>
                    <option value="Sampaloc">Sampaloc</option>
                    <option value="Lucban">Lucban</option>
                    <option value="Pagbilao">Pagbilao</option>
                    <option value="Polillo">Polillo</option>
                    <option value="Burdeos">Burdeos</option>
                    <option value="Panukulan">Panukulan</option>
                    <option value="Patnanungan">Patnanungan</option>
                    <option value="Jomalig">Jomalig</option>
                  </>
                )}
                {formData.province === 'Pangasinan' && (
                  <>
                    <option value="Alaminos">Alaminos</option>
                    <option value="Dagupan">Dagupan</option>
                    <option value="San Carlos">San Carlos</option>
                    <option value="Urdaneta">Urdaneta</option>
                    <option value="Agno">Agno</option>
                    <option value="Aguilar">Aguilar</option>
                    <option value="Alcala">Alcala</option>
                    <option value="Anda">Anda</option>
                    <option value="Asingan">Asingan</option>
                    <option value="Balungao">Balungao</option>
                    <option value="Bani">Bani</option>
                    <option value="Basista">Basista</option>
                    <option value="Bautista">Bautista</option>
                    <option value="Bayambang">Bayambang</option>
                    <option value="Binalonan">Binalonan</option>
                    <option value="Binmaley">Binmaley</option>
                    <option value="Bolinao">Bolinao</option>
                    <option value="Bugallon">Bugallon</option>
                    <option value="Burgos">Burgos</option>
                    <option value="Calasiao">Calasiao</option>
                    <option value="Dasol">Dasol</option>
                    <option value="Infanta">Infanta</option>
                    <option value="Labrador">Labrador</option>
                    <option value="Laoac">Laoac</option>
                    <option value="Lingayen">Lingayen</option>
                    <option value="Mabini">Mabini</option>
                    <option value="Malasiqui">Malasiqui</option>
                    <option value="Manaoag">Manaoag</option>
                    <option value="Mangaldan">Mangaldan</option>
                    <option value="Mangatarem">Mangatarem</option>
                    <option value="Mapandan">Mapandan</option>
                    <option value="Natividad">Natividad</option>
                    <option value="Pozorrubio">Pozorrubio</option>
                    <option value="Rosales">Rosales</option>
                    <option value="San Fabian">San Fabian</option>
                    <option value="San Jacinto">San Jacinto</option>
                    <option value="San Manuel">San Manuel</option>
                    <option value="San Nicolas">San Nicolas</option>
                    <option value="San Quintin">San Quintin</option>
                    <option value="Santa Barbara">Santa Barbara</option>
                    <option value="Santa Maria">Santa Maria</option>
                    <option value="Santo Tomas">Santo Tomas</option>
                    <option value="Sison">Sison</option>
                    <option value="Sual">Sual</option>
                    <option value="Tayug">Tayug</option>
                    <option value="Umingan">Umingan</option>
                    <option value="Urbiztondo">Urbiztondo</option>
                    <option value="Villasis">Villasis</option>
                  </>
                )}
                {formData.province === 'Abra' && (
                  <>
                    <option value="Bangued">Bangued</option>
                    <option value="Boliney">Boliney</option>
                    <option value="Bucay">Bucay</option>
                    <option value="Bucloc">Bucloc</option>
                    <option value="Daguioman">Daguioman</option>
                    <option value="Danglas">Danglas</option>
                    <option value="Dolores">Dolores</option>
                    <option value="La Paz">La Paz</option>
                    <option value="Lacub">Lacub</option>
                    <option value="Lagangilang">Lagangilang</option>
                    <option value="Lagayan">Lagayan</option>
                    <option value="Langiden">Langiden</option>
                    <option value="Licuan-Baay">Licuan-Baay</option>
                    <option value="Luba">Luba</option>
                    <option value="Malibcong">Malibcong</option>
                    <option value="Manabo">Manabo</option>
                    <option value="Penarrubia">Penarrubia</option>
                    <option value="Pidigan">Pidigan</option>
                    <option value="Pilar">Pilar</option>
                    <option value="Sallapadan">Sallapadan</option>
                    <option value="San Isidro">San Isidro</option>
                    <option value="San Juan">San Juan</option>
                    <option value="San Quintin">San Quintin</option>
                    <option value="Tayum">Tayum</option>
                    <option value="Tineg">Tineg</option>
                    <option value="Tubo">Tubo</option>
                    <option value="Villaviciosa">Villaviciosa</option>
                  </>
                )}
                {formData.province === 'Agusan del Norte' && (
                  <>
                    <option value="Buenavista">Buenavista</option>
                    <option value="Butuan">Butuan</option>
                    <option value="Cabadbaran">Cabadbaran</option>
                    <option value="Carmen">Carmen</option>
                    <option value="Jabonga">Jabonga</option>
                    <option value="Kitcharao">Kitcharao</option>
                    <option value="Las Nieves">Las Nieves</option>
                    <option value="Magallanes">Magallanes</option>
                    <option value="Nasipit">Nasipit</option>
                    <option value="Remedios T. Romualdez">Remedios T. Romualdez</option>
                    <option value="Santiago">Santiago</option>
                    <option value="Tubay">Tubay</option>
                  </>
                )}
                {formData.province === 'Agusan del Sur' && (
                  <>
                    <option value="Bayugan">Bayugan</option>
                    <option value="Bunawan">Bunawan</option>
                    <option value="Esperanza">Esperanza</option>
                    <option value="La Paz">La Paz</option>
                    <option value="Loreto">Loreto</option>
                    <option value="Prosperidad">Prosperidad</option>
                    <option value="Rosario">Rosario</option>
                    <option value="San Francisco">San Francisco</option>
                    <option value="San Luis">San Luis</option>
                    <option value="Santa Josefa">Santa Josefa</option>
                    <option value="Sibagat">Sibagat</option>
                    <option value="Talacogon">Talacogon</option>
                    <option value="Trento">Trento</option>
                    <option value="Veruela">Veruela</option>
                  </>
                )}
                {formData.province === 'Aklan' && (
                  <>
                    <option value="Altavas">Altavas</option>
                    <option value="Balete">Balete</option>
                    <option value="Banga">Banga</option>
                    <option value="Batan">Batan</option>
                    <option value="Buruanga">Buruanga</option>
                    <option value="Ibajay">Ibajay</option>
                    <option value="Kalibo">Kalibo</option>
                    <option value="Lezo">Lezo</option>
                    <option value="Libacao">Libacao</option>
                    <option value="Madalag">Madalag</option>
                    <option value="Makato">Makato</option>
                    <option value="Malay">Malay</option>
                    <option value="Malinao">Malinao</option>
                    <option value="Nabas">Nabas</option>
                    <option value="New Washington">New Washington</option>
                    <option value="Numancia">Numancia</option>
                    <option value="Tangalan">Tangalan</option>
                  </>
                )}
                {formData.province === 'Albay' && (
                  <>
                    <option value="Bacacay">Bacacay</option>
                    <option value="Camalig">Camalig</option>
                    <option value="Daraga">Daraga</option>
                    <option value="Guinobatan">Guinobatan</option>
                    <option value="Jovellar">Jovellar</option>
                    <option value="Legazpi">Legazpi</option>
                    <option value="Libon">Libon</option>
                    <option value="Ligao">Ligao</option>
                    <option value="Malilipot">Malilipot</option>
                    <option value="Malinao">Malinao</option>
                    <option value="Manito">Manito</option>
                    <option value="Oas">Oas</option>
                    <option value="Pio Duran">Pio Duran</option>
                    <option value="Polangui">Polangui</option>
                    <option value="Rapu-Rapu">Rapu-Rapu</option>
                    <option value="Santo Domingo">Santo Domingo</option>
                    <option value="Tabaco">Tabaco</option>
                    <option value="Tiwi">Tiwi</option>
                  </>
                )}
                {formData.province === 'Antique' && (
                  <>
                    <option value="Anini-y">Anini-y</option>
                    <option value="Barbaza">Barbaza</option>
                    <option value="Belison">Belison</option>
                    <option value="Bugasong">Bugasong</option>
                    <option value="Caluya">Caluya</option>
                    <option value="Culasi">Culasi</option>
                    <option value="Hamtic">Hamtic</option>
                    <option value="Laua-an">Laua-an</option>
                    <option value="Libertad">Libertad</option>
                    <option value="Pandan">Pandan</option>
                    <option value="Patnongon">Patnongon</option>
                    <option value="San Jose">San Jose</option>
                    <option value="San Remigio">San Remigio</option>
                    <option value="Sebaste">Sebaste</option>
                    <option value="Sibalom">Sibalom</option>
                    <option value="Tibiao">Tibiao</option>
                    <option value="Tobias Fornier">Tobias Fornier</option>
                    <option value="Valderrama">Valderrama</option>
                  </>
                )}
                {formData.province === 'Apayao' && (
                  <>
                    <option value="Calanasan">Calanasan</option>
                    <option value="Conner">Conner</option>
                    <option value="Flora">Flora</option>
                    <option value="Kabugao">Kabugao</option>
                    <option value="Luna">Luna</option>
                    <option value="Pudtol">Pudtol</option>
                    <option value="Santa Marcela">Santa Marcela</option>
                  </>
                )}
                {formData.province === 'Aurora' && (
                  <>
                    <option value="Baler">Baler</option>
                    <option value="Casiguran">Casiguran</option>
                    <option value="Dilasag">Dilasag</option>
                    <option value="Dinalungan">Dinalungan</option>
                    <option value="Dingalan">Dingalan</option>
                    <option value="Dipaculao">Dipaculao</option>
                    <option value="Maria Aurora">Maria Aurora</option>
                    <option value="San Luis">San Luis</option>
                  </>
                )}
                {formData.province === 'Basilan' && (
                  <>
                    <option value="Akbar">Akbar</option>
                    <option value="Al-Barka">Al-Barka</option>
                    <option value="Hadji Mohammad Ajul">Hadji Mohammad Ajul</option>
                    <option value="Hadji Muhtamad">Hadji Muhtamad</option>
                    <option value="Isabela">Isabela</option>
                    <option value="Lamitan">Lamitan</option>
                    <option value="Lantawan">Lantawan</option>
                    <option value="Maluso">Maluso</option>
                    <option value="Sumisip">Sumisip</option>
                    <option value="Tabuan-Lasa">Tabuan-Lasa</option>
                    <option value="Tipo-Tipo">Tipo-Tipo</option>
                    <option value="Tuburan">Tuburan</option>
                    <option value="Ungkaya Pukan">Ungkaya Pukan</option>
                  </>
                )}
                {formData.province === 'Bataan' && (
                  <>
                    <option value="Abucay">Abucay</option>
                    <option value="Bagac">Bagac</option>
                    <option value="Balanga">Balanga</option>
                    <option value="Dinalupihan">Dinalupihan</option>
                    <option value="Hermosa">Hermosa</option>
                    <option value="Limay">Limay</option>
                    <option value="Mariveles">Mariveles</option>
                    <option value="Morong">Morong</option>
                    <option value="Orani">Orani</option>
                    <option value="Orion">Orion</option>
                    <option value="Pilar">Pilar</option>
                    <option value="Samal">Samal</option>
                  </>
                )}
                {formData.province === 'Batanes' && (
                  <>
                    <option value="Basco">Basco</option>
                    <option value="Itbayat">Itbayat</option>
                    <option value="Ivana">Ivana</option>
                    <option value="Mahatao">Mahatao</option>
                    <option value="Sabtang">Sabtang</option>
                    <option value="Uyugan">Uyugan</option>
                  </>
                )}
                {formData.province === 'Benguet' && (
                  <>
                    <option value="Atok">Atok</option>
                    <option value="Baguio">Baguio</option>
                    <option value="Bakun">Bakun</option>
                    <option value="Bokod">Bokod</option>
                    <option value="Buguias">Buguias</option>
                    <option value="Itogon">Itogon</option>
                    <option value="Kabayan">Kabayan</option>
                    <option value="Kapangan">Kapangan</option>
                    <option value="Kibungan">Kibungan</option>
                    <option value="La Trinidad">La Trinidad</option>
                    <option value="Mankayan">Mankayan</option>
                    <option value="Sablan">Sablan</option>
                    <option value="Tuba">Tuba</option>
                    <option value="Tublay">Tublay</option>
                  </>
                )}
                {formData.province === 'Biliran' && (
                  <>
                    <option value="Almeria">Almeria</option>
                    <option value="Biliran">Biliran</option>
                    <option value="Cabucgayan">Cabucgayan</option>
                    <option value="Caibiran">Caibiran</option>
                    <option value="Culaba">Culaba</option>
                    <option value="Kawayan">Kawayan</option>
                    <option value="Maripipi">Maripipi</option>
                    <option value="Naval">Naval</option>
                  </>
                )}
                {formData.province === 'Bohol' && (
                  <>
                    <option value="Alburquerque">Alburquerque</option>
                    <option value="Alicia">Alicia</option>
                    <option value="Anda">Anda</option>
                    <option value="Antequera">Antequera</option>
                    <option value="Baclayon">Baclayon</option>
                    <option value="Balilihan">Balilihan</option>
                    <option value="Batuan">Batuan</option>
                    <option value="Bien Unido">Bien Unido</option>
                    <option value="Bilar">Bilar</option>
                    <option value="Buenavista">Buenavista</option>
                    <option value="Calape">Calape</option>
                    <option value="Candijay">Candijay</option>
                    <option value="Carmen">Carmen</option>
                    <option value="Catigbian">Catigbian</option>
                    <option value="Clarin">Clarin</option>
                    <option value="Corella">Corella</option>
                    <option value="Cortes">Cortes</option>
                    <option value="Dagohoy">Dagohoy</option>
                    <option value="Danao">Danao</option>
                    <option value="Dauis">Dauis</option>
                    <option value="Dimiao">Dimiao</option>
                    <option value="Duero">Duero</option>
                    <option value="Garcia Hernandez">Garcia Hernandez</option>
                    <option value="Guindulman">Guindulman</option>
                    <option value="Inabanga">Inabanga</option>
                    <option value="Jagna">Jagna</option>
                    <option value="Jetafe">Jetafe</option>
                    <option value="Lila">Lila</option>
                    <option value="Loay">Loay</option>
                    <option value="Loboc">Loboc</option>
                    <option value="Loon">Loon</option>
                    <option value="Mabini">Mabini</option>
                    <option value="Maribojoc">Maribojoc</option>
                    <option value="Panglao">Panglao</option>
                    <option value="Pilar">Pilar</option>
                    <option value="President Carlos P. Garcia">President Carlos P. Garcia</option>
                    <option value="Sagbayan">Sagbayan</option>
                    <option value="San Isidro">San Isidro</option>
                    <option value="San Miguel">San Miguel</option>
                    <option value="Sevilla">Sevilla</option>
                    <option value="Sierra Bullones">Sierra Bullones</option>
                    <option value="Sikatuna">Sikatuna</option>
                    <option value="Tagbilaran">Tagbilaran</option>
                    <option value="Talibon">Talibon</option>
                    <option value="Trinidad">Trinidad</option>
                    <option value="Tubigon">Tubigon</option>
                    <option value="Ubay">Ubay</option>
                    <option value="Valencia">Valencia</option>
                  </>
                )}
                {formData.province === 'Bukidnon' && (
                  <>
                    <option value="Baungon">Baungon</option>
                    <option value="Cabanglasan">Cabanglasan</option>
                    <option value="Damulog">Damulog</option>
                    <option value="Dangcagan">Dangcagan</option>
                    <option value="Don Carlos">Don Carlos</option>
                    <option value="Impasugong">Impasugong</option>
                    <option value="Kadingilan">Kadingilan</option>
                    <option value="Kalilangan">Kalilangan</option>
                    <option value="Kibawe">Kibawe</option>
                    <option value="Kitaotao">Kitaotao</option>
                    <option value="Lantapan">Lantapan</option>
                    <option value="Libona">Libona</option>
                    <option value="Malaybalay">Malaybalay</option>
                    <option value="Malitbog">Malitbog</option>
                    <option value="Manolo Fortich">Manolo Fortich</option>
                    <option value="Maramag">Maramag</option>
                    <option value="Pangantucan">Pangantucan</option>
                    <option value="Quezon">Quezon</option>
                    <option value="San Fernando">San Fernando</option>
                    <option value="Sumilao">Sumilao</option>
                    <option value="Talakag">Talakag</option>
                    <option value="Valencia">Valencia</option>
                  </>
                )}
                {formData.province === 'Cagayan' && (
                  <>
                    <option value="Abulug">Abulug</option>
                    <option value="Alcala">Alcala</option>
                    <option value="Allacapan">Allacapan</option>
                    <option value="Amulung">Amulung</option>
                    <option value="Aparri">Aparri</option>
                    <option value="Baggao">Baggao</option>
                    <option value="Ballesteros">Ballesteros</option>
                    <option value="Buguey">Buguey</option>
                    <option value="Calayan">Calayan</option>
                    <option value="Camalaniugan">Camalaniugan</option>
                    <option value="Claveria">Claveria</option>
                    <option value="Enrile">Enrile</option>
                    <option value="Gattaran">Gattaran</option>
                    <option value="Gonzaga">Gonzaga</option>
                    <option value="Iguig">Iguig</option>
                    <option value="Lal-lo">Lal-lo</option>
                    <option value="Lasam">Lasam</option>
                    <option value="Pamplona">Pamplona</option>
                    <option value="Penablanca">Penablanca</option>
                    <option value="Piat">Piat</option>
                    <option value="Rizal">Rizal</option>
                    <option value="Sanchez-Mira">Sanchez-Mira</option>
                    <option value="Santa Ana">Santa Ana</option>
                    <option value="Santa Praxedes">Santa Praxedes</option>
                    <option value="Santa Teresita">Santa Teresita</option>
                    <option value="Santo Nino">Santo Nino</option>
                    <option value="Solana">Solana</option>
                    <option value="Tuao">Tuao</option>
                    <option value="Tuguegarao">Tuguegarao</option>
                  </>
                )}
                {formData.province === 'Camarines Norte' && (
                  <>
                    <option value="Basud">Basud</option>
                    <option value="Capalonga">Capalonga</option>
                    <option value="Daet">Daet</option>
                    <option value="Jose Panganiban">Jose Panganiban</option>
                    <option value="Labo">Labo</option>
                    <option value="Mercedes">Mercedes</option>
                    <option value="Paracale">Paracale</option>
                    <option value="San Lorenzo Ruiz">San Lorenzo Ruiz</option>
                    <option value="San Vicente">San Vicente</option>
                    <option value="Santa Elena">Santa Elena</option>
                    <option value="Talisay">Talisay</option>
                    <option value="Vinzons">Vinzons</option>
                  </>
                )}
                {formData.province === 'Camarines Sur' && (
                  <>
                    <option value="Baao">Baao</option>
                    <option value="Balatan">Balatan</option>
                    <option value="Bato">Bato</option>
                    <option value="Bombon">Bombon</option>
                    <option value="Buhi">Buhi</option>
                    <option value="Bula">Bula</option>
                    <option value="Cabusao">Cabusao</option>
                    <option value="Calabanga">Calabanga</option>
                    <option value="Camaligan">Camaligan</option>
                    <option value="Canaman">Canaman</option>
                    <option value="Caramoan">Caramoan</option>
                    <option value="Del Gallego">Del Gallego</option>
                    <option value="Gainza">Gainza</option>
                    <option value="Garchitorena">Garchitorena</option>
                    <option value="Goa">Goa</option>
                    <option value="Iriga">Iriga</option>
                    <option value="Lagonoy">Lagonoy</option>
                    <option value="Libmanan">Libmanan</option>
                    <option value="Lupi">Lupi</option>
                    <option value="Magarao">Magarao</option>
                    <option value="Milaor">Milaor</option>
                    <option value="Minalabac">Minalabac</option>
                    <option value="Nabua">Nabua</option>
                    <option value="Naga">Naga</option>
                    <option value="Ocampo">Ocampo</option>
                    <option value="Pamplona">Pamplona</option>
                    <option value="Pasacao">Pasacao</option>
                    <option value="Pili">Pili</option>
                    <option value="Presentacion">Presentacion</option>
                    <option value="Ragay">Ragay</option>
                    <option value="Sagñay">Sagñay</option>
                    <option value="San Fernando">San Fernando</option>
                    <option value="San Jose">San Jose</option>
                    <option value="Sipocot">Sipocot</option>
                    <option value="Siruma">Siruma</option>
                    <option value="Tigaon">Tigaon</option>
                    <option value="Tinambac">Tinambac</option>
                  </>
                )}
                {formData.province === 'Camiguin' && (
                  <>
                    <option value="Catarman">Catarman</option>
                    <option value="Guinsiliban">Guinsiliban</option>
                    <option value="Mahinog">Mahinog</option>
                    <option value="Mambajao">Mambajao</option>
                    <option value="Sagay">Sagay</option>
                  </>
                )}
                {formData.province === 'Capiz' && (
                  <>
                    <option value="Cuartero">Cuartero</option>
                    <option value="Dao">Dao</option>
                    <option value="Dumalag">Dumalag</option>
                    <option value="Dumarao">Dumarao</option>
                    <option value="Ivisan">Ivisan</option>
                    <option value="Jamindan">Jamindan</option>
                    <option value="Ma-ayon">Ma-ayon</option>
                    <option value="Mambusao">Mambusao</option>
                    <option value="Panay">Panay</option>
                    <option value="Panitan">Panitan</option>
                    <option value="Pilar">Pilar</option>
                    <option value="Pontevedra">Pontevedra</option>
                    <option value="President Roxas">President Roxas</option>
                    <option value="Roxas">Roxas</option>
                    <option value="Sapian">Sapian</option>
                    <option value="Sigma">Sigma</option>
                    <option value="Tapaz">Tapaz</option>
                  </>
                )}
                {formData.province === 'Catanduanes' && (
                  <>
                    <option value="Bagamanoc">Bagamanoc</option>
                    <option value="Baras">Baras</option>
                    <option value="Bato">Bato</option>
                    <option value="Caramoran">Caramoran</option>
                    <option value="Gigmoto">Gigmoto</option>
                    <option value="Pandan">Pandan</option>
                    <option value="Panganiban">Panganiban</option>
                    <option value="San Andres">San Andres</option>
                    <option value="San Miguel">San Miguel</option>
                    <option value="Viga">Viga</option>
                    <option value="Virac">Virac</option>
                  </>
                )}
                {formData.province === 'Cotabato' && (
                  <>
                    <option value="Alamada">Alamada</option>
                    <option value="Aleosan">Aleosan</option>
                    <option value="Antipas">Antipas</option>
                    <option value="Arakan">Arakan</option>
                    <option value="Banisilan">Banisilan</option>
                    <option value="Carmen">Carmen</option>
                    <option value="Kabacan">Kabacan</option>
                    <option value="Kidapawan">Kidapawan</option>
                    <option value="Libungan">Libungan</option>
                    <option value="M'lang">M'lang</option>
                    <option value="Magpet">Magpet</option>
                    <option value="Makilala">Makilala</option>
                    <option value="Matalam">Matalam</option>
                    <option value="Midsayap">Midsayap</option>
                    <option value="Pigcawayan">Pigcawayan</option>
                    <option value="Pikit">Pikit</option>
                    <option value="President Roxas">President Roxas</option>
                    <option value="Tulunan">Tulunan</option>
                  </>
                )}
                {formData.province === 'Davao de Oro' && (
                  <>
                    <option value="Compostela">Compostela</option>
                    <option value="Laak">Laak</option>
                    <option value="Mabini">Mabini</option>
                    <option value="Maco">Maco</option>
                    <option value="Maragusan">Maragusan</option>
                    <option value="Mawab">Mawab</option>
                    <option value="Monkayo">Monkayo</option>
                    <option value="Montevista">Montevista</option>
                    <option value="Nabunturan">Nabunturan</option>
                    <option value="New Bataan">New Bataan</option>
                    <option value="Pantukan">Pantukan</option>
                  </>
                )}
                {formData.province === 'Davao del Norte' && (
                  <>
                    <option value="Asuncion">Asuncion</option>
                    <option value="Braulio E. Dujali">Braulio E. Dujali</option>
                    <option value="Carmen">Carmen</option>
                    <option value="Kapalong">Kapalong</option>
                    <option value="New Corella">New Corella</option>
                    <option value="Panabo">Panabo</option>
                    <option value="Samal">Samal</option>
                    <option value="San Isidro">San Isidro</option>
                    <option value="Santo Tomas">Santo Tomas</option>
                    <option value="Tagum">Tagum</option>
                    <option value="Talaingod">Talaingod</option>
                  </>
                )}
                {formData.province === 'Davao Occidental' && (
                  <>
                    <option value="Don Marcelino">Don Marcelino</option>
                    <option value="Jose Abad Santos">Jose Abad Santos</option>
                    <option value="Malita">Malita</option>
                    <option value="Santa Maria">Santa Maria</option>
                    <option value="Sarangani">Sarangani</option>
                  </>
                )}
                {formData.province === 'Davao Oriental' && (
                  <>
                    <option value="Baganga">Baganga</option>
                    <option value="Banaybanay">Banaybanay</option>
                    <option value="Boston">Boston</option>
                    <option value="Caraga">Caraga</option>
                    <option value="Cateel">Cateel</option>
                    <option value="Governor Generoso">Governor Generoso</option>
                    <option value="Lupon">Lupon</option>
                    <option value="Manay">Manay</option>
                    <option value="Mati">Mati</option>
                    <option value="San Isidro">San Isidro</option>
                    <option value="Tarragona">Tarragona</option>
                  </>
                )}
                {formData.province === 'Dinagat Islands' && (
                  <>
                    <option value="Basilisa">Basilisa</option>
                    <option value="Cagdianao">Cagdianao</option>
                    <option value="Dinagat">Dinagat</option>
                    <option value="Libjo">Libjo</option>
                    <option value="Loreto">Loreto</option>
                    <option value="San Jose">San Jose</option>
                    <option value="Tubajon">Tubajon</option>
                  </>
                )}
                {formData.province === 'Eastern Samar' && (
                  <>
                    <option value="Arteche">Arteche</option>
                    <option value="Balangiga">Balangiga</option>
                    <option value="Balangkayan">Balangkayan</option>
                    <option value="Borongan">Borongan</option>
                    <option value="Can-avid">Can-avid</option>
                    <option value="Dolores">Dolores</option>
                    <option value="General MacArthur">General MacArthur</option>
                    <option value="Giporlos">Giporlos</option>
                    <option value="Guiuan">Guiuan</option>
                    <option value="Hernani">Hernani</option>
                    <option value="Jipapad">Jipapad</option>
                    <option value="Lawaan">Lawaan</option>
                    <option value="Llorente">Llorente</option>
                    <option value="Maslog">Maslog</option>
                    <option value="Maydolong">Maydolong</option>
                    <option value="Mercedes">Mercedes</option>
                    <option value="Oras">Oras</option>
                    <option value="Quinapondan">Quinapondan</option>
                    <option value="Salcedo">Salcedo</option>
                    <option value="San Julian">San Julian</option>
                    <option value="San Policarpo">San Policarpo</option>
                    <option value="Sulat">Sulat</option>
                    <option value="Taft">Taft</option>
                  </>
                )}
                {formData.province === 'Guimaras' && (
                  <>
                    <option value="Buenavista">Buenavista</option>
                    <option value="Jordan">Jordan</option>
                    <option value="Nueva Valencia">Nueva Valencia</option>
                    <option value="San Lorenzo">San Lorenzo</option>
                    <option value="Sibunag">Sibunag</option>
                  </>
                )}
                {formData.province === 'Ifugao' && (
                  <>
                    <option value="Aguinaldo">Aguinaldo</option>
                    <option value="Alfonso Lista">Alfonso Lista</option>
                    <option value="Asipulo">Asipulo</option>
                    <option value="Banaue">Banaue</option>
                    <option value="Hingyon">Hingyon</option>
                    <option value="Hungduan">Hungduan</option>
                    <option value="Kiangan">Kiangan</option>
                    <option value="Lagawe">Lagawe</option>
                    <option value="Lamut">Lamut</option>
                    <option value="Mayoyao">Mayoyao</option>
                    <option value="Tinoc">Tinoc</option>
                  </>
                )}
                {formData.province === 'Ilocos Norte' && (
                  <>
                    <option value="Adams">Adams</option>
                    <option value="Bacarra">Bacarra</option>
                    <option value="Badoc">Badoc</option>
                    <option value="Bangui">Bangui</option>
                    <option value="Banna">Banna</option>
                    <option value="Batac">Batac</option>
                    <option value="Burgos">Burgos</option>
                    <option value="Carasi">Carasi</option>
                    <option value="Currimao">Currimao</option>
                    <option value="Dingras">Dingras</option>
                    <option value="Dumalneg">Dumalneg</option>
                    <option value="Laoag">Laoag</option>
                    <option value="Marcos">Marcos</option>
                    <option value="Nueva Era">Nueva Era</option>
                    <option value="Pagudpud">Pagudpud</option>
                    <option value="Paoay">Paoay</option>
                    <option value="Pasuquin">Pasuquin</option>
                    <option value="Piddig">Piddig</option>
                    <option value="Pinili">Pinili</option>
                    <option value="San Nicolas">San Nicolas</option>
                    <option value="Sarrat">Sarrat</option>
                    <option value="Solsona">Solsona</option>
                    <option value="Vintar">Vintar</option>
                  </>
                )}
                {formData.province === 'Ilocos Sur' && (
                  <>
                    <option value="Alilem">Alilem</option>
                    <option value="Banayoyo">Banayoyo</option>
                    <option value="Bantay">Bantay</option>
                    <option value="Burgos">Burgos</option>
                    <option value="Cabugao">Cabugao</option>
                    <option value="Candon">Candon</option>
                    <option value="Caoayan">Caoayan</option>
                    <option value="Cervantes">Cervantes</option>
                    <option value="Galimuyod">Galimuyod</option>
                    <option value="Gregorio del Pilar">Gregorio del Pilar</option>
                    <option value="Lidlidda">Lidlidda</option>
                    <option value="Magsingal">Magsingal</option>
                    <option value="Nagbukel">Nagbukel</option>
                    <option value="Narvacan">Narvacan</option>
                    <option value="Quirino">Quirino</option>
                    <option value="Salcedo">Salcedo</option>
                    <option value="San Emilio">San Emilio</option>
                    <option value="San Esteban">San Esteban</option>
                    <option value="San Ildefonso">San Ildefonso</option>
                    <option value="San Juan">San Juan</option>
                    <option value="San Vicente">San Vicente</option>
                    <option value="Santa">Santa</option>
                    <option value="Santa Catalina">Santa Catalina</option>
                    <option value="Santa Cruz">Santa Cruz</option>
                    <option value="Santa Lucia">Santa Lucia</option>
                    <option value="Santa Maria">Santa Maria</option>
                    <option value="Santiago">Santiago</option>
                    <option value="Santo Domingo">Santo Domingo</option>
                    <option value="Sigay">Sigay</option>
                    <option value="Sinait">Sinait</option>
                    <option value="Sugpon">Sugpon</option>
                    <option value="Suyo">Suyo</option>
                    <option value="Tagudin">Tagudin</option>
                    <option value="Vigan">Vigan</option>
                  </>
                )}
                {formData.province === 'Kalinga' && (
                  <>
                    <option value="Balbalan">Balbalan</option>
                    <option value="Lubuagan">Lubuagan</option>
                    <option value="Pasil">Pasil</option>
                    <option value="Pinukpuk">Pinukpuk</option>
                    <option value="Rizal">Rizal</option>
                    <option value="Tabuk">Tabuk</option>
                    <option value="Tanudan">Tanudan</option>
                    <option value="Tinglayan">Tinglayan</option>
                  </>
                )}
                {formData.province === 'Isabela' && (
                  <>
                    <option value="Alicia">Alicia</option>
                    <option value="Angadanan">Angadanan</option>
                    <option value="Aurora">Aurora</option>
                    <option value="Benito Soliven">Benito Soliven</option>
                    <option value="Burgos">Burgos</option>
                    <option value="Cabagan">Cabagan</option>
                    <option value="Cabatuan">Cabatuan</option>
                    <option value="Cordon">Cordon</option>
                    <option value="Delfin Albano">Delfin Albano</option>
                    <option value="Dinapigue">Dinapigue</option>
                    <option value="Divilacan">Divilacan</option>
                    <option value="Echague">Echague</option>
                    <option value="Gamu">Gamu</option>
                    <option value="Ilagan">Ilagan</option>
                    <option value="Jones">Jones</option>
                    <option value="Luna">Luna</option>
                    <option value="Maconacon">Maconacon</option>
                    <option value="Mallig">Mallig</option>
                    <option value="Naguilian">Naguilian</option>
                    <option value="Palanan">Palanan</option>
                    <option value="Quezon">Quezon</option>
                    <option value="Quirino">Quirino</option>
                    <option value="Ramon">Ramon</option>
                    <option value="Reina Mercedes">Reina Mercedes</option>
                    <option value="Roxas">Roxas</option>
                    <option value="San Agustin">San Agustin</option>
                    <option value="San Guillermo">San Guillermo</option>
                    <option value="San Isidro">San Isidro</option>
                    <option value="San Manuel">San Manuel</option>
                    <option value="San Mariano">San Mariano</option>
                    <option value="San Mateo">San Mateo</option>
                    <option value="San Pablo">San Pablo</option>
                    <option value="Santa Maria">Santa Maria</option>
                    <option value="Santiago">Santiago</option>
                    <option value="Santo Tomas">Santo Tomas</option>
                    <option value="Tumauini">Tumauini</option>
                  </>
                )}
                {formData.province === 'La Union' && (
                  <>
                    <option value="Agoo">Agoo</option>
                    <option value="Aringay">Aringay</option>
                    <option value="Bacnotan">Bacnotan</option>
                    <option value="Bagulin">Bagulin</option>
                    <option value="Balaoan">Balaoan</option>
                    <option value="Bangar">Bangar</option>
                    <option value="Bauang">Bauang</option>
                    <option value="Burgos">Burgos</option>
                    <option value="Caba">Caba</option>
                    <option value="Luna">Luna</option>
                    <option value="Naguilian">Naguilian</option>
                    <option value="Pugo">Pugo</option>
                    <option value="Rosario">Rosario</option>
                    <option value="San Fernando">San Fernando</option>
                    <option value="San Gabriel">San Gabriel</option>
                    <option value="San Juan">San Juan</option>
                    <option value="Santo Tomas">Santo Tomas</option>
                    <option value="Santol">Santol</option>
                    <option value="Sudipen">Sudipen</option>
                    <option value="Tubao">Tubao</option>
                  </>
                )}
                {formData.province === 'Lanao del Norte' && (
                  <>
                    <option value="Bacolod">Bacolod</option>
                    <option value="Baloi">Baloi</option>
                    <option value="Baroy">Baroy</option>
                    <option value="Iligan">Iligan</option>
                    <option value="Kapatagan">Kapatagan</option>
                    <option value="Kauswagan">Kauswagan</option>
                    <option value="Kolambugan">Kolambugan</option>
                    <option value="Lala">Lala</option>
                    <option value="Linamon">Linamon</option>
                    <option value="Magsaysay">Magsaysay</option>
                    <option value="Maigo">Maigo</option>
                    <option value="Matungao">Matungao</option>
                    <option value="Munai">Munai</option>
                    <option value="Nunungan">Nunungan</option>
                    <option value="Pantao Ragat">Pantao Ragat</option>
                    <option value="Pantar">Pantar</option>
                    <option value="Poona Piagapo">Poona Piagapo</option>
                    <option value="Salvador">Salvador</option>
                    <option value="Sapad">Sapad</option>
                    <option value="Sultan Naga Dimaporo">Sultan Naga Dimaporo</option>
                    <option value="Tagoloan">Tagoloan</option>
                    <option value="Tangcal">Tangcal</option>
                    <option value="Tubod">Tubod</option>
                  </>
                )}
                {formData.province === 'Lanao del Sur' && (
                  <>
                    <option value="Amai Manabilang">Amai Manabilang</option>
                    <option value="Bacolod-Kalawi">Bacolod-Kalawi</option>
                    <option value="Balabagan">Balabagan</option>
                    <option value="Balindong">Balindong</option>
                    <option value="Bayang">Bayang</option>
                    <option value="Binidayan">Binidayan</option>
                    <option value="Buadiposo-Buntong">Buadiposo-Buntong</option>
                    <option value="Bubong">Bubong</option>
                    <option value="Butig">Butig</option>
                    <option value="Ganassi">Ganassi</option>
                    <option value="Kapai">Kapai</option>
                    <option value="Lumba-Bayabao">Lumba-Bayabao</option>
                    <option value="Lumbaca-Unayan">Lumbaca-Unayan</option>
                    <option value="Lumbatan">Lumbatan</option>
                    <option value="Lumbayanague">Lumbayanague</option>
                    <option value="Madalum">Madalum</option>
                    <option value="Madamba">Madamba</option>
                    <option value="Maguing">Maguing</option>
                    <option value="Malabang">Malabang</option>
                    <option value="Marantao">Marantao</option>
                    <option value="Marawi">Marawi</option>
                    <option value="Marogong">Marogong</option>
                    <option value="Masiu">Masiu</option>
                    <option value="Mulondo">Mulondo</option>
                    <option value="Pagayawan">Pagayawan</option>
                    <option value="Piagapo">Piagapo</option>
                    <option value="Poona Bayabao">Poona Bayabao</option>
                    <option value="Pualas">Pualas</option>
                    <option value="Saguiaran">Saguiaran</option>
                    <option value="Sultan Dumalondong">Sultan Dumalondong</option>
                    <option value="Tagoloan II">Tagoloan II</option>
                    <option value="Tamparan">Tamparan</option>
                    <option value="Taraka">Taraka</option>
                    <option value="Tubaran">Tubaran</option>
                    <option value="Tugaya">Tugaya</option>
                    <option value="Wao">Wao</option>
                  </>
                )}
                {formData.province === 'Leyte' && (
                  <>
                    <option value="Abuyog">Abuyog</option>
                    <option value="Alangalang">Alangalang</option>
                    <option value="Albuera">Albuera</option>
                    <option value="Babatngon">Babatngon</option>
                    <option value="Barugo">Barugo</option>
                    <option value="Bato">Bato</option>
                    <option value="Baybay">Baybay</option>
                    <option value="Burauen">Burauen</option>
                    <option value="Calubian">Calubian</option>
                    <option value="Capoocan">Capoocan</option>
                    <option value="Carigara">Carigara</option>
                    <option value="Dagami">Dagami</option>
                    <option value="Dulag">Dulag</option>
                    <option value="Hilongos">Hilongos</option>
                    <option value="Hindang">Hindang</option>
                    <option value="Inopacan">Inopacan</option>
                    <option value="Isabel">Isabel</option>
                    <option value="Jaro">Jaro</option>
                    <option value="Javier">Javier</option>
                    <option value="Julita">Julita</option>
                    <option value="Kananga">Kananga</option>
                    <option value="La Paz">La Paz</option>
                    <option value="Leyte">Leyte</option>
                    <option value="MacArthur">MacArthur</option>
                    <option value="Mahaplag">Mahaplag</option>
                    <option value="Matag-ob">Matag-ob</option>
                    <option value="Matalom">Matalom</option>
                    <option value="Mayorga">Mayorga</option>
                    <option value="Merida">Merida</option>
                    <option value="Ormoc">Ormoc</option>
                    <option value="Palo">Palo</option>
                    <option value="Palompon">Palompon</option>
                    <option value="Pastrana">Pastrana</option>
                    <option value="San Isidro">San Isidro</option>
                    <option value="San Miguel">San Miguel</option>
                    <option value="Santa Fe">Santa Fe</option>
                    <option value="Tabango">Tabango</option>
                    <option value="Tabontabon">Tabontabon</option>
                    <option value="Tacloban">Tacloban</option>
                    <option value="Tanauan">Tanauan</option>
                    <option value="Tolosa">Tolosa</option>
                    <option value="Tunga">Tunga</option>
                    <option value="Villaba">Villaba</option>
                  </>
                )}
                {formData.province === 'Maguindanao' && (
                  <>
                    <option value="Ampatuan">Ampatuan</option>
                    <option value="Barira">Barira</option>
                    <option value="Buldon">Buldon</option>
                    <option value="Buluan">Buluan</option>
                    <option value="Cotabato City">Cotabato City</option>
                    <option value="Datu Abdullah Sangki">Datu Abdullah Sangki</option>
                    <option value="Datu Anggal Midtimbang">Datu Anggal Midtimbang</option>
                    <option value="Datu Blah T. Sinsuat">Datu Blah T. Sinsuat</option>
                    <option value="Datu Hoffer Ampatuan">Datu Hoffer Ampatuan</option>
                    <option value="Datu Montawal">Datu Montawal</option>
                    <option value="Datu Odin Sinsuat">Datu Odin Sinsuat</option>
                    <option value="Datu Paglas">Datu Paglas</option>
                    <option value="Datu Piang">Datu Piang</option>
                    <option value="Datu Salibo">Datu Salibo</option>
                    <option value="Datu Saudi-Ampatuan">Datu Saudi-Ampatuan</option>
                    <option value="Datu Unsay">Datu Unsay</option>
                    <option value="General Salipada K. Pendatun">General Salipada K. Pendatun</option>
                    <option value="Guindulungan">Guindulungan</option>
                    <option value="Kabuntalan">Kabuntalan</option>
                    <option value="Mamasapano">Mamasapano</option>
                    <option value="Mangudadatu">Mangudadatu</option>
                    <option value="Matanog">Matanog</option>
                    <option value="Northern Kabuntalan">Northern Kabuntalan</option>
                    <option value="Pagalungan">Pagalungan</option>
                    <option value="Paglat">Paglat</option>
                    <option value="Pandag">Pandag</option>
                    <option value="Parang">Parang</option>
                    <option value="Rajah Buayan">Rajah Buayan</option>
                    <option value="Shariff Aguak">Shariff Aguak</option>
                    <option value="Shariff Saydona Mustapha">Shariff Saydona Mustapha</option>
                    <option value="South Upi">South Upi</option>
                    <option value="Sultan Kudarat">Sultan Kudarat</option>
                    <option value="Sultan Mastura">Sultan Mastura</option>
                    <option value="Sultan sa Barongis">Sultan sa Barongis</option>
                    <option value="Sultan Sumagka">Sultan Sumagka</option>
                    <option value="Talayan">Talayan</option>
                    <option value="Talitay">Talitay</option>
                    <option value="Upi">Upi</option>
                  </>
                )}
                {formData.province === 'Marinduque' && (
                  <>
                    <option value="Boac">Boac</option>
                    <option value="Buenavista">Buenavista</option>
                    <option value="Gasan">Gasan</option>
                    <option value="Mogpog">Mogpog</option>
                    <option value="Santa Cruz">Santa Cruz</option>
                    <option value="Torrijos">Torrijos</option>
                  </>
                )}
                {formData.province === 'Masbate' && (
                  <>
                    <option value="Aroroy">Aroroy</option>
                    <option value="Baleno">Baleno</option>
                    <option value="Balud">Balud</option>
                    <option value="Batuan">Batuan</option>
                    <option value="Cataingan">Cataingan</option>
                    <option value="Cawayan">Cawayan</option>
                    <option value="Claveria">Claveria</option>
                    <option value="Dimasalang">Dimasalang</option>
                    <option value="Esperanza">Esperanza</option>
                    <option value="Mandaon">Mandaon</option>
                    <option value="Masbate City">Masbate City</option>
                    <option value="Milagros">Milagros</option>
                    <option value="Mobo">Mobo</option>
                    <option value="Monreal">Monreal</option>
                    <option value="Palanas">Palanas</option>
                    <option value="Pio V. Corpuz">Pio V. Corpuz</option>
                    <option value="Placer">Placer</option>
                    <option value="San Fernando">San Fernando</option>
                    <option value="San Jacinto">San Jacinto</option>
                    <option value="San Pascual">San Pascual</option>
                    <option value="Uson">Uson</option>
                  </>
                )}
                {formData.province === 'Metro Manila' && (
                  <>
                    <option value="Caloocan">Caloocan</option>
                    <option value="Las Piñas">Las Piñas</option>
                    <option value="Makati">Makati</option>
                    <option value="Malabon">Malabon</option>
                    <option value="Mandaluyong">Mandaluyong</option>
                    <option value="Manila">Manila</option>
                    <option value="Marikina">Marikina</option>
                    <option value="Muntinlupa">Muntinlupa</option>
                    <option value="Navotas">Navotas</option>
                    <option value="Parañaque">Parañaque</option>
                    <option value="Pasay">Pasay</option>
                    <option value="Pasig">Pasig</option>
                    <option value="Pateros">Pateros</option>
                    <option value="Quezon City">Quezon City</option>
                    <option value="San Juan">San Juan</option>
                    <option value="Taguig">Taguig</option>
                    <option value="Valenzuela">Valenzuela</option>
                  </>
                )}
                {formData.province === 'Misamis Occidental' && (
                  <>
                    <option value="Aloran">Aloran</option>
                    <option value="Baliangao">Baliangao</option>
                    <option value="Bonifacio">Bonifacio</option>
                    <option value="Calamba">Calamba</option>
                    <option value="Clarin">Clarin</option>
                    <option value="Concepcion">Concepcion</option>
                    <option value="Don Victoriano Chiongbian">Don Victoriano Chiongbian</option>
                    <option value="Jimenez">Jimenez</option>
                    <option value="Lopez Jaena">Lopez Jaena</option>
                    <option value="Oroquieta">Oroquieta</option>
                    <option value="Ozamiz">Ozamiz</option>
                    <option value="Panaon">Panaon</option>
                    <option value="Plaridel">Plaridel</option>
                    <option value="Sapang Dalaga">Sapang Dalaga</option>
                    <option value="Sinacaban">Sinacaban</option>
                    <option value="Tangub">Tangub</option>
                    <option value="Tudela">Tudela</option>
                  </>
                )}
                {formData.province === 'Mountain Province' && (
                  <>
                    <option value="Barlig">Barlig</option>
                    <option value="Bauko">Bauko</option>
                    <option value="Besao">Besao</option>
                    <option value="Bontoc">Bontoc</option>
                    <option value="Natonin">Natonin</option>
                    <option value="Paracelis">Paracelis</option>
                    <option value="Sabangan">Sabangan</option>
                    <option value="Sadanga">Sadanga</option>
                    <option value="Sagada">Sagada</option>
                    <option value="Tadian">Tadian</option>
                  </>
                )}
                {formData.province === 'Negros Occidental' && (
                  <>
                    <option value="Bacolod">Bacolod</option>
                    <option value="Bago">Bago</option>
                    <option value="Binalbagan">Binalbagan</option>
                    <option value="Cadiz">Cadiz</option>
                    <option value="Calatrava">Calatrava</option>
                    <option value="Candoni">Candoni</option>
                    <option value="Cauayan">Cauayan</option>
                    <option value="Enrique B. Magalona">Enrique B. Magalona</option>
                    <option value="Escalante">Escalante</option>
                    <option value="Himamaylan">Himamaylan</option>
                    <option value="Hinigaran">Hinigaran</option>
                    <option value="Hinoba-an">Hinoba-an</option>
                    <option value="Ilog">Ilog</option>
                    <option value="Isabela">Isabela</option>
                    <option value="Kabankalan">Kabankalan</option>
                    <option value="La Carlota">La Carlota</option>
                    <option value="La Castellana">La Castellana</option>
                    <option value="Manapla">Manapla</option>
                    <option value="Moises Padilla">Moises Padilla</option>
                    <option value="Murcia">Murcia</option>
                    <option value="Pontevedra">Pontevedra</option>
                    <option value="Pulupandan">Pulupandan</option>
                    <option value="Sagay">Sagay</option>
                    <option value="Salvador Benedicto">Salvador Benedicto</option>
                    <option value="San Carlos">San Carlos</option>
                    <option value="San Enrique">San Enrique</option>
                    <option value="Silay">Silay</option>
                    <option value="Sipalay">Sipalay</option>
                    <option value="Talisay">Talisay</option>
                    <option value="Toboso">Toboso</option>
                    <option value="Valladolid">Valladolid</option>
                    <option value="Victorias">Victorias</option>
                  </>
                )}
                {formData.province === 'Negros Oriental' && (
                  <>
                    <option value="Amlan">Amlan</option>
                    <option value="Ayungon">Ayungon</option>
                    <option value="Bacong">Bacong</option>
                    <option value="Bais">Bais</option>
                    <option value="Basay">Basay</option>
                    <option value="Bayawan">Bayawan</option>
                    <option value="Bindoy">Bindoy</option>
                    <option value="Canlaon">Canlaon</option>
                    <option value="Dauin">Dauin</option>
                    <option value="Dumaguete">Dumaguete</option>
                    <option value="Guihulngan">Guihulngan</option>
                    <option value="Jimalalud">Jimalalud</option>
                    <option value="La Libertad">La Libertad</option>
                    <option value="Mabinay">Mabinay</option>
                    <option value="Manjuyod">Manjuyod</option>
                    <option value="Pamplona">Pamplona</option>
                    <option value="San Jose">San Jose</option>
                    <option value="Santa Catalina">Santa Catalina</option>
                    <option value="Siaton">Siaton</option>
                    <option value="Sibulan">Sibulan</option>
                    <option value="Tanjay">Tanjay</option>
                    <option value="Tayasan">Tayasan</option>
                    <option value="Valencia">Valencia</option>
                    <option value="Vallehermoso">Vallehermoso</option>
                    <option value="Zamboanguita">Zamboanguita</option>
                  </>
                )}
                {formData.province === 'Northern Samar' && (
                  <>
                    <option value="Allen">Allen</option>
                    <option value="Biri">Biri</option>
                    <option value="Bobon">Bobon</option>
                    <option value="Capul">Capul</option>
                    <option value="Catarman">Catarman</option>
                    <option value="Catubig">Catubig</option>
                    <option value="Gamay">Gamay</option>
                    <option value="Laoang">Laoang</option>
                    <option value="Lapinig">Lapinig</option>
                    <option value="Las Navas">Las Navas</option>
                    <option value="Lavezares">Lavezares</option>
                    <option value="Mapanas">Mapanas</option>
                    <option value="Mondragon">Mondragon</option>
                    <option value="Palapag">Palapag</option>
                    <option value="Pambujan">Pambujan</option>
                    <option value="Rosario">Rosario</option>
                    <option value="San Antonio">San Antonio</option>
                    <option value="San Isidro">San Isidro</option>
                    <option value="San Jose">San Jose</option>
                    <option value="San Roque">San Roque</option>
                    <option value="San Vicente">San Vicente</option>
                    <option value="Silvino Lobos">Silvino Lobos</option>
                    <option value="Victoria">Victoria</option>
                  </>
                )}
                {formData.province === 'Nueva Ecija' && (
                  <>
                    <option value="Aliaga">Aliaga</option>
                    <option value="Bongabon">Bongabon</option>
                    <option value="Cabanatuan">Cabanatuan</option>
                    <option value="Cabiao">Cabiao</option>
                    <option value="Carranglan">Carranglan</option>
                    <option value="Cuyapo">Cuyapo</option>
                    <option value="Gabaldon">Gabaldon</option>
                    <option value="Gapan">Gapan</option>
                    <option value="General Mamerto Natividad">General Mamerto Natividad</option>
                    <option value="General Tinio">General Tinio</option>
                    <option value="Guimba">Guimba</option>
                    <option value="Jaen">Jaen</option>
                    <option value="Laur">Laur</option>
                    <option value="Licab">Licab</option>
                    <option value="Llanera">Llanera</option>
                    <option value="Lupao">Lupao</option>
                    <option value="Munoz">Munoz</option>
                    <option value="Nampicuan">Nampicuan</option>
                    <option value="Palayan">Palayan</option>
                    <option value="Pantabangan">Pantabangan</option>
                    <option value="Penaranda">Penaranda</option>
                    <option value="Quezon">Quezon</option>
                    <option value="Rizal">Rizal</option>
                    <option value="San Antonio">San Antonio</option>
                    <option value="San Isidro">San Isidro</option>
                    <option value="San Jose">San Jose</option>
                    <option value="San Leonardo">San Leonardo</option>
                    <option value="Santa Rosa">Santa Rosa</option>
                    <option value="Santo Domingo">Santo Domingo</option>
                    <option value="Talavera">Talavera</option>
                    <option value="Talugtug">Talugtug</option>
                    <option value="Zaragoza">Zaragoza</option>
                  </>
                )}
                {formData.province === 'Nueva Vizcaya' && (
                  <>
                    <option value="Alfonso Castaneda">Alfonso Castaneda</option>
                    <option value="Ambaguio">Ambaguio</option>
                    <option value="Aritao">Aritao</option>
                    <option value="Bagabag">Bagabag</option>
                    <option value="Bambang">Bambang</option>
                    <option value="Bayombong">Bayombong</option>
                    <option value="Diadi">Diadi</option>
                    <option value="Dupax del Norte">Dupax del Norte</option>
                    <option value="Dupax del Sur">Dupax del Sur</option>
                    <option value="Kasibu">Kasibu</option>
                    <option value="Kayapa">Kayapa</option>
                    <option value="Quezon">Quezon</option>
                    <option value="Santa Fe">Santa Fe</option>
                    <option value="Solano">Solano</option>
                    <option value="Villaverde">Villaverde</option>
                  </>
                )}
                {formData.province === 'Occidental Mindoro' && (
                  <>
                    <option value="Abra de Ilog">Abra de Ilog</option>
                    <option value="Calintaan">Calintaan</option>
                    <option value="Looc">Looc</option>
                    <option value="Lubang">Lubang</option>
                    <option value="Magsaysay">Magsaysay</option>
                    <option value="Mamburao">Mamburao</option>
                    <option value="Paluan">Paluan</option>
                    <option value="Rizal">Rizal</option>
                    <option value="Sablayan">Sablayan</option>
                    <option value="San Jose">San Jose</option>
                    <option value="Santa Cruz">Santa Cruz</option>
                  </>
                )}
                {formData.province === 'Oriental Mindoro' && (
                  <>
                    <option value="Baco">Baco</option>
                    <option value="Bansud">Bansud</option>
                    <option value="Bongabong">Bongabong</option>
                    <option value="Bulalacao">Bulalacao</option>
                    <option value="Calapan">Calapan</option>
                    <option value="Gloria">Gloria</option>
                    <option value="Mansalay">Mansalay</option>
                    <option value="Naujan">Naujan</option>
                    <option value="Pinamalayan">Pinamalayan</option>
                    <option value="Pola">Pola</option>
                    <option value="Puerto Galera">Puerto Galera</option>
                    <option value="Roxas">Roxas</option>
                    <option value="San Teodoro">San Teodoro</option>
                    <option value="Socorro">Socorro</option>
                    <option value="Victoria">Victoria</option>
                  </>
                )}
                {formData.province === 'Palawan' && (
                  <>
                    <option value="Aborlan">Aborlan</option>
                    <option value="Agutaya">Agutaya</option>
                    <option value="Araceli">Araceli</option>
                    <option value="Balabac">Balabac</option>
                    <option value="Bataraza">Bataraza</option>
                    <option value="Brooke's Point">Brooke's Point</option>
                    <option value="Busuanga">Busuanga</option>
                    <option value="Cagayancillo">Cagayancillo</option>
                    <option value="Coron">Coron</option>
                    <option value="Culion">Culion</option>
                    <option value="Cuyo">Cuyo</option>
                    <option value="Dumaran">Dumaran</option>
                    <option value="El Nido">El Nido</option>
                    <option value="Kalayaan">Kalayaan</option>
                    <option value="Linapacan">Linapacan</option>
                    <option value="Magsaysay">Magsaysay</option>
                    <option value="Narra">Narra</option>
                    <option value="Puerto Princesa">Puerto Princesa</option>
                    <option value="Quezon">Quezon</option>
                    <option value="Rizal">Rizal</option>
                    <option value="Roxas">Roxas</option>
                    <option value="San Vicente">San Vicente</option>
                    <option value="Sofronio Española">Sofronio Española</option>
                    <option value="Taytay">Taytay</option>
                  </>
                )}
                {formData.province === 'Romblon' && (
                  <>
                    <option value="Alcantara">Alcantara</option>
                    <option value="Banton">Banton</option>
                    <option value="Cajidiocan">Cajidiocan</option>
                    <option value="Calatrava">Calatrava</option>
                    <option value="Concepcion">Concepcion</option>
                    <option value="Corcuera">Corcuera</option>
                    <option value="Ferrol">Ferrol</option>
                    <option value="Looc">Looc</option>
                    <option value="Magdiwang">Magdiwang</option>
                    <option value="Odiongan">Odiongan</option>
                    <option value="Romblon">Romblon</option>
                    <option value="San Agustin">San Agustin</option>
                    <option value="San Andres">San Andres</option>
                    <option value="San Fernando">San Fernando</option>
                    <option value="San Jose">San Jose</option>
                    <option value="Santa Fe">Santa Fe</option>
                    <option value="Santa Maria">Santa Maria</option>
                  </>
                )}
                {formData.province === 'Samar' && (
                  <>
                    <option value="Almagro">Almagro</option>
                    <option value="Basey">Basey</option>
                    <option value="Calbayog">Calbayog</option>
                    <option value="Calbiga">Calbiga</option>
                    <option value="Catbalogan">Catbalogan</option>
                    <option value="Daram">Daram</option>
                    <option value="Gandara">Gandara</option>
                    <option value="Hinabangan">Hinabangan</option>
                    <option value="Jiabong">Jiabong</option>
                    <option value="Marabut">Marabut</option>
                    <option value="Matuguinao">Matuguinao</option>
                    <option value="Motiong">Motiong</option>
                    <option value="Pinabacdao">Pinabacdao</option>
                    <option value="San Jorge">San Jorge</option>
                    <option value="San Jose de Buan">San Jose de Buan</option>
                    <option value="San Sebastian">San Sebastian</option>
                    <option value="Santa Margarita">Santa Margarita</option>
                    <option value="Santa Rita">Santa Rita</option>
                    <option value="Santo Niño">Santo Niño</option>
                    <option value="Tagapul-an">Tagapul-an</option>
                    <option value="Talalora">Talalora</option>
                    <option value="Tarangnan">Tarangnan</option>
                    <option value="Villareal">Villareal</option>
                    <option value="Zumarraga">Zumarraga</option>
                  </>
                )}
                {formData.province === 'Sarangani' && (
                  <>
                    <option value="Alabel">Alabel</option>
                    <option value="Glan">Glan</option>
                    <option value="Kiamba">Kiamba</option>
                    <option value="Maasim">Maasim</option>
                    <option value="Maitum">Maitum</option>
                    <option value="Malapatan">Malapatan</option>
                    <option value="Malungon">Malungon</option>
                  </>
                )}
                {formData.province === 'Siquijor' && (
                  <>
                    <option value="Enrique Villanueva">Enrique Villanueva</option>
                    <option value="Larena">Larena</option>
                    <option value="Lazi">Lazi</option>
                    <option value="Maria">Maria</option>
                    <option value="San Juan">San Juan</option>
                    <option value="Siquijor">Siquijor</option>
                  </>
                )}
                {formData.province === 'Sorsogon' && (
                  <>
                    <option value="Barcelona">Barcelona</option>
                    <option value="Bulan">Bulan</option>
                    <option value="Bulusan">Bulusan</option>
                    <option value="Casiguran">Casiguran</option>
                    <option value="Castilla">Castilla</option>
                    <option value="Donsol">Donsol</option>
                    <option value="Gubat">Gubat</option>
                    <option value="Irosin">Irosin</option>
                    <option value="Juban">Juban</option>
                    <option value="Magallanes">Magallanes</option>
                    <option value="Matnog">Matnog</option>
                    <option value="Pilar">Pilar</option>
                    <option value="Prieto Diaz">Prieto Diaz</option>
                    <option value="Santa Magdalena">Santa Magdalena</option>
                    <option value="Sorsogon City">Sorsogon City</option>
                  </>
                )}
                {formData.province === 'South Cotabato' && (
                  <>
                    <option value="Banga">Banga</option>
                    <option value="General Santos">General Santos</option>
                    <option value="Koronadal">Koronadal</option>
                    <option value="Lake Sebu">Lake Sebu</option>
                    <option value="Norala">Norala</option>
                    <option value="Polomolok">Polomolok</option>
                    <option value="Santo Niño">Santo Niño</option>
                    <option value="Surallah">Surallah</option>
                    <option value="T'boli">T'boli</option>
                    <option value="Tampakan">Tampakan</option>
                    <option value="Tantangan">Tantangan</option>
                    <option value="Tupi">Tupi</option>
                  </>
                )}
                {formData.province === 'Southern Leyte' && (
                  <>
                    <option value="Anahawan">Anahawan</option>
                    <option value="Bontoc">Bontoc</option>
                    <option value="Hinunangan">Hinunangan</option>
                    <option value="Hinundayan">Hinundayan</option>
                    <option value="Libagon">Libagon</option>
                    <option value="Liloan">Liloan</option>
                    <option value="Limasawa">Limasawa</option>
                    <option value="Maasin">Maasin</option>
                    <option value="Macrohon">Macrohon</option>
                    <option value="Malitbog">Malitbog</option>
                    <option value="Padre Burgos">Padre Burgos</option>
                    <option value="Pintuyan">Pintuyan</option>
                    <option value="Saint Bernard">Saint Bernard</option>
                    <option value="San Francisco">San Francisco</option>
                    <option value="San Juan">San Juan</option>
                    <option value="San Ricardo">San Ricardo</option>
                    <option value="Silago">Silago</option>
                    <option value="Sogod">Sogod</option>
                    <option value="Tomas Oppus">Tomas Oppus</option>
                  </>
                )}
                {formData.province === 'Sultan Kudarat' && (
                  <>
                    <option value="Bagumbayan">Bagumbayan</option>
                    <option value="Columbio">Columbio</option>
                    <option value="Esperanza">Esperanza</option>
                    <option value="Isulan">Isulan</option>
                    <option value="Kalamansig">Kalamansig</option>
                    <option value="Lebak">Lebak</option>
                    <option value="Lutayan">Lutayan</option>
                    <option value="Lambayong">Lambayong</option>
                    <option value="Palimbang">Palimbang</option>
                    <option value="President Quirino">President Quirino</option>
                    <option value="Senator Ninoy Aquino">Senator Ninoy Aquino</option>
                    <option value="Tacurong">Tacurong</option>
                  </>
                )}
                {formData.province === 'Sulu' && (
                  <>
                    <option value="Banguingui">Banguingui</option>
                    <option value="Hadji Panglima Tahil">Hadji Panglima Tahil</option>
                    <option value="Indanan">Indanan</option>
                    <option value="Jolo">Jolo</option>
                    <option value="Kalingalan Caluang">Kalingalan Caluang</option>
                    <option value="Lugus">Lugus</option>
                    <option value="Luuk">Luuk</option>
                    <option value="Maimbung">Maimbung</option>
                    <option value="Old Panamao">Old Panamao</option>
                    <option value="Omar">Omar</option>
                    <option value="Pandami">Pandami</option>
                    <option value="Panglima Estino">Panglima Estino</option>
                    <option value="Pangutaran">Pangutaran</option>
                    <option value="Parang">Parang</option>
                    <option value="Pata">Pata</option>
                    <option value="Patikul">Patikul</option>
                    <option value="Siasi">Siasi</option>
                    <option value="Talipao">Talipao</option>
                    <option value="Tapul">Tapul</option>
                  </>
                )}
                {formData.province === 'Surigao del Norte' && (
                  <>
                    <option value="Alegria">Alegria</option>
                    <option value="Bacuag">Bacuag</option>
                    <option value="Burgos">Burgos</option>
                    <option value="Claver">Claver</option>
                    <option value="Dapa">Dapa</option>
                    <option value="Del Carmen">Del Carmen</option>
                    <option value="General Luna">General Luna</option>
                    <option value="Gigaquit">Gigaquit</option>
                    <option value="Mainit">Mainit</option>
                    <option value="Malimono">Malimono</option>
                    <option value="Pilar">Pilar</option>
                    <option value="Placer">Placer</option>
                    <option value="San Benito">San Benito</option>
                    <option value="San Francisco">San Francisco</option>
                    <option value="San Isidro">San Isidro</option>
                    <option value="Santa Monica">Santa Monica</option>
                    <option value="Sison">Sison</option>
                    <option value="Socorro">Socorro</option>
                    <option value="Surigao City">Surigao City</option>
                    <option value="Tagana-an">Tagana-an</option>
                    <option value="Tubod">Tubod</option>
                  </>
                )}
                {formData.province === 'Surigao del Sur' && (
                  <>
                    <option value="Barobo">Barobo</option>
                    <option value="Bayabas">Bayabas</option>
                    <option value="Bislig">Bislig</option>
                    <option value="Cagwait">Cagwait</option>
                    <option value="Cantilan">Cantilan</option>
                    <option value="Carmen">Carmen</option>
                    <option value="Carrascal">Carrascal</option>
                    <option value="Cortes">Cortes</option>
                    <option value="Hinatuan">Hinatuan</option>
                    <option value="Lanuza">Lanuza</option>
                    <option value="Lianga">Lianga</option>
                    <option value="Lingig">Lingig</option>
                    <option value="Madrid">Madrid</option>
                    <option value="Marihatag">Marihatag</option>
                    <option value="San Agustin">San Agustin</option>
                    <option value="San Miguel">San Miguel</option>
                    <option value="Tagbina">Tagbina</option>
                    <option value="Tago">Tago</option>
                    <option value="Tandag">Tandag</option>
                  </>
                )}
                {formData.province === 'Tarlac' && (
                  <>
                    <option value="Anao">Anao</option>
                    <option value="Bamban">Bamban</option>
                    <option value="Camiling">Camiling</option>
                    <option value="Capas">Capas</option>
                    <option value="Concepcion">Concepcion</option>
                    <option value="Gerona">Gerona</option>
                    <option value="La Paz">La Paz</option>
                    <option value="Mayantoc">Mayantoc</option>
                    <option value="Moncada">Moncada</option>
                    <option value="Paniqui">Paniqui</option>
                    <option value="Pura">Pura</option>
                    <option value="Ramos">Ramos</option>
                    <option value="San Clemente">San Clemente</option>
                    <option value="San Jose">San Jose</option>
                    <option value="San Manuel">San Manuel</option>
                    <option value="Santa Ignacia">Santa Ignacia</option>
                    <option value="Tarlac City">Tarlac City</option>
                    <option value="Victoria">Victoria</option>
                  </>
                )}
                {formData.province === 'Tawi-Tawi' && (
                  <>
                    <option value="Bongao">Bongao</option>
                    <option value="Languyan">Languyan</option>
                    <option value="Mapun">Mapun</option>
                    <option value="Panglima Sugala">Panglima Sugala</option>
                    <option value="Sapa-Sapa">Sapa-Sapa</option>
                    <option value="Sibutu">Sibutu</option>
                    <option value="Simunul">Simunul</option>
                    <option value="Sitangkai">Sitangkai</option>
                    <option value="South Ubian">South Ubian</option>
                    <option value="Tandubas">Tandubas</option>
                    <option value="Turtle Islands">Turtle Islands</option>
                  </>
                )}
                {formData.province === 'Zambales' && (
                  <>
                    <option value="Botolan">Botolan</option>
                    <option value="Cabangan">Cabangan</option>
                    <option value="Candelaria">Candelaria</option>
                    <option value="Castillejos">Castillejos</option>
                    <option value="Iba">Iba</option>
                    <option value="Masinloc">Masinloc</option>
                    <option value="Olongapo">Olongapo</option>
                    <option value="Palauig">Palauig</option>
                    <option value="San Antonio">San Antonio</option>
                    <option value="San Felipe">San Felipe</option>
                    <option value="San Marcelino">San Marcelino</option>
                    <option value="San Narciso">San Narciso</option>
                    <option value="Santa Cruz">Santa Cruz</option>
                    <option value="Subic">Subic</option>
                  </>
                )}
                {formData.province === 'Zamboanga del Norte' && (
                  <>
                    <option value="Baliguian">Baliguian</option>
                    <option value="Dapitan">Dapitan</option>
                    <option value="Dipolog">Dipolog</option>
                    <option value="Godod">Godod</option>
                    <option value="Gutalac">Gutalac</option>
                    <option value="Jose Dalman">Jose Dalman</option>
                    <option value="Kalawit">Kalawit</option>
                    <option value="Katipunan">Katipunan</option>
                    <option value="La Libertad">La Libertad</option>
                    <option value="Labason">Labason</option>
                    <option value="Leon B. Postigo">Leon B. Postigo</option>
                    <option value="Liloy">Liloy</option>
                    <option value="Manukan">Manukan</option>
                    <option value="Mutia">Mutia</option>
                    <option value="Pinan">Pinan</option>
                    <option value="Polanco">Polanco</option>
                    <option value="President Manuel A. Roxas">President Manuel A. Roxas</option>
                    <option value="Rizal">Rizal</option>
                    <option value="Salug">Salug</option>
                    <option value="Sergio Osmeña Sr.">Sergio Osmeña Sr.</option>
                    <option value="Siayan">Siayan</option>
                    <option value="Sibuco">Sibuco</option>
                    <option value="Sibutad">Sibutad</option>
                    <option value="Sindangan">Sindangan</option>
                    <option value="Siocon">Siocon</option>
                    <option value="Sirawai">Sirawai</option>
                    <option value="Tampilisan">Tampilisan</option>
                  </>
                )}
                {formData.province === 'Zamboanga del Sur' && (
                  <>
                    <option value="Aurora">Aurora</option>
                    <option value="Bayog">Bayog</option>
                    <option value="Dimataling">Dimataling</option>
                    <option value="Dinas">Dinas</option>
                    <option value="Dumalinao">Dumalinao</option>
                    <option value="Dumingag">Dumingag</option>
                    <option value="Guipos">Guipos</option>
                    <option value="Josefina">Josefina</option>
                    <option value="Kumalarang">Kumalarang</option>
                    <option value="Labangan">Labangan</option>
                    <option value="Lakewood">Lakewood</option>
                    <option value="Lapuyan">Lapuyan</option>
                    <option value="Mahayag">Mahayag</option>
                    <option value="Margosatubig">Margosatubig</option>
                    <option value="Midsalip">Midsalip</option>
                    <option value="Molave">Molave</option>
                    <option value="Pagadian">Pagadian</option>
                    <option value="Ramon Magsaysay">Ramon Magsaysay</option>
                    <option value="San Miguel">San Miguel</option>
                    <option value="San Pablo">San Pablo</option>
                    <option value="Sominot">Sominot</option>
                    <option value="Tabina">Tabina</option>
                    <option value="Tambulig">Tambulig</option>
                    <option value="Tigbao">Tigbao</option>
                    <option value="Tukuran">Tukuran</option>
                    <option value="Vincenzo A. Sagun">Vincenzo A. Sagun</option>
                    <option value="Zamboanga City">Zamboanga City</option>
                  </>
                )}
                {formData.province === 'Zamboanga Sibugay' && (
                  <>
                    <option value="Alicia">Alicia</option>
                    <option value="Buug">Buug</option>
                    <option value="Diplahan">Diplahan</option>
                    <option value="Imelda">Imelda</option>
                    <option value="Ipil">Ipil</option>
                    <option value="Kabasalan">Kabasalan</option>
                    <option value="Mabuhay">Mabuhay</option>
                    <option value="Malangas">Malangas</option>
                    <option value="Naga">Naga</option>
                    <option value="Olutanga">Olutanga</option>
                    <option value="Payao">Payao</option>
                    <option value="Roseller Lim">Roseller Lim</option>
                    <option value="Siay">Siay</option>
                    <option value="Talusan">Talusan</option>
                    <option value="Titay">Titay</option>
                    <option value="Tungawan">Tungawan</option>
                  </>
                )}
                {formData.province && !['Abra', 'Agusan del Norte', 'Agusan del Sur', 'Aklan', 'Albay', 'Antique', 'Apayao', 'Aurora', 'Basilan', 'Bataan', 'Batanes', 'Batangas', 'Benguet', 'Biliran', 'Bohol', 'Bukidnon', 'Bulacan', 'Cagayan', 'Camarines Norte', 'Camarines Sur', 'Camiguin', 'Capiz', 'Catanduanes', 'Cavite', 'Cebu', 'Cotabato', 'Davao de Oro', 'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 'Davao Oriental', 'Dinagat Islands', 'Eastern Samar', 'Guimaras', 'Ifugao', 'Ilocos Norte', 'Ilocos Sur', 'Iloilo', 'Isabela', 'Kalinga', 'La Union', 'Laguna', 'Lanao del Norte', 'Lanao del Sur', 'Leyte', 'Maguindanao', 'Marinduque', 'Masbate', 'Metro Manila', 'Misamis Occidental', 'Misamis Oriental', 'Mountain Province', 'Negros Occidental', 'Negros Oriental', 'Northern Samar', 'Nueva Ecija', 'Nueva Vizcaya', 'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Pampanga', 'Pangasinan', 'Quezon', 'Quirino', 'Rizal', 'Romblon', 'Samar', 'Sarangani', 'Siquijor', 'Sorsogon', 'South Cotabato', 'Southern Leyte', 'Sultan Kudarat', 'Sulu', 'Surigao del Norte', 'Surigao del Sur', 'Tarlac', 'Tawi-Tawi', 'Zambales', 'Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay'].includes(formData.province) && (
                  <option value={formData.province}>{formData.province}</option>
                )}
              </select>
              </div>
            </div>
          </div>
        </form>

        <div className="personal-info-actions">
          <button className="back-btn" onClick={handleBack}>← BACK</button>
          <button 
            type="submit" 
            className="submit-btn" 
            form="preScreeningForm"
          >
            CONTINUE →
          </button>
        </div>
      </div>

      {/* Company Pre-Screening Exam Container */}
      <div ref={stepContainerRef} className={`exam-container ${currentStep === 'questions' ? 'active' : 'hidden'}`}>
        {currentPage === 0 && (
          <>
            <h2 className="pre-screening-title">Company Pre-Screening Exam</h2>
            <p className="selected-position">
              <span className="selected-position-text">SELECTED POSITION: {(location.state?.selectedJob || '').toString().toUpperCase() || 'N/A'}</span>
            </p>
          </>
        )}
        
        <div className="questions-container">
          {examQuestions
            .slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage)
            .map((question, index) => {
              const globalIndex = currentPage * questionsPerPage + index;
              return (
                <div key={question.id} className={`question-group ${errors.questions?.[question.id] ? 'has-error' : ''}`}>
                  <h3 className="question-title">{globalIndex + 1}. {question.question}</h3>
                  <div className="question-options">
                    {question.options.map((option) => (
                      <label key={option.value} className="option-label">
                        <input 
                          type="radio" 
                          name={question.id} 
                          value={option.value} 
                          checked={questionsAnswers[question.id] === option.value} 
                          onChange={(e) => {
                            setQuestionsAnswers({ ...questionsAnswers, [question.id]: e.target.value }); 
                            clearQuestionError(question.id); 
                          }}
                        />
                        <span>{option.value}. {option.text}</span>
                      </label>
                    ))}
                  </div>
                  <div className={`error-message ${errors.questions?.[question.id] ? '' : 'is-hidden'}`}>
                    {errors.questions?.[question.id] || ''}
                  </div>
                </div>
              );
            })}
          
          <div className="exam-actions">
            <button className="back-btn" onClick={handleBack}>← BACK</button>
            {currentPage < Math.ceil(examQuestions.length / questionsPerPage) - 1 ? (
              <button 
                type="button" 
                className="submit-btn" 
                onClick={() => {
                  const start = currentPage * questionsPerPage;
                  const end = (currentPage + 1) * questionsPerPage;
                  const currentQuestions = examQuestions.slice(start, end);
                  const unansweredErrors = {};
                  currentQuestions.forEach((q, idx) => {
                    if (!questionsAnswers[q.id]) {
                      const number = start + idx + 1;
                      unansweredErrors[q.id] = `Please answer question ${number} before continuing.`;
                    }
                  });
                  if (Object.keys(unansweredErrors).length === 0) {
                    setCurrentPage(currentPage + 1);
                  } else {
                    setErrors(prev => ({ ...prev, questions: { ...prev.questions, ...unansweredErrors } }));
                    setTimeout(() => {
                      if (stepContainerRef.current) {
                        stepContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }, 0);
                  }
                }}
              >
                CONTINUE →
              </button>
            ) : (
              <button 
                type="button" 
                className="submit-btn" 
                onClick={handleQuestionsSubmit}
              >
                COMPLETE →
              </button>
            )}
          </div>
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
                    id="phoneNumber"
                    name="phoneNumber"
                    value={profileData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setProfileData({...profileData, phone: value});
                    }}
                    placeholder="09XXXXXXXXX"
                    maxLength="10"
                    className="phone-number-input"
                    required
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

    </div>
  );
};

export default PreScreening;


