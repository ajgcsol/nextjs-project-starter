# Video Upload Enhancement Plan

## Current Issues to Fix

### 1. Thumbnail Selection Issue
**Problem**: Upload first modal defaults to fallback thumbnail instead of allowing user choice
**Solution**: During thumbnail processing step, pause and show interactive thumbnail selection UI

**Implementation Details**:
- When thumbnail step starts, pause processing and show:
  - Video preview with scrubber/timeline
  - Real-time thumbnail preview as user scrubs through video
  - Option to upload custom thumbnail file
  - "Accept Thumbnail" button to confirm selection and continue
- Only after user accepts thumbnail, move to transcript step

### 2. Transcript Processing Issue  
**Problem**: Transcript not being added in second-to-last step
**Solution**: Implement real Mux transcription with speaker identification

**Implementation Details**:
- Use Mux automatic transcription API
- Add speaker diarization to identify multiple speakers (primary speakers only, not audience)
- Generate both closed captions (for video player) and readable transcript (for display below video)
- Store speaker-identified transcript in database

### 3. Enhanced Features to Add

#### A. Speaker Identification
- Use Mux transcription with speaker diarization
- Allow tagging of primary speakers (not audience members)  
- Format: "Speaker 1: [text]", "Speaker 2: [text]"
- Store speaker names/roles in metadata

#### B. Closed Captioning via Mux
- Enable Mux automatic caption generation (similar to thumbnail setup)
- Generate WebVTT files for video player
- Support multiple languages if needed

#### C. Transcript Display on Video Player Page
- Show full transcript below video player
- Include speaker identification
- Make transcript searchable/interactive
- Sync transcript highlighting with video playback

## Technical Implementation Steps

### Step 1: Fix Thumbnail Selection in UploadFirstServerlessModal
1. Update thumbnail step to be interactive (not just processing)
2. Add real-time thumbnail preview during video scrubbing
3. Add "Accept Thumbnail" confirmation before proceeding
4. Store selected thumbnail data (timestamp or custom file)

### Step 2: Implement Real Mux Transcription
1. Update `generateTranscription()` function to use real Mux API
2. Enable speaker diarization in Mux asset creation
3. Process transcript data with speaker identification
4. Store transcript with speaker metadata in database

### Step 3: Add Closed Captioning Integration
1. Configure Mux asset creation to generate captions
2. Set up WebVTT file generation and storage
3. Update video players to use Mux captions

### Step 4: Enhance Video Player Pages
1. Add transcript display component below video player
2. Implement transcript-to-video time syncing
3. Add speaker identification display
4. Make transcript searchable and interactive

### Step 5: Speaker Management System
1. Add speaker tagging interface during upload/editing
2. Allow naming of identified speakers
3. Store speaker metadata in database
4. Display speaker names instead of "Speaker 1", "Speaker 2"

## Files to Modify

### Core Modal Fix
- `src/components/UploadFirstServerlessModal.tsx` - Fix thumbnail selection during processing

### Mux Integration
- `src/lib/mux-video-processor.ts` - Add real transcription and speaker diarization
- `src/lib/mux-webhook-handler.ts` - Handle transcription completion events

### Video Player Enhancement
- `src/components/MuxVideoPlayer.tsx` - Add transcript display and speaker features
- Create new `TranscriptDisplay.tsx` component for transcript UI

### Database Updates
- Add speaker metadata fields to video schema
- Add transcript storage with speaker identification

## Expected User Experience

### During Upload:
1. User uploads video → sees video preview
2. User scrubs through video to select thumbnail timestamp OR uploads custom image
3. User clicks "Accept Thumbnail" → processing continues
4. Mux processes video and generates transcription with speaker identification
5. User can optionally tag/name identified speakers
6. Processing completes with thumbnail, captions, and transcript ready

### During Video Viewing:
1. Video plays with Mux captions available
2. Full transcript displays below video with speaker identification
3. Clicking transcript text jumps to that point in video
4. Transcript is searchable and shows speaker names/roles

## Priority Order
1. **HIGH**: Fix thumbnail selection UI during processing step
2. **HIGH**: Implement real Mux transcription (replace placeholder)
3. **MEDIUM**: Add speaker identification and tagging
4. **MEDIUM**: Add transcript display to video player pages
5. **LOW**: Enhanced speaker management interface

## Notes
- Keep existing fallback behavior for compatibility
- Ensure mobile-responsive design for all new UI elements
- Test with various video lengths and speaker counts
- Document speaker identification limitations (primary speakers only)