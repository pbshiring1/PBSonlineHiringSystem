// Email service using EmailJS
import emailjs from '@emailjs/browser';
import { EMAIL_CONFIG } from '../config/emailConfig';

// Initialize EmailJS
console.log('Initializing EmailJS with Public Key:', EMAIL_CONFIG.PUBLIC_KEY);
emailjs.init(EMAIL_CONFIG.PUBLIC_KEY);

/**
 * Verify EmailJS credentials
 * @returns {Object} - Verification result
 */
export const verifyEmailJSCredentials = () => {
  const issues = [];
  
  // Check Service ID format
  if (!EMAIL_CONFIG.SERVICE_ID || !EMAIL_CONFIG.SERVICE_ID.startsWith('service_')) {
    issues.push('Service ID should start with "service_" (e.g., service_abc123)');
  }
  
  // Check Template ID format
  if (!EMAIL_CONFIG.TEMPLATES.APPLICATION_CONFIRMATION || !EMAIL_CONFIG.TEMPLATES.APPLICATION_CONFIRMATION.startsWith('template_')) {
    issues.push('Template ID should start with "template_" (e.g., template_abc123)');
  }
  
  // Check Public Key format
  if (!EMAIL_CONFIG.PUBLIC_KEY || EMAIL_CONFIG.PUBLIC_KEY.length < 10) {
    issues.push('Public Key appears to be invalid (too short)');
  }
  
  // Check if using placeholder values
  if (EMAIL_CONFIG.SERVICE_ID === 'service_pbs_hiring') {
    issues.push('Service ID is still using placeholder value');
  }
  
  if (EMAIL_CONFIG.PUBLIC_KEY === 'your_public_key_here') {
    issues.push('Public Key is still using placeholder value');
  }
  
  return {
    isValid: issues.length === 0,
    issues: issues,
    credentials: {
      serviceId: EMAIL_CONFIG.SERVICE_ID,
      templateId: EMAIL_CONFIG.TEMPLATES.APPLICATION_CONFIRMATION,
      publicKey: EMAIL_CONFIG.PUBLIC_KEY
    }
  };
};

/**
 * Send interview schedule email to applicant
 * @param {Object} params
 * @param {string} params.to_name - Applicant name
 * @param {string} params.to_email - Applicant email
 * @param {string} params.job_position - Position title
 * @param {string} params.interview_date - Interview date (readable string)
 * @param {string} params.interview_time - Interview time (readable string)
 * @param {string} params.interview_location - Location or meeting link
 * @param {string} [params.interview_message] - Additional notes
 * @returns {Promise<boolean>}
 */
export const sendInterviewScheduleEmail = async (params) => {
  try {
    if (!params?.to_email) {
      console.error('[EmailJS] Missing to_email for interview invite. Params:', params);
      return false;
    }
    if (!params?.to_name) {
      console.warn('[EmailJS] Missing to_name, using fallback of "Applicant"');
    }
    if (!params?.job_position) {
      console.warn('[EmailJS] Missing job_position; email template may require it.');
    }
    const templateParams = {
      to_name: params.to_name,
      to_email: params.to_email,
      job_position: params.job_position,
      interview_date: params.interview_date,
      interview_time: params.interview_time,
      interview_location: params.interview_location,
      interview_message: params.interview_message || '',
      company_name: EMAIL_CONFIG.COMPANY.NAME,
      // Aliases for templates that still use generic fields
      name: params.to_name || 'Applicant',
      email: params.to_email,
      title: `Interview Invitation – ${params.job_position || ''}`.trim(),
      message: (params.interview_message || '').toString()
    };

    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATES.INTERVIEW_SCHEDULE || EMAIL_CONFIG.TEMPLATES.APPLICATION_CONFIRMATION,
      templateParams
    );

    console.log('Interview schedule email sent:', response);
    return true;
  } catch (error) {
    console.error('Failed to send interview schedule email:', error);
    console.error('Params used:', {
      serviceId: EMAIL_CONFIG.SERVICE_ID,
      templateId: EMAIL_CONFIG.TEMPLATES.INTERVIEW_SCHEDULE,
      publicKey: EMAIL_CONFIG.PUBLIC_KEY
    });
    return false;
  }
};

/**
 * Simple EmailJS connectivity test
 * @returns {Promise<boolean>} - Basic connectivity test result
 */
export const testBasicEmailJS = async () => {
  // Define basicParams outside try block so it's accessible in catch
  const basicParams = {
    to_name: 'Test',
    to_email: 'test@example.com',
    message: 'Test message'
  };
  
  try {
    console.log('Testing basic EmailJS connectivity...');
    console.log('Using Service ID:', EMAIL_CONFIG.SERVICE_ID);
    console.log('Using Template ID:', EMAIL_CONFIG.TEMPLATES.APPLICATION_CONFIRMATION);
    console.log('Using Public Key:', EMAIL_CONFIG.PUBLIC_KEY);
    
    console.log('Sending with parameters:', basicParams);
    
    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATES.APPLICATION_CONFIRMATION,
      basicParams
    );
    
    console.log('Basic EmailJS test successful:', response);
    return true;
  } catch (error) {
    console.error('Basic EmailJS test failed:', error);
    console.error('Full error object:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      text: error.text,
      response: error.response
    });
    
    // Log the exact request being made
    console.error('Request details:', {
      serviceId: EMAIL_CONFIG.SERVICE_ID,
      templateId: EMAIL_CONFIG.TEMPLATES.APPLICATION_CONFIRMATION,
      publicKey: EMAIL_CONFIG.PUBLIC_KEY,
      params: basicParams
    });
    
    return false;
  }
};

/**
 * Test EmailJS configuration
 * @returns {Promise<boolean>} - Configuration test result
 */
export const testEmailJSConfiguration = async () => {
  try {
    console.log('Testing EmailJS configuration...');
    console.log('Service ID:', EMAIL_CONFIG.SERVICE_ID);
    console.log('Public Key:', EMAIL_CONFIG.PUBLIC_KEY);
    console.log('Template ID:', EMAIL_CONFIG.TEMPLATES.APPLICATION_CONFIRMATION);
    
    // Test with minimal parameters - try different variable combinations
    const testParams = {
      to_name: 'Test User',
      to_email: 'test@example.com',
      job_position: 'Test Position',
      application_id: 'TEST-123',
      company_name: 'PBS Engineering Company',
      application_date: new Date().toLocaleDateString(),
      next_steps: 'Test steps'
    };
    
    console.log('Sending test email with params:', testParams);
    
    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATES.APPLICATION_CONFIRMATION,
      testParams
    );
    
    console.log('EmailJS test successful:', response);
    return true;
  } catch (error) {
    console.error('EmailJS test failed:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      text: error.text
    });
    
    // Try with even simpler parameters
    try {
      console.log('Trying with minimal parameters...');
      const simpleParams = {
        to_name: 'Test',
        to_email: 'test@example.com'
      };
      
      const simpleResponse = await emailjs.send(
        EMAIL_CONFIG.SERVICE_ID,
        EMAIL_CONFIG.TEMPLATES.APPLICATION_CONFIRMATION,
        simpleParams
      );
      
      console.log('Simple test successful:', simpleResponse);
      return true;
    } catch (simpleError) {
      console.error('Simple test also failed:', simpleError);
      return false;
    }
  }
};

/**
 * Send application confirmation email to applicant
 * @param {Object} applicantData - Applicant information
 * @param {string} applicantData.name - Applicant's full name
 * @param {string} applicantData.email - Applicant's email address
 * @param {string} applicantData.selectedJob - Selected job position
 * @param {string} applicantData.applicationId - Unique application ID
 * @returns {Promise<boolean>} - Success status
 */
export const sendApplicationConfirmationEmail = async (applicantData) => {
  try {
    console.log('Sending application confirmation email to:', applicantData.email);
    console.log('EmailJS Config:', {
      SERVICE_ID: EMAIL_CONFIG.SERVICE_ID,
      TEMPLATE_ID: EMAIL_CONFIG.TEMPLATES.APPLICATION_CONFIRMATION,
      PUBLIC_KEY: EMAIL_CONFIG.PUBLIC_KEY
    });
    
    // Prepare email template parameters
    const templateParams = {
      to_name: applicantData.name,
      to_email: applicantData.email,
      job_position: applicantData.selectedJob,
      application_id: applicantData.applicationId,
      company_name: 'PBS Engineering Company',
      application_date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      next_steps: [
        'We will contact you with updates via email',
        'Our HR team will review your application within 2-3 business days',
        'If selected, you will be contacted for an interview'
      ].join('\n• ')
    };

    console.log('Template parameters:', templateParams);

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATES.APPLICATION_CONFIRMATION,
      templateParams
    );

    console.log('Email sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      text: error.text
    });
    return false;
  }
};

/**
 * Send notification email to HR/Admin about new application
 * @param {Object} applicationData - Application information
 * @returns {Promise<boolean>} - Success status
 */
export const sendHRNotificationEmail = async (applicationData) => {
  try {
    console.log('Sending HR notification email for application:', applicationData.applicationId);
    
    const templateParams = {
      applicant_name: applicationData.name,
      applicant_email: applicationData.email,
      job_position: applicationData.selectedJob,
      application_id: applicationData.applicationId,
      application_date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      hr_email: 'hr@pbsengineering.com' // Replace with actual HR email
    };

    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      'template_61k9855', // Your actual HR notification template ID
      templateParams
    );

    console.log('HR notification email sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Error sending HR notification email:', error);
    return false;
  }
};

/**
 * Generate a unique application ID
 * @returns {string} - Unique application ID
 */
export const generateApplicationId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  return `PBS-${timestamp}-${randomStr}`.toUpperCase();
};

/**
 * Save application data to Firebase
 * @param {string} uid - User ID
 * @param {Object} applicationData - Application data
 * @returns {Promise<boolean>} - Success status
 */
export const saveApplicationData = async (uid, applicationData) => {
  try {
    // Import Firebase functions
    const { collection, addDoc } = await import('firebase/firestore');
    const { db } = await import('../firebase');
    
    // Save to applications collection
    const applicationRef = collection(db, 'applications');
    const docRef = await addDoc(applicationRef, {
      uid: uid,
      ...applicationData,
      status: 'submitted',
      submittedAt: new Date(),
      createdAt: new Date()
    });

    console.log('Application data saved with ID:', docRef.id);
    return true;
  } catch (error) {
    console.error('Error saving application data:', error);
    return false;
  }
};
