# EmailJS Debug Guide

## Current Issue: 412 Precondition Failed Error

The 412 error means your EmailJS credentials are incorrect or the template is not properly configured.

## Step 1: Verify Your EmailJS Credentials

### 1.1 Check Your EmailJS Dashboard
1. Go to https://www.emailjs.com/
2. Sign in to your account
3. Go to **"Email Services"** in the left sidebar
4. Find your service and note the **Service ID** (should look like `service_abc123`)

### 1.2 Check Your Public Key
1. In your EmailJS dashboard, go to **"Account"** or **"Personal Settings"**
2. Look for **"Public Key"** or **"API Key"**
3. Copy the full key (it should be much longer than `eJsllel7YnF9rRB_1`)

### 1.3 Check Your Templates
1. Go to **"Email Templates"** in the left sidebar
2. Find your template and note the **Template ID** (should look like `template_abc123`)
3. Make sure the template is **published** (not just saved)

## Step 2: Test Your Credentials

### Option A: Use the Test File
1. Open `emailjs-test.html` in your browser
2. Check the console for detailed error messages
3. This will tell you exactly what's wrong

### Option B: Check Your EmailJS Dashboard
1. Go to your template
2. Click **"Test It"** button
3. Fill in the test parameters and send
4. If it fails, the error message will tell you what's wrong

## Step 3: Common Issues and Solutions

### Issue 1: Public Key Too Short
- **Problem**: Your public key `eJsllel7YnF9rRB_1` is too short
- **Solution**: Get the correct public key from your EmailJS account settings

### Issue 2: Service ID Not Found
- **Problem**: `service_gigs2pn` doesn't exist
- **Solution**: Check your EmailJS dashboard for the correct Service ID

### Issue 3: Template ID Not Found
- **Problem**: `template_rz5irsl` doesn't exist
- **Solution**: Check your EmailJS dashboard for the correct Template ID

### Issue 4: Template Not Published
- **Problem**: Template exists but is not published
- **Solution**: Go to your template and click "Publish"

## Step 4: Update Your Configuration

Once you have the correct credentials, update `src/config/emailConfig.js`:

```javascript
export const EMAIL_CONFIG = {
  SERVICE_ID: 'your_actual_service_id', // e.g., service_abc123
  TEMPLATE_ID: 'your_actual_template_id', // e.g., template_abc123
  PUBLIC_KEY: 'your_actual_public_key', // e.g., user_abc123def456ghi789
  // ... rest of config
};
```

## Step 5: Test Again

After updating the configuration:
1. Restart your React app
2. Go to the ApplicationSuccess page
3. Check the console for detailed error messages
4. The verification function will tell you exactly what's wrong

## Need Help?

If you're still having issues:
1. Check the browser console for detailed error messages
2. Verify your EmailJS account is active and not suspended
3. Make sure you're using the correct email service provider
4. Check if your template has all the required variables

## Quick Test

Run this in your browser console to test your credentials:

```javascript
// Replace with your actual credentials
const SERVICE_ID = 'your_service_id';
const TEMPLATE_ID = 'your_template_id';
const PUBLIC_KEY = 'your_public_key';

emailjs.init(PUBLIC_KEY);
emailjs.send(SERVICE_ID, TEMPLATE_ID, {
  to_name: 'Test',
  to_email: 'test@example.com'
}).then(console.log).catch(console.error);
```



