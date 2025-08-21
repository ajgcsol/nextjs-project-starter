# Set DATABASE_URL for Vercel
$databaseUrl = "postgresql://neondb_owner:npg_AcpotanV8ig4@ep-twilight-field-ad34o7tz.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

Write-Host "Setting DATABASE_URL environment variable..."
Write-Host "Database URL: $databaseUrl"

# Use vercel env add with the connection string
vercel env add DATABASE_URL production --value $databaseUrl
