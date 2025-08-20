# Law School Institutional Repository

A comprehensive digital repository system designed specifically for law schools, featuring advanced editorial workflows, course management, plagiarism detection, Bluebook citation checking, and multimedia content management.

## 🏛️ Features

### 📚 Editorial Workflow System
- **Advanced Track Changes**: Real-time collaborative editing with change tracking
- **Plagiarism Detection**: AI-powered plagiarism checking using Ollama
- **Bluebook Citation Validation**: Automated citation format checking
- **Section-based Review**: Assign different sections to editors and reviewers
- **Multi-stage Approval Process**: Customizable editorial workflow

### 🎓 Course Management
- **Professor Dashboard**: Create and manage courses, assignments, and grades
- **Student Portal**: Submit assignments, view grades, and access course materials
- **Assignment Management**: File uploads, due dates, and automated grading
- **Enrollment System**: Streamlined course registration and management

### 🎥 Media Integration
- **Video Processing**: Automated transcoding and streaming
- **File Management**: Secure upload and storage system
- **Thumbnail Generation**: Automatic video thumbnail creation
- **CDN Integration**: Fast global content delivery

### 👥 User Management
- **Role-based Access Control**: Granular permissions system
- **Microsoft 365 Integration**: SSO with institutional accounts
- **Multi-role Support**: Admin, Faculty, Editor, Reviewer, Student roles
- **User Analytics**: Comprehensive usage tracking

### 🔍 Content Discovery
- **Advanced Search**: Full-text search across all content
- **Public Repository**: Searchable database of published works
- **Event Management**: Academic events and conference management
- **Analytics Dashboard**: Usage statistics and insights

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd law-school-repository
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npm run db:setup
   ```
   This interactive script will:
   - Guide you through database configuration
   - Create the database schema
   - Set up initial roles and permissions
   - Create an admin user
   - Optionally create sample data

4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration (the setup script creates this for you)

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Login with your admin credentials

## 📋 Database Schema

The system uses PostgreSQL with a comprehensive schema designed for academic institutions:

### Core Tables
- **users**: User accounts and profiles
- **roles**: Role definitions and permissions
- **courses**: Course information and management
- **assignments**: Assignment details and requirements
- **articles**: Academic articles and publications
- **events**: Academic events and conferences
- **videos**: Video content and metadata

### Advanced Features
- **track_changes**: Version control for documents
- **bluebook_citations**: Citation validation and tracking
- **plagiarism_reports**: Plagiarism detection results
- **workflow_steps**: Editorial workflow management
- **audit_logs**: Complete audit trail

See `database/schema.sql` for the complete schema definition.

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API Routes, PostgreSQL
- **UI**: Tailwind CSS, Radix UI, Lucide Icons
- **Authentication**: Microsoft 365 SSO + Local Auth
- **File Storage**: Local/S3/Supabase Storage
- **Video Processing**: AWS MediaConvert/Mux

### Project Structure
```
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API endpoints
│   │   ├── dashboard/         # Admin/user dashboards
│   │   └── public/            # Public pages
│   ├── components/            # React components
│   │   ├── ui/               # UI components
│   │   └── *.tsx             # Feature components
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Utility libraries
│   └── types/                # TypeScript definitions
├── database/                 # Database schema and migrations
├── scripts/                  # Setup and utility scripts
├── public/                   # Static assets
└── docs/                     # Documentation
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lawschool

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Microsoft 365 (Optional)
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_AD_AUTHORITY=https://login.microsoftonline.com/tenant-id

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./public/uploads

# AI Services
OLLAMA_API_URL=http://localhost:11434

# Video Processing (Optional)
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret

# AWS (Optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Role Configuration

The system includes predefined roles:

- **Admin**: Full system access
- **Faculty**: Course management, content creation
- **Editor-in-Chief**: Editorial workflow management
- **Editor**: Content editing and review
- **Reviewer**: Content review and feedback
- **Student**: Assignment submission, content access
- **Video Editor**: Video content management
- **Researcher**: Citation validation, research tasks

## 📖 Usage Guide

### For Administrators
1. **User Management**: Create users, assign roles, manage permissions
2. **System Configuration**: Configure settings, manage integrations
3. **Analytics**: Monitor usage, generate reports
4. **Content Moderation**: Review and approve content

### For Faculty
1. **Course Creation**: Set up courses, add students
2. **Assignment Management**: Create assignments, grade submissions
3. **Content Publishing**: Publish articles, manage reviews
4. **Event Management**: Create and manage academic events

### For Students
1. **Course Enrollment**: Join courses, access materials
2. **Assignment Submission**: Submit work, view grades
3. **Content Access**: Browse published articles, watch videos
4. **Event Registration**: Register for academic events

### For Editors
1. **Editorial Workflow**: Manage article submissions
2. **Review Process**: Assign reviewers, track progress
3. **Citation Checking**: Validate Bluebook citations
4. **Publication Management**: Approve and publish content

## 🚀 Deployment

### Hosting Options

#### Option 1: Supabase + Vercel (Recommended for Small Institutions)
- **Cost**: ~$75-85/month
- **Setup**: See `HOSTING_RECOMMENDATIONS.md`
- **Benefits**: Managed database, built-in auth, easy scaling

#### Option 2: AWS (Enterprise)
- **Cost**: ~$164+/month
- **Setup**: See `AWS_SETUP_GUIDE.md`
- **Benefits**: Full control, enterprise features, unlimited scaling

#### Option 3: Self-Hosted
- **Cost**: ~$40-60/month
- **Setup**: DigitalOcean, Railway, or similar
- **Benefits**: Cost-effective, full control

### Production Checklist

- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Set up file storage (S3/Supabase)
- [ ] Configure CDN for media delivery
- [ ] Set up SSL certificates
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerts
- [ ] Test all functionality
- [ ] Configure user authentication
- [ ] Set up email notifications

## 🔒 Security

### Authentication & Authorization
- Role-based access control (RBAC)
- Microsoft 365 SSO integration
- Session management
- Password hashing (bcrypt)

### Data Protection
- SQL injection prevention
- XSS protection
- CSRF protection
- File upload validation
- Rate limiting

### Privacy
- GDPR compliance features
- Data retention policies
- User consent management
- Audit logging

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Database tests
npm run db:test

# Integration tests
npm run test:integration
```

## 📊 Monitoring

### Built-in Analytics
- User activity tracking
- Content engagement metrics
- System performance monitoring
- Error tracking and reporting

### External Integrations
- Google Analytics (optional)
- Sentry for error tracking
- CloudWatch for AWS deployments
- Supabase analytics for Supabase deployments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use conventional commit messages
- Add tests for new features
- Update documentation
- Ensure accessibility compliance

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Course Management
- `GET /api/courses` - List courses
- `POST /api/courses` - Create course
- `GET /api/courses/[id]` - Get course details
- `PUT /api/courses/[id]` - Update course
- `DELETE /api/courses/[id]` - Delete course

### Content Management
- `GET /api/articles` - List articles
- `POST /api/articles` - Create article
- `GET /api/articles/[id]` - Get article
- `PUT /api/articles/[id]` - Update article
- `POST /api/plagiarism/check` - Check plagiarism
- `POST /api/bluebook/check` - Validate citations

### File Management
- `POST /api/files/upload` - Upload file
- `GET /api/files/[id]` - Download file
- `DELETE /api/files/[id]` - Delete file

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check database status
pg_isready -h localhost -p 5432

# Reset database
npm run db:reset
```

**File Upload Issues**
- Check file size limits
- Verify upload directory permissions
- Check storage configuration

**Authentication Issues**
- Verify Microsoft 365 configuration
- Check session configuration
- Validate JWT secrets

### Getting Help
- Check the [Issues](../../issues) page
- Review the documentation
- Contact the development team

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)

## 📞 Support

For support and questions:
- 📧 Email: support@lawschool.edu
- 📖 Documentation: [docs.lawschool.edu](https://docs.lawschool.edu)
- 🐛 Issues: [GitHub Issues](../../issues)

---

**Built with ❤️ for legal education**
