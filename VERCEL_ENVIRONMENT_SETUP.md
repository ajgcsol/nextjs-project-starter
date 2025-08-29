# Vercel Environment Variables Setup Guide

For the enhanced transcription system to work on Vercel, you need to configure these environment variables:

## Required Environment Variables

### AWS Services (for AWS Transcribe and S3)
```
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_s3_bucket_name
```

### OpenAI API (for Whisper AI and Entity Extraction)
```
OPENAI_API_KEY=your_openai_api_key
```

### Mux (for Video Processing and Subtitle Generation)
```
VIDEO_MUX_TOKEN_ID=your_mux_token_id
VIDEO_MUX_TOKEN_SECRET=your_mux_token_secret
```

### Database
```
DATABASE_URL=your_postgresql_connection_string
```

### Application
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Vercel Configuration Steps

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable above with appropriate values
5. Make sure to set variables for all environments (Production, Preview, Development)

## Service Priority and Fallbacks

The enhanced transcription system uses this priority order:

1. **AWS Transcribe** (Primary) - Best quality with speaker diarization
   - Requires: AWS credentials
   - Features: Speaker separation, high accuracy, handles long files

2. **Whisper AI** (Fallback) - Good quality, fast processing
   - Requires: OpenAI API key
   - Features: Good accuracy, multiple language support

3. **Mux Captions** (Alternative) - Built-in video platform feature
   - Requires: Mux credentials
   - Features: Integrated with video processing

## Testing Configuration

Use the test endpoint to verify all services:
```
GET /api/videos/test-transcription-services
```

This will show you which services are properly configured.

## Cost Considerations

- **AWS Transcribe**: ~$0.0004 per second of audio
- **OpenAI Whisper**: ~$0.006 per minute of audio
- **Mux Captions**: Included in Mux pricing plans

## Recommended Setup for Production

For maximum reliability, configure all three services:
1. AWS Transcribe for primary transcription (best quality)
2. OpenAI for fallback and entity extraction
3. Mux for basic caption functionality

This ensures your subtitle generation works even if one service is unavailable.