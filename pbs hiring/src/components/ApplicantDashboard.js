import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import './ApplicantDashboard.css';
import logoImg from './pic/488604347_2675430962655935_1675751460889163498_n-removebg-preview.png';
import bgImg from './pic/777.png';
import userIcon from './pic/user (2).png';
import Settings from './Settings';
import { getActiveJobs, getUserData, updateUserProfile, saveJobSelection, getSelectedJobs, auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

// Job descriptions for the popup
const jobDescriptions = {
  'CCTV TECHNICIAN': 'Install, maintain, and repair closed-circuit television systems for security and surveillance purposes',
  'PAINTER': 'Apply paint, varnish, and other finishes to interior and exterior surfaces of buildings and structures',
  'ELECTRONICS ENGINEER': 'Design, develop, and test electronic components, equipment, and systems for various applications',
  'WELDER': 'Join metal parts together using various welding techniques and equipment',
  'HELPER': 'Assist skilled workers in various construction and maintenance tasks',
  'NETWORK TECHNICIAN': 'Install, configure, and maintain computer networks and communication systems',
  'ELECTRICIAN': 'Install, maintain, and repair electrical wiring, equipment, and fixtures',
  'MASON': 'Build and repair walls, floors, and other structures using bricks, concrete blocks, and stone',
  'ELECTRICAL ENGINEER': 'Design, develop, and oversee electrical systems and equipment',
  'TECHNICIAN': 'Install, maintain, and repair various technical equipment and systems',
  'PIPE FITTER': 'Install, assemble, and maintain piping systems for water, gas, and other fluid distribution',
};

// Job details for the popup (location, experience, post date)
const jobDetails = {
  'CCTV TECHNICIAN': {
    location: 'Manila, Philippines',
    experience: '2-3 years',
    postDate: '2024-01-15'
  },
  'PAINTER': {
    location: 'Cebu, Philippines',
    experience: '1-2 years',
    postDate: '2024-01-10'
  },
  'ELECTRONICS ENGINEER': {
    location: 'Davao, Philippines',
    experience: '3-5 years',
    postDate: '2024-01-05'
  },
  'WELDER': {
    location: 'Manila, Philippines',
    experience: '2-4 years',
    postDate: '2024-01-12'
  },
  'HELPER': {
    location: 'Cebu, Philippines',
    experience: '0-1 years',
    postDate: '2024-01-08'
  },
  'NETWORK TECHNICIAN': {
    location: 'Davao, Philippines',
    experience: '2-3 years',
    postDate: '2024-01-14'
  },
  'ELECTRICIAN': {
    location: 'Manila, Philippines',
    experience: '3-4 years',
    postDate: '2024-01-11'
  },
  'MASON': {
    location: 'Cebu, Philippines',
    experience: '2-3 years',
    postDate: '2024-01-09'
  },
  'ELECTRICAL ENGINEER': {
    location: 'Davao, Philippines',
    experience: '4-6 years',
    postDate: '2024-01-06'
  },
  'TECHNICIAN': {
    location: 'Manila, Philippines',
    experience: '1-3 years',
    postDate: '2024-01-13'
  },
  'PIPE FITTER': {
    location: 'Cebu, Philippines',
    experience: '2-4 years',
    postDate: '2024-01-07'
  },
};

const ApplicantDashboard = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  // State for user information - initialize with localStorage data
  const [userInfo, setUserInfo] = useState(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(storedUserInfo);
        console.log('ApplicantDashboard - Initializing userInfo with:', parsedUserInfo);
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
  
  // Function to get first and last name only
  const getFirstLastName = (fullName) => {
    if (!fullName) return '';
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) return nameParts[0];
    return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
  };
  const [showJobPopup, setShowJobPopup] = useState(false);
  const [selectedJobForPopup, setSelectedJobForPopup] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  // Notification state
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  
  // Hired notification state
  const [showHiredNotification, setShowHiredNotification] = useState(false);
  const [hiredJobTitle, setHiredJobTitle] = useState('');

  // Map job titles to icons for the job details popup
  const jobTitleToIcon = {
    'CCTV TECHNICIAN': '📹',
    'PAINTER': '🎨',
    'ELECTRONICS ENGINEER': '⚙️',
    'WELDER': '🔧',
    'HELPER': '🧰',
    'NETWORK TECHNICIAN': '📡',
    'ELECTRICIAN': '💡',
    'MASON': '🧱',
    'ELECTRICAL ENGINEER': '🔌',
    'TECHNICIAN': '🛠️',
    'PIPE FITTER': '🚰'
  };

  const getIconForJob = (jobOrTitle) => {
    const title = typeof jobOrTitle === 'object' ? jobOrTitle?.title || '' : jobOrTitle || '';
    const key = title.toUpperCase();
    return jobTitleToIcon[key] || '🛠️';
  };

  // Function to get detailed job responsibilities
  const getJobResponsibilities = (jobTitle) => {
    const title = jobTitle.toUpperCase();
    switch (title) {
      case 'ELECTRICAL ENGINEER':
        return {
          title: 'Key Responsibilities:',
          responsibilities: [
            'Design, install, and maintain electrical systems and wiring.',
            'Read and follow blueprints, drawings, and schematics.',
            'Inspect systems to ensure everything is safe and up to code.',
            'Troubleshoot problems and implement solutions efficiently.',
            'Work closely with project managers, contractors, and team members.',
            'Keep tools and work areas organized and follow safety protocols.'
          ]
        };
      case 'ELECTRONICS ENGINEER':
        return {
          title: 'Key Responsibilities:',
          responsibilities: [
            'Develop and test electronic circuits, devices, and systems.',
            'Create and update technical drawings and system layouts.',
            'Troubleshoot electronics and find practical solutions.',
            'Collaborate with engineers from different disciplines.',
            'Make sure designs meet industry safety and quality standards.',
            'Keep up with the latest technology and apply it to projects.'
          ]
        };
      case 'CIVIL ENGINEER':
        return {
          title: 'Key Responsibilities:',
          responsibilities: [
            'Plan, design, and oversee construction projects from start to finish.',
            'Prepare accurate drawings, plans, and cost estimates.',
            'Analyze site data like maps, surveys, and soil reports.',
            'Ensure construction meets codes, safety rules, and environmental regulations.',
            'Conduct site inspections, risk assessments, and quality checks.',
            'Coordinate with architects, contractors, clients, and officials.'
          ]
        };
      case 'PIPE FITTER':
        return {
          title: 'Key Responsibilities:',
          responsibilities: [
            'Install, assemble, and maintain piping systems.',
            'Read and interpret blueprints and technical drawings.',
            'Cut, fit, and connect pipes accurately.',
            'Inspect systems for leaks or issues and fix them promptly.',
            'Work closely with engineers and other tradespeople.',
            'Keep tools and the workspace clean and safe.'
          ]
        };
      case 'TECHNICIAN':
        return {
          title: 'Key Responsibilities:',
          responsibilities: [
            'Install, maintain, and repair equipment or systems.',
            'Troubleshoot problems and perform diagnostic tests.',
            'Follow instructions carefully and document work done.',
            'Assist engineers and other team members on projects.',
            'Ensure safety rules are followed at all times.',
            'Keep tools and equipment organized.'
          ]
        };
      case 'NETWORK TECHNICIAN':
        return {
          title: 'Key Responsibilities:',
          responsibilities: [
            'Set up and maintain network hardware and connections.',
            'Monitor network performance and troubleshoot issues.',
            'Ensure network security and proper configurations.',
            'Document changes and support users with technical guidance.',
            'Collaborate with IT and engineering teams.',
            'Stay up to date with network technologies.'
          ]
        };
      case 'ELECTRICIAN':
        return {
          title: 'Key Responsibilities:',
          responsibilities: [
            'Install, repair, and maintain electrical systems.',
            'Read blueprints and follow technical instructions.',
            'Inspect systems and troubleshoot faults efficiently.',
            'Install panels, switches, outlets, and lighting.',
            'Coordinate with contractors and project managers on-site.',
            'Follow safety procedures and maintain a clean work area.'
          ]
        };
      case 'HELPER':
        return {
          title: 'Key Responsibilities:',
          responsibilities: [
            'Assist skilled workers with daily tasks on-site.',
            'Carry tools, materials, and equipment safely.',
            'Keep the work area organized and clean.',
            'Learn from experienced tradespeople.',
            'Follow all safety rules and wear proper PPE.',
            'Support the team wherever needed.'
          ]
        };
      case 'WELDER':
        return {
          title: 'Key Responsibilities:',
          responsibilities: [
            'Weld, cut, and join metal parts according to specifications.',
            'Read and interpret welding blueprints and plans.',
            'Inspect welded structures for quality and durability.',
            'Maintain welding tools and equipment.',
            'Follow all safety regulations carefully.',
            'Collaborate with engineers and other workers on-site.'
          ]
        };
      case 'PAINTER':
        return {
          title: 'Key Responsibilities:',
          responsibilities: [
            'Prepare surfaces for painting by cleaning, sanding, and priming.',
            'Apply paint, stains, or varnishes according to specifications.',
            'Ensure a smooth and consistent finish.',
            'Maintain painting tools and equipment.',
            'Follow safety guidelines when handling chemicals.',
            'Work with the team to meet project deadlines.'
          ]
        };
      case 'CCTV TECHNICIAN':
        return {
          title: 'Key Responsibilities:',
          responsibilities: [
            'Install and configure CCTV and surveillance systems.',
            'Conduct site surveys to determine optimal camera placement.',
            'Troubleshoot and repair camera or system issues.',
            'Connect systems to networks and ensure they work properly.',
            'Keep accurate records of installations and maintenance.',
            'Follow safety protocols and local regulations.'
          ]
        };
      case 'MASON':
        return {
          title: 'Key Responsibilities:',
          responsibilities: [
            'Build and repair walls, floors, and other masonry structures.',
            'Read blueprints and follow project specifications.',
            'Mix, pour, and apply mortar or concrete.',
            'Inspect work to ensure quality and stability.',
            'Work alongside other tradespeople and supervisors.',
            'Keep tools and workspace clean and safe.'
          ]
        };
      default:
        return {
          title: 'Key Responsibilities:',
          responsibilities: [
            'Perform technical tasks according to job specifications.',
            'Follow safety protocols and company guidelines.',
            'Collaborate with team members and supervisors.',
            'Maintain tools and equipment properly.',
            'Complete assigned tasks efficiently and accurately.',
            'Contribute to project success and team objectives.'
          ]
        };
    }
  };

  // Professional SVG icons for job cards - clean, modern, corporate style
  const getSvgIconForJob = (jobOrTitle) => {
    const title = typeof jobOrTitle === 'object' ? jobOrTitle?.title || '' : jobOrTitle || '';
    const key = title.toUpperCase();
    console.log('Rendering icon for:', key); // Debug log
    switch (key) {
      case 'CCTV TECHNICIAN':
        return (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <rect x="4" y="6" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="1" fill="currentColor"/>
            <path d="M8 20h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M6 4l2-1h8l2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case 'PAINTER':
        return (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M12 2C8 2 5 4.5 5 8c0 2 1.5 3.5 3.5 3.5h1c.8 0 1.5.7 1.5 1.5 0 .8.7 1.5 1.5 1.5 2.5 0 4.5-2 4.5-4.5 0-4-3-7-6-7z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="9" cy="9" r="1" fill="currentColor"/>
            <circle cx="7.5" cy="11" r="1" fill="currentColor"/>
            <circle cx="11" cy="12" r="1" fill="currentColor"/>
            <circle cx="13.5" cy="10" r="1" fill="currentColor"/>
            <path d="M16 6l-1 2 1 2 1-2z" fill="currentColor"/>
          </svg>
        );
      case 'WELDER':
        return (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M12 3c-2 2-2.5 3.5-2.5 5a2.5 2.5 0 0 0 5 0c0-1.5-.5-3-2.5-5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M6 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M10 2l1 2-1 1-1-1z" fill="currentColor"/>
            <circle cx="12" cy="18" r="1.5" fill="currentColor"/>
            <path d="M15 15l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case 'MASON':
        return (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <rect x="3" y="16" width="18" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="4" y="12" width="3" height="4" fill="currentColor"/>
            <rect x="8" y="12" width="3" height="4" fill="currentColor"/>
            <rect x="12" y="12" width="3" height="4" fill="currentColor"/>
            <rect x="16" y="12" width="3" height="4" fill="currentColor"/>
            <path d="M12 8v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M6 6h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="4" r="1.5" fill="currentColor"/>
          </svg>
        );
      case 'PIPE FITTER':
        return (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <rect x="3" y="9" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="9" y="12" width="6" height="0" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="15" y="9" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 9V6a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5v3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="6" cy="12" r="1" fill="currentColor"/>
            <circle cx="18" cy="12" r="1" fill="currentColor"/>
            <path d="M12 3v3M12 18v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case 'ELECTRICAL ENGINEER':
        return (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M13 2L3 14h6l-2 8 11-14h-6z" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.5" fill="white"/>
            <path d="M6 6l3 3M15 6l-3 3M6 18l3-3M15 18l-3-3" stroke="white" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        );
      case 'ELECTRONICS ENGINEER':
        return (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M6 2v2M18 2v2M6 20v2M18 20v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="1" fill="white"/>
          </svg>
        );
      case 'TECHNICIAN':
        return (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M21 5.5a3.5 3.5 0 0 1-5.1 3.1l-5.4 5.4a1 1 0 1 1-1.4-1.4l5.4-5.4A3.5 3.5 0 1 1 21 5.5z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <path d="M6 6l3 3M15 6l-3 3M6 18l3-3M15 18l-3-3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        );
      case 'NETWORK TECHNICIAN':
        return (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <circle cx="6" cy="18" r="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="18" cy="18" r="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="12" cy="6" r="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 8v10M8 18h8M7 17l2-1M17 17l-2-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M6 6l3 3M15 6l-3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            <circle cx="12" cy="6" r="1" fill="currentColor"/>
          </svg>
        );
      case 'ELECTRICIAN':
        return (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M12 3a6 6 0 0 0-3 10.5V21h6v-7.5A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 21h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <path d="M6 6l3 3M15 6l-3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            <path d="M12 1v2M12 21v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case 'HELPER':
        return (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <circle cx="8" cy="9" r="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="16" cy="9" r="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 19a4 4 0 0 1 7-3M20 19a4 4 0 0 0-7-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12 4v3M12 17v3M4 12h3M17 12h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="1" fill="currentColor"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M21 5.5a3.5 3.5 0 0 1-5.1 3.1l-5.4 5.4a1 1 0 1 1-1.4-1.4l5.4-5.4A3.5 3.5 0 1 1 21 5.5z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <path d="M6 6l3 3M15 6l-3 3M6 18l3-3M15 18l-3-3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        );
    }
  };
  
  // Profile edit modal state
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  
  // Replace confirmation modal state
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  // Function to fetch user data from Firebase
  const fetchUserDataFromFirebase = async () => {
    try {
      if (auth.currentUser) {
        const userData = await getUserData(auth.currentUser.uid);
        console.log('Fetched user data from Firebase:', userData);
        
        // Use the name from SignUp.js stored in localStorage, fallback to Firebase data
        const storedUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        
        // Update user info state with combined data
        const updatedUserInfo = {
          ...userData,
          name: auth.currentUser.displayName || storedUserInfo.name || userData.name || '',
          email: userData.email || storedUserInfo.email || auth.currentUser.email || '',
          photoURL: userData.photoURL || auth.currentUser.photoURL || null,
          role: storedUserInfo.role || userData.role || 'applicant'
        };
        setUserInfo(updatedUserInfo);
        
        // Update localStorage with the complete user info including photoURL
        localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
        
        setUserName(updatedUserInfo.name || 'User');
        setUserEmail(updatedUserInfo.email || '');
      }
    } catch (error) {
      console.error('Error fetching user data from Firebase:', error);
    }
  };

  // Function to load selected jobs from Firebase
  const loadSelectedJobsFromFirebase = async () => {
    try {
      if (auth.currentUser) {
        const selectedJobsFromFirebase = await getSelectedJobs(auth.currentUser.uid);
        console.log('Fetched selected jobs from Firebase:', selectedJobsFromFirebase);
        
        if (selectedJobsFromFirebase && selectedJobsFromFirebase.length > 0) {
          // Convert job objects to job IDs for the Set
          const jobIds = selectedJobsFromFirebase.map(job => 
            typeof job === 'object' ? job.id : job
          );
          setSelectedJobs(new Set(jobIds));
          console.log('Set selected jobs from Firebase:', jobIds);
        }
      }
    } catch (error) {
      console.error('Error loading selected jobs from Firebase:', error);
    }
  };

  // Fetch notifications (interviews and rejections)
  const fetchNotifications = async (userId) => {
    try {
      setLoadingNotifications(true);
      const allNotifications = [];
      
      // Fetch interview notifications
      const interviewsRef = collection(db, 'interviews');
      const interviewQuery = query(interviewsRef, where('applicantId', '==', userId));
      const interviewSnapshot = await getDocs(interviewQuery);
      
      interviewSnapshot.forEach((doc) => {
        const interview = doc.data();
        const now = new Date();
        const interviewDate = new Date(interview.date + ' ' + interview.time);
        const timeDiff = interviewDate - now;
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        let timeText = '';
        if (daysDiff > 0) {
          timeText = `in ${daysDiff} day${daysDiff > 1 ? 's' : ''}`;
        } else if (daysDiff === 0) {
          timeText = 'today';
        } else {
          timeText = `${Math.abs(daysDiff)} day${Math.abs(daysDiff) > 1 ? 's' : ''} ago`;
        }
        
        allNotifications.push({
          id: doc.id,
          title: `Interview Scheduled - ${interview.position}`,
          message: `Interview scheduled for ${interview.date} at ${interview.time}. Location: ${interview.location || 'TBD'}`,
          time: timeText,
          unread: daysDiff >= 0,
          type: 'interview',
          timestamp: interviewDate
        });
      });
      
      // Fetch rejection and hired notifications from decisions collection (preferred source)
      const decisionsRef = collection(db, 'decisions');
      const decisionsQueryRef = query(decisionsRef, where('applicantId', '==', userId));
      const decisionsSnapshot = await getDocs(decisionsQueryRef);

      let latestRejectedDecision = null;
      let latestHiredDecision = null;
      decisionsSnapshot.forEach((d) => {
        const data = d.data() || {};
        const decision = (data.decision || '').toString().toLowerCase();
        
        let createdAt = data.createdAt;
        try {
          if (typeof createdAt?.toDate === 'function') createdAt = createdAt.toDate();
          else if (typeof createdAt?.seconds === 'number') createdAt = new Date(createdAt.seconds * 1000);
        } catch {}
        const decidedAt = createdAt || new Date();

        if (decision === 'rejected') {
          if (!latestRejectedDecision || decidedAt > latestRejectedDecision.timestamp) {
            latestRejectedDecision = {
              id: d.id + '_decision_rejection',
              title: 'Application Update',
              message: 'Your application has been reviewed. Unfortunately, our team has chosen to move forward with other applicants. We wish you the best in your job search.',
              timestamp: decidedAt
            };
          }
        } else if (decision === 'hired') {
          if (!latestHiredDecision || decidedAt > latestHiredDecision.timestamp) {
            latestHiredDecision = {
              id: d.id + '_decision_hired',
              title: 'Congratulations!',
              message: data.message || 'You have been selected for the position!',
              timestamp: decidedAt,
              position: data.position || 'Selected Position'
            };
          }
        }
      });

      if (latestRejectedDecision) {
        const now = new Date();
        const timeDiff = now - latestRejectedDecision.timestamp;
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        let timeText = '';
        if (daysDiff === 0) timeText = 'today';
        else if (daysDiff === 1) timeText = '1 day ago';
        else timeText = `${daysDiff} days ago`;

        allNotifications.push({
          id: latestRejectedDecision.id,
          title: latestRejectedDecision.title,
          message: latestRejectedDecision.message,
          time: timeText,
          unread: daysDiff <= 7,
          type: 'rejection',
          timestamp: latestRejectedDecision.timestamp
        });
      }
      
      // Check for hired decision and show modal notification
      if (latestHiredDecision) {
        const now = new Date();
        const timeDiff = now - latestHiredDecision.timestamp;
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        
        // Show hired notification modal if hired within last 7 days and not already shown
        if (daysDiff <= 7) {
          const notificationShown = localStorage.getItem(`hiredNotificationShown_${userId}`);
          if (!notificationShown) {
            setHiredJobTitle(latestHiredDecision.position);
            setShowHiredNotification(true);
            localStorage.setItem(`hiredNotificationShown_${userId}`, 'true');
          }
        }
        
        let timeText = '';
        if (daysDiff === 0) timeText = 'today';
        else if (daysDiff === 1) timeText = '1 day ago';
        else timeText = `${daysDiff} days ago`;

        allNotifications.push({
          id: latestHiredDecision.id,
          title: latestHiredDecision.title,
          message: latestHiredDecision.message,
          time: timeText,
          unread: daysDiff <= 7,
          type: 'hired',
          timestamp: latestHiredDecision.timestamp
        });
      }
      
      // Admin/employer remarks/messages are intentionally not displayed in applicant notifications.
      
      // Sort by timestamp (newest first)
      allNotifications.sort((a, b) => b.timestamp - a.timestamp);
      
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Load jobs and user info from Firebase on component mount
  useEffect(() => {
    // Fetch user data from Firebase first
    fetchUserDataFromFirebase();
    
    // Load selected jobs from Firebase
    loadSelectedJobsFromFirebase();

    // Load jobs from Firebase only
    const loadJobs = async () => {
      try {
        const activeJobs = await getActiveJobs();
        console.log('Active jobs from Firebase:', activeJobs);
        
        if (activeJobs && activeJobs.length > 0) {
          // Filter out expired jobs
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const validJobs = activeJobs.filter(job => {
            if (!job.applicationEndDate) return true; // No expiration date means always active
            const endDate = new Date(job.applicationEndDate);
            endDate.setHours(0, 0, 0, 0);
            return endDate >= today; // Only show jobs that haven't expired
          });
          
          // Convert Firebase job objects to consistent format
          const formattedJobs = validJobs.map(job => ({
            id: job.id,
            title: job.title,
            description: job.description,
            location: job.location,
            experience: job.experience || job.experienceLevel,
            salary: job.salary,
            // ensure application window dates are preserved from Firebase
            applicationStartDate: job.applicationStartDate,
            applicationEndDate: job.applicationEndDate,
            // keep original fields for fallback/compatibility
            postedDate: job.postedDate,
            createdAt: job.createdAt
          }));
          setJobs(formattedJobs);
          console.log('Set jobs to Firebase data (filtered for active only):', formattedJobs);
        } else {
          // No jobs available from Firebase
          console.log('No active jobs found in Firebase');
          setJobs([]);
        }
      } catch (error) {
        console.error('Error loading jobs from Firebase:', error);
        setJobs([]);
      } finally {
        setLoading(false);
        console.log('Loading finished');
      }
    };

    // Load jobs from Firebase first, then fallback to test jobs
    loadJobs();
    
    // Fetch notifications if user is authenticated
    if (auth.currentUser) {
      fetchNotifications(auth.currentUser.uid);
    }
  }, []);

  // Separate useEffect for userInfo changes and role-based navigation
  useEffect(() => {
    // Check user role and redirect accordingly
    if (userInfo.role === 'admin') {
      console.log('Admin detected on applicant dashboard, redirecting to admin dashboard');
      navigate('/admin-dashboard');
      return;
    } else if (userInfo.role === 'employer') {
      console.log('Employer detected on applicant dashboard, redirecting to employer dashboard');
      navigate('/employer-dashboard');
      return;
    }
    
    // If user is employee or no role specified, continue with applicant dashboard
    setUserName(userInfo.name || 'User');
    setUserEmail(userInfo.email || '');
    console.log('ApplicantDashboard - User photoURL:', userInfo.photoURL);

    // Fallback: Load selected jobs from localStorage if Firebase fails
    const allSelectedJobs = JSON.parse(localStorage.getItem('selectedJobs') || '{}');
    if (userInfo.email && allSelectedJobs[userInfo.email]) {
      setSelectedJobs(new Set(allSelectedJobs[userInfo.email]));
    }
  }, [userInfo, navigate]);

  // Handle clicks outside dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside both dropdowns
      const profileDropdown = event.target.closest('.profile-dropdown');
      const notificationDropdown = event.target.closest('.notification-dropdown');
      
      if (!profileDropdown && !notificationDropdown) {
        setShowDropdown(false);
        setShowNotificationDropdown(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  const handleProfileClick = async () => {
    // Use the name from SignUp.js stored in localStorage
    const nameParts = (userInfo.name || '').split(' ');
    setProfileData({
      firstName: nameParts[0] || '',
      lastName: nameParts[nameParts.length - 1] || '',
      email: userInfo.email || '',
      phone: localStorage.getItem('userPhone') || ''
    });
    setShowDropdown(false);
    setShowProfileEdit(true);
  };

  const handleJobClick = (job) => {
    // Show the popup first
    setSelectedJobForPopup(job);
    setShowJobPopup(true);
  };

  const applyJobSelection = async () => {
    const jobId = typeof selectedJobForPopup === 'object' ? selectedJobForPopup.id : selectedJobForPopup;
    
    // Proceed with selecting (enforce single selection)
    const newSelectedJobs = new Set([jobId]);
    setSelectedJobs(newSelectedJobs);

    // Save job selection to Firebase FIRST and wait for completion
    try {
      if (auth.currentUser) {
        console.log('Saving job selection to Firebase:', selectedJobForPopup);
        
        // Clean job data to remove undefined values
        const cleanJobData = typeof selectedJobForPopup === 'object' ? {
          id: selectedJobForPopup.id || '',
          title: selectedJobForPopup.title || '',
          description: selectedJobForPopup.description || '',
          location: selectedJobForPopup.location || '',
          experience: selectedJobForPopup.experience || selectedJobForPopup.experienceLevel || '',
          salary: selectedJobForPopup.salary || '',
          applicationEndDate: selectedJobForPopup.applicationEndDate || null,
          postedDate: selectedJobForPopup.postedDate || selectedJobForPopup.createdAt || null
        } : selectedJobForPopup;
        
        await saveJobSelection(auth.currentUser.uid, cleanJobData);
        console.log('Job selection saved successfully to applicantInfo collection');
      } else {
        console.error('No authenticated user found');
        alert('Please log in to apply for jobs');
        return;
      }
    } catch (error) {
      console.error('Error saving job selection to Firebase:', error);
      alert('Failed to save job selection. Please try again.');
      return; // Don't proceed if Firebase save fails
    }

    // Update selected jobs in localStorage with user email as key
    const allSelectedJobs = JSON.parse(localStorage.getItem('selectedJobs') || '{}');
    allSelectedJobs[userEmail] = Array.from(newSelectedJobs);
    localStorage.setItem('selectedJobs', JSON.stringify(allSelectedJobs));

    // Close popup and navigate to pre-screening
    setShowJobPopup(false);
    navigate('/pre-screening', { 
      state: { 
        userName: userName,
        selectedJob: typeof selectedJobForPopup === 'object' ? selectedJobForPopup.title : selectedJobForPopup 
      }
    });
  };

  const handleApplyNow = async () => {
    // Check if user is rejected and within 6 months cooldown
    if (auth.currentUser) {
      try {
        const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', auth.currentUser.uid)));
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          if (userData.applicationStatus === 'rejected' && userData.rejectedAt) {
            const rejectionDate = new Date(userData.rejectedAt.seconds * 1000);
            const sixMonthsLater = new Date(rejectionDate);
            sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
            
            if (new Date() < sixMonthsLater) {
              const now = new Date();
              const timeDiff = sixMonthsLater - now;
              const remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
              const remainingMonths = Math.floor(remainingDays / 30);
              const remainingDaysAfterMonths = remainingDays % 30;
              
              let timeMessage = '';
              if (remainingMonths > 0) {
                timeMessage = `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
                if (remainingDaysAfterMonths > 0) {
                  timeMessage += ` and ${remainingDaysAfterMonths} day${remainingDaysAfterMonths > 1 ? 's' : ''}`;
                }
              } else {
                timeMessage = `${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
              }
              
              await Swal.fire({
                icon: 'info',
                title: 'Cannot reapply yet',
                text: `You cannot reapply for ${timeMessage}. Please wait until ${sixMonthsLater.toLocaleDateString()} to apply again.`
              });
              return;
            }
          }
        }

        // Also check latest decision from decisions collection
        try {
          const decisionsRef = collection(db, 'decisions');
          const decisionsQueryRef = query(decisionsRef, where('applicantId', '==', auth.currentUser.uid));
          const decisionsSnapshot = await getDocs(decisionsQueryRef);
          let latestRejectedAt = null;
          decisionsSnapshot.forEach((d) => {
            const data = d.data() || {};
            const decision = (data.decision || '').toString().toLowerCase();
            if (decision !== 'rejected') return;
            let createdAt = data.createdAt;
            try {
              if (typeof createdAt?.toDate === 'function') createdAt = createdAt.toDate();
              else if (typeof createdAt?.seconds === 'number') createdAt = new Date(createdAt.seconds * 1000);
            } catch {}
            const decidedAt = createdAt || new Date();
            if (!latestRejectedAt || decidedAt > latestRejectedAt) {
              latestRejectedAt = decidedAt;
            }
          });

          if (latestRejectedAt) {
            const sixMonthsLater = new Date(latestRejectedAt);
            sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
            if (new Date() < sixMonthsLater) {
              const now = new Date();
              const timeDiff = sixMonthsLater - now;
              const remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
              const remainingMonths = Math.floor(remainingDays / 30);
              const remainingDaysAfterMonths = remainingDays % 30;
              let timeMessage = '';
              if (remainingMonths > 0) {
                timeMessage = `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
                if (remainingDaysAfterMonths > 0) {
                  timeMessage += ` and ${remainingDaysAfterMonths} day${remainingDaysAfterMonths > 1 ? 's' : ''}`;
                }
              } else {
                timeMessage = `${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
              }
              await Swal.fire({
                icon: 'info',
                title: 'Cannot reapply yet',
                text: `You cannot reapply for ${timeMessage}. Please wait until ${sixMonthsLater.toLocaleDateString()} to apply again.`
              });
              return;
            }
          }
        } catch (e) {
          console.warn('Failed to check decisions for re-application restriction:', e);
        }
      } catch (error) {
        console.error('Error checking rejection status:', error);
      }
    }

    const jobId = typeof selectedJobForPopup === 'object' ? selectedJobForPopup.id : selectedJobForPopup;

    // If a different job is already selected, ask to replace
    if (selectedJobs.size > 0 && !selectedJobs.has(jobId)) {
      setShowReplaceConfirm(true);
      return;
    }

    // Apply the job selection
    await applyJobSelection();
  };

  const handleClosePopup = () => {
    setShowJobPopup(false);
    setSelectedJobForPopup('');
  };

  const confirmReplaceJob = async () => {
    setShowReplaceConfirm(false);
    await applyJobSelection();
  };

  const cancelReplaceJob = () => {
    setShowReplaceConfirm(false);
  };

  const handleProfileSave = async () => {
    // Validate phone number (must be exactly 10 digits after +63)
    if (profileData.phone && profileData.phone.length !== 10) {
      alert('Phone number must be exactly 10 digits after +63');
      return;
    }
    
    // Construct full name from individual fields
    const fullName = [profileData.firstName, profileData.lastName]
      .filter(name => name.trim())
      .join(' ');
    
    try {
      if (auth.currentUser) {
        // Save profile data to Firebase
        const profileUpdateData = {
          displayName: fullName,
          name: fullName,
          email: profileData.email,
          phoneNumber: profileData.phone,
          countryCode: '+63', // Default to +63 for Philippines
          updatedAt: new Date()
        };
        
        await updateUserProfile(auth.currentUser.uid, profileUpdateData);
        console.log('Profile data saved to Firebase successfully');
        
        // Update local state
        const updatedUserInfo = { 
          ...userInfo, 
          name: fullName, 
          email: profileData.email 
        };
        setUserInfo(updatedUserInfo);
        setUserName(fullName);
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

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  // Notification handlers
  const handleNotificationClick = () => {
    setShowNotificationDropdown(!showNotificationDropdown);
    // Close profile dropdown when notification is clicked
    if (showDropdown) {
      setShowDropdown(false);
    }
  };

  const handleNotificationItemClick = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, unread: false }
          : notification
      )
    );
  };

  const getUnreadCount = () => {
    return notifications.filter(notification => notification.unread).length;
  };
  
  const handleCloseHiredNotification = () => {
    setShowHiredNotification(false);
  };

  return (
    <div className="dashboard-container applicant-dashboard-root">

      {/* Header */}
      <header className="dashboard-header">
          <div className="header-left">
            <img src={logoImg} alt="PBS Logo" className="dashboard-logo" />
            <div className="company-info">
              <span className="company-name">PBS ENGINEERING SERVICES</span>
            </div>
          </div>
        <nav className="dashboard-nav">
          <div className="profile-dropdown">
            <div className="profile-header">
              <div className="profile-info" onClick={() => {
                setShowDropdown(!showDropdown);
                // Close notification dropdown when profile is clicked
                if (showNotificationDropdown) {
                  setShowNotificationDropdown(false);
                }
              }}>
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
                    onLoad={() => console.log('ApplicantDashboard - Profile picture loaded:', userInfo.photoURL || userIcon)}
                    onError={(e) => {
                      console.log('ApplicantDashboard - Profile picture failed to load, using fallback');
                      if (userInfo.photoURL && e.target.src !== userIcon) {
                        e.target.src = userIcon;
                      }
                    }}
                  />
                </div>
                <div className="profile-details">
                  <div className="profile-name">{getFirstLastName(userName) || 'Rheynier Riparip'}</div>
                  <div className="profile-email">{userEmail || 'rheynier@example.com'}</div>
                </div>
              </div>
              
              {/* Notification Bell */}
              <div className="notification-dropdown">
                <div onClick={handleNotificationClick}>
                  <div className="notification-bell">
                    <svg className="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {getUnreadCount() > 0 && (
                      <div className="notification-badge">
                        {getUnreadCount()}
                      </div>
                    )}
                  </div>
                </div>
                {showNotificationDropdown && (
                  <div className="notification-menu">
                    <div className="notification-header-title">
                      <h3>Notifications</h3>
                      <span className="notification-count">{notifications.length} total</span>
                    </div>
                    <div className="notification-list">
                      {loadingNotifications ? (
                        <div className="no-notifications">
                          <p>Loading notifications...</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="no-notifications">
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div 
                            key={notification.id} 
                            className={`notification-item ${notification.unread ? 'unread' : ''}`}
                            onClick={() => handleNotificationItemClick(notification.id)}
                          >
                            <div className="notification-content">
                              <div className="notification-title">{notification.title}</div>
                              <div className="notification-message">{notification.message}</div>
                              <div className="notification-time">{notification.time}</div>
                            </div>
                            {notification.unread && <div className="notification-dot"></div>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
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
                        console.log('ApplicantDashboard - Dropdown profile picture failed to load, using fallback');
                        if (userInfo.photoURL && e.target.src !== userIcon) {
                          e.target.src = userIcon;
                        }
                      }}
                    />
                  </div>
                  <div className="profile-details">
                    <div className="profile-name">{getFirstLastName(userName) || 'Rheynier Riparip'}</div>
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
                    <span className="menu-icon">↗️</span>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Main Section */}
      <main className="dashboard-main">
        <div className="main-content">
          <div className="welcome-section">
            <h1 className="join-title">Welcome to Our Team</h1>
            <p className="welcome-subtitle">Join PBS Engineering Services and become part of a professional, dedicated, and skilled workforce. We take pride in delivering high-quality construction and engineering solutions that help build stronger communities and a better future.</p>
          </div>
          <div className="job-openings-section">
            <h2 className="job-openings-title">Job Openings</h2>
            <p className="job-openings-subtitle">We are looking for skilled and dedicated professionals to join our team in the following roles</p>
          </div>
          <div className="job-cards-grid">
            {loading ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'white', fontSize: '1.2rem' }}>Loading jobs...</div>
            ) : jobs.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'white', fontSize: '1.2rem' }}>No jobs available</div>
            ) : (
              jobs.map((job) => {
                const jobTitle = job.title;
                const jobDesc = job.description || '';
                const jobId = job.id;
                return (
                  <div key={jobId} className="job-card-modern">
                    <div className="job-card-header">
                      <div className="job-card-title">{jobTitle}</div>
                      <div className="job-card-tag">
                        {(() => {
                          // If the current applicant has already applied for this job, show Applied
                          if (selectedJobs.has(jobId)) return 'Applied';

                          const toDate = (dateField) => {
                            if (!dateField) return null;
                            if (dateField.seconds) return new Date(dateField.seconds * 1000);
                            return new Date(dateField);
                          };
                          const start = toDate(job.applicationStartDate);
                          const end = toDate(job.applicationEndDate);
                          if (start && end) return `Available at: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
                          if (start) return `Available at: ${start.toLocaleDateString()}`;
                          if (end) return `Available at: ${end.toLocaleDateString()}`;
                          // No application window dates; show nothing
                          return '';
                        })()}
                      </div>
                    </div>
                    <div className="job-card-description">
                      {jobDesc}
                    </div>
                    <div className="job-card-requirements">
                      <div className="requirements-title">Qualifications:</div>
                      <ul className="requirements-list">
                        {(() => {
                          const title = jobTitle.toUpperCase();
                          switch (title) {
                            case 'ELECTRICAL ENGINEER':
                              return [
                                <li key="1">Bachelor's degree in Electrical Engineering</li>,
                                <li key="2">3+ years experience</li>,
                                <li key="3">Professional license preferred</li>
                              ];
                            case 'ELECTRONICS ENGINEER':
                              return [
                                <li key="1">Bachelor's degree in Electronics or Electrical Engineering</li>,
                                <li key="2">3+ years experience</li>,
                                <li key="3">Professional license preferred</li>
                              ];
                            case 'PIPE FITTER':
                              return [
                                <li key="1">Relevant technical diploma or certification</li>,
                                <li key="2">3+ years experience</li>,
                                <li key="3">Knowledge of construction safety practices</li>
                              ];
                            case 'TECHNICIAN':
                              return [
                                <li key="1">Relevant technical diploma or certification</li>,
                                <li key="2">3+ years experience</li>,
                                <li key="3">Hands-on experience with tools and equipment</li>
                              ];
                            case 'NETWORK TECHNICIAN':
                              return [
                                <li key="1">Bachelor's degree in Information Technology or related field</li>,
                                <li key="2">3+ years experience</li>,
                                <li key="3">Knowledge of networking protocols and hardware</li>
                              ];
                            case 'ELECTRICIAN':
                              return [
                                <li key="1">Licensed or certified electrician</li>,
                                <li key="2">3+ years experience</li>,
                                <li key="3">Knowledge of electrical safety and NEC standards</li>
                              ];
                            case 'HELPER':
                              return [
                                <li key="1">High school diploma or equivalent</li>,
                                <li key="2">Physically fit</li>,
                                <li key="3">Willingness to learn and assist skilled workers</li>
                              ];
                            case 'WELDER':
                              return [
                                <li key="1">Certification in welding or related trade</li>,
                                <li key="2">3+ years experience</li>,
                                <li key="3">Knowledge of safety procedures and equipment handling</li>
                              ];
                            case 'PAINTER':
                              return [
                                <li key="1">Bachelor's degree in Painting or related field</li>,
                                <li key="2">3+ years experience</li>,
                                <li key="3">Professional license preferred</li>
                              ];
                            case 'CCTV TECHNICIAN':
                              return [
                                <li key="1">Relevant technical diploma or certification</li>,
                                <li key="2">3+ years experience</li>,
                                <li key="3">Experience installing and maintaining CCTV systems</li>
                              ];
                            case 'MASON':
                              return [
                                <li key="1">Relevant technical diploma or certification</li>,
                                <li key="2">3+ years experience</li>,
                                <li key="3">Knowledge of construction safety and proper material handling</li>
                              ];
                            default:
                              return [
                                <li key="1">Bachelor's degree in {jobTitle.split(' ')[0]} Engineering</li>,
                                <li key="2">3+ years experience</li>,
                                <li key="3">Professional license preferred</li>
                              ];
                          }
                        })()}
                      </ul>
                    </div>
                    <button className="job-card-btn primary" onClick={() => handleJobClick(job)}>
                      View Details
                      <span className="apply-arrow">→</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Job Details Popup */}
      {showJobPopup && (
        <div className="job-popup-overlay" onClick={handleClosePopup}>
          <div className="job-popup" onClick={(e) => e.stopPropagation()}>
            <button className="job-popup-close" onClick={handleClosePopup} aria-label="Close">✕</button>
            <h3 className="job-popup-title">
              {selectedJobForPopup.title}
            </h3>
            <div className="job-responsibilities">
              <h4 className="responsibilities-title">
                {getJobResponsibilities(selectedJobForPopup.title).title}
              </h4>
              <ul className="responsibilities-list">
                {getJobResponsibilities(selectedJobForPopup.title).responsibilities.map((responsibility, index) => (
                  <li key={index} className="responsibility-item">
                    {responsibility}
                  </li>
                ))}
              </ul>
            </div>
            <button 
              className="job-popup-apply-btn"
              onClick={handleApplyNow}
            >
              <span className="apply-icon">✈️</span>
              Apply Now
            </button>
          </div>
        </div>
      )}

      {/* Replace Confirmation Modal */}
      {showReplaceConfirm && (
        <div className="job-popup-overlay replace-overlay" onClick={cancelReplaceJob}>
          <div className="job-popup replace-popup" onClick={(e) => e.stopPropagation()}>
            <button className="job-popup-close" onClick={cancelReplaceJob} aria-label="Close">✕</button>
            <div className="job-popup-icon">
              <svg
                className="replace-icon"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
              >
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="8" r="1.2" fill="currentColor" />
              </svg>
            </div>
            <h3 className="job-popup-title">Replace selected job?</h3>
            <p className="replace-description">
              You already selected <strong>{(() => {
                const lastJobId = Array.from(selectedJobs)[selectedJobs.size - 1];
                const job = jobs.find(j => (typeof j === 'object' ? j.id : j) === lastJobId);
                return typeof job === 'object' ? job.title : job;
              })()}</strong>. Do you want to replace it with
              {` `}
              <strong>
                {typeof selectedJobForPopup === 'object' ? selectedJobForPopup.title : selectedJobForPopup}
              </strong>
              ?
            </p>
            <div className="replace-actions">
              <button className="job-popup-apply-btn" onClick={confirmReplaceJob}>
                Yes, replace
              </button>
              <button className="job-popup-apply-btn cancel-btn" onClick={cancelReplaceJob}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


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
                <label>First Name *</label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                  placeholder="Rheynier"
                  required
                />
              </div>
              <div className="profile-edit-field">
                <label>Middle Name</label>
                <input
                  type="text"
                  value={profileData.middleName}
                  onChange={(e) => setProfileData({...profileData, middleName: e.target.value})}
                  placeholder="Middle Name"
                />
              </div>
              <div className="profile-edit-field">
                <label>Last Name *</label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                  placeholder="Riparip"
                  required
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
      
      {/* Hired Notification Modal */}
      {showHiredNotification && (
        <div className="notification-overlay hired-notification-overlay">
          <div className="notification-content hired-notification-content">
            <div className="notification-header">
              <h2>Notification: You're Hired!</h2>
              <button className="close-btn" onClick={handleCloseHiredNotification}>×</button>
            </div>
            <div className="notification-body">
              <p>
                Congratulations, you've been selected for the {hiredJobTitle} position at PBS Engineering Services! We're excited to have you on board.
              </p>
              <p>
                For further details, please contact us at <a href="mailto:pbsengineeringph@gmail.com">pbsengineeringph@gmail.com</a>.
              </p>
              <p>Welcome to the team!</p>
            </div>
            <div className="notification-actions">
              <button className="btn-primary" onClick={handleCloseHiredNotification}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicantDashboard; 

