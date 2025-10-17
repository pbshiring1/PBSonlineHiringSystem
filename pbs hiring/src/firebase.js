// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, query, orderBy, where, limit } from 'firebase/firestore';
// Removed Firebase Storage imports - now using Firestore only

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA77Yf6uR8dJsb6Mob2E2lj2qvSPxqvJ8c",
  authDomain: "pbshiring-d1298.firebaseapp.com",
  projectId: "pbshiring-d1298",
  storageBucket: "pbshiring-d1298.firebasestorage.app",
  messagingSenderId: "732676175257",
  appId: "1:732676175257:web:01eb70e365ca3cc278cf08",
  measurementId: "G-3SN5Q4RXKG"
};

// Update applicant profile fields in applicantInfo (not users)
export const updateApplicantProfile = async (uid, profileData) => {
  try {
    const applicantRef = doc(db, 'applicantInfo', uid);
    await setDoc(
      applicantRef,
      {
        // Mirror fields at top level for convenience
        fullName: profileData.name || profileData.displayName || '',
        email: profileData.email || '',
        phoneNumber: profileData.phoneNumber || profileData.phone || '',
        countryCode: profileData.countryCode || '+63',
        location: profileData.location || '',
        bio: profileData.bio || '',
        updatedAt: new Date(),
        // Keep a nested profile object as well
        profile: {
          name: profileData.name || profileData.displayName || '',
          email: profileData.email || '',
          phoneNumber: profileData.phoneNumber || profileData.phone || '',
          countryCode: profileData.countryCode || '+63',
          location: profileData.location || '',
          bio: profileData.bio || ''
        }
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.error('Error updating applicant profile:', error);
    throw error;
  }
};

// Save applicant personal information to applicantInfo (not users)
export const saveApplicantPersonalInfo = async (uid, personalData) => {
  try {
    const applicantRef = doc(db, 'applicantInfo', uid);
    // Merge to avoid overwriting exam results or selectedJobs
    await setDoc(applicantRef, {
      // Keep a dedicated nested object for personal info while also exposing some top-level fields
      personalInfo: {
        firstName: personalData.firstName || '',
        middleName: personalData.middleName || '',
        lastName: personalData.lastName || '',
        suffix: personalData.suffix || '',
        email: personalData.email || '',
        phoneNumber: personalData.phoneNumber || '',
        countryCode: personalData.countryCode || '+63',
        city: personalData.city || '',
        province: personalData.province || '',
        educationalAttainment: personalData.educationalAttainment || '',
        age: personalData.age || '',
        yearsOfExperience: personalData.yearsOfExperience || ''
      },
      // Mirror key fields at the top-level for easy reads/queries
      firstName: personalData.firstName || '',
      middleName: personalData.middleName || '',
      lastName: personalData.lastName || '',
      suffix: personalData.suffix || '',
      email: personalData.email || '',
      phoneNumber: personalData.phoneNumber || '',
      countryCode: personalData.countryCode || '+63',
      city: personalData.city || '',
      province: personalData.province || '',
      educationalAttainment: personalData.educationalAttainment || '',
      age: personalData.age || '',
      yearsOfExperience: personalData.yearsOfExperience || '',
      updatedAt: new Date()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving applicant personal info:', error);
    throw error;
  }
};

// Get applicant personal information from applicantInfo
export const getApplicantPersonalInfo = async (uid) => {
  try {
    const applicantRef = doc(db, 'applicantInfo', uid);
    const applicantSnap = await getDoc(applicantRef);
    if (applicantSnap.exists()) {
      const data = applicantSnap.data();
      // Prefer nested personalInfo but fallback to top-level mirrors
      const p = data.personalInfo || {};
      return {
        firstName: p.firstName ?? data.firstName ?? '',
        middleName: p.middleName ?? data.middleName ?? '',
        lastName: p.lastName ?? data.lastName ?? '',
        suffix: p.suffix ?? data.suffix ?? '',
        email: p.email ?? data.email ?? '',
        phoneNumber: p.phoneNumber ?? data.phoneNumber ?? '',
        countryCode: p.countryCode ?? data.countryCode ?? '+63',
        city: p.city ?? data.city ?? '',
        province: p.province ?? data.province ?? '',
        educationalAttainment: p.educationalAttainment ?? data.educationalAttainment ?? '',
        age: p.age ?? data.age ?? '',
        yearsOfExperience: p.yearsOfExperience ?? data.yearsOfExperience ?? ''
      };
    }
    return { firstName: '', middleName: '', lastName: '', suffix: '', email: '', phoneNumber: '', countryCode: '+63', city: '', province: '', educationalAttainment: '', age: '', yearsOfExperience: '' };
  } catch (error) {
    console.error('Error getting applicant personal info:', error);
    throw error;
  }
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Removed Firebase Storage - now using Firestore only

// Function to create user document only if it doesn't exist
export const createUserDocument = async (user, defaultRole = 'employee') => {
  try {
    const userRef = doc(db, 'users', user.uid);
    
    console.log('Attempting to access user document for UID:', user.uid);
    console.log('User authenticated:', !!user);
    console.log('User email:', user.email);
    
    // Check if user document already exists
    const userSnap = await getDoc(userRef);
    console.log('User document exists:', userSnap.exists());
    
    if (userSnap.exists()) {
      // User document exists, update lastLogin and photoURL if missing
      console.log('Updating existing user document...');
      const existingData = userSnap.data();
      const updateData = {
        lastLogin: new Date()
      };
      
      // Add photoURL if it's missing from the existing document
      if (!existingData.photoURL && user.photoURL) {
        updateData.photoURL = user.photoURL;
        console.log('Adding missing photoURL to existing user document');
      }
      
      await setDoc(userRef, updateData, { merge: true }); // merge: true prevents overwriting existing data
      console.log('User document updated (lastLogin and photoURL if needed)');
      return { ...existingData, ...updateData };
    } else {
      // User document doesn't exist, create new one
      console.log('Creating new user document...');
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'User',
        photoURL: user.photoURL || null,
        role: defaultRole,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      
      await setDoc(userRef, userData);
      console.log('User document created successfully');
      return userData;
    }
  } catch (error) {
    console.error('Error handling user document:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    throw error;
  }
};

// Function to get user role from Firestore
export const getUserRole = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data().role;
    } else {
      console.log('No such user document!');
      return null;
    }
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// Function to update user profile information
export const updateUserProfile = async (uid, profileData) => {
  try {
    const userRef = doc(db, 'users', uid);
    
    // Update the user document with new profile data
    await setDoc(userRef, {
      ...profileData,
      updatedAt: new Date()
    }, { merge: true }); // merge: true prevents overwriting existing data
    
    console.log('User profile updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Jobs Collection Functions

// Create a new job
export const createJob = async (jobData) => {
  try {
    const jobsRef = collection(db, 'jobs');
    const docRef = await addDoc(jobsRef, {
      ...jobData,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active' // active, inactive, closed
    });
    console.log('Job created successfully with ID:', docRef.id);
    return { id: docRef.id, ...jobData };
  } catch (error) {
    console.error('Error creating job:', error);
    throw error;
  }
};

// Get all jobs
export const getAllJobs = async () => {
  try {
    const jobsRef = collection(db, 'jobs');
    const q = query(jobsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const jobs = [];
    querySnapshot.forEach((doc) => {
      jobs.push({ id: doc.id, ...doc.data() });
    });
    return jobs;
  } catch (error) {
    console.error('Error getting jobs:', error);
    throw error;
  }
};

// Get active jobs only
export const getActiveJobs = async () => {
  try {
    const jobsRef = collection(db, 'jobs');
    const q = query(jobsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    // Helper: convert Firestore Timestamp, string (YYYY-MM-DD), or Date to a JS Date. Returns null if invalid/empty
    const coerceToDate = (value) => {
      try {
        if (!value) return null;
        // Firestore Timestamp
        if (typeof value === 'object' && value.seconds && typeof value.seconds === 'number') {
          return new Date(value.seconds * 1000);
        }
        // Firestore Timestamp with toDate()
        if (typeof value?.toDate === 'function') {
          return value.toDate();
        }
        // String in YYYY-MM-DD or any Date-parsable string
        if (typeof value === 'string') {
          // Normalize to local midnight to include the whole day in comparisons
          const normalized = new Date(`${value}T00:00:00`);
          return isNaN(normalized.getTime()) ? null : normalized;
        }
        // JS Date
        if (value instanceof Date) {
          return isNaN(value.getTime()) ? null : value;
        }
        return null;
      } catch {
        return null;
      }
    };

    // Determine if a job is currently within its hiring window
    const isWithinHiringWindow = (job) => {
      // If no dates are set, treat as always open when status is active
      const start = coerceToDate(job.applicationStartDate);
      const end = coerceToDate(job.applicationEndDate);

      // Compare against now, but make end inclusive through end-of-day
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const afterStart = !start || todayEnd >= start; // started on/before today
      const beforeEnd = !end || todayStart <= new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999); // not past end

      return afterStart && beforeEnd;
    };

    const jobs = [];
    querySnapshot.forEach((docSnap) => {
      const jobData = docSnap.data();
      if (jobData.status === 'active' && isWithinHiringWindow(jobData)) {
        jobs.push({ id: docSnap.id, ...jobData });
      }
    });
    return jobs;
  } catch (error) {
    console.error('Error getting active jobs:', error);
    throw error;
  }
};

// Update a job
export const updateJob = async (jobId, jobData) => {
  try {
    const jobRef = doc(db, 'jobs', jobId);
    await updateDoc(jobRef, {
      ...jobData,
      updatedAt: new Date()
    });
    console.log('Job updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating job:', error);
    throw error;
  }
};

// Delete a job
export const deleteJob = async (jobId) => {
  try {
    const jobRef = doc(db, 'jobs', jobId);
    await deleteDoc(jobRef);
    console.log('Job deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
};

// Get a specific job by ID
export const getJobById = async (jobId) => {
  try {
    const jobRef = doc(db, 'jobs', jobId);
    const jobSnap = await getDoc(jobRef);
    
    if (jobSnap.exists()) {
      return { id: jobSnap.id, ...jobSnap.data() };
    } else {
      console.log('No such job document!');
      return null;
    }
  } catch (error) {
    console.error('Error getting job:', error);
    throw error;
  }
};

// Pre-screening Functions

// Get user data from Firebase (name, email, phone, location, bio, educational attainment, and photoURL)
export const getUserData = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return {
        name: userData.displayName || userData.name || '',
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || '',
        countryCode: userData.countryCode || '+63',
        location: userData.location || '',
        bio: userData.bio || '',
        educationalAttainment: userData.educationalAttainment || '',
        // Prefer top-level age/yearsOfExperience; fallback to saved preScreeningData
        age: userData.age || userData?.preScreeningData?.age || '',
        yearsOfExperience: userData.yearsOfExperience || userData?.preScreeningData?.yearsOfExperience || '',
        photoURL: userData.photoURL || null
      };
    } else {
      console.log('No user document found!');
      return { name: '', email: '', phoneNumber: '', countryCode: '+63', location: '', bio: '', educationalAttainment: '', age: '', yearsOfExperience: '', photoURL: null };
    }
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

// Save pre-screening data to Firebase
export const savePreScreeningData = async (uid, preScreeningData) => {
  try {
    const userRef = doc(db, 'users', uid);
    
    // Update the user document with pre-screening data
    await setDoc(userRef, {
      phoneNumber: preScreeningData.phoneNumber,
      countryCode: preScreeningData.countryCode,
      educationalAttainment: preScreeningData.educationalAttainment,
      // Store age and yearsOfExperience at top level for easy reads
      age: preScreeningData.age,
      yearsOfExperience: preScreeningData.yearsOfExperience,
      preScreeningCompleted: true,
      preScreeningData: {
        ...preScreeningData,
        completedAt: new Date()
      },
      updatedAt: new Date()
    }, { merge: true }); // merge: true prevents overwriting existing data
    
    console.log('Pre-screening data saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving pre-screening data:', error);
    throw error;
  }
};

// Applicant Info Collection Functions

// Save pre-screening exam results to applicantInfo collection
export const saveApplicantExamResults = async (uid, examData) => {
  try {
    const applicantRef = doc(db, 'applicantInfo', uid);
    
    // Save exam results with scoring
    await setDoc(applicantRef, {
      ...examData,
      examCompletedAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });
    
    console.log('Applicant exam results saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving applicant exam results:', error);
    throw error;
  }
};

// Get applicant exam results
export const getApplicantExamResults = async (uid) => {
  try {
    const applicantRef = doc(db, 'applicantInfo', uid);
    const applicantSnap = await getDoc(applicantRef);
    
    if (applicantSnap.exists()) {
      return applicantSnap.data();
    } else {
      console.log('No applicant exam results found!');
      return null;
    }
  } catch (error) {
    console.error('Error getting applicant exam results:', error);
    throw error;
  }
};

// Save job selection to applicantInfo collection
export const saveJobSelection = async (uid, jobData) => {
  try {
    const applicantRef = doc(db, 'applicantInfo', uid);
    // Store a single selectedJob object; this replaces any previous selection
    await setDoc(
      applicantRef,
      {
        selectedJob: jobData,
        lastJobSelectedAt: new Date(),
        updatedAt: new Date()
      },
      { merge: true }
    );
    console.log('Selected job saved successfully (single value):', jobData);
    return true;
  } catch (error) {
    console.error('Error saving job selection:', error);
    throw error;
  }
};

// Get selected jobs from applicantInfo collection
export const getSelectedJobs = async (uid) => {
  // Backward compatibility: return an array for existing callers
  try {
    const applicantRef = doc(db, 'applicantInfo', uid);
    const applicantSnap = await getDoc(applicantRef);
    if (applicantSnap.exists()) {
      const data = applicantSnap.data();
      if (data.selectedJob) return [data.selectedJob];
      return data.selectedJobs || [];
    }
    console.log('No selected job found!');
    return [];
  } catch (error) {
    console.error('Error getting selected jobs:', error);
    throw error;
  }
};

export const getSelectedJob = async (uid) => {
  try {
    const applicantRef = doc(db, 'applicantInfo', uid);
    const applicantSnap = await getDoc(applicantRef);
    if (applicantSnap.exists()) {
      const data = applicantSnap.data();
      return data.selectedJob || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting selected job:', error);
    throw error;
  }
};

// Get applicants for a specific job
export const getApplicantsByJobId = async (jobId) => {
  try {
    const applicantInfoQuery = query(collection(db, 'applicantInfo'));
    const applicantInfoSnapshot = await getDocs(applicantInfoQuery);
    
    const applicants = [];
    applicantInfoSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const selectedJob = data.selectedJob;
      
      // Check if this applicant selected the specific job
      if (selectedJob && (
        selectedJob.id === jobId || 
        selectedJob.jobId === jobId ||
        (typeof selectedJob === 'object' && selectedJob.title && selectedJob.id === jobId)
      )) {
        applicants.push({
          id: docSnap.id,
          selectedJob: selectedJob,
          lastJobSelectedAt: data.lastJobSelectedAt,
          personalInfo: data.personalInfo || {},
          examResults: data.examResults || {},
          assessmentScore: data.assessmentScore || 0,
          interviewScore: data.interviewScore || 0,
          examScore: data.totalScore && data.maxTotalScore ? Math.round((data.totalScore / data.maxTotalScore) * 100) : 0,
          experience: data.experience || 0,
          applicationStatus: data.applicationStatus || 'pending'
        });
      }
    });
    
    return applicants;
  } catch (error) {
    console.error('Error getting applicants by job ID:', error);
    throw error;
  }
};

// Get applicant count for a specific job
export const getApplicantCountByJobId = async (jobId) => {
  try {
    const applicants = await getApplicantsByJobId(jobId);
    return applicants.length;
  } catch (error) {
    console.error('Error getting applicant count by job ID:', error);
    return 0;
  }
};

// Get all applicants with their selected jobs
export const getAllApplicantsWithJobs = async () => {
  try {
    const applicantInfoQuery = query(collection(db, 'applicantInfo'));
    const applicantInfoSnapshot = await getDocs(applicantInfoQuery);
    
    const applicants = [];
    applicantInfoSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const selectedJob = data.selectedJob;
      
      if (selectedJob) {
        applicants.push({
          id: docSnap.id,
          selectedJob: selectedJob,
          lastJobSelectedAt: data.lastJobSelectedAt,
          personalInfo: data.personalInfo || {},
          examResults: data.examResults || {},
          assessmentScore: data.assessmentScore || 0,
          interviewScore: data.interviewScore || 0,
          examScore: data.totalScore && data.maxTotalScore ? Math.round((data.totalScore / data.maxTotalScore) * 100) : 0,
          experience: data.experience || 0,
          applicationStatus: data.applicationStatus || 'pending',
          firstName: data.firstName || data.personalInfo?.firstName || '',
          middleName: data.middleName || data.personalInfo?.middleName || '',
          lastName: data.lastName || data.personalInfo?.lastName || '',
          suffix: data.suffix || data.personalInfo?.suffix || '',
          email: data.email || data.personalInfo?.email || '',
          phoneNumber: data.phoneNumber || data.personalInfo?.phoneNumber || ''
        });
      }
    });
    
    return applicants;
  } catch (error) {
    console.error('Error getting all applicants with jobs:', error);
    throw error;
  }
};

// Document Upload Functions

// Test function to validate blob creation (for debugging)
export const testBlobCreation = async (file) => {
  try {
    console.log('Testing blob creation for file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    // Test direct blob creation
    const directBlob = new Blob([file], { type: file.type });
    console.log('Direct blob:', {
      size: directBlob.size,
      type: directBlob.type,
      sizeMatch: directBlob.size === file.size
    });
    
    // Test ArrayBuffer method
    const arrayBuffer = await file.arrayBuffer();
    const arrayBufferBlob = new Blob([arrayBuffer], { type: file.type });
    console.log('ArrayBuffer blob:', {
      size: arrayBufferBlob.size,
      type: arrayBufferBlob.type,
      sizeMatch: arrayBufferBlob.size === file.size
    });
    
    // Test file reading
    const fileText = await file.text();
    console.log('File text length:', fileText.length);
    
    return {
      directBlob: {
        size: directBlob.size,
        type: directBlob.type,
        valid: directBlob.size > 0 && directBlob.size === file.size
      },
      arrayBufferBlob: {
        size: arrayBufferBlob.size,
        type: arrayBufferBlob.type,
        valid: arrayBufferBlob.size > 0 && arrayBufferBlob.size === file.size
      },
      fileReadable: fileText.length > 0
    };
  } catch (error) {
    console.error('Error testing blob creation:', error);
    return { error: error.message };
  }
};

// Removed Firebase Storage test function - now using Firestore only

// Upload file content as blob directly to Firestore
export const uploadApplicantDocumentSimple = async (uid, file, documentType = 'certification') => {
  try {
    console.log('Starting Firestore upload for file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    // Validate file
    if (!file || !file.name) {
      throw new Error('Invalid file provided');
    }
    
    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uid}_${documentType}_${timestamp}.${fileExtension}`;
    
    console.log('Generated filename:', fileName);
    
    // Convert file to base64 for Firestore storage
    const fileContent = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
    
    console.log('File converted to base64, length:', fileContent.length);
    
    // Save document data directly to Firestore
    const docData = {
      uid: uid,
      fileName: fileName,
      originalName: file.name,
      fileType: file.type,
      fileSize: file.size,
      documentType: documentType,
      fileContent: fileContent,
      fileContentType: 'base64',
      uploadedAt: new Date(),
      status: 'pending'
    };
    
    console.log('Saving document to Firestore with content length:', fileContent.length);
    
    const docRef = await addDoc(collection(db, 'applicantDocuments'), docData);
    console.log('Document saved to Firestore with ID:', docRef.id);
    
    return {
      id: docRef.id,
      ...docData
    };
  } catch (error) {
    console.error('Error in Firestore upload:', error);
    throw error;
  }
};

// Upload a file to Firebase Storage and save metadata to applicantDocuments collection
export const uploadApplicantDocument = async (uid, file, documentType = 'certification') => {
  try {
    console.log('Starting Firestore upload for file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    // Validate file
    if (!file || !file.name) {
      throw new Error('Invalid file provided');
    }
    
    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uid}_${documentType}_${timestamp}.${fileExtension}`;
    
    console.log('Generated filename:', fileName);
    
    // Convert file to base64 for storage in Firestore
    const arrayBuffer = await file.arrayBuffer();
    const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    console.log('File converted to base64, length:', base64String.length);
    
    // Save document data directly to Firestore
    const docData = {
      uid: uid,
      fileName: fileName,
      originalName: file.name,
      fileType: file.type,
      fileSize: file.size,
      documentType: documentType,
      fileContent: base64String, // Store file content as base64
      uploadedAt: new Date(),
      status: 'pending' // pending, approved, rejected
    };
    
    console.log('Saving document to Firestore:', { ...docData, fileContent: '[base64 content]' });
    const docRef = await addDoc(collection(db, 'applicantDocuments'), docData);
    console.log('Document saved with ID:', docRef.id);
    
    return {
      id: docRef.id,
      ...docData
    };
  } catch (error) {
    console.error('Error uploading document:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
};

// Get all documents for a specific applicant
export const getApplicantDocuments = async (uid) => {
  try {
    const q = query(collection(db, 'applicantDocuments'), orderBy('uploadedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const documents = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.uid === uid) {
        // Remove fileContent from the response to avoid sending large data
        const { fileContent, ...documentData } = data;
        documents.push({ 
          id: doc.id, 
          ...documentData,
          hasContent: !!fileContent
        });
      }
    });
    
    return documents;
  } catch (error) {
    console.error('Error getting applicant documents:', error);
    throw error;
  }
};

// Get a specific document with its content
export const getApplicantDocumentContent = async (documentId) => {
  try {
    const docRef = doc(db, 'applicantDocuments', documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      throw new Error('Document not found');
    }
  } catch (error) {
    console.error('Error getting document content:', error);
    throw error;
  }
};

// Delete a document from Firestore
export const deleteApplicantDocument = async (documentId) => {
  try {
    await deleteDoc(doc(db, 'applicantDocuments', documentId));
    console.log('Document deleted successfully from Firestore');
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Delete a user from Firestore
export const deleteUser = async (userId) => {
  try {
    // Delete user document from users collection
    await deleteDoc(doc(db, 'users', userId));
    
    // Also delete from applicantInfo collection if it exists
    try {
      await deleteDoc(doc(db, 'applicantInfo', userId));
    } catch (error) {
      // applicantInfo document might not exist, which is fine
      console.log('No applicantInfo document found for user:', userId);
    }
    
    console.log('User deleted successfully from Firestore');
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Delete multiple users from Firestore
export const deleteMultipleUsers = async (userIds) => {
  try {
    const deletePromises = userIds.map(userId => deleteUser(userId));
    await Promise.all(deletePromises);
    console.log(`${userIds.length} users deleted successfully from Firestore`);
    return true;
  } catch (error) {
    console.error('Error deleting multiple users:', error);
    throw error;
  }
};

// CSV Training Data Management
export const uploadCSVTrainingData = async (file, userRole = 'admin') => {
  try {
    // Read and parse CSV content
    const csvText = await file.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Parse CSV data into structured format
    const parsedData = lines.slice(1).map(line => {
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
    
    // Deactivate previous training data for this user role
    const previousDataQuery = query(
      collection(db, 'trainingData'),
      where('uploadedBy', '==', userRole),
      where('isActive', '==', true)
    );
    const previousDataSnapshot = await getDocs(previousDataQuery);
    
    const updatePromises = previousDataSnapshot.docs.map(doc => 
      updateDoc(doc.ref, { isActive: false })
    );
    await Promise.all(updatePromises);
    
    // Save new training data to Firestore
    const docRef = await addDoc(collection(db, 'trainingData'), {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'text/csv',
      csvContent: csvText, // Store raw CSV content
      parsedData: parsedData, // Store parsed structured data
      recordCount: parsedData.length,
      uploadedBy: userRole,
      uploadedAt: new Date(),
      isActive: true
    });
    
    console.log(`CSV training data uploaded successfully to Firestore: ${parsedData.length} records`);
    return { id: docRef.id, recordCount: parsedData.length };
  } catch (error) {
    console.error('Error uploading CSV training data:', error);
    throw error;
  }
};

export const getActiveTrainingData = async (userRole = 'admin') => {
  try {
    // Simplified query to avoid complex index requirements
    const trainingDataQuery = query(
      collection(db, 'trainingData'),
      where('uploadedBy', '==', userRole),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(trainingDataQuery);
    
    if (snapshot.empty) {
      return null;
    }
    
    // Sort by uploadedAt in JavaScript to avoid complex index
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    docs.sort((a, b) => b.uploadedAt.toMillis() - a.uploadedAt.toMillis());
    
    return docs[0]; // Return the most recent
  } catch (error) {
    console.error('Error fetching active training data:', error);
    throw error;
  }
};

export const loadTrainingDataFromStorage = async (userRole = 'admin') => {
  try {
    const trainingData = await getActiveTrainingData(userRole);
    
    if (!trainingData) {
      console.log('No training data found for', userRole);
      return null;
    }
    
    // Return the parsed data directly from Firestore
    if (trainingData.parsedData && trainingData.parsedData.length > 0) {
      console.log(`Loaded ${trainingData.parsedData.length} training records from Firestore for ${userRole}`);
      return trainingData.parsedData;
    }
    
    // Fallback: parse from CSV content if parsedData is not available
    if (trainingData.csvContent) {
      const lines = trainingData.csvContent.split('\n').filter(line => line.trim());
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
      
      console.log(`Loaded ${data.length} training records from Firestore CSV content for ${userRole}`);
      return data;
    }
    
    console.log('No valid training data found in Firestore for', userRole);
    return null;
  } catch (error) {
    console.warn('Error loading training data from Firestore:', error.message);
    return null; // Return null instead of throwing to prevent errors
  }
};

// Update document status (for admin approval/rejection)
export const updateDocumentStatus = async (documentId, status, adminNotes = '') => {
  try {
    const docRef = doc(db, 'applicantDocuments', documentId);
    await updateDoc(docRef, {
      status: status,
      adminNotes: adminNotes,
      reviewedAt: new Date()
    });
    
    console.log('Document status updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating document status:', error);
    throw error;
  }
};

export default app;
