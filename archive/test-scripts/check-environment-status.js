console.log('🔍 Environment Variables Diagnostic');
console.log('=' .repeat(50));

// Database Configuration
console.log('\n📊 DATABASE CONFIGURATION:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING');
if (process.env.DATABASE_URL) {
  // Mask the password for security
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
  console.log('DATABASE_URL (masked):', maskedUrl);
}

// AWS Configuration
console.log('\n☁️ AWS CONFIGURATION:');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ SET' : '❌ MISSING');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ SET' : '❌ MISSING');
console.log('AWS_REGION:', process.env.AWS_REGION || '❌ MISSING');
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME || '❌ MISSING');
console.log('CLOUDFRONT_DOMAIN:', process.env.CLOUDFRONT_DOMAIN || '⚠️ OPTIONAL');

// Mux Configuration (Video Processing)
console.log('\n🎭 MUX VIDEO CONFIGURATION:');
console.log('VIDEO_MUX_TOKEN_ID:', process.env.VIDEO_MUX_TOKEN_ID ? '✅ SET' : '❌ MISSING');
console.log('VIDEO_MUX_TOKEN_SECRET:', process.env.VIDEO_MUX_TOKEN_SECRET ? '✅ SET' : '❌ MISSING');

// Other Mux Configuration (if any)
console.log('\n🔧 OTHER MUX CONFIGURATION:');
const otherMuxVars = Object.keys(process.env).filter(key => 
  key.startsWith('MUX_') && !key.startsWith('VIDEO_MUX_')
);
if (otherMuxVars.length > 0) {
  otherMuxVars.forEach(key => {
    console.log(`${key}:`, process.env[key] ? '✅ SET' : '❌ MISSING');
  });
} else {
  console.log('No other MUX_* variables found');
}

// Environment Summary
console.log('\n📋 ENVIRONMENT SUMMARY:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

const requiredVars = [
  'DATABASE_URL',
  'AWS_ACCESS_KEY_ID', 
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'S3_BUCKET_NAME'
];

const optionalVars = [
  'VIDEO_MUX_TOKEN_ID',
  'VIDEO_MUX_TOKEN_SECRET',
  'CLOUDFRONT_DOMAIN'
];

const missingRequired = requiredVars.filter(key => !process.env[key]);
const missingOptional = optionalVars.filter(key => !process.env[key]);

console.log('\n🚨 MISSING REQUIRED VARIABLES:');
if (missingRequired.length === 0) {
  console.log('✅ All required variables are set');
} else {
  missingRequired.forEach(key => console.log(`❌ ${key}`));
}

console.log('\n⚠️ MISSING OPTIONAL VARIABLES:');
if (missingOptional.length === 0) {
  console.log('✅ All optional variables are set');
} else {
  missingOptional.forEach(key => console.log(`⚠️ ${key}`));
}

console.log('\n🎯 NEXT STEPS:');
if (missingRequired.length > 0) {
  console.log('1. Set missing required environment variables');
  console.log('2. Restart the development server');
  console.log('3. Test database connection');
} else if (missingOptional.length > 0) {
  console.log('1. Set missing optional variables for full functionality');
  console.log('2. Test video upload with Mux integration');
} else {
  console.log('1. All environment variables are configured');
  console.log('2. Check database server connectivity');
  console.log('3. Run migration if needed');
}

console.log('\n📝 CONFIGURATION COMMANDS:');
console.log('# Set DATABASE_URL (example):');
console.log('# export DATABASE_URL="postgresql://user:password@host:5432/database"');
console.log('\n# Set VIDEO_MUX credentials:');
console.log('# export VIDEO_MUX_TOKEN_ID="your_mux_token_id"');
console.log('# export VIDEO_MUX_TOKEN_SECRET="your_mux_token_secret"');
