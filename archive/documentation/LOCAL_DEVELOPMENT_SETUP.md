# Local Development Setup - Quick Start

## 🚀 Run the Application Locally (No AWS Required)

Since you're experiencing AWS permissions issues, you can run the full application locally for development and testing.

### Step 1: Install Dependencies

```powershell
# Navigate to the project directory (if not already there)
cd nextjs-project-starter

# Install all required packages
npm install
```

### Step 2: Create Local Environment File

```powershell
# Create a local environment file
copy .env.example .env.local
```

If `.env.example` doesn't exist, create `.env.local` manually:

```bash
# Database (using local SQLite for development)
DATABASE_URL=sqlite:./dev.db

# Application Settings
NEXTAUTH_SECRET=your-local-secret-key-for-development-only
NEXTAUTH_URL=http://localhost:3000

# File Upload Settings (local storage)
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./public/uploads

# AI Services (optional - for plagiarism detection)
OLLAMA_API_URL=http://localhost:11434

# AWS Settings (optional - leave empty for local development)
# AWS_REGION=us-east-1
# S3_BUCKET_NAME=
# MEDIACONVERT_ENDPOINT=

# Microsoft 365 Integration (optional)
# NEXT_PUBLIC_AZURE_AD_CLIENT_ID=
# NEXT_PUBLIC_AZURE_AD_AUTHORITY=
# NEXT_PUBLIC_AZURE_AD_REDIRECT_URI=http://localhost:3000/dashboard
# NEXT_PUBLIC_AZURE_AD_LOGOUT_REDIRECT_URI=http://localhost:3000/login
```

### Step 3: Start Development Server

```powershell
# Start the Next.js development server
npm run dev
```

### Step 4: Access the Application

Open your browser and go to: **http://localhost:3000**

## 🎯 What You Can Do Locally

### ✅ Fully Functional Features
- **Browse the repository** - All public pages work
- **User authentication** - Login with mock users
- **Dashboard access** - Role-based dashboards
- **Editorial workflow** - Complete editorial system
- **Course management** - Create and manage courses
- **Content creation** - Write and edit articles
- **User management** - Admin user controls
- **Bluebook citation checking** - AI-powered validation
- **Plagiarism detection** - With Ollama integration
- **File uploads** - Local file storage
- **Video management** - Basic video handling

### 🔄 Mock Data Available
The application includes comprehensive mock data:
- Sample users with different roles
- Example articles and content
- Course data
- Editorial workflow examples
- Citation samples

## 👥 Test User Accounts

You can log in with these pre-configured accounts:

### Admin Account
- **Email**: `admin@law.edu`
- **Password**: Any password (mock authentication)
- **Access**: Full system administration

### Faculty Account
- **Email**: `professor@law.edu`
- **Password**: Any password
- **Access**: Course management, content creation

### Editor-in-Chief Account
- **Email**: `editor.chief@law.edu`
- **Password**: Any password
- **Access**: Editorial workflow management

### Student Account
- **Email**: `student@law.edu`
- **Password**: Any password
- **Access**: Course access, assignment submission

## 🛠️ Development Features

### Hot Reload
- Changes to code automatically refresh the browser
- Fast development iteration

### TypeScript Support
- Full type checking and IntelliSense
- Compile-time error detection

### Component Library
- Complete UI component system
- Consistent design patterns

### API Routes
- All backend functionality works locally
- Mock data for testing

## 📁 Key Pages to Explore

### Public Pages
- **Home**: http://localhost:3000
- **Browse**: http://localhost:3000/public/browse
- **Articles**: http://localhost:3000/public/articles
- **Videos**: http://localhost:3000/public/videos

### Dashboard (after login)
- **Main Dashboard**: http://localhost:3000/dashboard
- **Course Management**: http://localhost:3000/dashboard/courses
- **Editorial Workflow**: http://localhost:3000/dashboard/editorial
- **User Management**: http://localhost:3000/dashboard/admin/users
- **Video Management**: http://localhost:3000/dashboard/videos

## 🔧 Optional: Set Up Ollama for AI Features

If you want to test AI-powered plagiarism detection:

### Install Ollama
```powershell
# Download and install Ollama from: https://ollama.ai/download
# Or using winget:
winget install Ollama.Ollama
```

### Download AI Model
```powershell
# After installing Ollama, download the CodeLlama model
ollama pull codellama
```

### Start Ollama Service
```powershell
# Ollama should start automatically, or run:
ollama serve
```

Now the plagiarism detection API will work with real AI analysis!

## 🚀 Production Deployment (Later)

When you're ready for production:

1. **Fix AWS permissions** (see `AWS_PERMISSIONS_FIX.md`)
2. **Run AWS setup script**
3. **Deploy to Vercel**: `npx vercel`
4. **Configure production environment variables**

## 📊 Performance

Local development includes:
- **Fast builds** with Turbopack
- **Optimized images** with Next.js Image component
- **Code splitting** for faster page loads
- **TypeScript compilation** for error checking

## 🐛 Troubleshooting

### Port Already in Use
```powershell
# If port 3000 is busy, use a different port:
npm run dev -- --port 3001
```

### Module Not Found Errors
```powershell
# Clear node_modules and reinstall:
rm -rf node_modules
rm package-lock.json
npm install
```

### TypeScript Errors
```powershell
# Check for TypeScript issues:
npm run type-check
```

## 🎉 You're Ready!

Your law school repository is now running locally with full functionality. You can:

- ✅ Test all features without AWS
- ✅ Develop and customize the application
- ✅ Add your own content and users
- ✅ Prepare for production deployment

The application is designed to work seamlessly in both local development and cloud production environments.
