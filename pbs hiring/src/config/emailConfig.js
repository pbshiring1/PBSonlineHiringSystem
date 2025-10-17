// EmailJS Configuration
// Replace these with your actual EmailJS credentials

export const EMAIL_CONFIG = {
  // Your actual EmailJS credentials
  SERVICE_ID: 'service_gigs2pn', // Your EmailJS service ID
  TEMPLATE_ID: 'template_rz5irsl', // Your template ID
  PUBLIC_KEY: 'd9vxPzlTTqidfPIRL', // Your EmailJS public key
  
  // Email templates
  TEMPLATES: {
    APPLICATION_CONFIRMATION: 'template_rz5irsl', // Your application confirmation template
    HR_NOTIFICATION: 'template_61k9855', // Your HR notification template
    // Use a dedicated Interview Schedule template (create this in EmailJS and replace the ID below)
    INTERVIEW_SCHEDULE: 'template_2f5z624'
  },
  
  // Company information
  COMPANY: {
    NAME: 'PBS Engineering Company',
    EMAIL: 'noreply@pbsengineering.com',
    HR_EMAIL: 'hr@pbsengineering.com',
    WEBSITE: 'https://pbsengineering.com'
  }
};

// Email template variables that will be available in your EmailJS templates
export const EMAIL_VARIABLES = {
  // For applicant confirmation email
  APPLICANT_CONFIRMATION: {
    to_name: '{{to_name}}',
    to_email: '{{to_email}}',
    job_position: '{{job_position}}',
    application_id: '{{application_id}}',
    company_name: '{{company_name}}',
    application_date: '{{application_date}}',
    next_steps: '{{next_steps}}'
  },
  
  // For HR notification email
  HR_NOTIFICATION: {
    applicant_name: '{{applicant_name}}',
    applicant_email: '{{applicant_email}}',
    job_position: '{{job_position}}',
    application_id: '{{application_id}}',
    application_date: '{{application_date}}',
    hr_email: '{{hr_email}}'
  }
  ,
  // For Interview Schedule email
  INTERVIEW_SCHEDULE: {
    to_name: '{{to_name}}',
    to_email: '{{to_email}}',
    job_position: '{{job_position}}',
    interview_date: '{{interview_date}}',
    interview_time: '{{interview_time}}',
    interview_location: '{{interview_location}}',
    interview_message: '{{interview_message}}',
    company_name: '{{company_name}}'
  }
};
