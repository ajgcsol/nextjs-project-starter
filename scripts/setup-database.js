#!/usr/bin/env node

/**
 * Database Setup Script for Law School Repository
 * 
 * This script sets up the database schema and initial data
 * Run with: node scripts/setup-database.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function question(rl, query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function getDatabaseConfig() {
  const rl = createInterface();
  
  log('\n🏛️  Law School Repository Database Setup', 'cyan');
  log('==========================================\n', 'cyan');
  
  // Check if DATABASE_URL is already set
  if (process.env.DATABASE_URL) {
    log('✅ Found DATABASE_URL in environment variables', 'green');
    const useExisting = await question(rl, 'Use existing DATABASE_URL? (y/n): ');
    
    if (useExisting.toLowerCase() === 'y') {
      rl.close();
      return { connectionString: process.env.DATABASE_URL };
    }
  }
  
  log('Please provide database connection details:\n', 'yellow');
  
  const host = await question(rl, 'Database Host (localhost): ') || 'localhost';
  const port = await question(rl, 'Database Port (5432): ') || '5432';
  const database = await question(rl, 'Database Name (lawschool): ') || 'lawschool';
  const username = await question(rl, 'Database Username (postgres): ') || 'postgres';
  const password = await question(rl, 'Database Password: ');
  
  rl.close();
  
  const connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}`;
  
  return {
    host,
    port: parseInt(port),
    database,
    user: username,
    password,
    connectionString
  };
}

async function testConnection(config) {
  log('\n🔌 Testing database connection...', 'blue');
  
  const pool = new Pool({
    connectionString: config.connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    client.release();
    
    log('✅ Database connection successful!', 'green');
    log(`   Time: ${result.rows[0].current_time}`, 'green');
    log(`   Version: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`, 'green');
    
    return pool;
  } catch (error) {
    log('❌ Database connection failed!', 'red');
    log(`   Error: ${error.message}`, 'red');
    throw error;
  }
}

async function runSchema(pool) {
  log('\n📋 Setting up database schema...', 'blue');
  
  try {
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    log(`   Executing ${statements.length} SQL statements...`, 'yellow');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await pool.query(statement + ';');
          process.stdout.write(`\r   Progress: ${i + 1}/${statements.length} statements`);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            log(`\n❌ Error executing statement ${i + 1}:`, 'red');
            log(`   ${error.message}`, 'red');
            log(`   Statement: ${statement.substring(0, 100)}...`, 'yellow');
          }
        }
      }
    }
    
    log('\n✅ Database schema setup complete!', 'green');
  } catch (error) {
    log('❌ Schema setup failed!', 'red');
    log(`   Error: ${error.message}`, 'red');
    throw error;
  }
}

async function createAdminUser(pool) {
  log('\n👤 Creating admin user...', 'blue');
  
  const rl = createInterface();
  
  const email = await question(rl, 'Admin email: ');
  const name = await question(rl, 'Admin name: ');
  const department = await question(rl, 'Department (optional): ') || null;
  
  rl.close();
  
  try {
    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (email, name, department, is_active, email_verified)
       VALUES ($1, $2, $3, true, true)
       ON CONFLICT (email) DO UPDATE SET name = $2, department = $3
       RETURNING id`,
      [email, name, department]
    );
    
    const userId = userResult.rows[0].id;
    
    // Assign admin role
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, r.id
       FROM roles r
       WHERE r.name = 'admin'
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId]
    );
    
    log('✅ Admin user created successfully!', 'green');
    log(`   Email: ${email}`, 'green');
    log(`   ID: ${userId}`, 'green');
    
  } catch (error) {
    log('❌ Admin user creation failed!', 'red');
    log(`   Error: ${error.message}`, 'red');
  }
}

async function createSampleData(pool) {
  log('\n📚 Creating sample data...', 'blue');
  
  const rl = createInterface();
  const createSample = await question(rl, 'Create sample data for testing? (y/n): ');
  rl.close();
  
  if (createSample.toLowerCase() !== 'y') {
    log('⏭️  Skipping sample data creation', 'yellow');
    return;
  }
  
  try {
    // Create sample professor
    const profResult = await pool.query(
      `INSERT INTO users (email, name, department, is_active, email_verified)
       VALUES ('professor@law.edu', 'Prof. Sarah Johnson', 'Constitutional Law', true, true)
       ON CONFLICT (email) DO UPDATE SET name = 'Prof. Sarah Johnson'
       RETURNING id`
    );
    const profId = profResult.rows[0].id;
    
    // Assign faculty role
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, r.id FROM roles r WHERE r.name = 'faculty'
       ON CONFLICT DO NOTHING`,
      [profId]
    );
    
    // Create sample course
    const courseResult = await pool.query(
      `INSERT INTO courses (name, code, semester, year, professor_id, description)
       VALUES ('Constitutional Law I', 'LAW 201', 'Spring', 2024, $1, 'Introduction to constitutional law principles')
       ON CONFLICT (code, semester, year) DO UPDATE SET description = 'Introduction to constitutional law principles'
       RETURNING id`,
      [profId]
    );
    const courseId = courseResult.rows[0].id;
    
    // Create sample students
    const students = [
      { email: 'john.doe@student.law.edu', name: 'John Doe' },
      { email: 'jane.smith@student.law.edu', name: 'Jane Smith' },
      { email: 'mike.johnson@student.law.edu', name: 'Michael Johnson' }
    ];
    
    for (const student of students) {
      const studentResult = await pool.query(
        `INSERT INTO users (email, name, is_active, email_verified)
         VALUES ($1, $2, true, true)
         ON CONFLICT (email) DO UPDATE SET name = $2
         RETURNING id`,
        [student.email, student.name]
      );
      const studentId = studentResult.rows[0].id;
      
      // Assign student role
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, r.id FROM roles r WHERE r.name = 'student'
         ON CONFLICT DO NOTHING`,
        [studentId]
      );
      
      // Enroll in course
      await pool.query(
        `INSERT INTO course_enrollments (course_id, student_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [courseId, studentId]
      );
    }
    
    // Create sample assignment
    await pool.query(
      `INSERT INTO assignments (course_id, title, description, due_date, max_points)
       VALUES ($1, 'Constitutional Analysis Paper', 'Analyze a recent Supreme Court case and its constitutional implications', $2, 100)`,
      [courseId, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] // Due in 30 days
    );
    
    // Create sample article
    await pool.query(
      `INSERT INTO articles (title, abstract, content, author_id, status)
       VALUES ($1, $2, $3, $4, 'published')`,
      [
        'AI Ethics in Legal Practice: A Comprehensive Framework',
        'This article examines the ethical implications of AI adoption in law firms, courts, and legal education.',
        '# AI Ethics in Legal Practice\n\nThe integration of artificial intelligence in legal practice presents unprecedented opportunities and challenges...',
        profId
      ]
    );
    
    log('✅ Sample data created successfully!', 'green');
    log('   - 1 Professor (professor@law.edu)', 'green');
    log('   - 3 Students', 'green');
    log('   - 1 Course (Constitutional Law I)', 'green');
    log('   - 1 Assignment', 'green');
    log('   - 1 Published Article', 'green');
    
  } catch (error) {
    log('❌ Sample data creation failed!', 'red');
    log(`   Error: ${error.message}`, 'red');
  }
}

async function generateEnvFile(config) {
  log('\n📝 Generating environment file...', 'blue');
  
  const envContent = `# Database Configuration
DATABASE_URL=${config.connectionString}

# Application Settings
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000

# File Upload Settings
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./public/uploads

# Video Processing (if using Mux)
# MUX_TOKEN_ID=your-mux-token-id
# MUX_TOKEN_SECRET=your-mux-token-secret

# Plagiarism Detection (Ollama)
OLLAMA_API_URL=http://localhost:11434

# Email Settings (optional)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Microsoft 365 Integration (optional)
# NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-client-id
# NEXT_PUBLIC_AZURE_AD_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
# NEXT_PUBLIC_AZURE_AD_REDIRECT_URI=http://localhost:3000/dashboard
# NEXT_PUBLIC_AZURE_AD_LOGOUT_REDIRECT_URI=http://localhost:3000/login

# AWS Configuration (if using AWS)
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# S3_BUCKET_NAME=your-bucket-name
# CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net

# Supabase Configuration (if using Supabase)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
`;

  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (fs.existsSync(envPath)) {
    const rl = createInterface();
    const overwrite = await question(rl, '.env.local already exists. Overwrite? (y/n): ');
    rl.close();
    
    if (overwrite.toLowerCase() !== 'y') {
      log('⏭️  Skipping .env.local generation', 'yellow');
      return;
    }
  }
  
  fs.writeFileSync(envPath, envContent);
  log('✅ Environment file created: .env.local', 'green');
  log('   Please review and update the configuration as needed', 'yellow');
}

async function showNextSteps() {
  log('\n🎉 Database setup complete!', 'green');
  log('==========================================\n', 'green');
  
  log('Next steps:', 'cyan');
  log('1. Review and update .env.local with your configuration', 'white');
  log('2. Install additional dependencies:', 'white');
  log('   npm install pg @types/pg bcryptjs @types/bcryptjs', 'yellow');
  log('3. Start the development server:', 'white');
  log('   npm run dev', 'yellow');
  log('4. Visit http://localhost:3000 to see your application', 'white');
  log('\nFor production deployment, see:', 'cyan');
  log('- HOSTING_RECOMMENDATIONS.md for hosting options', 'white');
  log('- AWS_SETUP_GUIDE.md for AWS deployment', 'white');
  
  log('\n📚 Sample login credentials (if created):', 'magenta');
  log('- Admin: Use the email you provided during setup', 'white');
  log('- Professor: professor@law.edu', 'white');
  log('- Students: john.doe@student.law.edu, jane.smith@student.law.edu', 'white');
  log('- Password: Use "password123" for testing (update in production!)', 'yellow');
}

async function main() {
  try {
    const config = await getDatabaseConfig();
    const pool = await testConnection(config);
    
    await runSchema(pool);
    await createAdminUser(pool);
    await createSampleData(pool);
    await generateEnvFile(config);
    
    await pool.end();
    await showNextSteps();
    
  } catch (error) {
    log('\n💥 Setup failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { main };
