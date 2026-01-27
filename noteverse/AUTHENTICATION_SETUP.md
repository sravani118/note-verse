# 🔐 NoteVerse Authentication Setup Guide

This guide will help you configure Google OAuth and Email functionality for NoteVerse.

---

## 📧 Part 1: Email Configuration (For Password Reset)

### Option A: Using Gmail (Recommended for Development)

1. **Enable 2-Step Verification** in your Google Account:
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification" → Turn it ON

2. **Create App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Or search for "App passwords" in Google Account settings
   - Select app: "Mail"
   - Select device: "Other" → Type "NoteVerse"
   - Click "Generate"
   - **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

3. **Update your `.env.local` file**:
   ```env
   EMAIL_SERVER_HOST=smtp.gmail.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=your-email@gmail.com
   EMAIL_SERVER_PASSWORD=abcd efgh ijkl mnop  # The 16-char app password
   EMAIL_FROM=your-email@gmail.com
   ```

### Option B: Using Other Email Providers

#### **SendGrid** (Free tier: 100 emails/day)
```env
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=YOUR_SENDGRID_API_KEY
EMAIL_FROM=verified-email@yourdomain.com
```

#### **Mailgun** (Free tier: 5,000 emails/month)
```env
EMAIL_SERVER_HOST=smtp.mailgun.org
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=postmaster@your-domain.mailgun.org
EMAIL_SERVER_PASSWORD=YOUR_MAILGUN_PASSWORD
EMAIL_FROM=noreply@your-domain.mailgun.org
```

---

## 🔵 Part 2: Google OAuth Configuration

### Step 1: Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### Step 2: Create or Select Project
1. Click project dropdown at the top
2. Click "New Project"
3. Name: **NoteVerse** (or any name)
4. Click "Create"
5. Wait for creation, then select it

### Step 3: Enable Required APIs
1. Left sidebar → "APIs & Services" → "Library"
2. Search: **"Google+ API"**
3. Click it → Click **"Enable"**

### Step 4: Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose **"External"** → Click "Create"
3. Fill in the form:
   ```
   App name: NoteVerse
   User support email: [your-email@gmail.com]
   App logo: [Optional - skip for now]
   App domain: [Skip for development]
   Authorized domains: [Skip for development]
   Developer contact: [your-email@gmail.com]
   ```
4. Click "Save and Continue"
5. **Scopes** page → Click "Save and Continue" (default scopes are fine)
6. **Test users** → Add your email → Click "Save and Continue"
7. **Summary** → Click "Back to Dashboard"

### Step 5: Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → Select **"OAuth client ID"**
3. Configure:
   ```
   Application type: Web application
   Name: NoteVerse Web Client
   
   Authorized JavaScript origins:
   - http://localhost:3001
   
   Authorized redirect URIs:
   - http://localhost:3001/api/auth/callback/google
   ```
4. Click "Create"

### Step 6: Copy Your Credentials
A popup will show:
- **Client ID**: `123456789012-abc123xyz456.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-abc123xyz789...`

**⚠️ IMPORTANT: Save these credentials!**

### Step 7: Update `.env.local`
Add to your `.env.local` file:
```env
GOOGLE_CLIENT_ID=123456789012-abc123xyz456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz789...
```

---

## 🔒 Part 3: Generate NextAuth Secret

Run this command in your terminal:
```bash
openssl rand -base64 32
```

Or use Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and update `.env.local`:
```env
NEXTAUTH_SECRET=your-generated-secret-here
```

---

## ✅ Final `.env.local` File

Your complete `.env.local` should look like:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://sravani-08:sravani08@noteverse.xytooc0.mongodb.net/noteverse?retryWrites=true&w=majority

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=generated-32-char-secret-here

# Google OAuth Credentials
GOOGLE_CLIENT_ID=123456789012-abc123xyz456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz789...

# Email Configuration
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com

# Environment
NODE_ENV=development
```

---

## 🧪 Testing

### Test Google OAuth:
1. Go to: http://localhost:3001/login
2. Click "Continue with Google"
3. Sign in with your Google account
4. You should be redirected to the dashboard

### Test Forgot Password:
1. Go to: http://localhost:3001/forgot-password
2. Enter your email
3. Check your email for reset link
4. Click the link and set new password

---

## 🐛 Common Issues

### "Error 400: redirect_uri_mismatch"
- Double-check the redirect URI in Google Console
- Must be exactly: `http://localhost:3001/api/auth/callback/google`
- No trailing slash!

### "Access blocked: This app's request is invalid"
- Complete the OAuth consent screen configuration
- Add yourself as a test user

### Email not sending:
- Verify Gmail app password (no spaces)
- Check if 2-Step Verification is enabled
- Try using the email test endpoint: `/api/test-email`

### "Invalid client" error:
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
- Check for extra spaces or line breaks
- Restart the development server after changing .env.local

---

## 📝 Next Steps

Once configured:
1. Restart your development server: `npm run dev`
2. Test all authentication flows
3. Create some test accounts
4. Try password reset
5. Test Google OAuth sign-in

---

## 🎉 You're Done!

Your NoteVerse authentication is now fully configured with:
- ✅ Email/Password authentication
- ✅ Google OAuth (Continue with Google)
- ✅ Password reset via email
- ✅ Secure MongoDB storage

Happy coding! 🚀
