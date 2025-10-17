import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, addDoc, updateDoc, doc, onSnapshot, getDoc, limit } from 'firebase/firestore';
import { db, getAllJobs, createJob, updateJob, deleteJob, getApplicantDocuments, getApplicantDocumentContent, getApplicantsByJobId, getApplicantCountByJobId, getAllApplicantsWithJobs, uploadCSVTrainingData, loadTrainingDataFromStorage } from '../firebase';
import { seedJobs, checkJobsExist } from '../utils/seedJobs';
import { sendInterviewScheduleEmail } from '../services/emailService';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import logoImg from './pic/488604347_2675430962655935_1675751460889163498_n-removebg-preview.png';
import bellIcon from './pic/bell.png.png';
import userIcon from './pic/user.png';

import './EmployerDashboard.css';
import './JobEditModal.css';
import { loadTrainingDataFromCSV, loadCSVFile } from '../utils/csvLoader';

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('dashboard');
  const [pieHoverIndex, setPieHoverIndex] = useState(null);
  
  // State for user information - initialize with localStorage data
  const [userInfo, setUserInfo] = useState(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(storedUserInfo);
        console.log('EmployerDashboard - Initializing userInfo with:', parsedUserInfo);
        return parsedUserInfo;
      } catch (error) {
        console.error('Error parsing user info from localStorage:', error);
      }
    }
    return {
      name: 'Loading...',
      email: '',
      role: 'employer',
      photoURL: null
    };
  });
  
  
  // State for Firebase data
  const [recentApplicants, setRecentApplicants] = useState([]);
  const [applicantRankings, setApplicantRankings] = useState([]);
  const [allApplicants, setAllApplicants] = useState([]); // Store all applicants for filtering
  
  // Profile dropdown state
  const [showDropdown, setShowDropdown] = useState(false);
  // Notification state for new applicants (mirror AdminDashboard behavior)
  const [newApplicantsCount, setNewApplicantsCount] = useState(0);
  const [currentApplicantsCount, setCurrentApplicantsCount] = useState(0);
  const initialApplicantCountRef = useRef(parseInt(localStorage.getItem('employer_lastApplicantCount') || '0', 10));
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [newApplicants, setNewApplicants] = useState([]);
  const [notificationApplicants, setNotificationApplicants] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [kpiData, setKpiData] = useState({
    totalJobPosts: 0,
    totalApplicants: 0,
    qualifiedCandidates: 0
  });
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedJobFilter, setSelectedJobFilter] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [openRoleMenuFor, setOpenRoleMenuFor] = useState(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');

  // State for job management
  const [showUpdateJobForm, setShowUpdateJobForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobApplicantCounts, setJobApplicantCounts] = useState({});

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
  // Candidate Status list built from decisions collection
  const [candidateStatusApplicants, setCandidateStatusApplicants] = useState([]);
  const [hiringAnalytics, setHiringAnalytics] = useState({});
  // State for hiring statistics in analytics chart
  const [hiringStats, setHiringStats] = useState({});

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



  // Date/time utility functions for schedule modal
  const pad2 = (n) => String(n).padStart(2, '0');
  const formatDateLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const getTodayStr = () => formatDateLocal(new Date());
  const parseDateLocal = (dateStr) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    } catch { return null; }
  };

  const isSunday = (dateStr) => {
    try { const d = parseDateLocal(dateStr); return d ? d.getDay() === 0 : false; } catch { return false; }
  };

  const normalizeDate = (dateStr) => {
    if (!dateStr) return getTodayStr();
    const d = parseDateLocal(dateStr);
    if (!d) return getTodayStr();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return getTodayStr();
    return formatDateLocal(d);
  };

  const clampTimeToWindow = (timeStr) => {
    if (!timeStr) return '08:00';
    const [h, m] = timeStr.split(':').map(Number);
    const hour = Math.max(8, Math.min(17, h));
    const minute = Math.max(0, Math.min(59, m));
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hour)}:${pad(minute)}`;
  };

  const roundUpToNextQuarter = (date) => {
    const minutes = date.getMinutes();
    const nextQuarter = Math.ceil(minutes / 15) * 15;
    if (nextQuarter >= 60) {
      date.setHours(date.getHours() + 1);
      date.setMinutes(0);
    } else {
      date.setMinutes(nextQuarter);
    }
    return date;
  };

  const getNextValidDateStr = () => {
    const today = new Date();
    let candidate = new Date(today);
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = candidate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        return formatDateLocal(candidate);
      }
      candidate.setDate(candidate.getDate() + 1);
    }
    return formatDateLocal(today);
  };

  const getNextAvailableTime = (dateStr) => {
    const normalized = normalizeDate(dateStr);
    const today = getTodayStr();
    const now = new Date();
    if (normalized === today) {
      const nextTime = roundUpToNextQuarter(now);
      const hour = nextTime.getHours();
      if (hour < 8) return '08:00';
      if (hour > 17) return '08:00';
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(hour)}:${pad(nextTime.getMinutes())}`;
    }
    return '08:00';
  };

  const handleDateInputChange = (value) => {
    const normalized = normalizeDate(value);
    setScheduleForm(prev => ({ ...prev, date: normalized }));
    
    let notice = '';
    if (value !== normalized) {
      if (isSunday(value)) notice = 'Sundays are not available. Using next available date.';
      else notice = 'Past dates are not allowed. Using today.';
    }
    // If same-day, ensure time isn't in the past
    let nextTime = scheduleForm.time;
    if (normalized === getTodayStr()) {
      const nowAdjusted = getNextAvailableTime(normalized);
      // If chosen time earlier than allowed for today, bump it
      if (scheduleForm.time && scheduleForm.time < nowAdjusted) {
        nextTime = nowAdjusted;
        notice = notice ? `${notice} Time adjusted to next available slot.` : 'Time adjusted to next available slot.';
      }
    }
    setScheduleForm(prev => ({ ...prev, time: nextTime }));
    setScheduleNotice(notice);
  };

  const handleTimeInputChange = (value) => {
    const clamped = clampTimeToWindow(value);
    setScheduleForm(prev => ({ ...prev, time: clamped }));
    if (value !== clamped) {
      setScheduleNotice('Time must be between 8:00 AM and 5:00 PM.');
    } else {
      setScheduleNotice('');
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

  // Reconstruct a File from stored document
  const reconstructFileFromDoc = (fullDoc) => {
    const mimeType = fullDoc.fileType || 'application/octet-stream';
    let blob;
    if (fullDoc.fileContentType === 'base64') {
      blob = base64ToBlob(fullDoc.fileContent, mimeType);
    } else {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(fullDoc.fileContent || '');
      blob = new Blob([bytes], { type: mimeType });
    }
    const name = fullDoc.originalName || fullDoc.fileName || 'document';
    return new File([blob], name, { type: mimeType });
  };

  console.log('EmployerDashboard component rendering');

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
  
  useEffect(() => {
    console.log('EmployerDashboard useEffect running');
    
    // Check if user is authenticated as employer
    if (userInfo.role !== 'employer') {
      console.log('User is not employer, redirecting to login');
      navigate('/login');
      return;
    } else {
      console.log('Employer authenticated, staying on dashboard');
    }
    
    console.log('EmployerDashboard - User photoURL:', userInfo.photoURL);
    fetchDashboardData();
    fetchJobs();
    
    // Load training data from Firestore on dashboard startup
    console.log('Employer dashboard loaded. Loading training data from Firestore...');
    
    // Load training data from Firestore
    loadTrainingDataFromStorage('employer').then(data => {
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

  // Default Candidate Status filter to "For Interview" like Admin
  useEffect(() => {
    if (currentView === 'candidate-status' && !selectedRoleFilter) {
      setSelectedRoleFilter('For Interview');
    }
  }, [currentView, selectedRoleFilter]);

  // Real-time listener for new applicants
  useEffect(() => {
    let unsubscribe = null;
    
    const setupApplicantListener = async () => {
      try {
        // Listen for changes in users collection where role is 'applicant'
        const applicantsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'applicant')
        );
        
        unsubscribe = onSnapshot(
          applicantsQuery,
          async (snapshot) => {
            console.log('Applicants collection changed, updating dashboard...');
            
            // Get all applicants with their selected jobs
            const applicantsWithJobs = await getAllApplicantsWithJobs();
            
            // Also get all users with role 'applicant' to show new signups immediately
            const allApplicantsQuery = query(
              collection(db, 'users'),
              where('role', '==', 'applicant')
            );
            const allApplicantsSnapshot = await getDocs(allApplicantsQuery);
            const allApplicantUsers = [];
            for (const docSnap of allApplicantsSnapshot.docs) {
              const data = docSnap.data();
              
              // Check for position in multiple places
              let position = 'No Position Selected'; // Default for new signups
              let applicantInfoData = null;
              let hasSelectedJob = false;
              
              try {
                const applicantInfoRef = doc(db, 'applicantInfo', docSnap.id);
                const applicantInfoSnap = await getDoc(applicantInfoRef);
                if (applicantInfoSnap.exists()) {
                  applicantInfoData = applicantInfoSnap.data();
                  
                  // Check for selected job in applicantInfo
                  if (applicantInfoData.selectedJob) {
                    position = applicantInfoData.selectedJob.title || applicantInfoData.selectedJob.jobTitle || 'Position Selected';
                    hasSelectedJob = true;
                  } else if (applicantInfoData.selectedJobs && applicantInfoData.selectedJobs.length > 0) {
                    const lastJob = applicantInfoData.selectedJobs[applicantInfoData.selectedJobs.length - 1];
                    position = lastJob.title || lastJob.jobTitle || 'Position Selected';
                    hasSelectedJob = true;
                  }
                }
              } catch (error) {
                console.warn('Error fetching applicant info for user:', docSnap.id, error);
              }
              
              // Check users collection for selectedJobTitle as fallback
              if (!hasSelectedJob && data.selectedJobTitle) {
                position = data.selectedJobTitle;
                hasSelectedJob = true;
              }
              
              allApplicantUsers.push({
                id: docSnap.id,
                name: [applicantInfoData?.firstName, applicantInfoData?.middleName, applicantInfoData?.lastName, applicantInfoData?.suffix].filter(Boolean).join(' ') || 
                      [applicantInfoData?.personalInfo?.firstName, applicantInfoData?.personalInfo?.middleName, applicantInfoData?.personalInfo?.lastName, applicantInfoData?.personalInfo?.suffix].filter(Boolean).join(' ') || 
                      data.displayName || data.name || 'Unknown',
                position: position,
                dateApplied: data.lastJobSelectedAt ? new Date(data.lastJobSelectedAt.toDate()).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : (data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'),
                assessment: (() => {
                  try {
                    if (applicantInfoData?.totalScore && applicantInfoData?.maxTotalScore) {
                      return Math.round((applicantInfoData.totalScore / applicantInfoData.maxTotalScore) * 100);
                    }
                    if (typeof data?.assessmentScore === 'number') {
                      return data.assessmentScore;
                    }
                  } catch {}
                  return 0;
                })(),
                status: (() => {
                  const pct = (() => {
                    try {
                      if (applicantInfoData?.totalScore && applicantInfoData?.maxTotalScore) {
                        return Math.round((applicantInfoData.totalScore / applicantInfoData.maxTotalScore) * 100);
                      }
                      if (typeof data?.assessmentScore === 'number') {
                        return data.assessmentScore;
                      }
                    } catch {}
                    return 0;
                  })();
                  if (!hasSelectedJob) return 'New Signup';
                  return pct >= 70 ? 'Passed' : 'Applied';
                })(),
                email: data.email || '',
                phone: data.phoneNumber || '',
                createdAt: data.lastJobSelectedAt || data.createdAt,
                applicationStatus: hasSelectedJob ? 'applied' : 'new'
              });
            }
            
            // Transform applicants data
            const employees = applicantsWithJobs.map(applicant => {
              const selectedJob = applicant.selectedJob;
              const personalInfo = applicant.personalInfo || {};
              
              return {
                id: applicant.id,
                name: [applicant.firstName, applicant.middleName, applicant.lastName, applicant.suffix].filter(Boolean).join(' ') || 
                      [personalInfo.firstName, personalInfo.middleName, personalInfo.lastName, personalInfo.suffix].filter(Boolean).join(' ') || 'Unknown',
                position: selectedJob?.title || selectedJob?.jobTitle || 'Not specified',
                dateApplied: applicant.lastJobSelectedAt ? new Date(applicant.lastJobSelectedAt.toDate()).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown',
                assessment: applicant.totalScore && applicant.maxTotalScore ? 
                  Math.round((applicant.totalScore / applicant.maxTotalScore) * 100) : 0,
                exam: applicant.totalScore && applicant.maxTotalScore ? 
                  Math.round((applicant.totalScore / applicant.maxTotalScore) * 100) : 0,
                status: (applicant.totalScore && applicant.maxTotalScore ? 
                  Math.round((applicant.totalScore / applicant.maxTotalScore) * 100) : 0) >= 70 ? 'Passed' : 'Failed',
                email: applicant.email || personalInfo.email || '',
                phone: applicant.phoneNumber || personalInfo.phoneNumber || '',
                experience: applicant.experience || 0,
                experienceYears: personalInfo.yearsOfExperience || applicant.yearsOfExperience || '',
                age: personalInfo.age || applicant.age || '',
                educationalAttainment: personalInfo.educationalAttainment || applicant.educationalAttainment || '',
                interview: applicant.interviewScore || 0,
                exam: applicant.totalScore && applicant.maxTotalScore ? 
                  Math.round((applicant.totalScore / applicant.maxTotalScore) * 100) : 0,
                createdAt: applicant.lastJobSelectedAt,
                selectedJobId: selectedJob?.id || selectedJob?.jobId,
                applicationStatus: applicant.applicationStatus || 'pending'
              };
            });
            
            // Combine employees with job selections and new applicants without jobs
            const allApplicantsData = [...employees, ...allApplicantUsers.filter(user => 
              !employees.some(emp => emp.id === user.id)
            )];
            
            // Update KPIs
            const totalApplicants = allApplicantsData.length;
            const qualifiedCandidates = allApplicantsData.filter(emp => emp.assessment >= 70).length;
            
            setKpiData(prev => ({
              ...prev,
              totalApplicants: totalApplicants,
              qualifiedCandidates: qualifiedCandidates
            }));
            
            // Update recent applicants
            const sortedByCreationTime = allApplicantsData.sort((a, b) => {
              if (!a.createdAt && !b.createdAt) return 0;
              if (!a.createdAt) return 1;
              if (!b.createdAt) return -1;
              
              const dateA = a.createdAt.toDate();
              const dateB = b.createdAt.toDate();
              return dateB - dateA;
            });
            
            setRecentApplicants(sortedByCreationTime.slice(0, 4));
            setNotificationApplicants(sortedByCreationTime);
            
            // Update notification count
            setCurrentApplicantsCount(totalApplicants);
            const previousCount = Number.isFinite(initialApplicantCountRef.current) ? initialApplicantCountRef.current : 0;
            const deltaNewApplicants = Math.max(totalApplicants - previousCount, 0);
            setNewApplicantsCount(deltaNewApplicants);
            const newlyAdded = deltaNewApplicants > 0 ? sortedByCreationTime.slice(0, deltaNewApplicants) : [];
            setNewApplicants(newlyAdded);
            
            // Sort applicants by assessment score
            const sortedEmployees = employees.sort((a, b) => (b.assessment || 0) - (a.assessment || 0));
            setAllApplicants(sortedEmployees);
            setApplicantRankings(sortedEmployees.slice(0, 5));
          },
          (error) => {
            console.error('Applicants listener error:', error);
          }
        );
      } catch (error) {
        console.error('Error setting up applicant listener:', error);
      }
    };
    
    setupApplicantListener();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    console.log('Jobs state updated:', jobs);
  }, [jobs]);

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

  // Fetch hiring statistics for analytics chart
  useEffect(() => {
    const fetchHiringData = async () => {
      try {
        const decisionsSnap = await getDocs(collection(db, 'decisions'));
        const stats = {};
        
        decisionsSnap.forEach((docSnap) => {
          const decision = docSnap.data();
          const position = decision.position || 'Unknown';
          const status = (decision.decision || '').toLowerCase();
          
          if (!stats[position]) {
            stats[position] = { hired: 0, notHired: 0 };
          }
          
          if (status === 'hired') {
            stats[position].hired++;
          } else if (status === 'rejected') {
            stats[position].notHired++;
          }
        });
        
        setHiringStats(stats);
      } catch (error) {
        console.error('Error fetching hiring data:', error);
      }
    };
    
    fetchHiringData();
  }, []);

  const fetchJobs = async () => {
    try {
      setJobsLoading(true);
      console.log('Fetching jobs from Firebase...');
      
      const jobsData = await getAllJobs();
      console.log('Jobs fetched from Firebase:', jobsData);
      
      // Transform Firebase data to match the expected format
      const transformedJobs = jobsData.map(job => ({
        id: job.id,
        title: job.title || '',
        description: job.description || '',
        location: job.location || '',
        salary: job.salary || '',
        employmentType: job.employmentType || 'full-time',
        experienceLevel: job.experienceLevel || 'mid-level',
        yearsOfExperience: job.yearsOfExperience || '',
        requirements: job.requirements || '',
        benefits: job.benefits || '',
        applicationStartDate: job.applicationStartDate || '',
        applicationEndDate: job.applicationEndDate || '',
        postedDate: job.createdAt ? new Date(job.createdAt.toDate()).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: job.status || 'active'
      }));
      
      setJobs(transformedJobs);
      console.log('Jobs transformed and set:', transformedJobs);
      
      // Fetch applicant counts for each job
      const applicantCounts = {};
      for (const job of transformedJobs) {
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
      
    } catch (error) {
      console.error('Error fetching jobs from Firebase:', error);
      // Set empty array on error
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleSeedJobs = async () => {
    try {
      setJobsLoading(true);
      console.log('Seeding jobs...');
      
      await seedJobs();
      // Refresh jobs after seeding
      await fetchJobs();
      
      await Swal.fire({ icon: 'success', title: 'Seeded', text: 'Sample jobs have been added to Firebase!' });
    } catch (error) {
      console.error('Error seeding jobs:', error);
      await Swal.fire({ icon: 'error', title: 'Seeding failed', text: `Error seeding jobs: ${error.message}` });
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching employer dashboard data...');
      
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
        
        allApplicantsData.push({
          id: docSnap.id,
          name: [applicantInfoData?.firstName, applicantInfoData?.middleName, applicantInfoData?.lastName, applicantInfoData?.suffix].filter(Boolean).join(' ') || 
                [personalInfo.firstName, personalInfo.middleName, personalInfo.lastName, personalInfo.suffix].filter(Boolean).join(' ') || 
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
          exam: applicantInfoData?.totalScore && applicantInfoData?.maxTotalScore ? 
            Math.round((applicantInfoData.totalScore / applicantInfoData.maxTotalScore) * 100) : 0,
          status: hasSelectedJob ? ((applicantInfoData?.totalScore && applicantInfoData?.maxTotalScore ? 
            Math.round((applicantInfoData.totalScore / applicantInfoData.maxTotalScore) * 100) : 0) >= 70 ? 'Passed' : 'Applied') : 'New Signup',
          email: userData.email || personalInfo.email || '',
          phone: userData.phoneNumber || personalInfo.phoneNumber || '',
          address: [personalInfo.city, personalInfo.province].filter(Boolean).join(', ') || '',
          createdAt: applicantInfoData?.lastJobSelectedAt || userData.createdAt,
          applicationStatus: hasSelectedJob ? 'applied' : 'new',
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
      
      // Sort applicants by assessment score
      const applicantsWithJobs = allApplicantsData.filter(applicant => applicant.applicationStatus === 'applied');
      const sortedApplicants = applicantsWithJobs.sort((a, b) => (b.assessment || 0) - (a.assessment || 0));
      
      console.log('Sorted applicants:', sortedApplicants);
      setAllApplicants(sortedApplicants); // Store all applicants for filtering
      setApplicantRankings(sortedApplicants.slice(0, 5)); // Show top 5 for employer dashboard

      // Build Candidate Status list from decisions collection only (mirror Admin)
      try {
        const decisionsSnap = await getDocs(collection(db, 'decisions'));
        const latestPerApplicant = {};
        const hiringStats = {};
        
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
        
        // Calculate hiring analytics by job category
        Object.values(latestPerApplicant).forEach(decision => {
          const position = decision.position || 'Unknown';
          const status = (decision.decision || '').toLowerCase();
          
          if (!hiringStats[position]) {
            hiringStats[position] = { hired: 0, notHired: 0 };
          }
          
          if (status === 'hired') {
            hiringStats[position].hired++;
          } else if (status === 'rejected') {
            hiringStats[position].notHired++;
          }
        });
        
        setHiringAnalytics(hiringStats);
        
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
        setHiringAnalytics({});
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback to sample data if Firebase fails
      setRecentApplicants([
        {
          id: 'fallback-1',
          name: 'Lebron James',
          position: 'Helper',
          dateApplied: 'March 3, 2025',
          assessment: 97,
          status: 'Passed'
        },
        {
          id: 'fallback-2',
          name: 'Joel Malupiton',
          position: 'Painter',
          dateApplied: 'March 3, 2025',
          assessment: 54,
          status: 'Failed'
        },
        {
          id: 'fallback-3',
          name: 'Kyrie Irving',
          position: 'Mason',
          dateApplied: 'March 3, 2025',
          assessment: 15,
          status: 'Failed'
        },
        {
          id: 'fallback-4',
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
        },
        {
          id: 'fallback-5',
          name: 'Jay',
          position: 'Pipe Filter',
          score: 56,
          status: 'Failed'
        }
      ]);
      
      setKpiData({
        totalJobPosts: jobs.length,
        totalApplicants: 854,
        qualifiedCandidates: 128
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isEmployer');
    localStorage.removeItem('userInfo');
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


  const handleViewChange = (view) => {
    console.log('Changing view to:', view);
    setCurrentView(view);
    if (view !== 'job-board') {
      setShowUpdateJobForm(false);
      setSelectedJob(null);
      setEditingJob(null);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
    fetchJobs();
  };

  const handleRoleFilterChange = (role) => {
    setSelectedRoleFilter(role);
  };

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

    // Filter by job position
    if (jobFilter && jobFilter !== '') {
      filtered = filtered.filter(applicant => 
        applicant.position.toLowerCase().includes(jobFilter.toLowerCase()) ||
        (applicant.selectedJobId && applicant.selectedJobId === jobFilter)
      );
    }

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
      await Swal.fire({ icon: 'info', title: 'No file selected', text: 'Please select a CSV file first' });
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
        const result = await uploadCSVTrainingData(selectedCSVFile, 'employer');
        console.log(`CSV uploaded to Firestore successfully: ${result.recordCount} records`);
        
        // Reload training data from Firestore to ensure we have the latest data
        try {
          const firestoreData = await loadTrainingDataFromStorage('employer');
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
          await Swal.fire({ icon: 'success', title: 'Training data loaded', text: `Loaded ${data.length} records. Trained for ${result.trades?.length || 0} trades.` });
        } else {
          await Swal.fire({ icon: 'success', title: 'Training data loaded', text: `Loaded ${data.length} records (training service unavailable)` });
        }
      } catch (mlError) {
        console.warn('XGBoost training failed:', mlError);
        await Swal.fire({ icon: 'success', title: 'Training data loaded', text: `Loaded ${data.length} records (ML training service unavailable)` });
      }
      
    } catch (error) {
      console.error('Error processing CSV:', error);
      await Swal.fire({ icon: 'error', title: 'CSV error', text: 'Error processing CSV file: ' + error.message });
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
      await Swal.fire({ icon: 'error', title: 'Load failed', text: 'Failed to load applicant details.' });
    } finally {
      setApplicantDetailsLoading(false);
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

  const handleMarkHired = async () => {
    try {
      if (!selectedApplicantForDecision?.id) return;
      await updateDoc(doc(db, 'users', selectedApplicantForDecision.id), {
        applicationStatus: 'hired',
        hiredAt: new Date(),
        decisionMessage: (decisionMessage || '').toString()
      });
      setAllApplicants((prev) => prev.map((a) => a.id === selectedApplicantForDecision.id ? { ...a, applicationStatus: 'hired' } : a));
      setApplicantRankings((prev) => prev.map((a) => a.id === selectedApplicantForDecision.id ? { ...a, applicationStatus: 'hired' } : a));
      await Swal.fire({ icon: 'success', title: 'Hired', text: `${selectedApplicantForDecision.name || 'Applicant'} has been marked as hired.` });
      closeDecisionModal();
    } catch (err) {
      console.error('Failed to mark hired:', err);
      await Swal.fire({ icon: 'error', title: 'Action failed', text: 'Failed to mark as hired. Please try again.' });
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
      setAllApplicants((prev) => prev.map((a) => a.id === selectedApplicantForDecision.id ? { ...a, applicationStatus: 'rejected' } : a));
      setApplicantRankings((prev) => prev.map((a) => a.id === selectedApplicantForDecision.id ? { ...a, applicationStatus: 'rejected' } : a));
      await Swal.fire({ icon: 'success', title: 'Rejected', text: `${selectedApplicantForDecision.name || 'Applicant'} has been marked as rejected.` });
      closeDecisionModal();
    } catch (err) {
      console.error('Failed to mark rejected:', err);
      await Swal.fire({ icon: 'error', title: 'Action failed', text: 'Failed to mark as rejected. Please try again.' });
    }
  };

  // Open remarks modal to view existing decision
  const openRemarksModal = async (applicant) => {
    setSelectedApplicantForRemarks(applicant);
    setRemarksLoading(true);
    setShowRemarksModal(true);
    
    try {
      // Fetch decisions for applicant and sort client-side to avoid composite index requirement
      const decisionsQueryRef = query(
        collection(db, 'decisions'),
        where('applicantId', '==', applicant.id)
      );
      const decisionsSnap = await getDocs(decisionsQueryRef);

      if (!decisionsSnap.empty) {
        let latest = null;
        decisionsSnap.forEach((docSnap) => {
          const data = docSnap.data() || {};
          let createdAt = data.createdAt;
          try {
            if (typeof createdAt?.toDate === 'function') createdAt = createdAt.toDate();
            else if (typeof createdAt?.seconds === 'number') createdAt = new Date(createdAt.seconds * 1000);
          } catch {}
        
          if (!latest || (createdAt && latest.createdAt && createdAt > latest.createdAt)) {
            latest = { ...data, createdAt: createdAt || new Date(0) };
          }
        });

        if (latest) {
          setRemarksMessage(latest.message || 'No remarks provided.');
        } else {
          setRemarksMessage('No remarks provided.');
        }
      } else {
        // Fallback to user document
        const userDoc = await getDoc(doc(db, 'users', applicant.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRemarksMessage(userData.decisionMessage || 'No remarks provided.');
        } else {
          setRemarksMessage('No remarks found.');
        }
      }
    } catch (error) {
      console.error('Error fetching remarks:', error);
      setRemarksMessage('Error loading remarks.');
    } finally {
      setRemarksLoading(false);
    }
  };

  const closeRemarksModal = () => {
    setShowRemarksModal(false);
    setSelectedApplicantForRemarks(null);
    setRemarksMessage('');
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
    const attributeMapping = {
      'age': calculatedAge || parseInt(applicant.age) || parseInt(applicant.personalInfo?.age) || 25,
      'experience_years': parseInt(applicant.experienceYears) || parseInt(applicant.personalInfo?.yearsOfExperience) || 0,
      'education_level': getEducationScore(applicant.educationalAttainment || applicant.personalInfo?.educationalAttainment || 'High School'),
      'exam_score': (applicant.totalScore && applicant.maxTotalScore)
        ? Math.round((applicant.totalScore / applicant.maxTotalScore) * 100)
        : (applicant.exam || applicant.assessment || 0),
      'interview_score': applicant.interview || 0
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

  // Format feature name for display
  const formatFeatureName = (feature) => {
    const nameMapping = {
      'age': 'Age',
      'experience_years': 'Years of Experience',
      'education_level': 'Education Level',
      'exam_score': 'Exam Score',
      'interview_score': 'Interview Score'
    };
    return nameMapping[feature] || feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Open documents modal for a given applicant
  const handleOpenApplicantDocuments = async (applicant) => {
    try {
      setSelectedApplicantForDocs(applicant);
      setShowDocsModal(true);
      setDocsLoading(true);
      const docs = await getApplicantDocuments(applicant.id);
      setApplicantDocs(docs);
    } catch (err) {
      console.error('Failed to load applicant documents:', err);
      await Swal.fire({ icon: 'error', title: 'Load failed', text: 'Failed to load documents. Please try again.' });
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
      await Swal.fire({ icon: 'error', title: 'Open failed', text: 'Unable to open the document.' });
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

  // Schedule interview handler functions
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
      // Validate weekday (Mon-Sat) and time window (08:00-17:00), and prevent past dates/times
      const day = (parseDateLocal(date) || new Date()).getDay();
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
      
      // Parse and format date/time for display
      const dateObj = new Date(`${date}T${time}`);
      const readableDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
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

      // Reflect on user document and set applicationStatus
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

      // Log decision record regardless of email status
      try {
        await addDoc(collection(db, 'decisions'), {
          applicantId: selectedApplicantForSchedule.id,
          applicantEmail: selectedApplicantForSchedule.email || '',
          applicantName: selectedApplicantForSchedule.name || '',
          position: selectedApplicantForSchedule.position || '',
          decision: 'for_interview',
          decidedBy: (userInfo && userInfo.email) || '',
          decidedByRole: 'employer',
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

      // Also create a decision record (mirror Admin behavior)
      try {
        await addDoc(collection(db, 'decisions'), {
          applicantId: applicant.id,
          applicantEmail: applicant.email || '',
          applicantName: applicant.name || '',
          position: applicant.position || '',
          decision: 'rejected',
          decidedBy: (userInfo && userInfo.email) || '',
          decidedByRole: 'employer',
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
      
      await Swal.fire({ icon: 'success', title: 'Rejected', text: `${applicant.name} has been marked as rejected.` });
    } catch (err) {
      console.error('Failed to reject applicant:', err);
      await Swal.fire({ icon: 'error', title: 'Action failed', text: 'Failed to reject applicant. Please try again.' });
    }
  };

  // Get job positions from actual jobs data
  const getJobPositions = () => {
    const jobTitles = jobs.map(job => job.title).filter(Boolean);
    // Add some common positions if no jobs exist yet
    if (jobTitles.length === 0) {
      return [
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
    }
    return jobTitles;
  };

  // Compute count of jobs active within the current month and active today
  const getActiveJobsThisMonth = () => {
    try {
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
      const now = new Date();
      const startOfMonth = (d0) => { const d = new Date(d0.getFullYear(), d0.getMonth(), 1); d.setHours(0,0,0,0); return d; };
      const endOfMonth = (d0) => { const d = new Date(d0.getFullYear(), d0.getMonth() + 1, 0); d.setHours(23,59,59,999); return d; };
      const thisMonthStart = startOfMonth(now);
      const thisMonthEnd = endOfMonth(now);
      const today = new Date(); today.setHours(0,0,0,0);
      return jobs.filter(j => {
        const s = parseDateStr(j.applicationStartDate);
        const e = parseDateStr(j.applicationEndDate);
        const overlaps = overlapWithRange(s, e, thisMonthStart, thisMonthEnd);
        if (!overlaps) return false;
        if (s && s > today) return false; // not yet started
        if (e && e < today) return false; // already ended
        return true;
      }).length;
    } catch { return 0; }
  };

  const handleMessagesClick = async () => {
    await Swal.fire({ icon: 'info', title: 'Coming soon', text: 'Messages functionality coming soon!' });
  };

  const handleNotificationsClick = () => {
    setShowNotificationModal(prev => !prev);
  };

  const handleCloseNotificationsModal = () => {
    // Mark notifications as seen by updating the baseline
    localStorage.setItem('employer_lastApplicantCount', String(currentApplicantsCount));
    initialApplicantCountRef.current = currentApplicantsCount;
    setNewApplicantsCount(0);
    setShowNotificationModal(false);
  };

  const handleMarkNotificationsAsRead = () => {
    // Reuse same logic as closing: mark seen and close
    localStorage.setItem('employer_lastApplicantCount', String(currentApplicantsCount));
    initialApplicantCountRef.current = currentApplicantsCount;
    setNewApplicantsCount(0);
    setShowNotificationModal(false);
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
        try {
          await Swal.fire({ icon: 'info', title: 'No data', text: 'No hired or rejected applicants found.' });
        } catch {}
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
          const address = p.address || '';
          const decisionBy = dec.decidedBy || '';
          const decisionDate = (() => {
            try {
              const d = dec.__ts instanceof Date ? dec.__ts : new Date(dec.__ts);
              if (!Number.isNaN(d.getTime())) return d.toISOString();
            } catch {}
            return '';
          })();

          rows.push({ applicantId: aid, name, email, phone, city, province, address, trade, age, education, experience, skill, status, decisionBy, decisionDate });
        } catch (e) {
          console.warn('Skipping applicant due to data fetch error:', aid, e);
        }
      }

      if (rows.length === 0) {
        try {
          await Swal.fire({ icon: 'info', title: 'No matches', text: 'No matching applicants to export.' });
        } catch {}
        return;
      }

      const headers = [
        'Applicant ID',
        'Name',
        'Email',
        'Phone',
        'City',
        'Province',
        'Address',
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
          r.address,
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
        await Swal.fire({ icon: 'success', title: 'Export complete', text: 'CSV exported successfully.' });
      } catch {}
    } catch (e) {
      console.error('Failed to export CSV:', e);
      try {
        await Swal.fire({ icon: 'error', title: 'Export failed', text: 'Failed to export CSV. Please try again.' });
      } catch {}
    }
  };


  const handleExportAnalytics = async () => {
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
      
      // Add job postings data
      if (jobs.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Job Postings', 20, 30);
        doc.setFontSize(10);
        
        yPosition = 45;
        jobs.slice(0, 15).forEach((job, index) => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(`${index + 1}. ${job.title}`, 20, yPosition);
          // Location removed from export
          doc.text(`   Status: ${job.status}`, 25, yPosition + 16);
          doc.text(`   Posted: ${job.postedDate}`, 25, yPosition + 24);
          yPosition += 35;
        });
      }
      
      // Save the PDF
      const fileName = `PBS_Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      await Swal.fire({ icon: 'success', title: 'Exported', text: 'Analytics report exported successfully!' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      await Swal.fire({ icon: 'error', title: 'Export failed', text: 'Failed to export analytics report. Please try again.' });
    }
  };

  // Job management functions
  const handleUpdateJob = (job) => {
    console.log('Editing job:', job);
    setSelectedJob(job);
    setEditingJob({ ...job }); // Create a copy for editing
    setShowUpdateJobForm(true);
    setCurrentView('job-board');
  };

  const handleCloseUpdateForm = () => {
    console.log('Exiting update form, staying on current view:', currentView);
    setShowUpdateJobForm(false);
    setSelectedJob(null);
    setEditingJob(null);
  };

  const handleJobFieldChange = (field, value) => {
    console.log('Updating field:', field, 'to:', value);
    setEditingJob(prev => {
      const next = { ...prev, [field]: value };
      // Guard: ensure end date is never before start date
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
    if (!editingJob.title || !editingJob.applicationEndDate) {
      await Swal.fire({ icon: 'warning', title: 'Missing info', text: 'Please fill in Job Title and Application End Date' });
      return;
    }
    
    // Validate that end date is after start date
    if (editingJob.applicationStartDate && editingJob.applicationEndDate) {
      const startDate = new Date(editingJob.applicationStartDate);
      const endDate = new Date(editingJob.applicationEndDate);
      if (endDate <= startDate) {
        await Swal.fire({ icon: 'warning', title: 'Invalid date', text: 'Application End Date must be after Start Date' });
        return;
      }
    }
    
    // Validate that end date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(editingJob.applicationEndDate);
    endDate.setHours(0, 0, 0, 0);
    if (endDate < today) {
      await Swal.fire({ icon: 'warning', title: 'Invalid date', text: 'Application End Date cannot be in the past' });
      return;
    }
    
    try {
      setJobsLoading(true);
      console.log('Saving job:', editingJob);
      
      if (editingJob.id && editingJob.id !== null && jobs.find(j => j.id === editingJob.id)) {
        // Update existing job
        console.log('Updating existing job in Firebase');
        await updateJob(editingJob.id, {
          title: editingJob.title,
          description: editingJob.description || 'Job description will be added here.',
          // location removed
          salary: editingJob.salary || '',
          employmentType: editingJob.employmentType || 'full-time',
          experienceLevel: editingJob.experienceLevel || 'mid-level',
          yearsOfExperience: editingJob.yearsOfExperience || '',
          requirements: editingJob.requirements || '',
          benefits: editingJob.benefits || '',
          applicationStartDate: editingJob.applicationStartDate || '',
          applicationEndDate: editingJob.applicationEndDate || '',
          status: editingJob.status || 'active'
        });
        
        // Update local state
        setJobs(prevJobs => {
          const updatedJobs = prevJobs.map(job => 
            job.id === editingJob.id ? editingJob : job
          );
          return updatedJobs;
        });
        
        await Swal.fire({ icon: 'success', title: 'Updated', text: `Job "${editingJob.title}" updated successfully!` });
      } else {
        // Create new job
        console.log('Creating new job in Firebase');
        const jobData = {
          title: editingJob.title,
          description: editingJob.description || 'Job description will be added here.',
          // location removed
          salary: editingJob.salary || '',
          employmentType: editingJob.employmentType || 'full-time',
          experienceLevel: editingJob.experienceLevel || 'mid-level',
          yearsOfExperience: editingJob.yearsOfExperience || '',
          requirements: editingJob.requirements || '',
          benefits: editingJob.benefits || '',
          applicationStartDate: editingJob.applicationStartDate || '',
          applicationEndDate: editingJob.applicationEndDate || '',
          status: 'active'
        };
        
        const newJob = await createJob(jobData);
        console.log('New job created in Firebase:', newJob);
        
        // Add to local state
        setJobs(prevJobs => [...prevJobs, newJob]);
        await Swal.fire({ icon: 'success', title: 'Created', text: `New job "${editingJob.title}" created successfully!` });
      }
      
    } catch (error) {
      console.error('Error saving job:', error);
      await Swal.fire({ icon: 'error', title: 'Save failed', text: `Error saving job: ${error.message}` });
    } finally {
      setJobsLoading(false);
      handleCloseUpdateForm();
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
    if (res.isConfirmed) {
      try {
        setJobsLoading(true);
        console.log('Deleting job from Firebase:', jobId);
        
        await deleteJob(jobId);
        
        // Update local state
        setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
        await Swal.fire({ icon: 'success', title: 'Deleted', text: 'Job deleted successfully!' });
        
      } catch (error) {
        console.error('Error deleting job:', error);
        await Swal.fire({ icon: 'error', title: 'Delete failed', text: `Error deleting job: ${error.message}` });
      } finally {
        setJobsLoading(false);
      }
    }
  };

  const handleCreateNewJob = () => {
    const today = new Date();
    const defaultEndDate = new Date(today);
    defaultEndDate.setDate(today.getDate() + 30); // Default to 30 days from now
    
    const newJob = {
      id: null, // Will be set when saving
      title: '',
      description: '',
      // location removed
      salary: '',
      employmentType: 'full-time',
      experienceLevel: 'mid-level',
      yearsOfExperience: '',
      requirements: '',
      benefits: '',
      applicationStartDate: today.toISOString().split('T')[0],
      applicationEndDate: defaultEndDate.toISOString().split('T')[0],
      status: 'draft'
    };
    
    setSelectedJob(newJob);
    setEditingJob(newJob);
    setShowUpdateJobForm(true);
  };

  // XGBoost ML Ranking computation
  const runXGBoostRanking = async () => {
    if (trainingData.length === 0) {
      await Swal.fire({ icon: 'info', title: 'Training data needed', text: 'Please load training data first using the Load CSV button' });
      return;
    }
    
    setIsRunningML(true);
    
    try {
      // Train XGBoost model with training data
      const response = await fetch('http://localhost:3001/api/xgboost-train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingData })
      });
      
      if (!response.ok) {
        throw new Error('Failed to train XGBoost model');
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setFeatureWeights(result.feature_weights || {});
        setMLTrained(true);
        
        // Apply ranking to current applicants
        const rankedApplicants = await rankApplicantsWithXGBoost(allApplicants);
        setApplicantRankings(rankedApplicants);
        
        // If a job filter is active, update weights for that trade
        if (selectedJobFilter) {
          updateFeatureWeightsForTrade(selectedJobFilter);
        }
        
      await Swal.fire({ icon: 'success', title: 'Model trained', text: `XGBoost trained with ${result.training_info.training_samples} samples.` });
      } else {
        throw new Error(result.message || 'Training failed');
      }
    } catch (error) {
      console.error('XGBoost training error:', error);
      // Fallback to simple correlation-based ranking
      const correlationWeights = calculateCorrelationWeights();
      const rankedApplicants = rankWithCorrelation(allApplicants, correlationWeights);
      setApplicantRankings(rankedApplicants);
      setFeatureWeights(correlationWeights);
      setMLTrained(true);
      await Swal.fire({ icon: 'info', title: 'Fallback ranking', text: 'Using correlation-based ranking as fallback' });
    } finally {
      setIsRunningML(false);
    }
  };
  
  const rankApplicantsWithXGBoost = async (applicants) => {
    try {
      const candidateData = applicants.map(applicant => ({
        id: applicant.id,
        name: applicant.name,
        position: applicant.position,
        trade: applicant.position, // Use position as trade for XGBoost
        age: applicant.age || 30,
        education: applicant.educationalAttainment || 'bachelor',
        experience: applicant.experienceYears || applicant.experience || 0,
        skillScore: applicant.assessment || applicant.exam || 75
      }));
      
      const response = await fetch('http://localhost:3001/api/xgboost-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates: candidateData })
      });
      
      if (!response.ok) {
        throw new Error('Prediction failed');
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        return result.rankings.map(ranked => {
          const original = applicants.find(a => a.id === ranked.id);
          return {
            ...original,
            score: ranked.predicted_score,
            mlRank: ranked.rank
          };
        });
      }
      
      throw new Error(result.message || 'Prediction failed');
    } catch (error) {
      console.error('XGBoost prediction error:', error);
      return rankWithCorrelation(applicants, featureWeights);
    }
  };
  
  const calculateCorrelationWeights = () => {
    if (trainingData.length === 0) {
      return {
        age: 0.15,
        education: 0.25,
        experience: 0.35,
        skillScore: 0.25
      };
    }
    
    // Calculate correlations with hiring outcomes
    const hired = trainingData.filter(d => d.status === 'hired');
    const rejected = trainingData.filter(d => d.status === 'rejected');
    
    if (hired.length === 0 || rejected.length === 0) {
      return {
        age: 0.15,
        education: 0.25,
        experience: 0.35,
        skillScore: 0.25
      };
    }
    
    // Simple correlation calculation
    const avgHired = {
      age: hired.reduce((sum, d) => sum + (d.age || 30), 0) / hired.length,
      education: hired.reduce((sum, d) => sum + getEducationScore(d.education || 'bachelor'), 0) / hired.length,
      experience: hired.reduce((sum, d) => sum + (d.experience || 0), 0) / hired.length,
      skillScore: hired.reduce((sum, d) => sum + (d.skillScore || 75), 0) / hired.length
    };
    
    const avgRejected = {
      age: rejected.reduce((sum, d) => sum + (d.age || 30), 0) / rejected.length,
      education: rejected.reduce((sum, d) => sum + getEducationScore(d.education || 'bachelor'), 0) / rejected.length,
      experience: rejected.reduce((sum, d) => sum + (d.experience || 0), 0) / rejected.length,
      skillScore: rejected.reduce((sum, d) => sum + (d.skillScore || 75), 0) / rejected.length
    };
    
    // Calculate importance based on difference
    const diffs = {
      age: Math.abs(avgHired.age - avgRejected.age) / 50,
      education: Math.abs(avgHired.education - avgRejected.education) / 100,
      experience: Math.abs(avgHired.experience - avgRejected.experience) / 20,
      skillScore: Math.abs(avgHired.skillScore - avgRejected.skillScore) / 100
    };
    
    const totalDiff = Object.values(diffs).reduce((sum, d) => sum + d, 0);
    
    return {
      age: diffs.age / totalDiff,
      education: diffs.education / totalDiff,
      experience: diffs.experience / totalDiff,
      skillScore: diffs.skillScore / totalDiff
    };
  };
  
  const rankWithCorrelation = (applicants, weights) => {
    return applicants.map(applicant => {
      const age = applicant.age || 30;
      const education = getEducationScore(applicant.educationalAttainment || 'bachelor');
      const experience = applicant.experienceYears || applicant.experience || 0;
      const skillScore = applicant.assessment || applicant.exam || 75;
      
      const score = 0; // No fallback calculation
      
      return {
        ...applicant,
        score: Math.round(score * 10) / 10
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((applicant, index) => ({
      ...applicant,
      mlRank: index + 1
    }));
  };
  




  if (loading) {
    return (
      <div className="employer-dashboard-root">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="dashboard-content">
      {/* KPIs */}
      <div className="kpi-section">
        <div className="kpi-card">
          <div className="kpi-content">
            <h3 className="kpi-label">Total Job Posts</h3>
            <div className="kpi-number">{kpiData.totalJobPosts}</div>
            <p className="kpi-subtext">{getActiveJobsThisMonth()} active this month</p>
            <div className="kpi-change positive">+2 from last month</div>
          </div>
          <div className="kpi-icon">
            <i className="fas fa-briefcase"></i>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-content">
            <h3 className="kpi-label">Total Applicants</h3>
            <div className="kpi-number">{kpiData.totalApplicants}</div>
            <p className="kpi-subtext">4 new this week</p>
            <div className="kpi-change positive">+12% from last month</div>
          </div>
          <div className="kpi-icon">
            <i className="fas fa-users"></i>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-content">
            <h3 className="kpi-label">Pending Interviews</h3>
            <div className="kpi-number">{candidateStatusApplicants.filter(c => c.applicationStatus === 'for_interview').length}</div>
            <p className="kpi-subtext">Scheduled for interviews</p>
            <div className="kpi-change positive">+3 this week</div>
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
            <i className="fas fa-ellipsis-v"></i>
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
  );

  const renderJobBoard = () => (
    <div className="update-job-posting-content">
      <div className="job-board-section">
        <div className="create-job-section">
          <button className="create-job-btn" onClick={handleCreateNewJob}>
            Create New Job
          </button>
          {jobs.length === 0 && (
            <button className="seed-jobs-btn" onClick={handleSeedJobs} disabled={jobsLoading}>
              {jobsLoading ? 'Adding Sample Jobs...' : 'Add Sample Jobs'}
            </button>
          )}
        </div>

        <div className="job-cards-grid">
          {jobsLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="no-jobs-message">
              <p>No jobs found. Create your first job posting!</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div className="job-card" key={job.id}>
                <div className="job-card-header">
                  <div className="job-title">{job.title}</div>
                  <span className={`job-status-badge ${(() => {
                    // Determine Inactive (not yet started), Active, or Expired based on start/end dates
                    try {
                      const today = new Date(); today.setHours(0,0,0,0);
                      const start = job?.applicationStartDate;
                      if (start) {
                        const startDate = new Date(start); startDate.setHours(0,0,0,0);
                        if (startDate > today) return 'inactive';
                      }
                      const end = job?.applicationEndDate;
                      if (end) {
                        const endDate = new Date(end); endDate.setHours(0,0,0,0);
                        return endDate >= today ? 'active' : 'expired';
                      }
                      return 'active';
                    } catch { return 'active'; }
                  })()}`}>{(() => {
                    try {
                      const today = new Date(); today.setHours(0,0,0,0);
                      const start = job?.applicationStartDate;
                      if (start) {
                        const startDate = new Date(start); startDate.setHours(0,0,0,0);
                        if (startDate > today) return 'Inactive';
                      }
                      const end = job?.applicationEndDate;
                      if (end) {
                        const endDate = new Date(end); endDate.setHours(0,0,0,0);
                        return endDate >= today ? 'Active' : 'Expired';
                      }
                      return 'Active';
                    } catch { return 'Active'; }
                  })()}</span>
                </div>
                
                <div className="job-description">
                  {job.description.length > 100 
                    ? `${job.description.substring(0, 100)}...` 
                    : job.description
                  }
                </div>
                
                <div className="job-details">
                  {/* Location display removed per request */}
                  <div className="job-detail">
                    <span className="detail-icon"><i className="fas fa-calendar"></i></span>
                    <span className="detail-text">Start: {job.applicationStartDate || 'Not Set'}</span>
                  </div>
                  <div className="job-detail">
                    <span className="detail-icon">⏰</span>
                    <span className="detail-text" style={{
                      color: (() => {
                        if (!job.applicationEndDate) return '#666';
                        const today = new Date(); today.setHours(0,0,0,0);
                        const endDate = new Date(job.applicationEndDate); endDate.setHours(0,0,0,0);
                        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                        if (daysLeft < 0) return '#dc3545'; // Red for expired
                        if (daysLeft <= 7) return '#f59e0b'; // Orange for expiring soon
                        return '#666'; // Default gray
                      })()
                    }}>End: {job.applicationEndDate ? (() => {
                      const today = new Date(); today.setHours(0,0,0,0);
                      const endDate = new Date(job.applicationEndDate); endDate.setHours(0,0,0,0);
                      const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                      if (daysLeft < 0) return `${job.applicationEndDate} (Expired)`;
                      if (daysLeft === 0) return `${job.applicationEndDate} (Today)`;
                      if (daysLeft <= 7) return `${job.applicationEndDate} (${daysLeft} days left)`;
                      return job.applicationEndDate;
                    })() : 'No Expiration'}</span>
                  </div>
                </div>
                
                <div className="job-footer">
                  <div className="applicants-summary">{jobApplicantCounts[job.id] || 0} applicants</div>
                  <div className="job-actions">
                    <button 
                      className="edit-btn" 
                      onClick={() => handleUpdateJob(job)}
                      disabled={jobsLoading}
                      title="Edit Job"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDeleteJob(job.id)}
                      disabled={jobsLoading}
                      title="Delete Job"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderApplications = () => (
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
              {isRunningML ? 'Training...' : 'XGBoost'}
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
            <div className="um-th weights">Weights</div>
            <div className="um-th score">XGBoost Score</div>
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
                      <i className="fas fa-info-circle"></i>
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
                    <button className="um-action-link reject" title="Reject Applicant" onClick={() => handleRejectApplicant(applicant)}>
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
  );

  const renderProfile = () => (
    <div className="profile-content">
      <h2 className="section-title">Profile Settings</h2>
      <div className="profile-form">
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" defaultValue={userInfo.name} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" defaultValue={userInfo.email} />
        </div>
        <div className="form-group">
          <label>Role</label>
          <input type="text" defaultValue={userInfo.role} disabled />
        </div>
        <div className="form-group">
          <label>Company</label>
          <input type="text" defaultValue="PBS Engineering Company" />
        </div>
        <button className="save-btn">Save Changes</button>
      </div>
    </div>
  );

  const renderAnalytics = () => (
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
                      'Pipe Fitter': '#3B82F6',
                      'Electrical Engineer': '#F59E0B',
                      'Electrician': '#10B981',
                      'Helper': '#8B5CF6',
                      'Technician': '#FACC15',
                      'Network Technician': '#EC4899',
                      'Mason': '#06B6D4',
                      'Welder': '#EF4444',
                      'Painter': '#D97706',
                      'CCTV Technician': '#2E8B57',
                      'Electronics Engineer': '#4682B4'
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
                  const pieSlices = jobEntries.map(([position, count]) => {
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
                    return { path: pathData, color: getJobColor(position), position, count, percentage: percentage.toFixed(1), labelX, labelY };
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
                          // Simple two-line wrap for long job names
                          const maxChars = 16;
                          const words = (s.position || '').split(' ');
                          let line1 = '';
                          let line2 = '';
                          words.forEach((w) => {
                            if ((line2 ? line2.length : 0) > 0 || (line1 + (line1 ? ' ' : '') + w).length > maxChars) {
                              line2 = (line2 ? line2 + ' ' : '') + w;
                            } else {
                              line1 = (line1 ? line1 + ' ' : '') + w;
                            }
                          });
                          const lines = line2 ? [line1, line2] : [line1];
                          const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
                          const tooltipWidth = Math.max(140, Math.min(260, longest * 7 + 24));
                          const tooltipHeight = lines.length === 2 ? 48 : 34;
                          const rectX = tx - tooltipWidth / 2;
                          const rectY = ty - (lines.length === 2 ? 29 : 22);
                          return (
                            <g pointerEvents="none">
                              <rect x={rectX} y={rectY} width={tooltipWidth} height={tooltipHeight} rx={8} fill="#111827" opacity="0.9" />
                              {lines.length === 2 ? (
                                <>
                                  <text x={tx} y={ty - 8} textAnchor="middle" fontSize="12" fill="#ffffff" fontWeight="700">{lines[0]}</text>
                                  <text x={tx} y={ty + 6} textAnchor="middle" fontSize="12" fill="#ffffff" fontWeight="700">{lines[1]}</text>
                                  <text x={tx} y={ty + 22} textAnchor="middle" fontSize="12" fill="#e5e7eb">{s.percentage}%</text>
                                </>
                              ) : (
                                <>
                                  <text x={tx} y={ty - 4} textAnchor="middle" fontSize="12" fill="#ffffff" fontWeight="700">{lines[0]}</text>
                                  <text x={tx} y={ty + 12} textAnchor="middle" fontSize="12" fill="#e5e7eb">{s.percentage}%</text>
                                </>
                              )}
                            </g>
                          );
                        })()}
                        
                        {/* donut center intentionally empty to mirror Admin */}
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
                        'CCTV Technician': '#3b82f6',
                        'Electronics Engineer': '#10b981', 
                        'Painter': '#f59e0b',
                        'Network Technician': '#ef4444',
                        'Electrician': '#8b5cf6',
                        'Helper': '#f97316',
                        'Mason': '#06b6d4',
                        'Welder': '#84cc16'
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
                     const stats = {};
                     Object.entries(hiringAnalytics || {}).forEach(([pos, s]) => {
                       stats[pos] = { hired: s.hired || 0, notHired: s.notHired || 0 };
                     });
                     const nonZero = Object.values(stats).filter(s => (s.hired + s.notHired) > 0);
                     const maxTotal = Math.max(0, ...nonZero.map(s => s.hired + s.notHired));
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
                     const stats = {};
                     Object.entries(hiringAnalytics || {}).forEach(([pos, s]) => {
                       stats[pos] = { hired: s.hired || 0, notHired: s.notHired || 0 };
                     });
                     const nonZero = Object.values(stats).filter(s => (s.hired + s.notHired) > 0);
                     const maxTotal = Math.max(0, ...nonZero.map(s => s.hired + s.notHired));
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
                     const stats = {};
                     Object.entries(hiringAnalytics || {}).forEach(([pos, s]) => {
                       stats[pos] = { hired: s.hired || 0, notHired: s.notHired || 0 };
                     });
                     const entries = Object.entries(stats).filter(([, s]) => (s.hired + s.notHired) > 0);
                     if (entries.length === 0) {
                       return <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>No hiring data available</div>;
                     }
                     const maxValue = Math.max(...entries.map(([, s]) => s.hired + s.notHired));
                     return entries.map(([position, s]) => {
                       const hiredHeight = maxValue > 0 ? (s.hired / maxValue) * 180 : 0;
                       const notHiredHeight = maxValue > 0 ? (s.notHired / maxValue) * 180 : 0;
                       return (
                         <div key={position} className="bar-group" data-tooltip={`Hired: ${s.hired} | Not Hired: ${s.notHired}`}>
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
                    const totalHired = Object.values(hiringAnalytics || {}).reduce((sum, s) => sum + (s.hired || 0), 0);
                    const totalNotHired = Object.values(hiringAnalytics || {}).reduce((sum, s) => sum + (s.notHired || 0), 0);
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
  );


  return (
    <div className="employer-dashboard-root">
      {/* Sidebar */}
      <aside className="employer-dashboard-sidebar">
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
                onLoad={() => console.log('EmployerDashboard - Profile picture loaded:', userInfo.photoURL || userIcon)}
              />
            </div>
          </div>
          <div className="sidebar-brand-text">
            <h2 className="brand-title">{userInfo.name}</h2>
            <p className="brand-subtitle">{userInfo.role}</p>
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
            className={`nav-item ${currentView === 'ranked-list' ? 'active' : ''}`}
            onClick={() => handleViewChange('ranked-list')}
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
            className={`nav-item ${currentView === 'job-board' ? 'active' : ''}`}
            onClick={() => handleViewChange('job-board')}
          >
            <i className="fas fa-briefcase"></i>
            Job Posting
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
      <main className="employer-dashboard-main">
        {/* Header */}
        <header className="employer-dashboard-header">
          <div className="header-content">
            <div className="header-title-section">
              <h1 className="header-title">{currentView === 'job-board' ? 'Job Posting Management' : currentView === 'ranked-list' ? 'Ranked Candidates' : currentView === 'analytics' ? 'Analytics Dashboard' : currentView === 'candidate-status' ? 'Candidate Status' : 'Dashboard Overview'}</h1>
              <p className="header-subtitle">{currentView === 'job-board' ? 'Modify existing job postings and requirements' : currentView === 'ranked-list' ? 'Top performing candidates ranked by overall score' : currentView === 'analytics' ? 'Comprehensive analysis and metrics of applicant performance' : currentView === 'candidate-status' ? 'Track hiring outcomes and manage interview-ready candidates' : 'Monitor your hiring pipeline and candidate progress'}</p>
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
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'ranked-list' && renderApplications()}
        {currentView === 'candidate-status' && (
          <div className="ranked-candidates-content candidate-status-content">
            <div className="um-card">
              <div className="um-card-header">
                <div className="um-card-actions">
                  <div className="status-filter">
                    <div className="custom-dropdown">
                      <div className="dropdown-trigger" onClick={() => setOpenRoleMenuFor(openRoleMenuFor === 'status-filter' ? null : 'status-filter')}>
                        <div className="dropdown-selected">
                          <span>{selectedRoleFilter || 'All Status'}</span>
                        </div>
                        <div className={`dropdown-arrow ${openRoleMenuFor === 'status-filter' ? 'open' : ''}`}>
                          <i className="fas fa-chevron-down"></i>
                        </div>
                      </div>
                      {openRoleMenuFor === 'status-filter' && (
                        <div className="dropdown-menu">
                          <div 
                            className={`dropdown-option ${selectedRoleFilter === 'All Status' || !selectedRoleFilter ? 'selected' : ''}`}
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

              <div className="um-table">
                <div className="um-table-header">
                  <div className="um-th name">Candidate</div>
                  <div className="um-th date">Application Date</div>
                  <div className="um-th position">Position</div>
                  <div className="um-th remarks">Remarks</div>
                  <div className="um-th status">Status</div>
                </div>
                {(() => {
                  // Use candidateStatusApplicants built from decisions to mirror Admin behavior
                  let filteredCandidates = candidateStatusApplicants;
                  if (!selectedRoleFilter || selectedRoleFilter === 'All Status') {
                    // no status filter
                  } else if (selectedRoleFilter === 'Hired') {
                    filteredCandidates = filteredCandidates.filter((a) => (a.applicationStatus || '').toLowerCase() === 'hired');
                  } else if (selectedRoleFilter === 'Rejected') {
                    filteredCandidates = filteredCandidates.filter((a) => (a.applicationStatus || '').toLowerCase() === 'rejected');
                  } else if (selectedRoleFilter === 'For Interview') {
                    filteredCandidates = filteredCandidates.filter((a) => (a.applicationStatus || '').toLowerCase() === 'for_interview');
                  }
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
                    const initials = (applicant.name || 'Unknown').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
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
                          {(() => {
                            const s = (applicant.applicationStatus || '').toLowerCase();
                            if (s === 'hired' || s === 'rejected') {
                              return (
                                <button 
                                  className="um-action-link"
                                  title="View Remarks"
                                  onClick={() => openRemarksModal(applicant)}
                                  style={{border:'none', background:'transparent', cursor:'pointer'}}
                                >
                                  <i className="fas fa-comment-dots"></i>
                                </button>
                              );
                            }
                            return (
                              <button 
                                className="um-action-link decision"
                                title="Decide Status"
                                onClick={() => openDecisionModal(applicant)}
                                style={{border: 'none', background: 'transparent', cursor: 'pointer'}}
                              >
                                <i className="fas fa-clipboard-check"></i>
                              </button>
                            );
                          })()}
                        </div>
                        <div className="um-td status">
                          <span className={`status-badge ${(() => {
                            const s = (applicant.applicationStatus || '').toLowerCase();
                            if (s === 'hired') return 'passed';
                            if (s === 'rejected') return 'rejected';
                            if (s === 'for_interview' || s === 'for interview') return 'for-interview';

                            return 'new';
                          })()}`}>
                            {(() => {
                              const s = (applicant.applicationStatus || '').toLowerCase();
                              if (s === 'hired') return 'Hired';
                              if (s === 'rejected') return 'Rejected';
                              if (s === 'for_interview') return 'For Interview';
                              return 'New';
                            })()}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {currentView === 'job-board' && renderJobBoard()}
        {currentView === 'analytics' && renderAnalytics()}
      </main>

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

    {/* Interview Schedule Modal */}
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

            {/* Location field removed per request */}

            <div className="form-field">
              <div className="field-icon"><i className="fas fa-calendar"></i></div>
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
              <div className="field-icon">⏰</div>
              <div className="field-content">
                <label>Application End Date (Expiration) *</label>
                <input 
                  type="date" 
                  value={editingJob?.applicationEndDate || ''} 
                  onChange={(e) => handleJobFieldChange('applicationEndDate', e.target.value)}
                  min={editingJob?.applicationStartDate || new Date().toISOString().split('T')[0]}
                  required
                />
                <small style={{color: '#666', fontSize: '12px'}}>Jobs will automatically close after this date</small>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn btn-cancel" onClick={handleCloseUpdateForm} disabled={jobsLoading}>
              Cancel
            </button>
            <button className="btn btn-save" onClick={handleSaveJob} disabled={jobsLoading}>
              {jobsLoading ? 'Saving...' : (editingJob?.id && jobs.find(j => j.id === editingJob.id) 
                ? 'Save Changes' 
                : 'Create Job'
              )}
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
                  <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                    {Object.entries(featureWeights).map(([feature, weight]) => {
                      const birthday = selectedApplicantDetails.personalInfo?.birthday || selectedApplicantDetails.birthday;
                      const calculatedAge = calculateAge(birthday);
                      const educationText = selectedApplicantDetails.personalInfo?.educationalAttainment || selectedApplicantDetails.educationalAttainment || 'High School';
                      const educationScore = getEducationScore(educationText);
                      
                      const applicantValue = {
                        age: calculatedAge || parseInt(selectedApplicantDetails.personalInfo?.age) || parseInt(selectedApplicantDetails.age) || 25,
                        experience_years: parseInt(selectedApplicantDetails.personalInfo?.yearsOfExperience) || parseInt(selectedApplicantDetails.experienceYears) || 0,
                        education_level: educationScore,
                        exam_score: selectedApplicantDetails.totalScore && selectedApplicantDetails.maxTotalScore ? Math.round((selectedApplicantDetails.totalScore / selectedApplicantDetails.maxTotalScore) * 100) : 0
                      }[feature] || 0;
                      
                      const contribution = applicantValue * weight;
                      const percentage = (Math.abs(weight) * 100).toFixed(1);
                      
                      return (
                        <div key={feature} style={{border:'1px solid #e5e7eb', borderRadius:'8px', padding:'12px'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                            <span style={{fontWeight:'600'}}>{formatFeatureName(feature)}</span>
                            <span style={{fontSize:'14px', color:'#6b7280'}}>
                              {feature === 'education_level' ? 
                                `${educationText} (${educationScore})` : 
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
                            <div style={{minWidth:'80px', textAlign:'right', fontWeight:'600', color: contribution >= 0 ? '#10b981' : '#ef4444'}}>
                              {contribution >= 0 ? '+' : ''}{contribution.toFixed(2)}
                            </div>
                          </div>
                          <div style={{fontSize:'12px', color:'#9ca3af', marginTop:'4px'}}>
                            Weight: {weight.toFixed(3)} × Value: {applicantValue} = Contribution: {contribution.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  

                </div>
                
                {(() => {
                  // Compute total contribution using the same logic as per-feature list
                  const birthday = selectedApplicantDetails.personalInfo?.birthday || selectedApplicantDetails.birthday;
                  const calculatedAge = calculateAge(birthday);
                  const educationText = selectedApplicantDetails.personalInfo?.educationalAttainment || selectedApplicantDetails.educationalAttainment || 'High School';
                  const educationScore = getEducationScore(educationText);

                  const totalContribution = Object.entries(featureWeights).reduce((sum, [feature, weight]) => {
                    const applicantValue = {
                      age: calculatedAge || parseInt(selectedApplicantDetails.personalInfo?.age) || parseInt(selectedApplicantDetails.age) || 25,
                      experience_years: parseInt(selectedApplicantDetails.personalInfo?.yearsOfExperience) || parseInt(selectedApplicantDetails.experienceYears) || 0,
                      education_level: educationScore,
                      exam_score: selectedApplicantDetails.totalScore && selectedApplicantDetails.maxTotalScore ? Math.round((selectedApplicantDetails.totalScore / selectedApplicantDetails.maxTotalScore) * 100) : 0
                    }[feature] || 0;
                    return sum + applicantValue * weight;
                  }, 0);

                  const applicantFromRankings = applicantRankings.find(a => a.id === selectedApplicantDetails.id);
                  const actualScore = applicantFromRankings?.score || 0;
                  
                  const birthDate2 = selectedApplicantDetails.personalInfo?.birthday || selectedApplicantDetails.birthday;
                  const calculatedAge2 = calculateAge(birthDate2);
                  const educationScore2 = getEducationScore(selectedApplicantDetails.personalInfo?.educationalAttainment || selectedApplicantDetails.educationalAttainment || 'High School');
                  
                  const attributeMapping2 = {
                    'age': calculatedAge2 || parseInt(selectedApplicantDetails.personalInfo?.age) || parseInt(selectedApplicantDetails.age) || 25,
                    'experience_years': parseInt(selectedApplicantDetails.personalInfo?.yearsOfExperience) || parseInt(selectedApplicantDetails.experienceYears) || 0,
                    'education_level': educationScore2,
                    'exam_score': selectedApplicantDetails.totalScore && selectedApplicantDetails.maxTotalScore ? Math.round((selectedApplicantDetails.totalScore / selectedApplicantDetails.maxTotalScore) * 100) : 0
                  };
                  
                  const calculationSteps = Object.entries(featureWeights).map(([feature, weight]) => {
                    const value = attributeMapping2[feature] || 0;
                    const contribution = value * weight;
                    return `${formatFeatureName(feature)}: ${value} × ${weight.toFixed(3)} = ${contribution.toFixed(2)}`;
                  });
                  
                  const manualTotal = Object.entries(featureWeights).reduce((sum, [feature, weight]) => {
                    const value = attributeMapping2[feature] || 0;
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

    {/* Remarks Modal */}
    {showRemarksModal && (
      <div className="modal-overlay" onClick={closeRemarksModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Decision Remarks</h2>
            <button className="close-modal-btn" onClick={closeRemarksModal}>✕</button>
          </div>
          <div className="modal-body">
            <div className="decision-meta">
              {selectedApplicantForRemarks?.name || 'Applicant'} • {selectedApplicantForRemarks?.position || ''}
            </div>
            <div className="form-row">
              <label>REMARKS</label>
              {remarksLoading ? (
                <div>Loading remarks...</div>
              ) : (
                <textarea 
                  value={remarksMessage}
                  readOnly
                  rows="4"
                  style={{backgroundColor: '#f8f9fa', cursor: 'default'}}
                />
              )}
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={closeRemarksModal}>
              Close
            </button>
          </div>
        </div>
      </div>
    )}

    </div>
  );
};

export default EmployerDashboard;
