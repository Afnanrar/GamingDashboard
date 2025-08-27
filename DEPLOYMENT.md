# 🚀 Deployment Guide - Gaming Agent Management System

This guide will walk you through deploying your Gaming Agent Management System to Vercel, from GitHub setup to production deployment.

## 📋 Prerequisites

- [GitHub](https://github.com) account
- [Vercel](https://vercel.com) account
- [Supabase](https://supabase.com) project set up
- [Google Gemini AI](https://ai.google.dev/) API key

## 🔧 Step 1: Prepare Your Project

### 1.1 Initialize Git Repository
```bash
# If not already initialized
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: Gaming Agent Management System"

# Add remote origin (replace with your GitHub repo URL)
git remote add origin https://github.com/yourusername/gaming-agent-management.git

# Push to GitHub
git push -u origin main
```

### 1.2 Verify Project Structure
Ensure your project has these key files:
```
gaming-agent-management/
├── index.tsx              # Main application file
├── index.css              # Styles
├── package.json           # Dependencies
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
├── supabase_schema.sql    # Database schema
├── README.md              # Project documentation
└── .env.local             # Environment variables (local only)
```

## 🌐 Step 2: Set Up Supabase Database

### 2.1 Create Supabase Project
1. Go to [Supabase](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `gaming-agent-management`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"

### 2.2 Run Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire content of `supabase_schema.sql`
3. Paste and run the script
4. Verify all tables are created successfully

### 2.3 Get Database Credentials
1. Go to **Settings** → **API**
2. Note down:
   - **Project URL**
   - **anon public key**
   - **service_role key** (keep this secret)

## 🔑 Step 3: Configure Environment Variables

### 3.1 Create Environment File
Create `.env.local` in your project root:
```env
# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase (you'll add these later)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3.2 Get Gemini API Key
1. Go to [Google AI Studio](https://ai.google.dev/)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env.local` file

## 📤 Step 4: Deploy to Vercel

### 4.1 Connect GitHub to Vercel
1. Go to [Vercel](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Select the `gaming-agent-management` repository

### 4.2 Configure Project Settings
In the Vercel project configuration:

**Build Settings:**
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

**Environment Variables:**
Add these variables in Vercel dashboard:
```env
GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4.3 Deploy
1. Click "Deploy"
2. Wait for build to complete
3. Your app will be available at `https://your-project.vercel.app`

## 🔄 Step 5: Continuous Deployment

### 5.1 Automatic Deployments
Vercel automatically deploys on every push to your main branch:
```bash
# Make changes to your code
git add .
git commit -m "Update feature X"
git push origin main

# Vercel automatically deploys the changes
```

### 5.2 Preview Deployments
For pull requests, Vercel creates preview deployments:
1. Create a feature branch
2. Make changes
3. Create a pull request
4. Vercel generates a preview URL
5. Test changes before merging

## 🧪 Step 6: Testing Your Deployment

### 6.1 Basic Functionality Test
1. **Home Page**: Verify landing page loads
2. **Business Registration**: Test business signup
3. **Login**: Test with sample credentials:
   - Email: `test@test.com`
   - Password: `password`
4. **Dashboard**: Verify all features work
5. **AI Integration**: Test Gemini AI insights

### 6.2 Performance Testing
1. **Page Load Speed**: Use Lighthouse in Chrome DevTools
2. **Mobile Responsiveness**: Test on various screen sizes
3. **Cross-browser**: Test on Chrome, Firefox, Safari, Edge

## 🔒 Step 7: Security & Production

### 7.1 Environment Variables
Ensure sensitive data is in Vercel environment variables, not in code:
```env
# ✅ Good - In Vercel dashboard
GEMINI_API_KEY=sk-...

# ❌ Bad - In code
const apiKey = "sk-..."
```

### 7.2 Domain Configuration
1. **Custom Domain**: Add your domain in Vercel
2. **SSL Certificate**: Automatically provided by Vercel
3. **DNS Configuration**: Update your domain's DNS records

### 7.3 Monitoring
1. **Vercel Analytics**: Enable in project settings
2. **Error Tracking**: Monitor build and runtime errors
3. **Performance**: Track Core Web Vitals

## 🚨 Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Check build logs in Vercel dashboard
# Common causes:
# - Missing dependencies
# - TypeScript errors
# - Environment variable issues
```

#### Environment Variable Issues
```bash
# Verify in Vercel dashboard:
# - Variables are set correctly
# - No extra spaces or quotes
# - Variables are accessible to build process
```

#### Database Connection Issues
```bash
# Check Supabase:
# - Project is active
# - API keys are correct
# - Database is accessible
# - Row Level Security is configured
```

### Debug Commands
```bash
# Local testing
npm run dev

# Build testing
npm run build

# Preview build
npm run preview

# Check for TypeScript errors
npx tsc --noEmit
```

## 📊 Step 8: Post-Deployment

### 8.1 Performance Optimization
1. **Bundle Analysis**: Use `npm run build` to analyze bundle size
2. **Image Optimization**: Ensure images are optimized
3. **Caching**: Configure proper cache headers

### 8.2 SEO & Analytics
1. **Meta Tags**: Verify all meta tags are present
2. **Google Analytics**: Add tracking code if needed
3. **Search Console**: Submit sitemap to Google

### 8.3 Backup & Recovery
1. **Database Backups**: Set up Supabase backups
2. **Code Backups**: Ensure GitHub repository is up to date
3. **Environment Variables**: Document all variables

## 🔄 Step 9: Updates & Maintenance

### 9.1 Regular Updates
```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Update to latest versions
npm outdated
```

### 9.2 Monitoring
1. **Uptime**: Monitor application availability
2. **Performance**: Track Core Web Vitals
3. **Errors**: Monitor error rates and types

## 📚 Additional Resources

### Documentation
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)
- [React Documentation](https://react.dev/)

### Support
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)
- **Community**: GitHub Issues, Discord, Stack Overflow

## 🎉 Congratulations!

Your Gaming Agent Management System is now deployed and running in production! 

### Next Steps:
1. **Monitor Performance**: Keep an eye on Vercel analytics
2. **User Feedback**: Collect feedback from your users
3. **Feature Updates**: Continue developing new features
4. **Scaling**: Plan for growth and additional users

---

**Need Help?** Create an issue in your GitHub repository or contact the development team.

**Happy Deploying! 🚀**
