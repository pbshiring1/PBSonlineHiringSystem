import React, { useEffect, useState, useRef } from 'react';

import { useNavigate } from 'react-router-dom';

import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, onSnapshot, documentId, addDoc, getDoc, deleteDoc } from 'firebase/firestore';

import { db, getAllJobs, deleteJob, createJob, updateJob, getApplicantDocuments, getApplicantDocumentContent, getApplicantsByJobId, getApplicantCountByJobId, getAllApplicantsWithJobs, deleteUser, deleteMultipleUsers, uploadCSVTrainingData, loadTrainingDataFromStorage } from '../firebase';

import { sendInterviewScheduleEmail } from '../services/emailService';

import jsPDF from 'jspdf';

import './AdminDashboard.css';

import './JobEditModal.css';

import Swal from 'sweetalert2';

import logoImg from './pic/488604347_2675430962655935_1675751460889163498_n-removebg-preview.png';

import bellIcon from './pic/bell.png.png';

import userIcon from './pic/user.png';

import { loadTrainingDataFromCSV, loadCSVFile } from '../utils/csvLoader';



const AdminDashboard = () => {

  const navigate = useNavigate();

  const [currentView, setCurrentView] = useState('dashboard');

  const [reportsActiveTab, setReportsActiveTab] = useState('analytics');

  const [showUpdateJobForm, setShowUpdateJobForm] = useState(false);

  const [selectedJob, setSelectedJob] = useState(null);

  const [selectedUsers, setSelectedUsers] = useState([]);

  
  
  // Notification state for new applicants

  const [newApplicantsCount, setNewApplicantsCount] = useState(0);

  const [currentApplicantsCount, setCurrentApplicantsCount] = useState(0);

  const initialApplicantCountRef = useRef(parseInt(localStorage.getItem('admin_lastApplicantCount') || '0', 10));

  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const [newApplicants, setNewApplicants] = useState([]);
  const [notificationApplicants, setNotificationApplicants] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState('all');

  
  
  // Profile dropdown state

  const [showDropdown, setShowDropdown] = useState(false);

  
  
  // State for user information - initialize with localStorage data

  const [userInfo, setUserInfo] = useState(() => {

    const storedUserInfo = localStorage.getItem('userInfo');

    if (storedUserInfo) {

      try {

        const parsedUserInfo = JSON.parse(storedUserInfo);

        console.log('AdminDashboard - Initializing userInfo with:', parsedUserInfo);

        return parsedUserInfo;

      } catch (error) {

        console.error('Error parsing user info from localStorage:', error);

      }

    }

    return {

      name: 'Loading...',

      email: '',

      role: 'admin',

      photoURL: null

    };

  });

  

  
  
  // State for Firebase data

  const [recentApplicants, setRecentApplicants] = useState([]);

  const [applicantRankings, setApplicantRankings] = useState([]);

  const [allApplicants, setAllApplicants] = useState([]); // Store all applicants for filtering

  const [candidateStatusApplicants, setCandidateStatusApplicants] = useState([]); // Applicants with a decision

  const [kpiData, setKpiData] = useState({

    totalJobPosts: 0,

    totalApplicants: 0,

    qualifiedCandidates: 0

  });
  const [kpiExtras, setKpiExtras] = useState({
    activeJobsThisMonth: 0,
    activeJobsLastMonth: 0,
    changeActiveJobsMonth: 0,
    newApplicantsThisWeek: 0,
    applicantsThisMonth: 0,
    applicantsLastMonth: 0,
    applicantsChangePct: 0,
    interviewsThisWeek: 0,
    interviewsWeekDelta: 0
  });
  const [pieHoverIndex, setPieHoverIndex] = useState(null);

  const [loading, setLoading] = useState(true);



  // Filter states

  const [selectedJobFilter, setSelectedJobFilter] = useState('');



  const [users, setUsers] = useState([]);

  const [editingUserRole, setEditingUserRole] = useState({ userId: null, role: '' });

  const availableRoles = ['admin', 'employer', 'applicant'];

  // User Management UI state

  const [userSearchTerm, setUserSearchTerm] = useState('');

  const [openRoleMenuFor, setOpenRoleMenuFor] = useState(null);

  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');



  // Jobs data from Firebase

  const [jobs, setJobs] = useState([]);

  const [jobApplicantCounts, setJobApplicantCounts] = useState({});



  // State for editing job

  const [editingJob, setEditingJob] = useState(null);



  // Documents modal state

  const [showDocsModal, setShowDocsModal] = useState(false);

  const [docsLoading, setDocsLoading] = useState(false);

  const [selectedApplicantForDocs, setSelectedApplicantForDocs] = useState(null);

  const [applicantDocs, setApplicantDocs] = useState([]);

  const [showDocPreview, setShowDocPreview] = useState(false);

  const [docPreviewUrl, setDocPreviewUrl] = useState('');

  const [docPreviewType, setDocPreviewType] = useState('');

  const [docPreviewName, setDocPreviewName] = useState('');



  // Interview scheduling modal state

  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [selectedApplicantForSchedule, setSelectedApplicantForSchedule] = useState(null);

  const [scheduleForm, setScheduleForm] = useState({

    date: '',

    time: '',

    location: '',

    message: ''

  });

  const [sendingInvite, setSendingInvite] = useState(false);

  const [scheduleNotice, setScheduleNotice] = useState('');



  // ML Ranking state

  const [isRunningML, setIsRunningML] = useState(false);

  const [mlTrained, setMLTrained] = useState(false);

  const [trainingData, setTrainingData] = useState([]);

  const [showCSVUpload, setShowCSVUpload] = useState(false);

  const [selectedCSVFile, setSelectedCSVFile] = useState(null);

  const [featureWeights, setFeatureWeights] = useState({});

  const [showWeightsModal, setShowWeightsModal] = useState(false);

  const [weightsLoading, setWeightsLoading] = useState(false);

  const [showingWeightsFor, setShowingWeightsFor] = useState(null);

  const [showApplicantDetailsModal, setShowApplicantDetailsModal] = useState(false);

  const [selectedApplicantDetails, setSelectedApplicantDetails] = useState(null);

  const [applicantDetailsLoading, setApplicantDetailsLoading] = useState(false);

  // Decision modal state (Hired / Rejected)

  const [showDecisionModal, setShowDecisionModal] = useState(false);

  const [selectedApplicantForDecision, setSelectedApplicantForDecision] = useState(null);

  const [decisionMessage, setDecisionMessage] = useState('');



  // Read-only remarks modal state

  const [showRemarksModal, setShowRemarksModal] = useState(false);

  const [selectedApplicantForRemarks, setSelectedApplicantForRemarks] = useState(null);

  const [remarksMessage, setRemarksMessage] = useState('');

  const [remarksLoading, setRemarksLoading] = useState(false);



  // Helpers for scheduling constraints

  // Local date formatting/parsing (avoid timezone issues)

  const pad2 = (n) => String(n).padStart(2, '0');

  const formatDateLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const getTodayStr = () => formatDateLocal(new Date());

  const parseDateLocal = (dateStr) => {

    // Expects yyyy-MM-dd

    const parts = (dateStr || '').split('-');

    const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);

    if (!y || !m || !d) return null;

    return new Date(y, m - 1, d, 0, 0, 0, 0);

  };



  const isSunday = (dateStr) => {

    try { const d = parseDateLocal(dateStr); return d ? d.getDay() === 0 : false; } catch { return false; }

  };



  const normalizeDate = (dateStr) => {

    // If past date -> today. If Sunday -> next day (Monday)

    try {

      const today = parseDateLocal(getTodayStr());

      const sel = parseDateLocal(dateStr);

      if (!sel) return getTodayStr();

      if (sel < today) return getTodayStr();

      if (sel.getDay() === 0) {

        sel.setDate(sel.getDate() + 1); // move to Monday

      }

      return formatDateLocal(sel);

    } catch { return getTodayStr(); }

  };



  const clampTimeToWindow = (timeStr) => {

    try {

      const [hh = '08', mm = '00'] = (timeStr || '').split(':');

      let h = parseInt(hh, 10); let m = parseInt(mm, 10);

      if (Number.isNaN(h)) h = 8; if (Number.isNaN(m)) m = 0;

      if (h < 8) { h = 8; m = 0; }

      if (h > 17 || (h === 17 && m > 0)) { h = 17; m = 0; }

      const pad = (n) => String(n).padStart(2, '0');

      return `${pad(h)}:${pad(m)}`;

    } catch { return '08:00'; }

  };



  const roundUpToNextQuarter = (date) => {

    const d = new Date(date);

    d.setSeconds(0, 0);

    const remainder = d.getMinutes() % 15;

    if (remainder !== 0) {

      d.setMinutes(d.getMinutes() + (15 - remainder));

    }

    return d;

  };



  const getNextValidDateStr = () => {

    // Today or next Monday if today is Sunday or day already ended (past 17:00)

    const now = new Date();

    let d = parseDateLocal(getTodayStr());

    if (d.getDay() === 0) d.setDate(d.getDate() + 1);

    // If it's past 5pm now, move to next day (skip Sunday)

    const h = now.getHours(), m = now.getMinutes();

    if (h > 17 || (h === 17 && m > 0)) {

      d.setDate(d.getDate() + 1);

      if (d.getDay() === 0) d.setDate(d.getDate() + 1);

    }

    return formatDateLocal(d);

  };



  const getNextAvailableTime = (dateStr) => {

    // For the given date, return the earliest valid time >= now (for today) and within 08:00-17:00

    const todayStr = getTodayStr();

    if (dateStr !== todayStr) return '08:00';

    const now = new Date();

    let t = roundUpToNextQuarter(now);

    let h = t.getHours();

    let m = t.getMinutes();

    if (h < 8) { h = 8; m = 0; }

    if (h > 17 || (h === 17 && m > 0)) { h = 17; m = 0; }

    const pad = (n) => String(n).padStart(2, '0');

    return `${pad(h)}:${pad(m)}`;

  };

  // Capitalize the first letter of each word in a name
  const toNameCase = (input) => {
    try {
      const s = (input || '').toString().trim();
      if (!s) return '';
      return s
        .split(/\s+/)
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
        .join(' ');
    } catch {
      return '';
    }
  };



  const handleDateInputChange = (value) => {

    let notice = '';

    const normalized = normalizeDate(value);

    if (normalized !== value) {

      if (isSunday(value)) notice = 'Sunday is not available. Moved to Monday.';

      else notice = 'Past dates are not allowed. Using today.';

    }

    // If same-day, ensure time isn't in the past

    let nextTime = scheduleForm.time;

    if (normalized === getTodayStr()) {

      const nowAdjusted = getNextAvailableTime(normalized);

      // If chosen time earlier than allowed for today, bump it

      const [ch, cm] = (nextTime || '08:00').split(':').map((x) => parseInt(x, 10));

      const [nh, nm] = nowAdjusted.split(':').map((x) => parseInt(x, 10));

      if (ch < nh || (ch === nh && cm < nm)) nextTime = nowAdjusted;

    }

    nextTime = clampTimeToWindow(nextTime);

    setScheduleForm((prev) => ({ ...prev, date: normalized, time: nextTime }));

    setScheduleNotice(notice);

  };



  const handleTimeInputChange = (value) => {

    const clamped = clampTimeToWindow(value);

    if (clamped !== value) {

      setScheduleNotice('Time must be between 8:00 AM and 5:00 PM. Adjusted automatically.');

    } else {

      setScheduleNotice('');

    }

    setScheduleForm((prev) => ({ ...prev, time: clamped }));

  };



  const formatDate = (ts) => {

    try {

      if (!ts) return '—';

      if (typeof ts?.toDate === 'function') return ts.toDate().toLocaleString();

      if (typeof ts?.seconds === 'number') return new Date(ts.seconds * 1000).toLocaleString();

      return new Date(ts).toLocaleString();

    } catch {

      return '—';

    }

  };



  // Close open role dropdown on outside click

  useEffect(() => {

    if (openRoleMenuFor === null) return;

    const close = (e) => {

      // Don't close if clicking inside the dropdown

      if (e.target.closest('.custom-dropdown')) return;

      // Don't close if clicking on job filter dropdown options

      if (openRoleMenuFor === 'job-filter' && e.target.closest('.dropdown-option')) return;

      setOpenRoleMenuFor(null);

    };

    document.addEventListener('click', close);

    return () => document.removeEventListener('click', close);

  }, [openRoleMenuFor]);



  // Format date as YYYY-MM-DD (for Join Date column)

  const formatYmd = (ts) => {

    try {

      let d = null;

      if (!ts) return '';

      if (typeof ts?.toDate === 'function') d = ts.toDate();

      else if (typeof ts?.seconds === 'number') d = new Date(ts.seconds * 1000);

      else d = new Date(ts);

      if (!d || Number.isNaN(d.getTime())) return '';

      const yyyy = d.getFullYear();

      const mm = String(d.getMonth() + 1).padStart(2, '0');

      const dd = String(d.getDate()).padStart(2, '0');

      return `${yyyy}-${mm}-${dd}`;

    } catch {

      return '';

    }

  };



  // Convert base64 string to Blob

  const base64ToBlob = (base64, contentType) => {

    const byteCharacters = atob(base64);

    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {

      byteNumbers[i] = byteCharacters.charCodeAt(i);

    }

    const byteArray = new Uint8Array(byteNumbers);

    return new Blob([byteArray], { type: contentType });

  };



  // Reconstruct a File object from stored document content/metadata

  const reconstructFileFromDoc = (fullDoc) => {

    const mimeType = fullDoc.fileType || 'application/octet-stream';

    let blob;

    if (fullDoc.fileContentType === 'base64') {

      blob = base64ToBlob(fullDoc.fileContent, mimeType);

    } else {

      // Assume text content; encode to UTF-8 bytes

      const encoder = new TextEncoder();

      const bytes = encoder.encode(fullDoc.fileContent || '');

      blob = new Blob([bytes], { type: mimeType });

    }

    const name = fullDoc.originalName || fullDoc.fileName || 'document';

    return new File([blob], name, { type: mimeType });

  };



  useEffect(() => {

    // Check if user is authenticated as admin

    if (userInfo.role !== 'admin') {

      console.log('User is not admin, redirecting to login');

      navigate('/login');

      return;

    }

    
    
    console.log('AdminDashboard - User photoURL:', userInfo.photoURL);

    fetchDashboardData();

    
    
    // Load training data from Firestore on dashboard startup

    console.log('Admin dashboard loaded. Loading training data from Firestore...');

    
    
    // Load training data from Firestore

    loadTrainingDataFromStorage('admin').then(data => {

      if (data && data.length > 0) {

        setTrainingData(data);

        console.log(`✅ Loaded ${data.length} training records from Firestore`);

      } else {

        console.log('No training data found in Firestore. Use CSV upload to add training data.');

      }

    }).catch(error => {

      console.warn('Failed to load training data from Firestore:', error.message);

      console.log('Use CSV upload to add training data.');

    });

  }, [navigate, userInfo.role]);



  useEffect(() => {

    console.log('Jobs state updated:', jobs);

  }, [jobs]);

  // Ensure SweetAlert2 dialogs render above in-app modals/overlays
  useEffect(() => {
    try {
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-swal2-zfix', 'true');
      styleEl.textContent = `
        .swal2-container { z-index: 3000 !important; }
      `;
      document.head.appendChild(styleEl);
      return () => {
        if (styleEl && styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl);
        }
      };
    } catch {}
  }, []);


  // Real-time listener for jobs to keep total job posts accurate

  useEffect(() => {

    try {

      const unsubscribe = onSnapshot(

        collection(db, 'jobs'),

        (snapshot) => {

          const jobsData = [];

          snapshot.forEach((docSnap) => jobsData.push({ id: docSnap.id, ...docSnap.data() }));

          setJobs(jobsData);

          setKpiData((prev) => ({ ...prev, totalJobPosts: jobsData.length }));

        },

        (error) => {

          console.error('Jobs listener error:', error);

        }

      );

      return () => unsubscribe();

    } catch (err) {

      console.error('Failed to init jobs listener:', err);

    }

  }, []);



  // Real-time listener for recent applicants - listen to users collection for immediate updates

  useEffect(() => {

    let unsubscribe = null;

    
    
    const setupListener = async () => {

      try {

        const usersQuery = query(

          collection(db, 'users'),

          where('role', '==', 'applicant')

        );

        
        
        unsubscribe = onSnapshot(

          usersQuery,

          async (snapshot) => {

            console.log('Users collection changed, updating admin dashboard...');

            
            
            // Refresh full dashboard data when users change

            await fetchDashboardData();

          },

          (error) => {

            console.error('Users listener error:', error);

          }

        );

      } catch (error) {

        console.error('Error setting up users listener:', error);

      }

    };

    
    
    setupListener();

    return () => { if (unsubscribe) unsubscribe(); };

  }, []);



  // Helper: map firestore applicant to UI row

  const mapToRecentRow = (data) => {

    const createdAt = data?.createdAt;

    const name = data?.__enrichedFullName || data?.displayName || data?.name || 'Unknown';

    const dateApplied = createdAt && typeof createdAt.toDate === 'function'

      ? createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

      : 'Unknown';



    const assessment = typeof data?.assessmentScore === 'number' ? data.assessmentScore : 0;



    return {

      id: data.id,

      name,

      position: data?.position || data?.__enrichedPosition || 'Not specified',

      dateApplied,

      assessment,

      status: assessment >= 70 ? 'Passed' : 'Failed',

    };

  };



  // Helper: enrich from applicantInfo: selected job title and full name

  const enrichApplicantsWithPositions = async (items) => {

    try {

      const ids = items.map((i) => i.id).filter(Boolean);

      if (ids.length === 0) return items;

      // Firestore in queries support up to 10 ids per query; for 8 it's ok

      const infoQ = query(collection(db, 'applicantInfo'), where(documentId(), 'in', ids));

      const infoSnap = await getDocs(infoQ);

      const map = {};

      const nameMap = {};

      infoSnap.forEach((docSnap) => {

        const info = docSnap.data();

        const selectedJobs = info?.selectedJobs || [];

        if (selectedJobs.length > 0) {

          const lastJob = selectedJobs[selectedJobs.length - 1];

          const title = typeof lastJob === 'object' ? (lastJob.title || lastJob.jobTitle || '') : (info.selectedJobTitle || '');

          if (title) map[docSnap.id] = title;

        } else if (info?.selectedJobTitle) {

          map[docSnap.id] = info.selectedJobTitle;

        }



        // Build full name from applicantInfo

        const p = info?.personalInfo || info; // support both nested and top-level

        const first = (p?.firstName || p?.firstname || '').toString().trim();

        const middle = (p?.middleName || p?.middlename || '').toString().trim();

        const last = (p?.lastName || p?.lastname || '').toString().trim();

        let fullName = [first, middle, last].filter(Boolean).join(' ').trim();

        if (!fullName && typeof p?.fullName === 'string') fullName = p.fullName.trim();

        if (!fullName && typeof info?.fullName === 'string') fullName = info.fullName.trim();

        if (fullName) nameMap[docSnap.id] = fullName;

      });

      return items.map((i) => ({ ...i, __enrichedPosition: map[i.id], __enrichedFullName: nameMap[i.id] }));

    } catch (err) {

      console.warn('Failed to enrich positions from applicantInfo:', err);

      return items;

    }

  };



  const fetchDashboardData = async () => {

    try {

      setLoading(true);

      
      
      console.log('Fetching dashboard data...');

      
      
      // First, let's check what's in the users collection

      const allUsersQuery = query(collection(db, 'users'));

      const allUsersSnapshot = await getDocs(allUsersQuery);

      console.log('All users in collection:', allUsersSnapshot.size);

      
      
      allUsersSnapshot.forEach((doc) => {

        console.log('User data:', doc.id, doc.data());

      });



      // Map all users for User Management table

      const fetchedUsers = [];

      allUsersSnapshot.forEach((docSnap) => {

        const data = docSnap.data();

        fetchedUsers.push({

          id: docSnap.id,

          name: [data.firstName, data.middleName, data.lastName, data.suffix].filter(Boolean).join(' ') || 

                data.displayName || data.name || 'Unknown',

          email: data.email || '',

          role: data.role || 'employee',

          profilePicture: data.photoURL || null,

          createdAt: data.createdAt || null

        });

      });

      setUsers(fetchedUsers);

      
      
      // Get all users with role 'applicant' and their applicant info

      const allApplicantsQuery = query(collection(db, 'users'), where('role', '==', 'applicant'));

      const allApplicantsSnapshot = await getDocs(allApplicantsQuery);

      const allApplicantsData = [];

      
      
      for (const docSnap of allApplicantsSnapshot.docs) {

        const userData = docSnap.data();

        let applicantInfoData = null;

        
        
        try {

          const applicantInfoRef = doc(db, 'applicantInfo', docSnap.id);

          const applicantInfoSnap = await getDoc(applicantInfoRef);

          if (applicantInfoSnap.exists()) {

            applicantInfoData = applicantInfoSnap.data();

          }

        } catch (error) {

          console.warn('Error fetching applicant info for user:', docSnap.id, error);

        }

        
        
        // Determine position from applicantInfo

        let position = 'No Position Selected';

        let hasSelectedJob = false;

        
        
        if (applicantInfoData?.selectedJob) {

          position = applicantInfoData.selectedJob.title || applicantInfoData.selectedJob.jobTitle || 'Position Selected';

          hasSelectedJob = true;

        }

        
        
        const personalInfo = applicantInfoData?.personalInfo || {};

        
        
        const statusFromUser = (userData.applicationStatus || '').toString().toLowerCase();

        const normalizedStatus = statusFromUser ? statusFromUser : (hasSelectedJob ? 'applied' : 'new');



        allApplicantsData.push({

          id: docSnap.id,

          name: [personalInfo.firstName, personalInfo.middleName, personalInfo.lastName, personalInfo.suffix].filter(Boolean).join(' ') || 

                userData.displayName || userData.name || 'Unknown',

          position: position,

          dateApplied: applicantInfoData?.lastJobSelectedAt ? new Date(applicantInfoData.lastJobSelectedAt.toDate()).toLocaleDateString('en-US', {

            year: 'numeric',

            month: 'long',

            day: 'numeric'

          }) : (userData.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString('en-US', {

            year: 'numeric',

            month: 'long',

            day: 'numeric'

          }) : 'Unknown'),

          assessment: applicantInfoData?.totalScore && applicantInfoData?.maxTotalScore ? 

            Math.round((applicantInfoData.totalScore / applicantInfoData.maxTotalScore) * 100) : 0,

          status: hasSelectedJob ? ((applicantInfoData?.totalScore && applicantInfoData?.maxTotalScore ? 

            Math.round((applicantInfoData.totalScore / applicantInfoData.maxTotalScore) * 100) : 0) >= 70 ? 'Passed' : 'Applied') : 'New Signup',

          email: userData.email || personalInfo.email || '',

          phone: userData.phoneNumber || personalInfo.phoneNumber || '',

          address: [personalInfo.city, personalInfo.province].filter(Boolean).join(', ') || '',

          createdAt: applicantInfoData?.lastJobSelectedAt || userData.createdAt,

          applicationStatus: normalizedStatus,

          experienceYears: personalInfo.yearsOfExperience || '',

          age: personalInfo.age || '',

          educationalAttainment: personalInfo.educationalAttainment || '',

          interview: applicantInfoData?.interviewScore || 0,

          exam: applicantInfoData?.totalScore && applicantInfoData?.maxTotalScore ? 

            Math.round((applicantInfoData.totalScore / applicantInfoData.maxTotalScore) * 100) : 0,

          selectedJobId: applicantInfoData?.selectedJob?.id

        });

      }

      
      
      // If no applicants found at all, show fallback

      if (allApplicantsData.length === 0) {

        console.log('No applicants found, using fallback data');

        setRecentApplicants([{

          id: 'fallback-1',

          name: 'No Applicants Found',

          position: 'Please add applicants to Firebase',

          dateApplied: 'N/A',

          assessment: 0,

          status: 'N/A'

        }]);

        setApplicantRankings([]);
        setKpiExtras((prev) => ({
          ...prev,
          activeJobsThisMonth: Array.isArray(jobs) ? jobs.length : 0,
          activeJobsLastMonth: 0,
          changeActiveJobsMonth: Array.isArray(jobs) ? jobs.length : 0,
          newApplicantsThisWeek: 0,
          applicantsThisMonth: 0,
          applicantsLastMonth: 0,
          applicantsChangePct: 0,
          interviewsThisWeek: 0,
          interviewsWeekDelta: 0
        }));

        setKpiData({

          totalJobPosts: jobs.length || 0,

          totalApplicants: 0,

          qualifiedCandidates: 0

        });

        return;

      }

      
      
      // Calculate KPIs using all applicants

      const totalApplicants = allApplicantsData.length;

      const qualifiedCandidates = allApplicantsData.filter(emp => emp.assessment >= 70).length;

      
      
      setKpiData({

        totalJobPosts: jobs.length || 0,

        totalApplicants: totalApplicants,

        qualifiedCandidates: qualifiedCandidates

      });

      // KPI date windows and applicant metrics
      const toJsDate = (ts) => {
        try {
          if (!ts) return null;
          if (typeof ts.toDate === 'function') return ts.toDate();
          if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
          const d = new Date(ts);
          return Number.isNaN(d.getTime()) ? null : d;
        } catch { return null; }
      };
      const now = new Date();
      const startOfMonth = (d0) => { const d = new Date(d0.getFullYear(), d0.getMonth(), 1); d.setHours(0,0,0,0); return d; };
      const endOfMonth = (d0) => { const d = new Date(d0.getFullYear(), d0.getMonth() + 1, 0); d.setHours(23,59,59,999); return d; };
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      const lastMonthStart = startOfMonth(lastMonthDate);
      const lastMonthEnd = endOfMonth(lastMonthDate);
      const startOfWeek = (d0) => {
        const d = new Date(d0);
        d.setHours(0,0,0,0);
        const day = d.getDay(); // 0 Sun .. 6 Sat
        const diff = day === 0 ? 6 : (day - 1); // Monday start
        d.setDate(d.getDate() - diff);
        return d;
      };
      const endOfWeek = (s) => { const d = new Date(s); d.setDate(d.getDate() + 6); d.setHours(23,59,59,999); return d; };
      const thisWeekStart = startOfWeek(now);
      const thisWeekEnd = endOfWeek(thisWeekStart);
      const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(thisWeekEnd); lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

      const applicantsThisMonth = allApplicantsData.filter(a => {
        const d = toJsDate(a.createdAt);
        return d && d >= thisMonthStart && d <= thisMonthEnd;
      }).length;
      const applicantsLastMonth = allApplicantsData.filter(a => {
        const d = toJsDate(a.createdAt);
        return d && d >= lastMonthStart && d <= lastMonthEnd;
      }).length;
      const newApplicantsThisWeek = allApplicantsData.filter(a => {
        const d = toJsDate(a.createdAt);
        return d && d >= thisWeekStart && d <= thisWeekEnd;
      }).length;
      const applicantsChangePct = applicantsLastMonth > 0
        ? Math.round(((applicantsThisMonth - applicantsLastMonth) / applicantsLastMonth) * 100)
        : 0;

      // Will be computed from decisions collection later
      let interviewsThisWeek = 0;
      let interviewsLastWeek = 0;



      // Set recent applicants (latest 4 based on creation time)

      const sortedByCreationTime = allApplicantsData.sort((a, b) => {

        if (!a.createdAt && !b.createdAt) return 0;

        if (!a.createdAt) return 1;

        if (!b.createdAt) return -1;

        
        
        const dateA = a.createdAt.toDate();

        const dateB = b.createdAt.toDate();

        return dateB - dateA;

      });

      
      
      console.log('Sorted by creation time:', sortedByCreationTime);

      const recentApplicantsData = sortedByCreationTime.slice(0, 4);

      console.log('Recent applicants data:', recentApplicantsData);

      setRecentApplicants(recentApplicantsData);
      setNotificationApplicants(sortedByCreationTime);



      // Compute notification badge count and list of new applicants

      setCurrentApplicantsCount(totalApplicants);

      const previousCount = Number.isFinite(initialApplicantCountRef.current) ? initialApplicantCountRef.current : 0;

      const deltaNewApplicants = Math.max(totalApplicants - previousCount, 0);

      setNewApplicantsCount(deltaNewApplicants);

      const newlyAdded = deltaNewApplicants > 0 ? sortedByCreationTime.slice(0, deltaNewApplicants) : [];

      setNewApplicants(newlyAdded);

      
      
      // Sort applicants by assessment score; exclude rejected and for_interview applicants

      const applicantsWithJobs = allApplicantsData

        .filter(applicant => {

          const s = (applicant.applicationStatus || '').toLowerCase();

          return s !== 'rejected' && s !== 'for_interview';

        })

        .filter(applicant => applicant.applicationStatus === 'applied' || applicant.applicationStatus === 'hired');

      const sortedApplicants = applicantsWithJobs.sort((a, b) => (b.assessment || 0) - (a.assessment || 0));

      
      
      console.log('Sorted applicants:', sortedApplicants);

      setAllApplicants(sortedApplicants); // Store all applicants for filtering

      setApplicantRankings(sortedApplicants.slice(0, 4)); // Show top 4 for admin dashboard

      
      
      // Build Candidate Status list from decisions collection only

      try {

        const decisionsSnap = await getDocs(collection(db, 'decisions'));

        const latestPerApplicant = {};

        decisionsSnap.forEach((docSnap) => {

          const d = docSnap.data() || {};

          const aid = d.applicantId;

          if (!aid) return;

          let createdAt = d.createdAt;

          try {

            if (typeof createdAt?.toDate === 'function') createdAt = createdAt.toDate();

            else if (typeof createdAt?.seconds === 'number') createdAt = new Date(createdAt.seconds * 1000);

          } catch {}

          if (!latestPerApplicant[aid] || (createdAt && latestPerApplicant[aid].createdAt && createdAt > latestPerApplicant[aid].createdAt)) {

            latestPerApplicant[aid] = { ...d, createdAt: createdAt || new Date(0) };

          }

        });

        // Count interviews scheduled this week vs last week
        decisionsSnap.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const decision = (data.decision || '').toString().toLowerCase();
          let createdAt2 = data.createdAt;
          try {
            if (typeof createdAt2?.toDate === 'function') createdAt2 = createdAt2.toDate();
            else if (typeof createdAt2?.seconds === 'number') createdAt2 = new Date(createdAt2.seconds * 1000);
          } catch {}
          if (decision === 'for_interview' && createdAt2) {
            // thisWeekStart/End defined earlier in this function
            try {
              if (createdAt2 >= thisWeekStart && createdAt2 <= thisWeekEnd) interviewsThisWeek++;
              if (createdAt2 >= lastWeekStart && createdAt2 <= lastWeekEnd) interviewsLastWeek++;
            } catch {}
          }
        });

        const idSet = new Set(Object.keys(latestPerApplicant));

        const csApplicants = allApplicantsData

          .filter((a) => idSet.has(a.id))

          .map((a) => {

            const dec = latestPerApplicant[a.id] || {};

            const decision = (dec.decision || '').toString().toLowerCase();

            let displayStatus = 'Applied';

            if (decision === 'for_interview') displayStatus = 'For Interview';

            else if (decision === 'rejected') displayStatus = 'Rejected';

            else if (decision === 'hired') displayStatus = 'Hired';

            return { ...a, applicationStatus: decision, status: displayStatus };

          });

        setCandidateStatusApplicants(csApplicants);

      } catch (e) {

        console.error('Error fetching decisions:', e);

        setCandidateStatusApplicants([]);

      }



      // Fetch jobs from Firebase

      try {

        const jobsData = await getAllJobs();

        console.log('Jobs fetched from Firebase:', jobsData);

        setJobs(jobsData);

        
        
        // Fetch applicant counts for each job

        const applicantCounts = {};

        for (const job of jobsData) {

          try {

            const count = await getApplicantCountByJobId(job.id);

            applicantCounts[job.id] = count;

            console.log(`Job ${job.title} has ${count} applicants`);

          } catch (error) {

            console.error(`Error fetching applicant count for job ${job.id}:`, error);

            applicantCounts[job.id] = 0;

          }

        }

        
        
        setJobApplicantCounts(applicantCounts);

        console.log('Job applicant counts:', applicantCounts);

        
        
        // Update KPI data with actual job count

        setKpiData(prev => ({

          ...prev,

          totalJobPosts: jobsData.length

        }));
        // Compute active jobs overlapping this month and last month
        const parseDateStr = (s) => {
          if (!s) return null;
          const d = new Date(s);
          return Number.isNaN(d.getTime()) ? null : d;
        };
        const overlapWithRange = (start, end, rangeStart, rangeEnd) => {
          const s = start || new Date(0);
          const e = end || new Date(8640000000000000);
          return e >= rangeStart && s <= rangeEnd;
        };
        const activeThisMonth = jobsData.filter(j => {
          const s = parseDateStr(j.applicationStartDate);
          const e = parseDateStr(j.applicationEndDate);
          const overlaps = overlapWithRange(s, e, thisMonthStart, thisMonthEnd);
          if (!overlaps) return false;
          // Only count currently active (not future, not expired)
          try {
            const today = new Date(); today.setHours(0,0,0,0);
            if (s && s > today) return false; // not yet started
            if (e && e < today) return false; // already ended
          } catch {}
          return true;
        }).length;
        const activeLastMonth = jobsData.filter(j => {
          const s = parseDateStr(j.applicationStartDate);
          const e = parseDateStr(j.applicationEndDate);
          return overlapWithRange(s, e, lastMonthStart, lastMonthEnd);
        }).length;

        setKpiExtras(prev => ({
          ...prev,
          activeJobsThisMonth: activeThisMonth,
          activeJobsLastMonth: activeLastMonth,
          changeActiveJobsMonth: activeThisMonth - activeLastMonth,
          newApplicantsThisWeek,
          applicantsThisMonth,
          applicantsLastMonth,
          applicantsChangePct,
          interviewsThisWeek,
          interviewsWeekDelta: interviewsThisWeek - interviewsLastWeek
        }));

      } catch (jobError) {

        console.error('Error fetching jobs:', jobError);

        // Set empty jobs array if fetching fails

        setJobs([]);

        setKpiData(prev => ({

          ...prev,

          totalJobPosts: 0

        }));
        setKpiExtras(prev => ({
          ...prev,
          activeJobsThisMonth: 0,
          activeJobsLastMonth: 0,
          changeActiveJobsMonth: 0
        }));

      }
      
      
      
    } catch (error) {

      console.error('Error fetching dashboard data:', error);

      // Fallback to sample data if Firebase fails

      setRecentApplicants([

        {

          name: 'Lebron James',

          position: 'Helper',

          dateApplied: 'March 3, 2025',

          assessment: 97,

          status: 'Passed'

        },

        {

          name: 'Joel Malupiton',

          position: 'Painter',

          dateApplied: 'March 3, 2025',

          assessment: 54,

          status: 'Failed'

        },

        {

          name: 'Kyrie Irving',

          position: 'Mason',

          dateApplied: 'March 3, 2025',

          assessment: 15,

          status: 'Failed'

        },

        {

          name: 'Zayn Malik',

          position: 'Electronic Engineer',

          dateApplied: 'March 3, 2025',

          assessment: 97,

          status: 'Passed'

        }

      ]);

      
      
      setApplicantRankings([

        {

          id: 'fallback-1',

          name: 'Jay',

          position: 'Electronic Engineer',

          score: 92,

          status: 'Passed'

        },

        {

          id: 'fallback-2',

          name: 'Jay',

          position: 'Electrical Engineer',

          score: 88,

          status: 'Passed'

        },

        {

          id: 'fallback-3',

          name: 'Jay',

          position: 'CCTV Technician',

          score: 65,

          status: 'Failed'

        },

        {

          id: 'fallback-4',

          name: 'Jay',

          position: 'Network Technician',

          score: 79,

          status: 'Passed'

        }

      ]);

    } finally {

      setLoading(false);

    }

  };



  const handleLogout = () => {

    localStorage.removeItem('isAdmin');

    navigate('/login');

  };



  const handleProfileClick = () => {

    setShowDropdown(false);

    // Profile functionality can be added here

    console.log('Profile clicked');

  };



  const handleSettingsClick = () => {

    setShowDropdown(false);

    // Settings functionality can be added here

    console.log('Settings clicked');

  };



  const handleMessagesClick = () => {

    alert('Messages functionality coming soon!');

  };



  const handleNotificationsClick = () => {

    setShowNotificationModal(prev => !prev);

  };



  const handleCloseNotificationsModal = () => {

    // Mark notifications as seen by updating the baseline

    localStorage.setItem('admin_lastApplicantCount', String(currentApplicantsCount));

    initialApplicantCountRef.current = currentApplicantsCount;

    setNewApplicantsCount(0);

    setShowNotificationModal(false);

  };



  const handleMarkNotificationsAsRead = () => {

    // Mark notifications as seen by updating the baseline

    localStorage.setItem('admin_lastApplicantCount', String(currentApplicantsCount));

    initialApplicantCountRef.current = currentApplicantsCount;

    setNewApplicantsCount(0);

    setShowNotificationModal(false);

  };







  const handleExport = (type) => {

    // Placeholder for export functionality

    console.log(`Exporting ${type}`);

    alert(`${type} export started...`);

  };



  const handleViewChange = (view) => {

    setCurrentView(view);

    if (view !== 'job-board') {

      setShowUpdateJobForm(false);

      setSelectedJob(null);

      setEditingJob(null);

    }

  };



  const handleUserSelection = (userId) => {

    setSelectedUsers(prev => 

      prev.includes(userId) 

        ? prev.filter(id => id !== userId)

        : [...prev, userId]

    );

  };



  const handleSelectAllUsers = (idsToToggle) => {

    const targetIds = Array.isArray(idsToToggle) && idsToToggle.length > 0 ? idsToToggle : users.map((u) => u.id);

    const allSelected = targetIds.every((id) => selectedUsers.includes(id));

    if (allSelected) {

      setSelectedUsers((prev) => prev.filter((id) => !targetIds.includes(id)));

    } else {

      setSelectedUsers((prev) => Array.from(new Set([...prev, ...targetIds])));

    }

  };



  const handleEditUser = (user) => {

    setEditingUserRole({ userId: user.id, role: user.role || 'applicant' });

  };



  const handleCancelEditUser = () => {

    setEditingUserRole({ userId: null, role: '' });

  };



  const handleSaveUserRole = async (user) => {

    try {

      const newRole = editingUserRole.role;

      if (!newRole || editingUserRole.userId !== user.id) return;

      console.log('Updating user role:', user.id, '->', newRole);

      await updateDoc(doc(db, 'users', user.id), { role: newRole });

      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));

      setEditingUserRole({ userId: null, role: '' });

      await Swal.fire({ icon: 'success', title: 'Role updated', text: `Updated ${user.name}'s role to "${newRole}"` });

    } catch (error) {

      console.error('Failed to update user role:', error);

      await Swal.fire({ icon: 'error', title: 'Update failed', text: 'Failed to update role. Please try again.' });

    }

  };



  const handleDeleteUser = async (user) => {

    // Prevent deletion of admin users

    if (user.role === 'admin') {

      await Swal.fire({ icon: 'warning', title: 'Action blocked', text: 'Cannot delete admin users. Please change their role first.' });

      return;

    }

    
    
    const res = await Swal.fire({
      icon: 'warning',
      title: 'Delete user?',
      text: `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });

    if (!res.isConfirmed) return;

    try {

      console.log('Deleting user:', user);

      await deleteUser(user.id);

      // Also delete related decision records for this user
      try {
        const decSnap = await getDocs(
          query(collection(db, 'decisions'), where('applicantId', '==', user.id))
        );
        await Promise.all(
          decSnap.docs.map((d) => deleteDoc(doc(db, 'decisions', d.id)))
        );
      } catch (cleanupErr) {
        console.warn('Failed to delete related decisions for user:', user.id, cleanupErr);
      }

      // Update local state to remove the deleted user
      setUsers(prev => prev.filter(u => u.id !== user.id));

      setSelectedUsers(prev => prev.filter(id => id !== user.id));

      await Swal.fire({ icon: 'success', title: 'Deleted', text: `User ${user.name} deleted successfully!` });

    } catch (error) {

      console.error('Failed to delete user:', error);

      await Swal.fire({ icon: 'error', title: 'Delete failed', text: 'Failed to delete user. Please try again.' });

    }

  };



  const handleBulkDelete = async () => {

    if (selectedUsers.length === 0) {

      await Swal.fire({ icon: 'info', title: 'No users selected', text: 'Please select users to delete.' });

      return;

    }

    
    
    // Check if any selected users are admins

    const selectedUserObjects = users.filter(u => selectedUsers.includes(u.id));

    const adminUsers = selectedUserObjects.filter(u => u.role === 'admin');

    
    
    if (adminUsers.length > 0) {

      await Swal.fire({ icon: 'warning', title: 'Action blocked', text: `Cannot delete admin users: ${adminUsers.map(u => u.name).join(', ')}. Please change their roles first.` });

      return;

    }

    
    
    const res = await Swal.fire({
      icon: 'warning',
      title: 'Delete selected users?',
      text: `Are you sure you want to delete ${selectedUsers.length} selected users? This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });

    if (!res.isConfirmed) return;

    try {

      console.log('Bulk deleting users:', selectedUsers);

      await deleteMultipleUsers(selectedUsers);

      // Also delete related decision records for all selected users
      try {
        for (const uid of selectedUsers) {
          const decSnap = await getDocs(
            query(collection(db, 'decisions'), where('applicantId', '==', uid))
          );
          // Delete each decision document for this user
          await Promise.all(
            decSnap.docs.map((d) => deleteDoc(doc(db, 'decisions', d.id)))
          );
        }
      } catch (cleanupErr) {
        console.warn('Failed to delete some related decisions during bulk delete:', cleanupErr);
      }

      // Update local state to remove the deleted users
      setUsers(prev => prev.filter(u => !selectedUsers.includes(u.id)));

      setSelectedUsers([]);

      await Swal.fire({ icon: 'success', title: 'Deleted', text: `${selectedUsers.length} users deleted successfully!` });

    } catch (error) {

      console.error('Failed to delete users:', error);

      await Swal.fire({ icon: 'error', title: 'Delete failed', text: 'Failed to delete some users. Please try again.' });

    }

  };



  const handleRoleFilterChange = (role) => {

    setSelectedRoleFilter(role);

  };



  const handleUpdateJob = (job) => {

    console.log('Editing job:', job);

    setSelectedJob(job);

    setEditingJob({ ...job }); // Create a copy for editing

    setShowUpdateJobForm(true);

    setCurrentView('job-board'); // Keep on job-board view

  };



  const handleCloseUpdateForm = () => {

    console.log('Exiting update form, staying on current view:', currentView);

    setShowUpdateJobForm(false);

    setSelectedJob(null);

    setEditingJob(null);

  };



  const handleJobFieldChange = (field, value) => {

    console.log('Updating field:', field, 'to:', value); // Debug log

    setEditingJob(prev => {

      const next = { ...prev, [field]: value };

      // Guard: end date must not be before start date

      if (field === 'applicationStartDate') {

        const start = value || '';

        const end = next.applicationEndDate || '';

        if (start && end && end < start) {

          next.applicationEndDate = start;

        }

      }

      if (field === 'applicationEndDate') {

        const start = next.applicationStartDate || '';

        const end = value || '';

        if (start && end && end < start) {

          next.applicationEndDate = start;

        }

      }

      return next;

    });

  };



  const handleSaveJob = async () => {
    const confirmRes = await Swal.fire({
      icon: 'question',
      title: editingJob?.id ? 'Save changes?' : 'Create job?',
      text: editingJob?.id ? `Save changes to "${editingJob.title || 'this job'}"?` : `Create new job "${editingJob.title || 'Untitled'}"?`,
      showCancelButton: true,
      confirmButtonText: editingJob?.id ? 'Yes, save' : 'Yes, create',
      cancelButtonText: 'Cancel'
    });
    if (!confirmRes.isConfirmed) return;

    if (!editingJob.title) {

      await Swal.fire({ icon: 'warning', title: 'Missing info', text: 'Please fill in Job Title' });

      return;

    }

    // Validate that end date is not earlier than start date
    const start = editingJob?.applicationStartDate || '';
    const end = editingJob?.applicationEndDate || '';
    if (start && end && end < start) {
      await Swal.fire({ icon: 'warning', title: 'Invalid dates', text: 'Application End Date cannot be earlier than Application Start Date.' });
      return;
    }

    
    
    try {

      console.log('Saving job:', editingJob);

      
      
      if (editingJob.id && editingJob.id !== null && jobs.find(j => j.id === editingJob.id)) {

        // Update existing job in Firebase

        console.log('Updating existing job');

        await updateJob(editingJob.id, editingJob);

        
        
        // Update local state

        setJobs(prevJobs => 

          prevJobs.map(job => 

            job.id === editingJob.id ? { ...editingJob, updatedAt: new Date() } : job

          )

        );

        await Swal.fire({ icon: 'success', title: 'Updated', text: `Job "${editingJob.title}" updated successfully!` });

      } else {

        // Create new job in Firebase

        console.log('Creating new job');

        const jobData = {

          title: editingJob.title,

          category: editingJob.category || '',

          description: editingJob.description || 'Job description will be added here.',

          // location removed

          experience: editingJob.yearsOfExperience || '',

          salary: editingJob.salary || '',

          employmentType: editingJob.employmentType || 'full-time',

          experienceLevel: editingJob.experienceLevel || 'mid-level',

          requirements: editingJob.requirements || '',

          benefits: editingJob.benefits || '',

          applicationStartDate: editingJob.applicationStartDate || '',

          applicationEndDate: editingJob.applicationEndDate || ''

        };

        
        
        const newJob = await createJob(jobData);

        console.log('New job created:', newJob);

        
        
        // Add to local state

        setJobs(prevJobs => [newJob, ...prevJobs]);

        await Swal.fire({ icon: 'success', title: 'Created', text: `New job "${editingJob.title}" created successfully!` });

      }

      
      
      handleCloseUpdateForm();

    } catch (error) {

      console.error('Error saving job:', error);

      await Swal.fire({ icon: 'error', title: 'Save failed', text: 'Failed to save job. Please try again.' });

    }

  };



  const handleDeleteJob = async (jobId) => {

    const jobToDelete = jobs.find(j => j.id === jobId);

    const res = await Swal.fire({
      icon: 'warning',
      title: 'Delete job?',
      text: `Are you sure you want to delete the job "${jobToDelete?.title || ''}"?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });

    if (!res.isConfirmed) return;

    try {

      console.log('Deleting job:', jobId);

      await deleteJob(jobId);

      // Remove from local state
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));

      await Swal.fire({ icon: 'success', title: 'Deleted', text: 'Job deleted successfully!' });

    } catch (error) {

      console.error('Error deleting job:', error);

      await Swal.fire({ icon: 'error', title: 'Delete failed', text: 'Failed to delete job. Please try again.' });

    }

  };





  const handleCreateNewJob = () => {

    const newJob = {

      id: null, // Will be set when saving

      title: '',

      description: '',

      location: '',

      salary: '',

      employmentType: 'full-time',

      experienceLevel: 'mid-level',

      yearsOfExperience: '',

      requirements: '',

      benefits: '',

      applicationStartDate: new Date().toISOString().split('T')[0],

      applicationEndDate: '',

      status: 'draft'

    };

    
    
    setSelectedJob(newJob);

    setEditingJob(newJob);

    setShowUpdateJobForm(true);

  };



  const handleRefresh = () => {

    fetchDashboardData();

  };



  // Display all jobs since search is removed

  const displayedJobs = Array.isArray(jobs) ? jobs : [];



  // Filter functions

  const handleJobFilterChange = async (jobTitle) => {

    setSelectedJobFilter(jobTitle);

    await filterApplicants(jobTitle);

    // Update feature weights for the selected job/trade automatically

    if (jobTitle) {

      updateFeatureWeightsForTrade(jobTitle);

    }

  };



  const filterApplicants = async (jobFilter) => {

    let filtered = [...allApplicants];



    // Filter by job position (exact match only or selectedJobId match)

    if (jobFilter && jobFilter !== '') {

      const target = jobFilter.toLowerCase().trim();

      filtered = filtered.filter(applicant => {

        const pos = (applicant.position || '').toLowerCase().trim();

        const exactMatch = pos === target;

        const idMatch = applicant.selectedJobId && applicant.selectedJobId === jobFilter;

        return exactMatch || idMatch;

      });

    }



    // Always exclude rejected applicants

    filtered = filtered.filter(a => {

      const s = (a.applicationStatus || '').toLowerCase();

      return s !== 'rejected' && s !== 'for_interview';

    });



    // Apply job-specific XGBoost model if job filter is selected

    if (jobFilter && filtered.length > 0) {

      try {

        const mlRankings = await computeMLRankings(filtered);

        setApplicantRankings(mlRankings);

        return;

      } catch (error) {

        console.error('Error applying job-specific XGBoost model:', error);

      }

    }



    // Only use XGBoost scores - no fallback to assessment

    filtered = filtered.map(applicant => ({

      ...applicant,

      score: applicant.score || 0

    }));



    setApplicantRankings(filtered);

  };



  const updateFeatureWeightsForTrade = async (tradeName) => {

    try {

      const response = await fetch('https://xgboost-service.onrender.com/api/xgboost-weights', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ trade: tradeName })

      });

      
      
      if (response.ok) {

        const result = await response.json();

        if (result.status === 'success' && result.weights) {

          setFeatureWeights(result.weights);

        }

      }

    } catch (error) {

      console.error('Error fetching XGBoost weights:', error);

    }

  };



  // Helpers for Job Board cards

  const getJobStatus = (job) => {

    try {

      const today = new Date();

      today.setHours(0, 0, 0, 0);

      const start = job?.applicationStartDate;

      if (start) {

        const startDate = new Date(start);

        startDate.setHours(0, 0, 0, 0);

        if (startDate > today) return 'Inactive';

      }

      const end = job?.applicationEndDate;

      if (end) {

        const endDate = new Date(end);

        endDate.setHours(0, 0, 0, 0);

        return endDate >= today ? 'Active' : 'Closed';

      }

      return 'Active';

    } catch {

      return 'Active';

    }

  };





  // Get job positions from actual jobs data

  const getJobPositions = () => {

    const jobTitles = jobs.map(job => job.title).filter(Boolean);

    // Add some common positions if no jobs exist yet

    if (jobTitles.length === 0) {

      const defaultPositions = [

        'Electrical Engineer',

        'Electronics Engineer', 

        'Pipe Fitter',

        'Technician',

        'Network Technician',

        'CCTV Technician',

        'Electrician',

        'Helper',

        'Mason',

        'Welder',

        'Painter'

      ];

      console.log('Using default positions:', defaultPositions);

      return defaultPositions;

    }

    console.log('Using job titles from jobs:', jobTitles);

    return jobTitles;

  };



  const handleViewClick = () => {

    console.log('View clicked');

    // Add functionality here

  };



  const handleCalendarClick = (applicant) => {

    setSelectedApplicantForSchedule(applicant);

    // Pre-fill date/time with next valid slot

    const date = getNextValidDateStr();

    const time = getNextAvailableTime(date);

    setScheduleForm({ date, time, location: '', message: '' });

    setShowScheduleModal(true);

    setScheduleNotice('');

  };



  const handleCloseScheduleModal = () => {

    if (sendingInvite) return;

    setShowScheduleModal(false);

    setSelectedApplicantForSchedule(null);

  };



  const handleScheduleFieldChange = (field, value) => {

    setScheduleForm((prev) => ({ ...prev, [field]: value }));

  };



  const handleSendInterviewInvite = async () => {

    try {

      if (!selectedApplicantForSchedule) return;

      const { date, time, location, message } = scheduleForm;

      if (!date || !time || !location) {

        await Swal.fire({ icon: 'warning', title: 'Missing info', text: 'Please fill in date, time, and location.' });

        return;

      }

      // Validate weekday (Mon-Sat) and time window (08:00-17:00)

      const day = (parseDateLocal(date) || new Date()).getDay(); // 0=Sun,1=Mon,...6=Sat

      if (day === 0) {

        await Swal.fire({ icon: 'warning', title: 'Invalid date', text: 'Interviews can only be scheduled Monday to Saturday. Please choose a valid date.' });

        return;

      }

      const [hh, mm] = time.split(':').map((n) => parseInt(n, 10));

      if (

        Number.isNaN(hh) || Number.isNaN(mm) ||

        hh < 8 || hh > 17 || (hh === 17 && mm > 0)

      ) {

        await Swal.fire({ icon: 'warning', title: 'Invalid time', text: 'Time must be between 8:00 AM and 5:00 PM.' });

        return;

      }

      // Disallow past dates and past times when same-day

      const todayStr = getTodayStr();

      if ((parseDateLocal(date) || new Date()) < (parseDateLocal(todayStr) || new Date())) {

        await Swal.fire({ icon: 'warning', title: 'Invalid date', text: 'Date cannot be in the past.' });

        return;

      }

      if (date === todayStr) {

        const now = new Date();

        const d = parseDateLocal(date) || new Date();

        const selected = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0);

        if (selected < now) {

          await Swal.fire({ icon: 'warning', title: 'Invalid time', text: 'Selected time is in the past. Please choose a future time today or another date.' });

          return;

        }

      }

      setSendingInvite(true);



      // Prepare readable date/time

      const dateObj = new Date(`${date}T${time}`);

      const readableDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      const readableTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });



      // Save schedule to Firestore (interviews collection)

      await addDoc(collection(db, 'interviews'), {

        applicantId: selectedApplicantForSchedule.id,

        applicantEmail: selectedApplicantForSchedule.email || '',

        applicantName: selectedApplicantForSchedule.name || '',

        position: selectedApplicantForSchedule.position || '',

        date: date,

        time: time,

        location: location,

        message: message || '',

        status: 'scheduled',

        createdAt: new Date()

      });



      // Optionally reflect on user document

      try {

        await updateDoc(doc(db, 'users', selectedApplicantForSchedule.id), {

          applicationStatus: 'for_interview',

          interview: {

            date,

            time,

            location,

            message: message || '',

            updatedAt: new Date()

          }

        });

      } catch (e) {

        console.warn('Could not update user doc with interview info:', e);

      }



      // Send email via EmailJS

      const emailOk = await sendInterviewScheduleEmail({

        to_name: selectedApplicantForSchedule.name || 'Applicant',

        to_email: selectedApplicantForSchedule.email || '',

        job_position: selectedApplicantForSchedule.position || 'your selected position',

        interview_date: readableDate,

        interview_time: readableTime,

        interview_location: location,

        interview_message: message || ''

      });



      // Always log a decision record, regardless of email status

      try {

        await addDoc(collection(db, 'decisions'), {

          applicantId: selectedApplicantForSchedule.id,

          applicantEmail: selectedApplicantForSchedule.email || '',

          applicantName: selectedApplicantForSchedule.name || '',

          position: selectedApplicantForSchedule.position || '',

          decision: 'for_interview',

          decidedBy: (userInfo && userInfo.email) || '',

          decidedByRole: 'admin',

          source: 'schedule-interview',

          message: (message || '').toString(),

          emailSent: !!emailOk,

          createdAt: new Date()

        });

      } catch (e) {

        console.warn('Failed to log interview decision to decisions collection:', e);

      }



      if (!emailOk) {

        await Swal.fire({ icon: 'info', title: 'Saved without email', text: 'Interview saved; email sending failed. Decision recorded as For Interview.' });

      } else {

        await Swal.fire({ icon: 'success', title: 'Invite sent', text: 'Interview scheduled and email sent successfully.' });

      }



      setShowScheduleModal(false);

      setSelectedApplicantForSchedule(null);

    } catch (err) {

      console.error('Failed to schedule interview:', err);

      await Swal.fire({ icon: 'error', title: 'Scheduling failed', text: 'Failed to schedule interview. Please try again.' });

    } finally {

      setSendingInvite(false);

    }

  };



  const handleDeleteClick = () => {

    console.log('Delete clicked');

    // Add functionality here

  };



  // Check weights for each applicant and show score breakdown

  const handleCheckWeights = async () => {

    setWeightsLoading(true);

    try {

      // Get feature weights from ML model

      const response = await fetch('https://xgboost-service.onrender.com/api/xgboost-weights', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ trade: selectedJobFilter || 'general' })

      });

      
      
      if (response.ok) {

        const result = await response.json();

        if (result.status === 'success' && result.weights) {

          setFeatureWeights(result.weights);

          setShowWeightsModal(true);

        } else {

          alert('No weights available. Please train the ML model first.');

        }

      } else {

        alert('Failed to fetch weights. Please ensure the ML service is running.');

      }

    } catch (error) {

      console.error('Error fetching weights:', error);

      alert('Error connecting to ML service. Please check if the service is running.');

    } finally {

      setWeightsLoading(false);

    }

  };







  const handleCloseApplicantDetailsModal = () => {

    setShowApplicantDetailsModal(false);

    setSelectedApplicantDetails(null);

  };



  // Open status decision modal (Hired / Rejected)

  const openDecisionModal = (applicant) => {

    setSelectedApplicantForDecision(applicant);

    setDecisionMessage('');

    setShowDecisionModal(true);

  };



  const closeDecisionModal = () => {

    setShowDecisionModal(false);

    setSelectedApplicantForDecision(null);

    setDecisionMessage('');

  };



  // Open read-only remarks modal for hired/rejected

  const openRemarksModal = async (applicant) => {

    setSelectedApplicantForRemarks(applicant);

    setRemarksMessage('');

    setShowRemarksModal(true);

    setRemarksLoading(true);

    try {

      const decisionsRef = collection(db, 'decisions');

      const snap = await getDocs(query(decisionsRef, where('applicantId', '==', applicant.id)));

      let latest = null;

      snap.forEach((docSnap) => {

        const data = docSnap.data();

        if (!latest) {

          latest = { id: docSnap.id, ...data };

          return;

        }

        const latestTs = latest.createdAt && latest.createdAt.toDate ? latest.createdAt.toDate() : new Date(0);

        const thisTs = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : new Date(0);

        if (thisTs > latestTs) latest = { id: docSnap.id, ...data };

      });

      if (latest) setRemarksMessage(latest.message || '');

    } catch (e) {

      console.warn('Failed to load remarks:', e);

    } finally {

      setRemarksLoading(false);

    }

  };



  const closeRemarksModal = () => {

    setShowRemarksModal(false);

    setSelectedApplicantForRemarks(null);

    setRemarksMessage('');

  };



  

  

  // Create or update the latest decision for an applicant in Firestore

  const upsertDecisionForApplicant = async (applicant, nextDecision, source, message) => {

    try {

      const decisionsRef = collection(db, 'decisions');

      const snap = await getDocs(query(decisionsRef, where('applicantId', '==', applicant.id)));

      let latest = null;

      snap.forEach((docSnap) => {

        const data = docSnap.data();

        if (!latest) {

          latest = { id: docSnap.id, ...data };

          return;

        }

        const latestTs = latest.createdAt && latest.createdAt.toDate ? latest.createdAt.toDate() : new Date(0);

        const thisTs = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : new Date(0);

        if (thisTs > latestTs) latest = { id: docSnap.id, ...data };

      });



      const basePayload = {

        applicantId: applicant.id,

        applicantEmail: applicant.email || '',

        applicantName: applicant.name || '',

        position: applicant.position || '',

        decision: nextDecision,

        decidedBy: (userInfo && userInfo.email) || '',

        decidedByRole: 'admin',

        source: source || 'decision-modal',

        message: (message || '').toString()

      };



      if (latest && latest.id) {

        await updateDoc(doc(db, 'decisions', latest.id), {

          ...basePayload,

          updatedAt: new Date()

        });

      } else {

        await addDoc(decisionsRef, {

          ...basePayload,

          createdAt: new Date()

        });

      }

    } catch (e) {

      console.warn('Failed to upsert decision:', e);

    }

  };



  const handleMarkHired = async () => {

    try {

      if (!selectedApplicantForDecision?.id) return;

      await updateDoc(doc(db, 'users', selectedApplicantForDecision.id), {

        applicationStatus: 'hired',

        hiredAt: new Date(),

        decisionMessage: (decisionMessage || '').toString()

      });

      // Upsert decision record with remarks

      await upsertDecisionForApplicant(selectedApplicantForDecision, 'hired', 'decision-modal', decisionMessage);

      setAllApplicants((prev) => prev.map((a) => a.id === selectedApplicantForDecision.id ? { ...a, applicationStatus: 'hired' } : a));

      setApplicantRankings((prev) => prev.map((a) => a.id === selectedApplicantForDecision.id ? { ...a, applicationStatus: 'hired' } : a));

      alert(`${selectedApplicantForDecision.name || 'Applicant'} has been marked as hired.`);

      closeDecisionModal();

    } catch (err) {

      console.error('Failed to mark hired:', err);

      alert('Failed to mark as hired. Please try again.');

    }

  };



  const handleMarkRejectedInModal = async () => {

    try {

      if (!selectedApplicantForDecision?.id) return;

      await updateDoc(doc(db, 'users', selectedApplicantForDecision.id), {

        applicationStatus: 'rejected',

        rejectedAt: new Date(),

        decisionMessage: (decisionMessage || '').toString()

      });

      // Upsert decision record with remarks

      await upsertDecisionForApplicant(selectedApplicantForDecision, 'rejected', 'decision-modal', decisionMessage);

      setAllApplicants((prev) => prev.map((a) => a.id === selectedApplicantForDecision.id ? { ...a, applicationStatus: 'rejected' } : a));

      setApplicantRankings((prev) => prev.map((a) => a.id === selectedApplicantForDecision.id ? { ...a, applicationStatus: 'rejected' } : a));

      alert(`${selectedApplicantForDecision.name || 'Applicant'} has been marked as rejected.`);

      closeDecisionModal();

    } catch (err) {

      console.error('Failed to mark rejected:', err);

      alert('Failed to mark as rejected. Please try again.');

    }

  };



  // Open applicant details modal

  const handleOpenApplicantDetails = async (applicantId) => {

    setApplicantDetailsLoading(true);

    try {

      const applicantInfoRef = doc(db, 'applicantInfo', applicantId);

      const applicantInfoSnap = await getDoc(applicantInfoRef);

      
      
      let applicantData = { id: applicantId, personalInfo: {} };

      if (applicantInfoSnap.exists()) {

        applicantData = {

          id: applicantId,

          ...applicantInfoSnap.data(),

          personalInfo: applicantInfoSnap.data().personalInfo || {}

        };

      }

      
      
      setSelectedApplicantDetails(applicantData);

      
      
      // Get job-specific XGBoost weights for this applicant

      const applicantFromRankings = applicantRankings.find(a => a.id === applicantId);

      if (applicantFromRankings?.jobWeights) {

        // Use the job-specific weights calculated during XGBoost

        setFeatureWeights(applicantFromRankings.jobWeights);

      } else if (trainingData.length > 0) {

        // Calculate job-specific weights for this applicant's position

        const applicantPosition = applicantData.selectedJob?.title || applicantData.position || '';

        const positionTrainingData = trainingData.filter(sample => 

          applicantPosition.toLowerCase().includes(sample.trade?.toLowerCase() || '') ||

          (sample.trade?.toLowerCase() || '').includes(applicantPosition.toLowerCase())

        );

        
        
        const relevantData = positionTrainingData.length > 0 ? positionTrainingData : trainingData;

        const correlations = { age: 0, education: 0, experience: 0, skill: 0 };

        
        
        relevantData.forEach(sample => {

          const target = sample.status === 'hired' || sample.status === 'accepted' ? 1 : 0;

          correlations.age += Math.abs(target - (sample.age / 100)) * target;

          correlations.education += Math.abs(target - (getEducationScore(sample.education) / 100)) * target;

          correlations.experience += Math.abs(target - (sample.experience / 20)) * target;

          correlations.skill += Math.abs(target - (sample.skillScore / 100)) * target;

        });

        
        
        const totalCorr = Object.values(correlations).reduce((sum, val) => sum + val, 0);

        const weights = {};

        Object.keys(correlations).forEach(key => {

          weights[key === 'skill' ? 'exam_score' : key === 'education' ? 'education_level' : key === 'experience' ? 'experience_years' : key] = totalCorr > 0 ? correlations[key] / totalCorr : 0.25;

        });

        
        
        // Normalize weights

        const totalWeight = Object.values(weights).reduce((sum, val) => sum + val, 0);

        if (totalWeight > 0) {

          Object.keys(weights).forEach(key => {

            weights[key] = weights[key] / totalWeight;

          });

        }

        
        
        setFeatureWeights(weights);

      }

      
      
      setShowApplicantDetailsModal(true);

    } catch (error) {

      console.error('Error fetching applicant details:', error);

      alert('Failed to load applicant details.');

    } finally {

      setApplicantDetailsLoading(false);

    }

  };



  // Calculate individual score breakdown for an applicant

  const calculateScoreBreakdown = (applicant) => {

    if (!featureWeights || Object.keys(featureWeights).length === 0) {

      return null;

    }



    const breakdown = {};

    let totalWeightedScore = 0;

    let totalWeight = 0;



    // Map applicant attributes to feature weights

    const birthday = applicant.personalInfo?.birthday || applicant.birthday;

    const calculatedAge = calculateAge(birthday);

    const locationText = applicant.personalInfo?.city || applicant.city || applicant.personalInfo?.province || applicant.province || applicant.personalInfo?.address || applicant.address || applicant.personalInfo?.location || applicant.location || '';

    const locationScore = locationText ? 1 : 0;

    const attributeMapping = {

      'age': calculatedAge || parseInt(applicant.age) || parseInt(applicant.personalInfo?.age) || 25,

      'experience_years': parseInt(applicant.experienceYears) || parseInt(applicant.personalInfo?.yearsOfExperience) || 0,

      'education_level': getEducationScore(applicant.educationalAttainment || applicant.personalInfo?.educationalAttainment || 'High School'),

      'exam_score': (applicant.totalScore && applicant.maxTotalScore)

        ? Math.round((applicant.totalScore / applicant.maxTotalScore) * 100)

        : (applicant.exam || 0),

      'location': locationScore

    };



    // Calculate weighted contribution for each attribute

    Object.entries(featureWeights).forEach(([feature, weight]) => {

      let value = attributeMapping[feature] || 0;

      const contribution = value * weight;

      breakdown[feature] = {

        value: attributeMapping[feature] || 0, // Show original value

        weight: weight,

        contribution: contribution,

        percentage: 0 // Will be calculated after total

      };

      totalWeightedScore += contribution;

      totalWeight += Math.abs(weight);

    });



    // Overall score equals the sum of raw contributions

    const displayedScore = totalWeightedScore;

    const scaleFactor = 1;



    // Use raw contributions without normalization

    Object.keys(breakdown).forEach(feature => {

      breakdown[feature].normalizedContribution = breakdown[feature].contribution;

      breakdown[feature].percentage = totalWeightedScore !== 0 ? 

        (Math.abs(breakdown[feature].contribution) / Math.abs(totalWeightedScore)) * 100 : 0;

    });



    return {

      breakdown,

      totalScore: totalWeightedScore,

      totalWeight,

      displayedScore

    };

  };



  // Convert education level to numeric score

  // Calculate age from birthday

  const calculateAge = (birthday) => {

    if (!birthday) return null;

    try {

      const birthDate = new Date(birthday);

      const today = new Date();

      let age = today.getFullYear() - birthDate.getFullYear();

      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {

        age--;

      }

      return age;

    } catch {

      return null;

    }

  };



  const getEducationScore = (education) => {

    if (!education) return 2; // Default to High School

    
    
    const educationStr = education.toString().toLowerCase().trim();

    
    
    // Direct matches

    const educationScores = {

      'elementary': 1,

      'high school': 2,

      'senior high school': 3,

      'vocational': 4,

      'college': 5,

      "bachelor's degree": 6,

      "master's degree": 7,

      'doctorate': 8

    };

    
    
    // Check direct match first

    if (educationScores[educationStr]) {

      return educationScores[educationStr];

    }

    
    
    // Partial matches for flexibility

    if (educationStr.includes('elementary')) return 1;

    if (educationStr.includes('high school') || educationStr.includes('secondary')) return 2;

    if (educationStr.includes('senior high')) return 3;

    if (educationStr.includes('vocational') || educationStr.includes('technical')) return 4;

    if (educationStr.includes('college') && !educationStr.includes('bachelor')) return 5;

    if (educationStr.includes('bachelor')) return 6;

    if (educationStr.includes('master')) return 7;

    if (educationStr.includes('doctorate') || educationStr.includes('phd')) return 8;

    
    
    // Default fallback

    return 2;

  };



  // Format feature name for display

  const formatFeatureName = (feature) => {

    const nameMapping = {

      'age': 'Age',

      'experience_years': 'Years of Experience',

      'education_level': 'Education Level',

      'exam_score': 'Exam Score',

      'location': 'Location'

    };

    return nameMapping[feature] || feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  };



  // Reject an applicant from the Ranked Candidate List

  const handleRejectApplicant = async (applicant) => {

    try {

      if (!applicant?.id) return;

      const res = await Swal.fire({
        icon: 'warning',
        title: 'Reject applicant?',
        text: `Reject applicant ${applicant.name}? This will mark them as rejected.`,
        showCancelButton: true,
        confirmButtonText: 'Yes, reject',
        cancelButtonText: 'Cancel'
      });

      if (!res.isConfirmed) return;

      // Persist applicationStatus to users collection

      await updateDoc(doc(db, 'users', applicant.id), {

        applicationStatus: 'rejected',

        rejectedAt: new Date()

      });

      // Also create a decision record

      try {

        await addDoc(collection(db, 'decisions'), {

          applicantId: applicant.id,

          applicantEmail: applicant.email || '',

          applicantName: applicant.name || '',

          position: applicant.position || '',

          decision: 'rejected',

          decidedBy: (userInfo && userInfo.email) || '',

          decidedByRole: 'admin',

          source: 'ranked-candidates',

          message: '',

          createdAt: new Date()

        });

      } catch (e) {

        console.warn('Failed to log decision to decisions collection:', e);

      }

      // Update UI state locally

      setAllApplicants((prev) => prev.map((a) => a.id === applicant.id ? { ...a, applicationStatus: 'rejected' } : a));

      setApplicantRankings((prev) => prev.map((a) => a.id === applicant.id ? { ...a, applicationStatus: 'rejected' } : a));

      await Swal.fire({ icon: 'success', title: 'Rejected', text: `${applicant.name} has been marked as rejected.` });

    } catch (err) {

      console.error('Failed to reject applicant:', err);

      await Swal.fire({ icon: 'error', title: 'Action failed', text: 'Failed to reject applicant. Please try again.' });

    }

  };



  // Export Hired/Rejected applicants from Firestore to CSV (training-data compatible)
  const handleExportCandidateStatusCSV = async () => {
    try {
      // Fetch latest decisions for hired/rejected
      const decSnap = await getDocs(
        query(collection(db, 'decisions'), where('decision', 'in', ['hired', 'rejected']))
      );

      // Keep the latest decision per applicant
      const latestByApplicant = {};
      decSnap.forEach((docSnap) => {
        const d = docSnap.data() || {};
        const aid = d.applicantId;
        if (!aid) return;
        let ts = d.updatedAt || d.createdAt || null;
        try {
          if (typeof ts?.toDate === 'function') ts = ts.toDate();
          else if (typeof ts?.seconds === 'number') ts = new Date(ts.seconds * 1000);
        } catch {}
        const cur = latestByApplicant[aid];
        if (!cur || (ts && cur.__ts && ts > cur.__ts)) {
          latestByApplicant[aid] = { ...d, __ts: ts || new Date(0) };
        }
      });

      const applicantIds = Object.keys(latestByApplicant);
      if (applicantIds.length === 0) {
        alert('No hired or rejected applicants found.');
        return;
      }

      const rows = [];
      for (const aid of applicantIds) {
        const dec = latestByApplicant[aid];
        try {
          const infoSnap = await getDoc(doc(db, 'applicantInfo', aid));
          const info = infoSnap.exists() ? (infoSnap.data() || {}) : {};
          const p = info.personalInfo || {};
          const trade = dec.position || info?.selectedJob?.title || info?.selectedJobTitle || '';

          // Optional job filter from UI
          if (selectedJobFilter) {
            const target = selectedJobFilter.toLowerCase();
            const tradeText = (trade || '').toLowerCase();
            const idMatch = info?.selectedJob?.id && info.selectedJob.id === selectedJobFilter;
            if (!(tradeText === target || idMatch)) continue;
          }

          const birthday = p?.birthday || info?.birthday;
          const ageCalc = calculateAge(birthday);
          const age = typeof ageCalc === 'number' && !Number.isNaN(ageCalc) ? ageCalc : (parseInt(p?.age, 10) || '');
          const education = p?.educationalAttainment || info?.educationalAttainment || '';
          const experience = (() => { const v = parseInt(p?.yearsOfExperience, 10); return Number.isNaN(v) ? 0 : v; })();
          const skill = (typeof info?.totalScore === 'number' && typeof info?.maxTotalScore === 'number' && info.maxTotalScore > 0)
            ? Math.round((info.totalScore / info.maxTotalScore) * 100)
            : 0;
          const status = (dec.decision || '').toString().toLowerCase();
          const name = dec.applicantName || [p.firstName, p.middleName, p.lastName, p.suffix].filter(Boolean).join(' ');
          const email = dec.applicantEmail || p.email || '';
          // Phone as text for CSV/Excel to avoid scientific notation
          const phone = (() => {
            const raw = (p.phoneNumber !== undefined && p.phoneNumber !== null) ? p.phoneNumber : '';
            if (raw === '') return '';
            const asString = typeof raw === 'number'
              ? raw.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 })
              : String(raw);
            const cleaned = asString.replace(/\s+/g, '');
            // Prefix with apostrophe so Excel treats as text and shows full digits
            return `'${cleaned}`;
          })();
          const city = p.city || '';
          const province = p.province || '';
          const decisionBy = dec.decidedBy || '';
          const decisionDate = (() => {
            try {
              const d = dec.__ts instanceof Date ? dec.__ts : new Date(dec.__ts);
              if (!Number.isNaN(d.getTime())) return d.toISOString();
            } catch {}
            return '';
          })();

          rows.push({ applicantId: aid, name, email, phone, city, province, trade, age, education, experience, skill, status, decisionBy, decisionDate });
        } catch (e) {
          console.warn('Skipping applicant due to data fetch error:', aid, e);
        }
      }

      if (rows.length === 0) {
        alert('No matching applicants to export.');
        return;
      }

      const headers = [
        'Applicant ID',
        'Name',
        'Email',
        'Phone',
        'City',
        'Province',
        'Trade',
        'Age',
        'Educational Attainment',
        'Years Of Experience',
        'Skill Score',
        'Status',
        'Decision By',
        'Decision Date'
      ];

      const toCsvValue = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
      };

      const lines = [headers.join(',')];
      rows.forEach((r) => {
        lines.push([
          r.applicantId,
          r.name,
          r.email,
          r.phone,
          r.city,
          r.province,
          r.trade,
          r.age,
          r.education,
          r.experience,
          r.skill,
          r.status,
          r.decisionBy,
          r.decisionDate
        ].map(toCsvValue).join(','));
      });

      const csvContent = lines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const aEl = document.createElement('a');
      aEl.href = url;
      const fileName = `hired_rejected_export_${new Date().toISOString().split('T')[0]}.csv`;
      aEl.download = fileName;
      document.body.appendChild(aEl);
      aEl.click();
      document.body.removeChild(aEl);
      URL.revokeObjectURL(url);
      try {
        await Swal.fire({
          icon: 'success',
          title: 'Export complete',
          text: 'CSV exported successfully.',
          confirmButtonText: 'OK'
        });
      } catch {}
    } catch (e) {
      console.error('Failed to export CSV:', e);
      try {
        await Swal.fire({ icon: 'error', title: 'Export failed', text: 'Failed to export CSV. Please try again.' });
      } catch {}
    }
  };



  const handleExportAnalytics = () => {

    try {

      const doc = new jsPDF();

      
      
      // Set up the PDF document

      doc.setFontSize(20);

      doc.text('PBS Engineering Company', 20, 30);

      doc.setFontSize(16);

      doc.text('Analytics Dashboard Report', 20, 45);

      doc.setFontSize(12);

      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 60);

      
      
      // Add KPI data

      doc.setFontSize(14);

      doc.text('Key Performance Indicators', 20, 80);

      doc.setFontSize(10);

      doc.text(`Total Job Posts: ${kpiData.totalJobPosts}`, 20, 95);

      doc.text(`Total Applicants: ${kpiData.totalApplicants}`, 20, 105);

      doc.text(`Qualified Candidates: ${kpiData.qualifiedCandidates}`, 20, 115);

      doc.text(`Qualification Rate: ${kpiData.totalApplicants > 0 ? Math.round((kpiData.qualifiedCandidates / kpiData.totalApplicants) * 100 * 10) / 10 : 0}%`, 20, 125);

      
      
      // Add recent applicants data

      doc.setFontSize(14);

      doc.text('Recent Applicants', 20, 145);

      doc.setFontSize(10);

      
      
      let yPosition = 160;

      recentApplicants.forEach((applicant, index) => {

        if (yPosition > 280) {

          doc.addPage();

          yPosition = 20;

        }

        doc.text(`${index + 1}. ${applicant.name}`, 20, yPosition);

        doc.text(`   Position: ${applicant.position}`, 25, yPosition + 8);

        doc.text(`   Date Applied: ${applicant.dateApplied}`, 25, yPosition + 16);

        doc.text(`   Assessment: ${applicant.assessment}%`, 25, yPosition + 24);

        doc.text(`   Status: ${applicant.status}`, 25, yPosition + 32);

        yPosition += 45;

      });

      
      
      // Add applicant rankings

      if (applicantRankings.length > 0) {

        doc.addPage();

        doc.setFontSize(14);

        doc.text('Top Ranked Candidates', 20, 30);

        doc.setFontSize(10);

        
        
        yPosition = 45;

        applicantRankings.slice(0, 10).forEach((applicant, index) => {

          if (yPosition > 280) {

            doc.addPage();

            yPosition = 20;

          }

          doc.text(`${index + 1}. ${applicant.name}`, 20, yPosition);

          doc.text(`   Position: ${applicant.position}`, 25, yPosition + 8);

          doc.text(`   Score: ${applicant.score}%`, 25, yPosition + 16);

          doc.text(`   Status: ${applicant.status}`, 25, yPosition + 24);

          yPosition += 35;

        });

      }

      
      
      // Save the PDF

      const fileName = `PBS_Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`;

      doc.save(fileName);

      
      
      alert('Analytics report exported successfully!');

    } catch (error) {

      console.error('Error exporting PDF:', error);

      alert('Failed to export analytics report. Please try again.');

    }

  };



  // Open documents modal for selected applicant

  const handleOpenApplicantDocuments = async (applicant) => {

    try {

      setSelectedApplicantForDocs(applicant);

      setShowDocsModal(true);

      setDocsLoading(true);

      const docs = await getApplicantDocuments(applicant.id);

      setApplicantDocs(docs);

    } catch (err) {

      console.error('Failed to load applicant documents:', err);

      alert('Failed to load documents. Please try again.');

    } finally {

      setDocsLoading(false);

    }

  };



  const handleCloseDocsModal = () => {

    setShowDocsModal(false);

    setSelectedApplicantForDocs(null);

    setApplicantDocs([]);

  };



  const handleViewSingleDocument = async (docMeta) => {

    try {

      if (docMeta.downloadURL) {

        setDocPreviewUrl(docMeta.downloadURL);

        setDocPreviewType(docMeta.fileType || 'application/octet-stream');

        setDocPreviewName(docMeta.originalName || docMeta.fileName || 'document');

        setShowDocPreview(true);

        return;

      }

      const fullDoc = await getApplicantDocumentContent(docMeta.id);

      const file = reconstructFileFromDoc(fullDoc);

      const url = URL.createObjectURL(file);

      setDocPreviewUrl(url);

      setDocPreviewType(file.type || 'application/octet-stream');

      setDocPreviewName(file.name || 'document');

      setShowDocPreview(true);

    } catch (err) {

      console.error('Unable to open document:', err);

      alert('Unable to open the document.');

    }

  };



  const handleCloseDocPreview = () => {

    try {

      if (docPreviewUrl && docPreviewUrl.startsWith('blob:')) {

        URL.revokeObjectURL(docPreviewUrl);

      }

    } catch {}

    setShowDocPreview(false);

    setDocPreviewUrl('');

    setDocPreviewType('');

    setDocPreviewName('');

  };



  // ML Ranking computation with actual Python XGBoost

  const computeMLRankings = async (employees) => {

    setIsRunningML(true);

    try {

      // Require real training data; no hardcoded fallback
      const currentTrainingData = trainingData && trainingData.length > 0 ? trainingData : [];
      if (currentTrainingData.length === 0) {
        throw new Error('No training data loaded. Upload CSV in Ranked Candidates → Load CSV.');
      }

      
      
      // Train XGBoost models

      const trainResponse = await fetch('https://xgboost-service.onrender.com/api/train-xgboost', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ training_data: currentTrainingData })

      });

      
      
      if (!trainResponse.ok) {

        throw new Error('Failed to train XGBoost models');

      }

      
      
      // Prepare applicant data for prediction

      const applicantData = employees.map(emp => {

        const birthday = emp.personalInfo?.birthday || emp.birthday;

        const calculatedAge = calculateAge(birthday);

        
        
        return {

          id: emp.id,

          position: emp.position,

          age: calculatedAge || parseInt(emp.age) || parseInt(emp.personalInfo?.age) || 25,

          experience: parseInt(emp.experienceYears) || parseInt(emp.personalInfo?.yearsOfExperience) || 0,

          exam_score: emp.exam || emp.assessment || 0,

          education_score: getEducationScore(emp.educationalAttainment || emp.personalInfo?.educationalAttainment || 'High School')

        };

      });

      
      
      // Get predictions from XGBoost

      const predictResponse = await fetch('https://xgboost-service.onrender.com/api/predict-score', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ applicants: applicantData })

      });

      
      
      if (!predictResponse.ok) {

        throw new Error('Failed to get XGBoost predictions');

      }

      
      
      const predictions = await predictResponse.json();

      
      
      // Get feature weights for current job filter

      const weightsResponse = await fetch('https://xgboost-service.onrender.com/api/xgboost-weights', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ trade: selectedJobFilter || 'general' })

      });

      
      
      if (weightsResponse.ok) {

        const weightsResult = await weightsResponse.json();

        if (weightsResult.status === 'success') {

          setFeatureWeights(weightsResult.weights);

        }

      }

      
      
      // Merge predictions with employee data

      const mlRankings = employees.map(emp => {

        const prediction = predictions.predictions?.find(p => p.id === emp.id);

        return {

          ...emp,

          score: prediction ? prediction.score : 0

        };

      }).sort((a, b) => b.score - a.score);

      
      
      setMLTrained(true);

      return mlRankings;
      
      
      
    } catch (error) {

      console.error('XGBoost ML ranking failed:', error);
      const msg = (error && error.message ? error.message : '').toString().toLowerCase();
      try {
        if (msg.includes('no training data')) {
          const res = await Swal.fire({
            icon: 'warning',
            title: 'Training data required',
            text: 'No training data found. Upload CSV in Ranked Candidates → Load CSV.',
            confirmButtonText: 'Open Upload'
          });
          try { setShowCSVUpload(true); } catch {}
        } else {
          await Swal.fire({ icon: 'error', title: 'Service unavailable', text: 'XGBoost service unavailable. Make sure Python service is running.' });
        }
      } catch {}

      return employees.map(emp => ({

        ...emp,

        score: 0

      })).sort((a, b) => b.score - a.score);

    } finally {

      setIsRunningML(false);

    }

  };







  const handleCSVFileSelect = (event) => {

    const file = event.target.files[0];

    setSelectedCSVFile(file);

  };



  const handleCSVUpload = async () => {

    if (!selectedCSVFile) {

      alert('Please select a CSV file first');

      return;

    }

    
    
    try {

      // Parse CSV data first

      const text = await selectedCSVFile.text();

      const lines = text.split('\n').filter(line => line.trim());

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      
      
      const data = lines.slice(1).map(line => {

        const values = line.split(',').map(v => v.trim());

        const record = {};

        
        
        headers.forEach((header, index) => {

          if (header.includes('trade') || header.includes('job')) {

            record.trade = values[index];

          } else if (header.includes('age')) {

            record.age = parseInt(values[index]) || 30;

          } else if (header.includes('education')) {

            record.education = values[index];

          } else if (header.includes('experience')) {

            record.experience = parseInt(values[index]) || 0;

          } else if (header.includes('skill')) {

            record.skillScore = parseInt(values[index]) || 75;

          } else if (header.includes('status')) {

            record.status = values[index].toLowerCase();

          }

        });

        
        
        return record;

      }).filter(record => record.trade && record.status);

      
      
      // Set training data locally first

      setTrainingData(data);

      
      
      // Upload to Firestore Database

      try {

        const result = await uploadCSVTrainingData(selectedCSVFile, 'admin');

        console.log(`CSV uploaded to Firestore successfully: ${result.recordCount} records`);

        
        
        // Reload training data from Firestore to ensure we have the latest data

        try {

          const firestoreData = await loadTrainingDataFromStorage('admin');

          if (firestoreData && firestoreData.length > 0) {

            setTrainingData(firestoreData);

            console.log(`Reloaded ${firestoreData.length} training records from Firestore`);

          }

        } catch (reloadError) {

          console.warn('Failed to reload training data from Firestore:', reloadError);

          // Keep the locally parsed data

        }

      } catch (uploadError) {

        console.warn('Firestore upload failed, but continuing with local data:', uploadError);

        // Continue with local data even if Firestore upload fails

      }

      
      
      setShowCSVUpload(false);

      setSelectedCSVFile(null);

      
      
      // Try to train XGBoost models (with fallback)

      try {

        const response = await fetch('https://xgboost-service.onrender.com/api/train-xgboost', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({ training_data: data })

        });

        
        
        if (response.ok) {

          const result = await response.json();

          try {
            await Swal.fire({
              icon: 'success',
              title: 'Training complete',
              text: `Successfully loaded ${data.length} records. Trained for ${result.trades?.length || 0} trades.`
            });
          } catch {}

        } else {

          try {
            await Swal.fire({
              icon: 'success',
              title: 'Training data loaded',
              text: `Successfully loaded ${data.length} records (training service unavailable).`
            });
          } catch {}

        }

      } catch (mlError) {

        console.warn('XGBoost training failed:', mlError);

        try {
          await Swal.fire({
            icon: 'success',
            title: 'Training data loaded',
            text: `Successfully loaded ${data.length} records (ML training service unavailable).`
          });
        } catch {}

      }
      
      
      
    } catch (error) {

      console.error('Error processing CSV:', error);

      alert('❌ Error processing CSV file: ' + error.message);

    }

  };



  if (loading) {

    return (

      <div className="admin-dashboard-root">

        <div className="loading-container">

          <div className="loading-spinner"></div>

          <p>Loading dashboard data...</p>

        </div>

      </div>

    );

  }



  return (

    <div className="admin-dashboard-root">

      {/* Sidebar */}

      <aside className="admin-dashboard-sidebar">

        {/* User Profile Section */}

        <div className="sidebar-branding">

          <div className="sidebar-logo">

            <div className="logo-circle">

              <img 

                src={userInfo.photoURL || userIcon} 

                alt="User Avatar" 

                style={{ 

                  width: '100%', 

                  height: '100%', 

                  borderRadius: '50%',

                  objectFit: 'cover'

                }}

                onLoad={() => console.log('AdminDashboard - Profile picture loaded:', userInfo.photoURL || userIcon)}

              />

            </div>

          </div>

          <div className="sidebar-brand-text">
 <h2 
            className="brand-title">{toNameCase(userInfo.name)}</h2>

            <p className="brand-subtitle">Staff</p>

          </div>

        </div>

        
        
        <nav className="sidebar-nav">

          <button 

            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}

            onClick={() => handleViewChange('dashboard')}

          >

            <i className="fas fa-th-large"></i>

            Dashboard

          </button>



          <button 

            className={`nav-item ${currentView === 'manage-users' ? 'active' : ''}`}

            onClick={() => handleViewChange('manage-users')}

          >

            <i className="fas fa-users"></i>

            User Management

          </button>



          <button 

            className={`nav-item ${currentView === 'job-board' ? 'active' : ''}`}

            onClick={() => handleViewChange('job-board')}

          >

            <i className="fas fa-briefcase"></i>

            Job Posting

          </button>



          <button 

            className={`nav-item ${currentView === 'ranked-candidates' ? 'active' : ''}`}

            onClick={() => handleViewChange('ranked-candidates')}

          >

            <i className="fas fa-star"></i>

            Ranked Candidates

          </button>



          <button 

            className={`nav-item ${currentView === 'candidate-status' ? 'active' : ''}`}

            onClick={() => handleViewChange('candidate-status')}

          >

            <i className="fas fa-chart-line"></i>

            Candidate Status

          </button>



          <button 

            className={`nav-item ${currentView === 'analytics' ? 'active' : ''}`}

            onClick={() => handleViewChange('analytics')}

          >

            <i className="fas fa-chart-bar"></i>

            Analytics

          </button>

        </nav>

        
        
        <button className="logout-btn" onClick={handleLogout}>

          <i className="fas fa-arrow-right"></i>

          Log out

        </button>

      </aside>



      {/* Main Content */}

      <main className="admin-dashboard-main">

        {/* Header */}

        <header className="admin-dashboard-header">

          <div className="header-content">

            <div className="header-title-section">

              <h1 className="header-title">{currentView === 'manage-users' ? 'User Management' : currentView === 'job-board' ? 'Job Posting Management' : currentView === 'ranked-candidates' ? 'Ranked Candidates' : currentView === 'analytics' ? 'Analytics Dashboard' : currentView === 'candidate-status' ? 'Candidate Status' : 'Dashboard Overview'}</h1>

              <p className="header-subtitle">{currentView === 'manage-users' ? 'Manage system users, roles, and permissions' : currentView === 'job-board' ? 'Modify existing job postings and requirements' : currentView === 'ranked-candidates' ? 'Top performing candidates ranked by overall score' : currentView === 'analytics' ? 'Comprehensive analysis and metrics of applicant performance' : currentView === 'candidate-status' ? 'Track hiring outcomes and manage interview-ready candidates' : 'Monitor your hiring pipeline and candidate progress'}</p>

            </div>

            <div className="header-actions">

              <button className="refresh-btn" onClick={handleRefresh}>

                <i className="fas fa-sync-alt"></i>

                Refresh Data

              </button>

              {currentView === 'candidate-status' && (

                <button className="export-btn" onClick={handleExportCandidateStatusCSV}>

                  <i className="fas fa-download"></i>

                  Export

                </button>

              )}

              <div className="header-icon-container" onClick={() => handleNotificationsClick()}>

                <i className="fas fa-bell"></i>

                {newApplicantsCount > 0 && (

                  <span className="notification-badge">{newApplicantsCount}</span>

                )}

              </div>

            </div>

          </div>

          {showNotificationModal && (

            <div className="notification-popover">

              <div className="notification-modal-header" style={{ marginTop: '16px' }}>
                <h3>Notifications</h3>
                <button onClick={handleCloseNotificationsModal}>✕</button>
              </div>
              <div style={{ padding: '8px 20px', borderBottom: '1px solid #eee', display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setNotificationFilter('all')}
                  style={{ background: 'transparent', color: notificationFilter === 'all' ? '#ff6b35' : '#374151', border: '1px solid ' + (notificationFilter === 'all' ? '#ff6b35' : '#e5e7eb'), padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                >
                  All
                </button>
                <button 
                  onClick={() => setNotificationFilter('unread')}
                  style={{ background: 'transparent', color: notificationFilter === 'unread' ? '#ff6b35' : '#374151', border: '1px solid ' + (notificationFilter === 'unread' ? '#ff6b35' : '#e5e7eb'), padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                >
                  Unread
                </button>
              </div>

              <div className="notification-modal-body">

                {newApplicantsCount > 0 ? (
                  <p>You have {newApplicantsCount} new applicant{newApplicantsCount > 1 ? 's' : ''}.</p>
                ) : (
                  <p>No new applicants.</p>
                )}
                <ul>
                  {(notificationFilter === 'unread' ? notificationApplicants.slice(0, newApplicantsCount) : notificationApplicants).map((applicant, index) => (
                    <li key={applicant.id || index}>
                      <strong>{applicant.name}</strong> — {applicant.position} • {applicant.dateApplied}
                    </li>
                  ))}
                </ul>
                
              </div>

            </div>

          )}

        </header>





        {/* Conditional Content */}

        {currentView === 'dashboard' && (

          <div className="dashboard-content">

            {/* KPIs */}

            <div className="kpi-section">

              <div className="kpi-card">

                <div className="kpi-content">

                  <h3 className="kpi-label">Total Job Posts</h3>

                  <div className="kpi-number">{kpiData.totalJobPosts}</div>

                  <p className="kpi-subtext">{kpiExtras.activeJobsThisMonth} active this month</p>

                  <div className={`kpi-change ${kpiExtras.changeActiveJobsMonth >= 0 ? 'positive' : 'negative'}`}>
                    {kpiExtras.changeActiveJobsMonth >= 0 ? '+' : ''}{kpiExtras.changeActiveJobsMonth} from last month
                  </div>

                </div>

                <div className="kpi-icon">

                  <i className="fas fa-briefcase"></i>

                </div>

              </div>

              <div className="kpi-card">

                <div className="kpi-content">

                  <h3 className="kpi-label">Total Applicants</h3>

                  <div className="kpi-number">{kpiData.totalApplicants}</div>

                  <p className="kpi-subtext">{kpiExtras.newApplicantsThisWeek} new this week</p>

                  <div className={`kpi-change ${kpiExtras.applicantsChangePct >= 0 ? 'positive' : 'negative'}`}>
                    {kpiExtras.applicantsChangePct >= 0 ? '+' : ''}{kpiExtras.applicantsChangePct}% from last month
                  </div>

                </div>

                <div className="kpi-icon">

                  <i className="fas fa-users"></i>

                </div>

              </div>

              <div className="kpi-card">

                <div className="kpi-content">

                  <h3 className="kpi-label">Pending Interviews</h3>

                  <div className="kpi-number">{(() => {

                    const pendingCount = candidateStatusApplicants.filter(applicant => 

                      (applicant.applicationStatus || '').toLowerCase() === 'for_interview'

                    ).length;

                    return pendingCount;

                  })()}</div>

                  <p className="kpi-subtext">Scheduled for interviews</p>

                  <div className={`kpi-change ${kpiExtras.interviewsWeekDelta >= 0 ? 'positive' : 'negative'}`}>
                    {kpiExtras.interviewsWeekDelta >= 0 ? '+' : ''}{kpiExtras.interviewsWeekDelta} this week
                  </div>

                </div>

                <div className="kpi-icon">

                  <i className="fas fa-calendar-check"></i>

                </div>

              </div>

            </div>



            {/* Recent Applicants Table */}

            <div className="recent-applicants-section">

              <div className="section-header">

                <div className="section-title-section">

                  <h2 className="section-title">Recent Applicants</h2>

                </div>

                <div className="section-actions">
                </div>

              </div>

              <div className="applicants-table">

                <div className="table-header">

                  <div className="table-cell">Applicant</div>

                  <div className="table-cell">Position</div>

                  <div className="table-cell">Date Applied</div>

                  <div className="table-cell">Assessment</div>

                </div>

                {recentApplicants.length === 0 ? (

                  <div className="table-row no-data">

                    <div className="table-cell no-data-message" colSpan="4">

                      No recent applicants found. Please check Firebase data.

                    </div>

                  </div>

                ) : (

                  recentApplicants.map((applicant, index) => (

                    <div className="table-row" key={applicant.id || index}>

                      <div className="table-cell applicant-cell">

                        <div className="applicant-avatar">

                          <span className="avatar-initials">

                            {applicant.name ? applicant.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'FC'}

                          </span>

                        </div>

                        <div className="applicant-info">

                          <div className="applicant-name">{applicant.name}</div>

                          <div className="applicant-email">{applicant.email || 'felix@example.com'}</div>

                        </div>

                      </div>

                      <div className="table-cell">{applicant.position}</div>

                      <div className="table-cell">{applicant.dateApplied}</div>

                      <div className="table-cell">

                        <span className={`assessment-score ${applicant.assessment >= 70 ? 'high' : applicant.assessment >= 50 ? 'medium' : 'low'}`}>

                          {applicant.assessment}%

                        </span>

                      </div>

                    </div>

                  ))

                )}

              </div>

            </div>



          </div>

        )}



        {/* Candidate Status Interface */}

        {currentView === 'candidate-status' && (

          <div className="ranked-candidates-content candidate-status-content">

            <div className="um-card">

              <div className="um-card-header">

                <div className="um-card-actions">

                  <div className="status-filter">

                    <div className="custom-dropdown">

                      <div className="dropdown-trigger" onClick={() => setOpenRoleMenuFor(openRoleMenuFor === 'status-filter' ? null : 'status-filter')}>

                        <div className="dropdown-selected">

                          <span>{selectedRoleFilter || 'For Interview'}</span>

                        </div>

                      <div className={`dropdown-arrow ${openRoleMenuFor === 'status-filter' ? 'open' : ''}`}>

                        <i className="fas fa-chevron-down"></i>

                      </div>

                      </div>

                      {openRoleMenuFor === 'status-filter' && (

                        <div className="dropdown-menu">

                          <div 

                            className={`dropdown-option ${selectedRoleFilter === 'All Status' ? 'selected' : ''}`}

                            onClick={(e) => {

                              e.stopPropagation();

                              handleRoleFilterChange('All Status');

                            }}

                          >

                            <span>All Status</span>

                          </div>

                          <div 

                            className={`dropdown-option ${selectedRoleFilter === 'Hired' ? 'selected' : ''}`}

                            onClick={(e) => {

                              e.stopPropagation();

                              handleRoleFilterChange('Hired');

                            }}

                          >

                            <span>Hired</span>

                          </div>

                          <div 

                            className={`dropdown-option ${selectedRoleFilter === 'Rejected' ? 'selected' : ''}`}

                            onClick={(e) => {

                              e.stopPropagation();

                              handleRoleFilterChange('Rejected');

                            }}

                          >

                            <span>Rejected</span>

                          </div>

                          <div 

                            className={`dropdown-option ${selectedRoleFilter === 'For Interview' ? 'selected' : ''}`}

                            onClick={(e) => {

                              e.stopPropagation();

                              handleRoleFilterChange('For Interview');

                            }}

                          >

                            <span>For Interview</span>

                          </div>

                        </div>

                      )}

                    </div>

                  </div>

                <div className="job-filter">

                  <div className="custom-dropdown">

                    <div className="dropdown-trigger" onClick={() => setOpenRoleMenuFor(openRoleMenuFor === 'job-filter' ? null : 'job-filter')}>

                      <div className="dropdown-selected">

                        <span>{selectedJobFilter || 'All Jobs'}</span>

                      </div>

                      <div className={`dropdown-arrow ${openRoleMenuFor === 'job-filter' ? 'open' : ''}`}>

                        <i className="fas fa-chevron-down"></i>

                      </div>

                    </div>

                    {openRoleMenuFor === 'job-filter' && (

                      <div className="dropdown-menu">

                        <div 

                          className={`dropdown-option ${!selectedJobFilter ? 'selected' : ''}`}

                          onClick={(e) => {

                            e.stopPropagation();

                            setSelectedJobFilter('');

                            setOpenRoleMenuFor(null);

                          }}

                        >

                          <span>All Jobs</span>

                        </div>

                        {getJobPositions().map((position, index) => (

                          <div 

                            key={index}

                            className={`dropdown-option ${selectedJobFilter === position ? 'selected' : ''}`}

                            onClick={(e) => {

                              e.stopPropagation();

                              setSelectedJobFilter(position);

                              setOpenRoleMenuFor(null);

                            }}

                          >

                            <span>{position}</span>

                          </div>

                        ))}

                      </div>

                    )}

                  </div>

                </div>

                </div>

              </div>



              <div className="um-table candidate-status-table">

                <div className="um-table-header">

                  <div className="um-th name">Candidate</div>

                  <div className="um-th date">Application Date</div>

                  <div className="um-th position">Position</div>

                  <div className="um-th remarks">Remarks</div>

                  <div className="um-th status">Status</div>

                </div>

                
                
                {(() => {

                  // Use only applicants that have a decision (from `decisions` collection)

                  let filteredCandidates = candidateStatusApplicants;



                  // Map filter to applicationStatus values

                  if (selectedRoleFilter === 'Hired') {

                    filteredCandidates = filteredCandidates.filter((a) => (a.applicationStatus || '').toLowerCase() === 'hired');

                  } else if (selectedRoleFilter === 'Rejected') {

                    filteredCandidates = filteredCandidates.filter((a) => (a.applicationStatus || '').toLowerCase() === 'rejected');

                  } else if (selectedRoleFilter === 'For Interview') {

                    filteredCandidates = filteredCandidates.filter((a) => (a.applicationStatus || '').toLowerCase() === 'for_interview');

                  } else if (!selectedRoleFilter) {

                    // Default to For Interview when no explicit selection

                    filteredCandidates = filteredCandidates.filter((a) => (a.applicationStatus || '').toLowerCase() === 'for_interview');

                  } else {

                    // 'All Status' or any other value: no additional filtering by status

                  }



                  // Apply job filter when selected

                  if (selectedJobFilter) {

                    const sel = selectedJobFilter.toLowerCase();

                    filteredCandidates = filteredCandidates.filter((applicant) =>

                      (applicant.position || '').toLowerCase().includes(sel) ||

                      (applicant.selectedJobId && applicant.selectedJobId === selectedJobFilter)

                    );

                  }



                  if (filteredCandidates.length === 0) {

                    return (

                      <div className="um-table-row no-data">

                        <div className="um-td no-data-message" style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6b7280'}}>

                          No candidates found.

                        </div>

                      </div>

                    );

                  }



                  return filteredCandidates.map((applicant, index) => {

                    const initials = (applicant.name || 'Unknown')

                      .split(' ')

                      .map((n) => n[0])

                      .join('')

                      .slice(0, 2)

                      .toUpperCase();
                    
                    
                    
                    return (

                      <div className="um-table-row candidate-status-row" key={applicant.id || index}>

                        <div className="um-td name">

                          <div className="um-user">

                            <div className="um-avatar">{initials}</div>

                            <div className="um-user-meta">

                              <div className="um-user-name">{applicant.name}</div>

                              <div className="um-user-email">{applicant.email || 'No email'}</div>

                            </div>

                          </div>

                        </div>

                        <div className="um-td date">{applicant.dateApplied}</div>

                        <div className="um-td position">

                          <span className="position-tag">{applicant.position}</span>

                        </div>

                        <div className="um-td remarks">

                          {((applicant.applicationStatus || '').toLowerCase() === 'for_interview') ? (

                            <button 

                              className="um-action-link decision"

                              title="Decide Status"

                              onClick={() => openDecisionModal(applicant)}

                              style={{border:'none', background:'transparent', cursor:'pointer'}}

                            >

                              <i className="fas fa-clipboard-check"></i>

                            </button>

                          ) : (

                            <button 

                              className="um-action-link"

                              title="View Remarks"

                              onClick={() => openRemarksModal(applicant)}

                              style={{border:'none', background:'transparent', cursor:'pointer'}}

                            >

                              <i className="fas fa-comment-dots" style={{ color: '#9ca3af' }}></i>

                            </button>

                          )}

                        </div>

                        <div className="um-td status">
                          {(() => {
                            const raw = (applicant.applicationStatus || applicant.status || '').toString().toLowerCase();
                            let cls = 'new';
                            let label = applicant.status || '';
                            if (raw === 'hired') { cls = 'hired'; label = 'Hired'; }
                            else if (raw === 'for_interview' || raw === 'for interview') { cls = 'for-interview'; label = 'For Interview'; }
                            else if (raw === 'rejected') { cls = 'rejected'; label = 'Rejected'; }
                            return (
                              <span className={`status-badge ${cls}`}>{label}</span>
                            );
                          })()}
                        </div>

                      </div>

                    );

                  });

                })()}

              </div>

            </div>

          </div>

        )}



        {/* Ranked Candidates Interface */}

        {currentView === 'ranked-candidates' && (

          <div className="ranked-candidates-content">

            <div className="um-card">

              <div className="um-card-header">

                <div className="um-card-title-group">

                </div>

                <div className="um-card-actions">

                  {isRunningML && (

                    <div style={{display:'flex', alignItems:'center', gap:'8px', color:'#3b82f6', fontSize:'14px'}}>

                      <div style={{width:'16px', height:'16px', border:'2px solid #e5e7eb', borderTop:'2px solid #3b82f6', borderRadius:'50%', animation:'spin 1s linear infinite'}}></div>

                      Training AI Model...

                    </div>

                  )}

                  {mlTrained && (

                    <div style={{display:'flex', alignItems:'center', gap:'8px', color:'#10b981', fontSize:'14px'}}>

                      <i className="fas fa-check-circle"></i>

                      AI Model Active ({trainingData.length || 3} samples)

                    </div>

                  )}

                  <button 

                    className="btn btn-secondary" 

                    onClick={() => { fetch('https://xgboost-service.onrender.com/', { method: 'GET', mode: 'no-cors' }).catch(() => {}); computeMLRankings(allApplicants).then(setApplicantRankings); }} 

                    disabled={isRunningML}

                    style={{fontSize:'12px', padding:'4px 8px'}}

                  >

                    {isRunningML ? 'Training...' : 'Score'}

                  </button>

                  <button className="btn btn-secondary" onClick={() => setShowCSVUpload(true)} style={{fontSize:'12px', padding:'4px 8px'}}>

                    Load CSV

                  </button>

                  <div className="um-search">

                    <i className="fas fa-search"></i>

                    <input 

                      type="text" 

                      placeholder="Search candidates..."

                      value={userSearchTerm}

                      onChange={(e) => setUserSearchTerm(e.target.value)}

                    />

                  </div>

                  <div className="job-filter">

                    <div className="custom-dropdown">

                      <div className="dropdown-trigger" onClick={() => setOpenRoleMenuFor(openRoleMenuFor === 'job-filter' ? null : 'job-filter')}>

                        <div className="dropdown-selected">

                          <span>{selectedJobFilter || 'All Jobs'}</span>

                        </div>

                        <div className={`dropdown-arrow ${openRoleMenuFor === 'job-filter' ? 'open' : ''}`}>

                          ▼

                        </div>

                      </div>

                      {openRoleMenuFor === 'job-filter' && (

                        <div className="dropdown-menu">

                          <div 

                            className={`dropdown-option ${!selectedJobFilter ? 'selected' : ''}`}

                            onClick={(e) => {

                              e.stopPropagation();

                              handleJobFilterChange('');

                            }}

                          >

                            <span>All Jobs</span>

                          </div>

                          {getJobPositions().map((position, index) => (

                            <div 

                              key={index}

                              className={`dropdown-option ${selectedJobFilter === position ? 'selected' : ''}`}

                              onClick={(e) => {

                                e.stopPropagation();

                                handleJobFilterChange(position);

                              }}

                            >

                              <span>{position}</span>

                            </div>

                          ))}

                        </div>

                      )}

                    </div>

                  </div>

                </div>

              </div>



              <div className="um-table">

                <div className="um-table-header">

                  <div className="um-th rank">Rank</div>

                  <div className="um-th name">Candidate</div>

                  <div className="um-th position">Position</div>

                  <div className="um-th weights">Details</div>

                  <div className="um-th score">Score</div>

                  <div className="um-th actions">Actions</div>

                </div>

                
                
                {(() => {

                  // Filter candidates based on search term

                  const searchTerm = (userSearchTerm || '').trim().toLowerCase();

                  const filteredCandidates = searchTerm

                    ? applicantRankings.filter((applicant) => {

                        const name = (applicant.name || '').toLowerCase();

                        const email = (applicant.email || '').toLowerCase();

                        const position = (applicant.position || '').toLowerCase();

                        return name.includes(searchTerm) || 

                               email.includes(searchTerm) || 

                               position.includes(searchTerm);

                      })

                    : applicantRankings;



                  if (filteredCandidates.length === 0) {

                    return (

                      <div className="um-table-row no-data">

                        <div className="um-td no-data-message" style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#6b7280'}}>

                          {searchTerm ? 'No candidates found matching your search.' : 'No candidates found. Please check Firebase data.'}

                        </div>

                      </div>

                    );

                  }



                  return filteredCandidates.map((applicant, index) => {

                    const initials = (applicant.name || 'Unknown')

                      .split(' ')

                      .map((n) => n[0])

                      .join('')

                      .slice(0, 2)

                      .toUpperCase();
                    
                    
                    
                    // Find the original rank in the full list

                    const originalRank = applicantRankings.findIndex(a => a.id === applicant.id) + 1;

                    
                    
                    return (

                      <div className="um-table-row" key={applicant.id || index}>

                        <div className="um-td rank">

                          <span className="rank-number">{originalRank}</span>

                        </div>

                        <div className="um-td name">

                          <div className="um-user">

                            <div className="um-avatar">{initials}</div>

                            <div className="um-user-meta">

                              <div className="um-user-name">{applicant.name}</div>

                              <div className="um-user-email">{applicant.email || 'No email'}</div>

                            </div>

                          </div>

                        </div>

                        <div className="um-td position">

                          <span className="position-tag">{applicant.position}</span>

                        </div>

                        <div className="um-td weights">

                          <button 

                            className="um-action-link" 

                            title="View Applicant Details" 

                            onClick={() => handleOpenApplicantDetails(applicant.id)}

                            style={{border: 'none', background: 'transparent', cursor: 'pointer'}}

                            disabled={applicantDetailsLoading}

                          >

                            <i className="fas fa-info-circle" style={{ color: '#9ca3af' }}></i>

                          </button>

                        </div>

                        <div className="um-td score">

                          <span className={`score-text ${applicant.score >= 90 ? 'excellent' : applicant.score >= 80 ? 'good' : applicant.score >= 70 ? 'average' : 'poor'}`}>

                            {applicant.score ? applicant.score.toFixed(2) : '0.00'}

                          </span>

                        </div>

                        <div className="um-td actions">

                          <button className="um-action-link view" title="View Details" onClick={() => handleOpenApplicantDocuments(applicant)}>

                            <i className="fas fa-eye"></i>

                          </button>

                          <button className="um-action-link calendar" title="Schedule Interview" onClick={() => handleCalendarClick(applicant)}>

                            <i className="fas fa-calendar"></i>

                          </button>

                          <button

                            className="um-action-link reject"

                            title="Reject Applicant"

                            onClick={() => handleRejectApplicant(applicant)}

                          >

                            <i className="fas fa-times" aria-hidden="true"></i>

                            <span className="label">REJECT</span>

                          </button>

                        </div>

                      </div>

                    );

                  });

                })()}

              </div>

            </div>

          </div>

        )}



        {/* Analytics Interface */}

        {currentView === 'analytics' && (

          <div className="reports-analytics-content">

            <div className="analytics-dashboard">

              <div className="analytics-content">

                {/* Pie Chart */}

                <div className="analytics-chart-card">

                  <h2 className="chart-title">Applicants per Job</h2>

                  <div className="professional-chart">

                    <div className="chart-header">

                      <div className="header-content">

                        <h3>Job Application Distribution</h3>

                        <p>Distribution of all applicants across job positions</p>

                      </div>

                    </div>

                    
                    
                    <div className="chart-body" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px'}}>

                      {(() => {

                        const getJobColor = (position) => {

                          const colorMap = {

                            'Pipe Fitter': '#3B82F6',               // Blue

                            'Electrical Engineer': '#F59E0B',       // Orange

                            'Electrician': '#10B981',               // Green

                            'Helper': '#8B5CF6',                    // Purple

                            'Technician': '#FACC15',                // Yellow

                            'Network Technician': '#EC4899',        // Pink

                            'Mason': '#06B6D4',                     // Teal

                            'Welder': '#EF4444',                    // Red

                            'Painter': '#D97706',                   // Dark Orange

                            'CCTV Technician': '#2E8B57',           // Sea Green

                            'Electronics Engineer': '#4682B4'       // Steel Blue

                          };

                          return colorMap[position] || '#6b7280';

                        };

                        
                        
                        const jobCounts = {};

                        allApplicants.forEach(applicant => {

                          const position = applicant.position || 'Unknown';

                          jobCounts[position] = (jobCounts[position] || 0) + 1;

                        });

                        
                        
                        const jobEntries = Object.entries(jobCounts).sort((a, b) => b[1] - a[1]);

                        const totalApplicants = allApplicants.length;

                        
                        
                        if (totalApplicants === 0) {

                          return (

                            <div style={{textAlign: 'center', color: '#666'}}>

                              No applicant data available

                            </div>

                          );

                        }

                        
                        
                        let currentAngle = -90;

                        const pieSlices = jobEntries.map(([position, count], index) => {

                          const percentage = (count / totalApplicants) * 100;

                          const angle = (count / totalApplicants) * 360;

                          const startAngle = currentAngle;

                          const endAngle = currentAngle + angle;

                          
                          
                          const cx = 150, cy = 150; const R = 120; const r = 75;

                          const startX = cx + R * Math.cos((startAngle * Math.PI) / 180);

                          const startY = cy + R * Math.sin((startAngle * Math.PI) / 180);

                          const endX = cx + R * Math.cos((endAngle * Math.PI) / 180);

                          const endY = cy + R * Math.sin((endAngle * Math.PI) / 180);

                          const innerStartX = cx + r * Math.cos((startAngle * Math.PI) / 180);

                          const innerStartY = cy + r * Math.sin((startAngle * Math.PI) / 180);

                          const innerEndX = cx + r * Math.cos((endAngle * Math.PI) / 180);

                          const innerEndY = cy + r * Math.sin((endAngle * Math.PI) / 180);

                          
                          
                          const largeArcFlag = angle > 180 ? 1 : 0;

                          const pathData = `M ${startX} ${startY} A ${R} ${R} 0 ${largeArcFlag} 1 ${endX} ${endY} L ${innerEndX} ${innerEndY} A ${r} ${r} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY} Z`;

                          
                          
                          currentAngle += angle;

                          
                          
                          const midAngle = (startAngle + endAngle) / 2;

                          const labelRadius = (R + r) / 2 + 5;

                          const labelX = cx + labelRadius * Math.cos((midAngle * Math.PI) / 180);

                          const labelY = cy + labelRadius * Math.sin((midAngle * Math.PI) / 180);

                          return {

                            path: pathData,

                            color: getJobColor(position),

                            position,

                            count,

                            percentage: percentage.toFixed(1),

                            labelX,

                            labelY

                          };

                        });

                        
                        
                        return (

                          <div style={{position: 'relative', width: '300px', height: '300px'}}>

                            <svg width="300" height="300" viewBox="0 0 300 300">

                              <defs>

                                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">

                                  <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>

                                </filter>

                              </defs>

                              
                              
                              {pieSlices.map((slice, index) => (

                                <path key={index}

                                      d={slice.path}

                                      fill={slice.color}

                                      filter="url(#shadow)"

                                      stroke="#ffffff"

                                      strokeWidth={pieHoverIndex === index ? 3 : 2}

                                      onMouseEnter={() => setPieHoverIndex(index)}

                                      onMouseLeave={() => setPieHoverIndex(null)}

                                />

                              ))}

                              {pieHoverIndex !== null && (() => {
                                const s = pieSlices[pieHoverIndex];
                                const tx = s.labelX, ty = s.labelY - 10;
                                return (
                                  <g pointerEvents="none">
                                    <rect x={tx - 70} y={ty - 22} width={140} height={34} rx={8} fill="#111827" opacity="0.9" />
                                    <text x={tx} y={ty - 4} textAnchor="middle" fontSize="12" fill="#ffffff" fontWeight="700">{s.position}</text>
                                    <text x={tx} y={ty + 12} textAnchor="middle" fontSize="12" fill="#e5e7eb">{s.percentage}%</text>
                                  </g>
                                );
                              })()}

                              {/* Donut style center intentionally left empty */}

                            </svg>

                          </div>

                        );

                      })()}

                    </div>

                    
                    
                    <div className="chart-footer">

                      <div className="legend" style={{display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center'}}>

                        {(() => {

                          const getJobColor = (position) => {

                            const colorMap = {

                              'Pipe Fitter': '#3B82F6',               // Blue

                              'Electrical Engineer': '#F59E0B',       // Orange

                              'Electrician': '#10B981',               // Green

                              'Helper': '#8B5CF6',                    // Purple

                              'Technician': '#FACC15',                // Yellow

                              'Network Technician': '#EC4899',        // Pink

                              'Mason': '#06B6D4',                     // Teal

                              'Welder': '#EF4444',                    // Red

                              'Painter': '#D97706',                   // Dark Orange

                              'CCTV Technician': '#2E8B57',           // Sea Green

                              'Electronics Engineer': '#4682B4'       // Steel Blue

                            };

                            return colorMap[position] || '#6b7280';

                          };

                          
                          
                          const jobCounts = {};

                          allApplicants.forEach(applicant => {

                            const position = applicant.position || 'Unknown';

                            jobCounts[position] = (jobCounts[position] || 0) + 1;

                          });

                          
                          
                          const jobEntries = Object.entries(jobCounts).sort((a, b) => b[1] - a[1]);

                          const totalApplicants = allApplicants.length;

                          
                          
                          return jobEntries.map(([position, count], index) => {

                            const percentage = totalApplicants > 0 ? ((count / totalApplicants) * 100).toFixed(1) : '0.0';

                            return (

                              <div key={position} className="legend-item">

                                <div className="legend-color" style={{background: getJobColor(position), width: '12px', height: '12px', borderRadius: '2px'}}></div>

                                <span>{position} ({percentage}%)</span>

                              </div>

                            );

                          });

                        })()}

                      </div>

                    </div>

                  </div>

                </div>



                 {/* Hired vs Not Hired per Category Chart */}

                 <div className="analytics-chart-card">

                   <h2 className="chart-title">Hired vs Not Hired per Category</h2>

                   <div className="professional-chart">

                     <div className="chart-header">

                       <div className="header-content">

                         <h3>Hiring outcomes by job category</h3>

                         <p>Compare hired vs not hired candidates across different job categories</p>

                       </div>

                     </div>
                    
                    
                    
                    <div className="chart-body">

                      <div className="y-axis-container">

                        <div className="y-axis-title">Candidates</div>

                        <div className="y-axis-labels">
                          {(() => {
                            const hiringStats = {};
                            candidateStatusApplicants.forEach(a => {
                              const pos = a.position || 'Unknown';
                              const st = (a.applicationStatus || '').toLowerCase();
                              if (st === 'hired' || st === 'rejected') {
                                if (!hiringStats[pos]) hiringStats[pos] = { hired: 0, notHired: 0 };
                                if (st === 'hired') hiringStats[pos].hired++; else hiringStats[pos].notHired++;
                              }
                            });
                            const nonZeroEntries = Object.entries(hiringStats).filter(([, s]) => (s.hired + s.notHired) > 0);
                            const maxTotal = Math.max(0, ...nonZeroEntries.map(([, s]) => s.hired + s.notHired));
                            const desiredSteps = 5;
                            const step = Math.max(1, Math.ceil(maxTotal / desiredSteps));
                            const ticksAsc = [];
                            for (let v = 0; v <= maxTotal; v += step) ticksAsc.push(v);
                            if (ticksAsc[ticksAsc.length - 1] !== maxTotal) ticksAsc.push(maxTotal);
                            const ticks = ticksAsc.reverse();
                            return ticks.map((t, idx) => (
                              <div key={idx} className="y-tick">
                                <span className="tick-line"></span>
                                <span className="tick-label">{t}</span>
                              </div>
                            ));
                          })()}
                        </div>

                      </div>

                      
                      
                      <div className="chart-main">

                        <div className="grid-background">
                          {(() => {
                            const hiringStats = {};
                            candidateStatusApplicants.forEach(a => {
                              const pos = a.position || 'Unknown';
                              const st = (a.applicationStatus || '').toLowerCase();
                              if (st === 'hired' || st === 'rejected') {
                                if (!hiringStats[pos]) hiringStats[pos] = { hired: 0, notHired: 0 };
                                if (st === 'hired') hiringStats[pos].hired++; else hiringStats[pos].notHired++;
                              }
                            });
                            const nonZeroEntries = Object.entries(hiringStats).filter(([, s]) => (s.hired + s.notHired) > 0);
                            const maxTotal = Math.max(0, ...nonZeroEntries.map(([, s]) => s.hired + s.notHired));
                            const desiredSteps = 5;
                            const step = Math.max(1, Math.ceil(maxTotal / desiredSteps));
                            const ticks = [];
                            for (let v = 0; v <= maxTotal; v += step) ticks.push(v);
                            if (ticks[ticks.length - 1] !== maxTotal) ticks.push(maxTotal);
                            return ticks.map((_, i) => (<div key={i} className="grid-line"></div>));
                          })()}
                        </div>

                        
                        
                        <div className="bars-container">

                          {(() => {

                            // Calculate hiring statistics from candidateStatusApplicants

                            const hiringStats = {};

                            candidateStatusApplicants.forEach(applicant => {

                              const position = applicant.position || 'Unknown';

                              const status = (applicant.applicationStatus || '').toLowerCase();

                              // Only consider definitive outcomes; ignore interview/other statuses
                              if (status === 'hired' || status === 'rejected') {
                                if (!hiringStats[position]) {
                                  hiringStats[position] = { hired: 0, notHired: 0 };
                                }
                                if (status === 'hired') {
                                  hiringStats[position].hired++;
                                } else {
                                  hiringStats[position].notHired++;
                                }
                              }

                            });

                            
                            
                            if (Object.keys(hiringStats).length === 0) {

                              return (

                                <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>

                                  No hiring data available

                                </div>

                              );

                            }

                            
                            
                            const entries = Object.entries(hiringStats).filter(([, s]) => (s.hired + s.notHired) > 0);
                            const maxValue = Math.max(0, ...entries.map(([, s]) => s.hired + s.notHired));
                            return entries.map(([position, stats]) => {

                              const hiredHeight = maxValue > 0 ? (stats.hired / maxValue) * 180 : 0;

                              const notHiredHeight = maxValue > 0 ? (stats.notHired / maxValue) * 180 : 0;

                              
                              
                              return (

                                <div key={position} className="bar-group" data-tooltip={`Hired: ${stats.hired} | Not Hired: ${stats.notHired}`}>

                                  <div className="stacked-bar" style={{height: `${hiredHeight + notHiredHeight}px`}}>
                                    <div className="stacked-segment hired" style={{height: `${hiredHeight}px`}}></div>
                                    <div className="stacked-segment not-hired" style={{height: `${notHiredHeight}px`}}></div>
                                  </div>

                                  <span className="bar-label" title={position}>{position}</span>

                                </div>

                              );

                            });

                          })()}

                        </div>

                      </div>

                    </div>

                    
                    
                    <div className="chart-footer">

                      <div className="legend">

                        {(() => {

                          const hiringStats = {};

                          candidateStatusApplicants.forEach(applicant => {

                            const position = applicant.position || 'Unknown';

                            const status = (applicant.applicationStatus || '').toLowerCase();

                            // Only include hired/rejected, skip interview and other states
                            if (status === 'hired' || status === 'rejected') {
                              if (!hiringStats[position]) {
                                hiringStats[position] = { hired: 0, notHired: 0 };
                              }
                              if (status === 'hired') {
                                hiringStats[position].hired++;
                              } else {
                                hiringStats[position].notHired++;
                              }
                            }

                          });

                          
                          
                          const totalHired = Object.values(hiringStats).reduce((sum, stats) => sum + stats.hired, 0);

                          const totalNotHired = Object.values(hiringStats).reduce((sum, stats) => sum + stats.notHired, 0);

                          const totalCandidates = totalHired + totalNotHired;

                          const successRate = totalCandidates > 0 ? Math.round((totalHired / totalCandidates) * 100) : 0;

                          
                          
                          return (

                            <>

                              <div className="legend-item">

                                <div className="legend-color" style={{background: '#F59E0B'}}></div>

                                <span>Hired ({totalHired})</span>

                              </div>
                              <div className="legend-item">

                                <div className="legend-color" style={{background: '#EF4444'}}></div>

                                <span>Not Hired ({totalNotHired})</span>

                              </div>
                              <div className="legend-item">

                                <div className="legend-color" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}></div>

                                <span>Success Rate: {successRate}%</span>

                              </div>

                            </>

                          );

                        })()}

                      </div>

                    </div>

                  </div>

                </div>



              </div>

            </div>

          </div>

        )}



        {/* Update Job Posting Interface */}

        {currentView === 'job-board' && (

          <div className="update-job-posting-content">

            <div className="job-board-section">

              <div className="create-job-section">

                <button className="create-job-btn" onClick={handleCreateNewJob}>

                  Create New Job

                </button>

              </div>



              <div className="job-cards-grid">

                {displayedJobs.map((job) => (

                  <div className="job-card" key={job.id}>

                    {/* Header Section */}

                    <div className="job-card-header">

                      <div className="job-title">{job.title}</div>

                      <div className={`job-status-badge ${(() => {
                        const s = getJobStatus(job);
                        return s === 'Active' ? 'active' : (s === 'Inactive' ? 'inactive' : 'closed');
                      })()}`}>

                        {getJobStatus(job)}

                      </div>

                    </div>

                    
                    
                    {/* Description Section */}

                    <div className="job-description">

                      {job.description.length > 100 

                        ? `${job.description.substring(0, 100)}...` 

                        : job.description

                      }

                    </div>

                    
                    
                    {/* Job Details Section */}

                    <div className="job-details">
                      <div className="job-detail">

                        <span className="detail-icon">📅</span>

                        <span className="detail-text">Start: {job.applicationStartDate || 'Not Set'}</span>

                      </div>

                      <div className="job-detail">

                        <span className="detail-icon">⏰</span>

                        <span className="detail-text">End: {job.applicationEndDate || 'No Expiration'}</span>

                      </div>

                    </div>

                    

                    
                    
                    {/* Footer Section */}

                    <div className="job-footer">

                      <div className="applicants-summary">{jobApplicantCounts[job.id] || 0} applicants</div>

                      <div className="job-actions">

                        <button className="edit-btn" onClick={() => handleUpdateJob(job)}>

                          <i className="fas fa-pen"></i>

                          Edit

                        </button>

                        <button className="delete-btn" onClick={() => handleDeleteJob(job.id)}>

                          <i className="fas fa-trash"></i>

                          Delete

                        </button>

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            </div>

          </div>

        )}



        {/* User Management Interface */}

        {currentView === 'manage-users' && (

          <div className="user-management-content">

            <div className="um-card">

              <div className="um-card-header">

                <div className="um-card-actions">

                  <button 

                    className="um-btn um-btn-danger ghost"

                    onClick={handleBulkDelete}

                    disabled={selectedUsers.length === 0}

                  >

                    <i className="fas fa-trash"></i>

                    Delete Selected ({selectedUsers.length})

                  </button>

                  <div className="um-search">

                    <i className="fas fa-search"></i>

                    <input 

                      type="text" 

                      placeholder="Search users..."

                      value={userSearchTerm}

                      onChange={(e) => setUserSearchTerm(e.target.value)}

                    />

                  </div>

                  <div className="role-filter">

                    <div className="custom-dropdown">

                      <div className="dropdown-trigger" onClick={() => setOpenRoleMenuFor(openRoleMenuFor === 'role-filter' ? null : 'role-filter')}>

                        <div className="dropdown-selected">

                          <span>{selectedRoleFilter ? (selectedRoleFilter === 'admin' ? 'Staff' : selectedRoleFilter) : 'All Roles'}</span>

                        </div>

                        <div className={`dropdown-arrow ${openRoleMenuFor === 'role-filter' ? 'open' : ''}`}>

                          ▼

                        </div>

                      </div>

                      {openRoleMenuFor === 'role-filter' && (

                        <div className="dropdown-menu">

                          <div 

                            className={`dropdown-option ${!selectedRoleFilter ? 'selected' : ''}`}

                            onClick={(e) => {

                              e.stopPropagation();

                              handleRoleFilterChange('');

                            }}

                          >

                            <span>All Roles</span>

                          </div>

                          <div 

                            className={`dropdown-option ${selectedRoleFilter === 'admin' ? 'selected' : ''}`}

                            onClick={(e) => {

                              e.stopPropagation();

                              handleRoleFilterChange('admin');

                            }}

                          >

                            <span>Staff</span>

                          </div>

                          <div 

                            className={`dropdown-option ${selectedRoleFilter === 'employer' ? 'selected' : ''}`}

                            onClick={(e) => {

                              e.stopPropagation();

                              handleRoleFilterChange('employer');

                            }}

                          >

                            <span>Employer</span>

                          </div>

                          <div 

                            className={`dropdown-option ${selectedRoleFilter === 'applicant' ? 'selected' : ''}`}

                            onClick={(e) => {

                              e.stopPropagation();

                              handleRoleFilterChange('applicant');

                            }}

                          >

                            <span>Applicant</span>

                          </div>

                        </div>

                      )}

                    </div>

                  </div>

                </div>

              </div>



              {(() => {

                const term = (userSearchTerm || '').trim().toLowerCase();

                let filteredUsers = users;

                
                
                // Apply search filter

                if (term) {

                  filteredUsers = filteredUsers.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(term));

                }

                
                
                // Apply role filter

                if (selectedRoleFilter) {

                  filteredUsers = filteredUsers.filter((u) => u.role === selectedRoleFilter);

                }

                const allVisibleIds = filteredUsers.map((u) => u.id);

                const allVisibleSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedUsers.includes(id));

                
                
                // Show filter status

                const totalUsers = users.length;

                const filteredCount = filteredUsers.length;

                return (

                  <div>

                    {/* Filter Status */}

                    {(selectedRoleFilter || userSearchTerm) && (

                      <div style={{

                        padding: '12px 20px',

                        backgroundColor: '#f0f9ff',

                        border: '1px solid #bae6fd',

                        borderRadius: '8px',

                        marginBottom: '16px',

                        fontSize: '14px',

                        color: '#0369a1'

                      }}>

                        <i className="fas fa-filter" style={{marginRight: '8px'}}></i>

                        Showing {filteredCount} of {totalUsers} users

                        {selectedRoleFilter && ` • Filtered by role: ${selectedRoleFilter}`}

                        {userSearchTerm && ` • Search: "${userSearchTerm}"`}

                        <button 

                          onClick={() => {

                            setSelectedRoleFilter('');

                            setUserSearchTerm('');

                          }}

                          style={{

                            marginLeft: '12px',

                            padding: '4px 8px',

                            backgroundColor: 'transparent',

                            border: '1px solid #0369a1',

                            borderRadius: '4px',

                            color: '#0369a1',

                            cursor: 'pointer',

                            fontSize: '12px'

                          }}

                        >

                          Clear filters

                        </button>

                      </div>

                    )}

                    <div className="um-table">

                    <div className="um-table-header">

                      <div className="um-th checkbox">

                        <input 

                          type="checkbox" 

                          checked={allVisibleSelected}

                          onChange={() => handleSelectAllUsers(allVisibleIds)}

                        />

                      </div>

                      <div className="um-th name">Name</div>

                      <div className="um-th role">User Role</div>

                      <div className="um-th join">Join Date</div>

                      <div className="um-th actions">Actions</div>

                    </div>



                    {filteredUsers.map((user) => {

                      const initials = (user.name || user.email || '?')

                        .split(' ')

                        .map((n) => n[0])

                        .join('')

                        .slice(0, 2)

                        .toUpperCase();

                      return (

                        <div className="um-table-row" key={user.id}>

                          <div className="um-td checkbox">

                            <input 

                              type="checkbox" 

                              checked={selectedUsers.includes(user.id)}

                              onChange={() => handleUserSelection(user.id)}

                            />

                          </div>

                          <div className="um-td name">

                            <div className="um-user">

                              <div className="um-avatar">{initials}</div>

                              <div className="um-user-meta">

                                <div className="um-user-name">{user.name}</div>

                                <div className="um-user-email">{user.email}</div>

                              </div>

                            </div>

                          </div>

                          <div className="um-td role">

                            {editingUserRole.userId === user.id ? (

                              <div className="um-select-custom" onClick={(e) => e.stopPropagation()}>

                                <button 

                                  type="button"

                                  className="um-select-trigger"

                                  onClick={() => setOpenRoleMenuFor(openRoleMenuFor === user.id ? null : user.id)}

                                >

                                  <span className={`role-dot ${editingUserRole.role}`}></span>

                                  {editingUserRole.role === 'admin' ? 'Staff' : editingUserRole.role}

                                  <span className="chevron">▼</span>

                                </button>

                                {openRoleMenuFor === user.id && (

                                  <div className="um-options" role="listbox">

                                    {availableRoles.map((r) => (

                                      <div 

                                        key={r}

                                        role="option"

                                        aria-selected={r === editingUserRole.role}

                                        className={`um-option ${r === editingUserRole.role ? 'selected' : ''}`}

                                        onClick={() => { setEditingUserRole((prev) => ({ ...prev, role: r })); setOpenRoleMenuFor(null); }}

                                      >

                                        <span className={`role-dot ${r}`}></span>

                                        {r}

                                      </div>

                                    ))}

                                  </div>

                                )}

                              </div>

                            ) : (

                              <span className={`role-badge ${user.role === 'admin' ? 'staff' : user.role}`}>

                                {user.role === 'admin' ? 'Staff' : user.role === 'employer' ? 'Employer' : 'Applicant'}

                              </span>

                            )}

                          </div>

                          <div className="um-td join">{formatYmd(user.createdAt) || '—'}</div>

                          <div className="um-td actions">

                            {editingUserRole.userId === user.id ? (

                              <>

                                <button 

                                  className="um-action-link edit"

                                  onClick={() => handleSaveUserRole(user)}

                                >

                                  <i className="fas fa-save"></i> Save

                                </button>

                                <button 

                                  className="um-action-link delete"

                                  onClick={handleCancelEditUser}

                                >

                                  <i className="fas fa-times"></i> Cancel

                                </button>

                              </>

                            ) : (

                              <>

                                <button 

                                  className="um-action-link edit"

                                  onClick={() => handleEditUser(user)}

                                >

                                  <i className="fas fa-pen"></i> Edit

                                </button>

                                <button 

                                  className={`um-action-link delete ${user.role === 'admin' ? 'disabled' : ''}`}

                                  onClick={() => handleDeleteUser(user)}

                                  disabled={user.role === 'admin'}

                                  title={user.role === 'admin' ? 'Cannot delete admin users' : 'Delete user'}

                                >

                                  <i className="fas fa-trash"></i> Delete

                                </button>

                              </>

                            )}

                          </div>

                        </div>

                      );

                    })}

                    </div>

                  </div>

                );

              })()}

            </div>

          </div>

        )}

      </main>

      {/* Interview Schedule Modal (global overlay) */}

      {showScheduleModal && (

        <div className="modal-overlay" onClick={handleCloseScheduleModal}>

          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            <h2>Schedule Interview</h2>

            <div className="modal-body">

              <div className="form-row">

                <label>Date</label>

                <input type="date" min={getTodayStr()} value={scheduleForm.date} onChange={(e) => handleDateInputChange(e.target.value)} />

              </div>

              <div className="form-row">

                <label>Time</label>

                <input type="time" min="08:00" max="17:00" step="900" value={scheduleForm.time} onChange={(e) => handleTimeInputChange(e.target.value)} />

              </div>

              <div className="form-row">

                <label>Location</label>

                <input type="text" placeholder="Office address or meeting link" value={scheduleForm.location} onChange={(e) => handleScheduleFieldChange('location', e.target.value)} />

              </div>

              {scheduleNotice && (

                <small style={{color:'#dc3545'}}>{scheduleNotice}</small>

              )}

              <small style={{color:'#6c757d'}}>Available: Monday to Saturday, 8:00 AM – 5:00 PM</small>

              <div className="form-row">

                <label>Message (optional)</label>

                <textarea placeholder="Additional instructions" value={scheduleForm.message} onChange={(e) => handleScheduleFieldChange('message', e.target.value)} />

              </div>

            </div>

            <div className="modal-actions">

              <button className="btn btn-secondary" onClick={handleCloseScheduleModal} disabled={sendingInvite}>Cancel</button>

              <button className="btn btn-primary" onClick={handleSendInterviewInvite} disabled={sendingInvite}>

                {sendingInvite ? 'Sending...' : 'Send Invite'}

              </button>

            </div>

          </div>

        </div>

      )}

      {showDocsModal && (

        <div 

          className="docs-modal-overlay" 

          onClick={handleCloseDocsModal}

          style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000}}

        >

          <div 

            className="docs-modal" 

            onClick={(e) => e.stopPropagation()}

            style={{width:'min(900px, 92vw)', maxHeight:'85vh', background:'#fff', borderRadius:'12px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)', overflow:'hidden', display:'flex', flexDirection:'column'}}

          >

            <div style={{padding:'16px 20px', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', justifyContent:'space-between'}}>

              <div>

                <h3 style={{margin:0}}>Applicant Documents</h3>

                <div style={{fontSize:'12px', color:'#666'}}>{selectedApplicantForDocs?.name} • {selectedApplicantForDocs?.email || ''}</div>

              </div>

              <button onClick={handleCloseDocsModal} style={{border:'none', background:'transparent', fontSize:'20px', cursor:'pointer'}}>✕</button>

            </div>

            <div style={{padding:'16px 20px', overflow:'auto'}}>

              {docsLoading ? (

                <div>Loading documents...</div>

              ) : applicantDocs.length === 0 ? (

                <div>No documents uploaded by this applicant.</div>

              ) : (

                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'12px'}}>

                  {applicantDocs.map((d) => (

                    <div key={d.id} style={{border:'1px solid #eee', borderRadius:'10px', padding:'12px'}}>

                      <div style={{fontWeight:600, marginBottom:'6px'}}>{d.documentType || 'Document'}</div>

                      <div style={{fontSize:'12px', color:'#666', marginBottom:'8px'}}>{d.originalName || d.fileName}</div>

                      <div style={{fontSize:'12px', color:'#666', marginBottom:'12px'}}>Uploaded: {formatDate(d.uploadedAt)}</div>

                      <button onClick={() => handleViewSingleDocument(d)} style={{width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1px solid #ddd', background:'#f7f7f7', cursor:'pointer'}}>Open</button>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </div>

        </div>

      )}

      {showDocPreview && (

        <div 

          className="doc-preview-overlay" 

          onClick={handleCloseDocPreview}

          style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2100}}

        >

          <div 

            className="doc-preview-modal" 

            onClick={(e) => e.stopPropagation()}

            style={{width:'min(1000px, 95vw)', height:'min(85vh, 900px)', background:'#fff', borderRadius:'12px', boxShadow:'0 20px 60px rgba(0,0,0,0.35)', overflow:'hidden', display:'flex', flexDirection:'column'}}

          >

            <div style={{padding:'12px 16px', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', justifyContent:'space-between'}}>

              <div style={{display:'flex', flexDirection:'column'}}>

                <strong style={{margin:0}}>{docPreviewName}</strong>

                <span style={{fontSize:'12px', color:'#666'}}>{docPreviewType}</span>

              </div>

              <button onClick={handleCloseDocPreview} style={{border:'none', background:'transparent', fontSize:'20px', cursor:'pointer'}}>✕</button>

            </div>

            <div style={{flex:1, background:'#f6f7f8'}}>

              {docPreviewType.startsWith('image/') ? (

                <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>

                  <img src={docPreviewUrl} alt={docPreviewName} style={{maxWidth:'100%', maxHeight:'100%'}} />

                </div>

              ) : (

                <iframe src={docPreviewUrl} title="Document Preview" style={{border:'none', width:'100%', height:'100%'}} />

              )}

            </div>

          </div>

        </div>

      )}



      {/* Job Edit Modal */}

      {showUpdateJobForm && (

        <div className="modal-overlay" onClick={handleCloseUpdateForm}>

          <div className="job-edit-modal" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">

              <div className="modal-header-content">

                <h2>

                  {editingJob?.id && jobs.find(j => j.id === editingJob.id) 

                    ? 'Edit Job Details' 

                    : 'Create New Job'

                  }

                </h2>

                <p className="modal-subtitle">

                  {editingJob?.id && jobs.find(j => j.id === editingJob.id)

                    ? 'Update your job posting information'

                    : 'Add a new job posting to your board'

                  }

                </p>

              </div>

              <button className="close-modal-btn" onClick={handleCloseUpdateForm}>✕</button>

            </div>



            <div className="modal-body">

              <div className="form-field">

                <div className="field-icon">👤</div>

                <div className="field-content">

                  <label>Job Title</label>

                  <input 

                    type="text" 

                    value={editingJob?.title || ''} 

                    onChange={(e) => handleJobFieldChange('title', e.target.value)}

                    placeholder="Enter job title"

                  />

                </div>

              </div>



              <div className="form-field">

                <div className="field-icon">📝</div>

                <div className="field-content">

                  <label>Job Description</label>

                  <textarea 

                    value={editingJob?.description || ''} 

                    onChange={(e) => handleJobFieldChange('description', e.target.value)}

                    placeholder="Enter job description"

                    rows="3"

                  />

                </div>

              </div>



              <div className="form-field">

                <div className="field-icon">📅</div>

                <div className="field-content">

                  <label>Application Start Date</label>

                  <input 

                    type="date" 

                    value={editingJob?.applicationStartDate || ''} 

                    onChange={(e) => handleJobFieldChange('applicationStartDate', e.target.value)}

                  />

                </div>

              </div>



              



              <div className="form-field">

                <div className="field-icon">📅</div>

                <div className="field-content">

                  <label>Application End Date</label>

                  <input 

                    type="date" 

                    min={editingJob?.applicationStartDate || ''}

                    value={editingJob?.applicationEndDate || ''} 

                    onChange={(e) => handleJobFieldChange('applicationEndDate', e.target.value)}

                  />

                </div>

              </div>

            </div>



            <div className="modal-actions">

              <button className="btn btn-cancel" onClick={handleCloseUpdateForm}>

                Cancel

              </button>

              <button className="btn btn-save" onClick={handleSaveJob}>

                {editingJob?.id && jobs.find(j => j.id === editingJob.id) 

                  ? 'Save Changes' 

                  : 'Create Job'

                }

              </button>

            </div>

          </div>

        </div>

      )}



      {/* CSV Upload Modal */}

      {showCSVUpload && (

        <div className="modal-overlay" onClick={() => setShowCSVUpload(false)}>

          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{width:'500px'}}>

            <h2>Load Training Data CSV</h2>

            <div className="modal-body">

              <p>Upload a CSV file with columns: Trade, Age, Educational Attainment, Years Of Experience, Skill Score, Status</p>

              <input 

                type="file" 

                accept=".csv" 

                onChange={handleCSVFileSelect}

                style={{width:'100%', padding:'8px', border:'1px solid #ddd', borderRadius:'4px'}}

              />

              {selectedCSVFile && (

                <div style={{marginTop:'12px', padding:'8px', backgroundColor:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:'4px', fontSize:'14px'}}>

                  <strong>Selected file:</strong> {selectedCSVFile.name} ({(selectedCSVFile.size / 1024).toFixed(1)} KB)

                </div>

              )}

              <div style={{marginTop:'12px', fontSize:'12px', color:'#666'}}>

                Expected format:<br/>

                Trade,Age,Educational Attainment,Years Of Experience,Skill Score,Status<br/>

                Electronics Engineer,28,Bachelor,5,85,hired<br/>

                Network Technician,32,Associate,8,92,hired<br/>

                Electrician,25,Certificate,3,78,rejected

              </div>

            </div>

            <div className="modal-actions">

              <button className="btn btn-secondary" onClick={() => {

                setShowCSVUpload(false);

                setSelectedCSVFile(null);

              }}>

                Cancel

              </button>

              <button 

                className="btn btn-primary" 

                onClick={handleCSVUpload}

                disabled={!selectedCSVFile}

                style={{

                  opacity: selectedCSVFile ? 1 : 0.5,

                  cursor: selectedCSVFile ? 'pointer' : 'not-allowed'

                }}

              >

                Upload CSV

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Applicant Details Modal */}

      {showApplicantDetailsModal && (

        <div className="modal-overlay" onClick={handleCloseApplicantDetailsModal}>

          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{width:'900px', maxHeight:'90vh', overflow:'auto'}}>

            <div className="modal-header">

              <h2>Applicant Details & Score Breakdown</h2>

              <button className="close-modal-btn" onClick={handleCloseApplicantDetailsModal}>✕</button>

            </div>

            

            <div className="modal-body">

              {applicantDetailsLoading ? (

                <div>Loading applicant details...</div>

              ) : selectedApplicantDetails ? (

                <div>

                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', marginBottom:'30px'}}>

                    <div>

                      <h3>Personal Information</h3>

                      <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>

                        <div><strong>Name:</strong> {[selectedApplicantDetails.personalInfo.firstName, selectedApplicantDetails.personalInfo.middleName, selectedApplicantDetails.personalInfo.lastName].filter(Boolean).join(' ') || 'N/A'}</div>

                        <div><strong>Birthday:</strong> {selectedApplicantDetails.personalInfo?.birthday || selectedApplicantDetails.birthday || 'N/A'}</div>

                        <div><strong>Age:</strong> {(() => {

                          const birthday = selectedApplicantDetails.personalInfo?.birthday || selectedApplicantDetails.birthday;

                          const age = calculateAge(birthday);

                          return age !== null ? age : (selectedApplicantDetails.personalInfo?.age || selectedApplicantDetails.age || 'N/A');

                        })()}</div>

                        <div><strong>Email:</strong> {selectedApplicantDetails.personalInfo?.email || selectedApplicantDetails.email || 'N/A'}</div>

                        <div><strong>Phone:</strong> {selectedApplicantDetails.personalInfo?.phoneNumber || selectedApplicantDetails.phone || 'N/A'}</div>

                        <div><strong>Address:</strong> {(() => {

                          // Try multiple possible locations for address data

                          const city = selectedApplicantDetails.personalInfo?.city || selectedApplicantDetails.city;

                          const province = selectedApplicantDetails.personalInfo?.province || selectedApplicantDetails.province;

                          const address = selectedApplicantDetails.personalInfo?.address || selectedApplicantDetails.address;

                          const location = selectedApplicantDetails.personalInfo?.location || selectedApplicantDetails.location;

                          
                          
                          // If we have city and province, use them

                          if (city && province) {

                            return `${city}, ${province}`;

                          }

                          // If we have city only, use it

                          if (city) {

                            return city;

                          }

                          // If we have province only, use it

                          if (province) {

                            return province;

                          }

                          // If we have a full address field, use it

                          if (address) {

                            return address;

                          }

                          // If we have a location field, use it

                          if (location) {

                            return location;

                          }

                          return 'N/A';

                        })()}</div>

                      </div>

                    </div>

                    <div>

                      <h3>Professional Information</h3>

                      <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>

                        <div><strong>Education:</strong> {selectedApplicantDetails.personalInfo?.educationalAttainment || selectedApplicantDetails.educationalAttainment || 'N/A'}</div>

                        <div><strong>Experience:</strong> {selectedApplicantDetails.personalInfo?.yearsOfExperience || selectedApplicantDetails.experienceYears || 'N/A'} years</div>

                        <div><strong>Position Applied:</strong> {selectedApplicantDetails.selectedJob?.title || 'N/A'}</div>

                        <div><strong>Exam Score:</strong> {selectedApplicantDetails.totalScore && selectedApplicantDetails.maxTotalScore ? Math.round((selectedApplicantDetails.totalScore / selectedApplicantDetails.maxTotalScore) * 100) : 0}%</div>

                      </div>

                    </div>

                  </div>

                  
                  
                  <div>

                    <h3>Score Breakdown (XGBoost Weights)</h3>

                    <div style={{marginBottom:'20px', padding:'12px', backgroundColor:'#f8f9fa', borderRadius:'8px', fontSize:'14px', color:'#333'}}>

                      <strong>Score Computation Formula:</strong><br/>

                      Overall Score = Σ(Feature Value × Feature Weight)<br/>

                      <span style={{fontSize:'12px', color:'#666', marginTop:'4px', display:'block'}}>

                        Each feature contributes to the total score based on its value multiplied by its importance weight.

                      </span>

                    </div>

                    {(() => {

                      const displayedScore = selectedApplicantDetails.totalScore && selectedApplicantDetails.maxTotalScore ? 

                        Math.round((selectedApplicantDetails.totalScore / selectedApplicantDetails.maxTotalScore) * 100) : 0;
                      
                      
                      
                      const attributeMapping = {

                        'age': calculateAge(selectedApplicantDetails.personalInfo?.birthday || selectedApplicantDetails.birthday) || parseInt(selectedApplicantDetails.personalInfo?.age) || parseInt(selectedApplicantDetails.age) || 25,

                        'experience_years': parseInt(selectedApplicantDetails.personalInfo?.yearsOfExperience) || parseInt(selectedApplicantDetails.experienceYears) || 0,

                        'education_level': getEducationScore(selectedApplicantDetails.personalInfo?.educationalAttainment || selectedApplicantDetails.educationalAttainment || 'High School'),

                        'exam_score': selectedApplicantDetails.totalScore && selectedApplicantDetails.maxTotalScore ? Math.round((selectedApplicantDetails.totalScore / selectedApplicantDetails.maxTotalScore) * 100) : (selectedApplicantDetails.exam || 0),

                        'location': (selectedApplicantDetails.personalInfo?.city || selectedApplicantDetails.city || selectedApplicantDetails.personalInfo?.province || selectedApplicantDetails.province || selectedApplicantDetails.personalInfo?.address || selectedApplicantDetails.address || selectedApplicantDetails.personalInfo?.location || selectedApplicantDetails.location) ? 1 : 0

                      };

                      
                      
                      const rawTotal = Object.entries(featureWeights).reduce((sum, [f, w]) => {

                        let v = attributeMapping[f] || 0;

                        return sum + (v * w);

                      }, 0);

                      
                      
                      return (

                        <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>

                          {Object.entries(featureWeights).map(([feature, weight]) => {

                            const applicantValue = attributeMapping[feature] || 0;

                            const rawContribution = applicantValue * weight;

                            const percentage = (Math.abs(weight) * 100).toFixed(1);

                            
                            
                            return (

                              <div key={feature} style={{border:'1px solid #e5e7eb', borderRadius:'8px', padding:'12px'}}>

                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>

                                  <span style={{fontWeight:'600'}}>{formatFeatureName(feature)}</span>

                                  <span style={{fontSize:'14px', color:'#6b7280'}}>

                                    {feature === 'education_level' ? 

                                      `${selectedApplicantDetails.personalInfo?.educationalAttainment || selectedApplicantDetails.educationalAttainment || 'High School'} (${applicantValue})` : 

                                      `Value: ${applicantValue}`

                                    }

                                  </span>

                                </div>

                                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>

                                  <div style={{flex:1, height:'16px', backgroundColor:'#f0f0f0', borderRadius:'8px', overflow:'hidden'}}>

                                    <div 

                                      style={{

                                        height:'100%', 

                                        width:`${percentage}%`, 

                                        backgroundColor: weight >= 0 ? '#10b981' : '#ef4444',

                                        borderRadius:'8px'

                                      }}

                                    />

                                  </div>

                                  <div style={{minWidth:'80px', textAlign:'right', fontWeight:'600', color: rawContribution >= 0 ? '#10b981' : '#ef4444'}}>

                                    {rawContribution >= 0 ? '+' : ''}{rawContribution.toFixed(2)}

                                  </div>

                                </div>

                                <div style={{fontSize:'12px', color:'#9ca3af', marginTop:'4px'}}>

                                  Weight: {weight.toFixed(3)} × Value: {applicantValue} = Contribution: {rawContribution.toFixed(2)}

                                </div>

                              </div>

                            );

                          })}

                        </div>

                      );

                    })()}

                  </div>

                  
                  
                  {/* Total Contribution */}

                  {Object.keys(featureWeights).length > 0 && (() => {

                    const applicantFromRankings = applicantRankings.find(a => a.id === selectedApplicantDetails.id);

                    const actualScore = applicantFromRankings?.score || 0;

                    
                    
                    const birthday = selectedApplicantDetails.personalInfo?.birthday || selectedApplicantDetails.birthday;

                    const calculatedAge = calculateAge(birthday);

                    const educationScore = getEducationScore(selectedApplicantDetails.personalInfo?.educationalAttainment || selectedApplicantDetails.educationalAttainment || 'High School');

                    
                    
                    const attributeMapping = {

                      'age': calculatedAge || parseInt(selectedApplicantDetails.personalInfo?.age) || parseInt(selectedApplicantDetails.age) || 25,

                      'experience_years': parseInt(selectedApplicantDetails.personalInfo?.yearsOfExperience) || parseInt(selectedApplicantDetails.experienceYears) || 0,

                      'education_level': educationScore,

                      'exam_score': selectedApplicantDetails.totalScore && selectedApplicantDetails.maxTotalScore ? Math.round((selectedApplicantDetails.totalScore / selectedApplicantDetails.maxTotalScore) * 100) : 0,

                      'location': (selectedApplicantDetails.personalInfo?.city || selectedApplicantDetails.city || selectedApplicantDetails.personalInfo?.province || selectedApplicantDetails.province || selectedApplicantDetails.personalInfo?.address || selectedApplicantDetails.address || selectedApplicantDetails.personalInfo?.location || selectedApplicantDetails.location) ? 1 : 0

                    };

                    
                    
                    const calculationSteps = Object.entries(featureWeights).map(([feature, weight]) => {

                      const value = attributeMapping[feature] || 0;

                      const contribution = value * weight;

                      return `${formatFeatureName(feature)}: ${value} × ${weight.toFixed(3)} = ${contribution.toFixed(2)}`;

                    });

                    
                    
                    const manualTotal = Object.entries(featureWeights).reduce((sum, [feature, weight]) => {

                      const value = attributeMapping[feature] || 0;

                      return sum + (value * weight);

                    }, 0);



                    return (

                      <div style={{marginTop:'20px', padding:'16px', backgroundColor:'#f8f9fa', borderRadius:'8px'}}>

                        <div style={{display:'flex', flexDirection:'column', gap:'8px', fontSize:'14px'}}>

                      <div style={{marginTop:'8px', paddingTop:'8px', borderTop:'1px solid #ddd'}}>

                            <strong>Total Points: {manualTotal.toFixed(2)}</strong>

                          </div>

                          <div style={{padding:'8px 12px', backgroundColor:'#fff3cd', border:'1px solid #ffeaa7', borderRadius:'6px', color:'#856404', fontSize:'12px'}}>
                            <strong>Note:</strong> XGBoost models use advanced tree-based algorithms that may include bias terms, feature scaling/normalization, and non-linear transformations beyond simple linear combinations shown in the breakdown.
                          </div>

                        </div>

                      </div>

                    );

                  })()}

                </div>

              ) : (

                <div>No applicant details found.</div>

              )}

            </div>

            <div className="modal-actions">

              <button className="btn btn-secondary" onClick={handleCloseApplicantDetailsModal}>

                Close

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Feature Weights Modal */}

      {showWeightsModal && (

        <div className="modal-overlay" onClick={() => setShowWeightsModal(false)}>

          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{width:'800px', maxHeight:'90vh', overflow:'auto'}}>

            <div className="modal-header">

              <h2>Feature Weights & Score Breakdown</h2>

              <button className="close-modal-btn" onClick={() => setShowWeightsModal(false)}>✕</button>

            </div>

            <div className="modal-body">

              <p style={{marginBottom:'20px', color:'#666'}}>

                Feature importance and individual score contributions for {selectedJobFilter || 'all'} positions

              </p>

              
              
              {/* Feature Weights Section */}

              <div style={{marginBottom:'30px'}}>

                <h3 style={{marginBottom:'16px', color:'#333'}}>Model Feature Weights</h3>

                {Object.keys(featureWeights).length === 0 ? (

                  <div style={{textAlign:'center', padding:'40px', color:'#999'}}>

                    No feature weights available. Please train the model first.

                  </div>

                ) : (

                  <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>

                    {Object.entries(featureWeights)

                      .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))

                      .map(([feature, weight]) => {

                        const percentage = (Math.abs(weight) * 100).toFixed(1);

                        const displayName = formatFeatureName(feature);

                        
                        
                        return (

                          <div key={feature} style={{display:'flex', alignItems:'center', gap:'12px'}}>

                            <div style={{minWidth:'140px', fontWeight:'500'}}>{displayName}</div>

                            <div style={{flex:1, height:'16px', backgroundColor:'#f0f0f0', borderRadius:'8px', overflow:'hidden'}}>

                              <div 

                                style={{

                                  height:'100%', 

                                  width:`${percentage}%`, 

                                  backgroundColor: weight >= 0 ? '#10b981' : '#ef4444',

                                  borderRadius:'8px',

                                  transition:'width 0.3s ease'

                                }}

                              />

                            </div>

                            <div style={{minWidth:'60px', textAlign:'right', fontWeight:'600', color: weight >= 0 ? '#10b981' : '#ef4444'}}>

                              {weight >= 0 ? '+' : ''}{weight.toFixed(3)}

                            </div>

                          </div>

                        );

                      })

                    }

                  </div>

                )}

              </div>



              {/* Individual Applicant Breakdowns */}

              {Object.keys(featureWeights).length > 0 && (

                <div>

                  <h3 style={{marginBottom:'16px', color:'#333'}}>Individual Score Breakdowns</h3>

                  <div style={{display:'flex', flexDirection:'column', gap:'20px', maxHeight:'400px', overflow:'auto'}}>

                    {applicantRankings.slice(0, 5).map((applicant, index) => {

                      const breakdown = calculateScoreBreakdown(applicant);

                      if (!breakdown) return null;

                      
                      
                      return (

                        <div key={applicant.id} style={{border:'1px solid #e5e7eb', borderRadius:'8px', padding:'16px'}}>

                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>

                            <div>

                              <h4 style={{margin:0, color:'#1f2937'}}>{applicant.name}</h4>

                              <p style={{margin:0, fontSize:'12px', color:'#6b7280'}}>{applicant.position}</p>

                            </div>

                            <div style={{textAlign:'right'}}>

                              <div style={{fontSize:'18px', fontWeight:'bold', color:'#1f2937'}}>

                                {applicant.score ? applicant.score.toFixed(2) : '0.00'}

                              </div>

                              <div style={{fontSize:'12px', color:'#6b7280'}}>Final Score</div>

                            </div>

                          </div>

                          
                          
                          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>

                            {Object.entries(breakdown.breakdown).map(([feature, data]) => (

                              <div key={feature} style={{display:'flex', flexDirection:'column', gap:'4px'}}>

                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>

                                  <span style={{fontSize:'12px', fontWeight:'500'}}>{formatFeatureName(feature)}</span>

                                  <span style={{fontSize:'12px', color:'#6b7280'}}>{data.value}</span>

                                </div>

                                <div style={{height:'6px', backgroundColor:'#f3f4f6', borderRadius:'3px', overflow:'hidden'}}>

                                  <div 

                                    style={{

                                      height:'100%',

                                      width:`${Math.min(data.percentage, 100)}%`,

                                      backgroundColor: data.contribution >= 0 ? '#3b82f6' : '#ef4444',

                                      borderRadius:'3px'

                                    }}

                                  />

                                </div>

                                <div style={{fontSize:'10px', color:'#9ca3af'}}>

                                  Weight: {data.weight.toFixed(3)} | Contribution: {data.contribution.toFixed(2)}

                                </div>

                              </div>

                            ))}

                          </div>

                        </div>

                      );

                    })}

                  </div>
                  
                  

                  

                </div>

              )}

              
              
              <div style={{marginTop:'20px', padding:'12px', backgroundColor:'#f8f9fa', borderRadius:'8px', fontSize:'12px', color:'#666'}}>

                <strong>How to read this:</strong><br/>

                • <strong>Feature Weights:</strong> Show how much each attribute influences the final score<br/>

                • <strong>Individual Breakdowns:</strong> Show how each applicant's attributes contributed to their score<br/>

                • <strong>Green bars:</strong> Positive contribution | <strong>Red bars:</strong> Negative contribution

              </div>

            </div>

            <div className="modal-actions">

              <button className="btn btn-secondary" onClick={() => setShowWeightsModal(false)}>

                Close

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Decision Modal (Hired / Rejected) */}

      {showDecisionModal && (

        <div className="modal-overlay decision-overlay" onClick={closeDecisionModal}>

          <div className="modal-content decision-modal" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">

              <h2>Set Application Status</h2>

              <button className="close-modal-btn" onClick={closeDecisionModal}>✕</button>

            </div>

            <div className="modal-body">

              <div className="decision-meta">

                {selectedApplicantForDecision?.name || 'Applicant'} • {selectedApplicantForDecision?.position || ''}

              </div>

              <div className="form-row">

                <label>REMARKS</label>

                <textarea 

                  placeholder="Add a note for this decision"

                  value={decisionMessage}

                  onChange={(e) => setDecisionMessage(e.target.value)}

                  rows="3"

                />

              </div>

              <div className="modal-actions decision-actions">

                <button className="um-action-link edit" onClick={handleMarkHired}>

                  <i className="fas fa-check"></i>

                  HIRE

                </button>

                <button className="um-action-link delete" onClick={handleMarkRejectedInModal}>

                  <i className="fas fa-times"></i>

                  REJECT

                </button>

              </div>

            </div>

          </div>

        </div>

      )}



      {/* Remarks Modal (read-only) */}

      {showRemarksModal && (

        <div className="modal-overlay decision-overlay" onClick={closeRemarksModal}>

          <div className="modal-content decision-modal" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">

              <h2>Remarks</h2>

              <button className="close-modal-btn" onClick={closeRemarksModal}>✕</button>

            </div>

            <div className="modal-body">

              <div className="decision-meta">

                {selectedApplicantForRemarks?.name || 'Applicant'} • {selectedApplicantForRemarks?.position || ''}

              </div>

              <div className="form-row">

                <label>REMARKS</label>

                {remarksLoading ? (

                  <div>Loading...</div>

                ) : (

                  (remarksMessage && remarksMessage.trim()) ? (

                    <textarea value={remarksMessage} readOnly rows="4" />

                  ) : (

                    <div>No remarks</div>

                  )

                )}

              </div>

              <div className="modal-actions decision-actions">

                <button className="um-action-link" onClick={closeRemarksModal}>

                  Close

                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



export default AdminDashboard;



