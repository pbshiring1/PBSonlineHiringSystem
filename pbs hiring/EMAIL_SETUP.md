# Email Setup Instructions

This document explains how to set up email functionality for the PBS Hiring application using EmailJS.

## Prerequisites

1. An EmailJS account (free at https://www.emailjs.com/)
2. A Gmail account or other email service provider

## Setup Steps

### 1. Create EmailJS Account

1. Go to https://www.emailjs.com/
2. Sign up for a free account
3. Verify your email address

### 2. Add Email Service

1. In your EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail recommended)
4. Follow the setup instructions for your provider
5. Note down your **Service ID** (e.g., `service_abc123`)

### 3. Create Email Templates

#### Template 1: Application Confirmation Email

1. Go to "Email Templates" in your EmailJS dashboard
2. Click "Create New Template"
3. Name it: `template_application_confirmation`
4. Use this template content:

```html
Subject: Application Confirmation - {{job_position}} Position

Dear {{to_name}},

Thank you for your interest in the {{job_position}} position at {{company_name}}.

Your application has been successfully submitted with the following details:

Application ID: {{application_id}}
Position Applied: {{job_position}}
Application Date: {{application_date}}

What happens next:
{{next_steps}}

We will review your application and contact you with updates via email.

Best regards,
{{company_name}} HR Team
```

#### Template 2: HR Notification Email

1. Create another template named: `template_hr_notification`
2. Use this template content:

```html
Subject: New Application Received - {{job_position}}

A new application has been received:

Applicant Name: {{applicant_name}}
Email: {{applicant_email}}
Position: {{job_position}}
Application ID: {{application_id}}
Date: {{application_date}}

Please review the application in the admin dashboard.

Best regards,
PBS Hiring System
```

### 4. Get Your Public Key

1. Go to "Account" in your EmailJS dashboard
2. Find your **Public Key** (e.g., `user_abc123def456`)
3. Copy this key

### 5. Update Configuration

1. Open `src/config/emailConfig.js`
2. Replace the placeholder values with your actual credentials:

```javascript
export const EMAIL_CONFIG = {
  SERVICE_ID: 'service_gigs2pn',
  TEMPLATE_ID: 'template_rz5irsl',
  PUBLIC_KEY: 'eJsllel7YnF9rRB_1',
  // ... rest of config
};
```

### 6. Test the Setup

1. Start your React application: `npm start`
2. Complete the application process
3. Check if the confirmation email is sent
4. Check your email inbox for the confirmation

## Email Template Variables

The following variables are available in your EmailJS templates:

### Application Confirmation Email:
- `{{to_name}}` - Applicant's full name
- `{{to_email}}` - Applicant's email address
- `{{job_position}}` - Selected job position
- `{{application_id}}` - Unique application ID
- `{{company_name}}` - Company name
- `{{application_date}}` - Application submission date
- `{{next_steps}}` - Next steps information

### HR Notification Email:
- `{{applicant_name}}` - Applicant's full name
- `{{applicant_email}}` - Applicant's email address
- `{{job_position}}` - Selected job position
- `{{application_id}}` - Unique application ID
- `{{application_date}}` - Application submission date
- `{{hr_email}}` - HR team email address

## Troubleshooting

### Common Issues:

1. **"Invalid service ID" error**
   - Check that your Service ID is correct in `emailConfig.js`
   - Ensure the service is active in your EmailJS dashboard

2. **"Invalid template ID" error**
   - Verify the template name matches exactly in `emailConfig.js`
   - Check that the template is published in EmailJS

3. **"Invalid public key" error**
   - Verify your Public Key is correct
   - Ensure your EmailJS account is verified

4. **Emails not being sent**
   - Check your email service provider settings
   - Verify the email service is properly connected in EmailJS
   - Check the browser console for error messages

### Testing:

1. Use the browser's developer console to check for errors
2. Verify all configuration values are correct
3. Test with a simple email first before using complex templates

## Security Notes

- Never commit your actual EmailJS credentials to version control
- Consider using environment variables for production
- The public key is safe to use in client-side code
- EmailJS handles the actual email sending securely

## Support

- EmailJS Documentation: https://www.emailjs.com/docs/
- EmailJS Support: https://www.emailjs.com/support/
- PBS Hiring System: Contact your development team
