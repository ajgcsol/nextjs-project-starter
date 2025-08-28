# Initialize Neon Database
$env:DATABASE_URL = "postgresql://neondb_owner:npg_AcpotanV8ig4@ep-twilight-field-ad34o7tz.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

Write-Host "🔗 Setting DATABASE_URL environment variable..."
Write-Host "🔄 Running database initialization script..."

node init-database.js
