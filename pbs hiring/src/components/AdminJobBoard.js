import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminJobBoard.css';

const AdminJobBoard = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showUpdateJobForm, setShowUpdateJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('isAdmin') !== 'true') {
      navigate('/login');
      return;
    }
    
    fetchJobs();
  }, [navigate]);

  const fetchJobs = () => {
    setLoading(true);
    // Use sample data matching the image
    setJobs([
    {
        id: 1,
      title: 'ELECTRICAL ENGINEER',
        description: 'Designs and supervises electrical systems.',
        location: 'Bulacan',
        yearsOfExperience: '3-5 years',
        postedDate: '2024-01-15',
        applicationStartDate: null,
        applicationEndDate: null
    },
    {
        id: 2,
      title: 'ELECTRONICS ENGINEER',
        description: 'Designs and develops electronic systems.',
        location: 'Bulacan',
        yearsOfExperience: '3-5 years',
        postedDate: '2024-01-14',
        applicationStartDate: '2025-09-19',
        applicationEndDate: '2025-09-27'
    },
    {
        id: 3,
      title: 'NETWORK TECHNICIAN',
        description: 'Maintains and troubleshoots network infrastructure.',
        location: 'Bulacan',
        yearsOfExperience: '2-3 years',
        postedDate: '2024-01-13',
        applicationStartDate: '2025-09-10',
        applicationEndDate: '2025-09-20'
    },
    {
        id: 4,
      title: 'ELECTRICIAN',
        description: 'Installs and maintains electrical systems.',
        location: 'Bulacan',
        yearsOfExperience: '2-4 years',
        postedDate: '2024-01-12',
        applicationStartDate: '2025-09-05',
        applicationEndDate: '2025-09-15'
      }
    ]);
    setLoading(false);
  };

  // Derived list for Job Board based on search
  const normalizedJobSearch = (jobSearchTerm || '').trim().toLowerCase();
  const displayedJobs = (Array.isArray(jobs) ? jobs : []).filter((j) => {
    if (!normalizedJobSearch) return true;
    const title = (j.title || '').toLowerCase();
    const desc = (j.description || '').toLowerCase();
    const loc = (j.location || '').toLowerCase();
    return title.includes(normalizedJobSearch) || desc.includes(normalizedJobSearch) || loc.includes(normalizedJobSearch);
  });

  // Helpers for job status and applicants summary
  const getJobStatus = (job) => {
    try {
      const end = job?.applicationEndDate;
      if (!end) return 'Active';
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(end);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= today ? 'Active' : 'Closed';
    } catch {
      return 'Active';
    }
  };

  const getApplicantsCountForJob = (jobTitle) => {
    // Return realistic applicant counts based on job title
    const applicantCounts = {
      'ELECTRICAL ENGINEER': 5,
      'ELECTRONICS ENGINEER': 3,
      'NETWORK TECHNICIAN': 8,
      'ELECTRICIAN': 12
    };
    return applicantCounts[jobTitle] || 0;
  };

  const handleUpdateJob = (job) => {
    console.log('Editing job:', job);
    alert('Edit button clicked! Job: ' + job.title);
    setEditingJob({ ...job });
    setShowUpdateJobForm(true);
  };

  const handleDeleteJob = (jobId) => {
    if (window.confirm(`Are you sure you want to delete the job "${jobs.find(j => j.id === jobId)?.title}"?`)) {
      console.log('Deleting job:', jobId);
      alert('Job deleted successfully!');
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
    }
  };

  const handleJobFieldChange = (field, value) => {
    console.log('Updating field:', field, 'to:', value);
    setEditingJob(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveJob = () => {
    if (!editingJob.title || !editingJob.location) {
      alert('Please fill in Job Title and Location');
      return;
    }
    
    console.log('Saving job:', editingJob);
    console.log('Current jobs before save:', jobs);
    
    if (editingJob.id && editingJob.id !== null && jobs.find(j => j.id === editingJob.id)) {
      // Update existing job
      console.log('Updating existing job');
      setJobs(prevJobs => {
        const updatedJobs = prevJobs.map(job => 
          job.id === editingJob.id ? editingJob : job
        );
        console.log('Updated jobs:', updatedJobs);
        return updatedJobs;
      });
      alert(`Job "${editingJob.title}" updated successfully!`);
    } else {
      // Create new job
      console.log('Creating new job');
      const newJob = {
        ...editingJob,
        id: Date.now(), // Generate new ID
        description: editingJob.description || 'Job description will be added here.',
        postedDate: new Date().toISOString().split('T')[0],
        status: 'active'
      };
      console.log('New job object:', newJob);
      setJobs(prevJobs => {
        const updatedJobs = [...prevJobs, newJob];
        console.log('Jobs after adding new job:', updatedJobs);
        return updatedJobs;
      });
      alert(`New job "${editingJob.title}" created successfully!`);
    }
    
    handleCloseUpdateForm();
  };

  const handleCloseUpdateForm = () => {
    setShowUpdateJobForm(false);
    setEditingJob(null);
  };

  const handleCreateNewJob = () => {
    const newJob = {
      id: null,
      title: '',
      description: '',
      location: '',
      salary: '',
      employmentType: 'full-time',
      experienceLevel: 'mid-level',
      yearsOfExperience: '',
      requirements: '',
      benefits: '',
      postedDate: new Date().toISOString().split('T')[0],
      status: 'draft'
    };
    
    setEditingJob(newJob);
    setShowUpdateJobForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditingJob(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingJob.title.trim() && editingJob.description.trim()) {
      handleSaveJob();
    }
  };

  const toggleUploadForm = () => {
    setShowUploadForm(!showUploadForm);
  };

  if (loading) {
    return (
      <div style={{minHeight: '100vh', backgroundColor: '#faf7f2', padding: '20px'}}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight: '100vh', backgroundColor: '#faf7f2', padding: '20px'}}>
      <div style={{maxWidth: '1200px', margin: '0 auto'}}>
        {/* Search Bar */}
        <div className="search-section">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              className="search-input"
              placeholder="Search jobs..."
              value={jobSearchTerm}
              onChange={(e) => setJobSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-board-header">
          <h1 className="admin-board-title">Job Board Management</h1>
          <button className="upload-job-btn" onClick={handleCreateNewJob}>
            <span className="btn-icon">+</span>
            CREATE NEW JOB
          </button>
        </div>

        {/* Update Job Form */}
        {showUpdateJobForm && (
          <div className="update-job-form" style={{border: '3px solid red', backgroundColor: 'yellow'}}>
            <div style={{padding: '10px', backgroundColor: 'lightgreen'}}>
              FORM IS RENDERING! showUpdateJobForm: {showUpdateJobForm.toString()}
            </div>
            <div className="form-header">
              <div className="form-header-content">
                <h2>
                  {editingJob?.id && jobs.find(j => j.id === editingJob.id) 
                    ? 'Edit Job Details' 
                    : 'Create New Job'
                  }
                </h2>
                <p className="form-subtitle">
                  {editingJob?.id && jobs.find(j => j.id === editingJob.id)
                    ? 'Update your job posting information'
                    : 'Add a new job posting to your board'
                  }
                </p>
              </div>
              <button className="close-form-btn" onClick={handleCloseUpdateForm}>✕</button>
            </div>

            <div className="form-content">
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
                <div className="field-icon">📍</div>
                <div className="field-content">
                  <label>Location</label>
                  <input 
                    type="text" 
                    value={editingJob?.location || ''} 
                    onChange={(e) => handleJobFieldChange('location', e.target.value)}
                    placeholder="Enter job location"
                  />
                </div>
              </div>

              <div className="form-field">
                <div className="field-icon">⏰</div>
                <div className="field-content">
                  <label>Experience Required</label>
                  <input 
                    type="text" 
                    value={editingJob?.yearsOfExperience || ''} 
                    onChange={(e) => handleJobFieldChange('yearsOfExperience', e.target.value)}
                    placeholder="e.g., 3 years"
                  />
                </div>
              </div>

              <div className="form-field">
                <div className="field-icon">💰</div>
                <div className="field-content">
                  <label>Salary</label>
                  <input 
                    type="text" 
                    value={editingJob?.salary || ''} 
                    onChange={(e) => handleJobFieldChange('salary', e.target.value)}
                    placeholder="e.g., ₱25,000 - ₱35,000"
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
                    value={editingJob?.applicationEndDate || ''} 
                    onChange={(e) => handleJobFieldChange('applicationEndDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-actions">
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

        {/* Simple Upload Form (Legacy) */}
        {showUploadForm && (
          <div className="upload-job-form">
            <div className="form-header">
              <h2>Upload New Job Posting</h2>
              <button className="close-form-btn" onClick={toggleUploadForm}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Job Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={editingJob?.title || ''}
                  onChange={handleInputChange}
                  placeholder="Enter job title"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Job Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={editingJob?.description || ''}
                  onChange={handleInputChange}
                  placeholder="Enter job description"
                  rows="4"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={toggleUploadForm}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Upload Job
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="job-cards-grid">
          {displayedJobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-card-header">
                <div className="job-title">{job.title}</div>
                <div className={`job-status-badge ${getJobStatus(job).toLowerCase()}`}>
                  {getJobStatus(job)}
                </div>
              </div>
              <div className="job-description">
                {job.description.length > 100 
                  ? `${job.description.substring(0, 100)}...` 
                  : job.description
                }
              </div>
              <div className="job-details">
                <div className="job-detail">
                  <span className="detail-icon">📍</span>
                  <span className="detail-text">{job.location}</span>
                </div>
                <div className="job-detail">
                  <span className="detail-icon">📅</span>
                  <span className="detail-text">Start: {job.applicationStartDate || 'Not Set'}</span>
                </div>
                <div className="job-detail">
                  <span className="detail-icon">⏰</span>
                  <span className="detail-text">End: {job.applicationEndDate || 'No Expiration'}</span>
                </div>
              </div>
              <div className="job-footer">
                <div className="applicants-summary">
                  {getApplicantsCountForJob(job.title)} applicants
                </div>
                <div className="job-actions">
                  <button className="edit-btn" onClick={() => handleUpdateJob(job)}>
                    <span className="btn-icon">✏️</span>
                    Edit
                  </button>
                  <button className="delete-btn" onClick={() => handleDeleteJob(job.id)}>
                    <span className="btn-icon">🗑️</span>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
          </div>
    </div>
  );
};

export default AdminJobBoard;