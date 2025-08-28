"use client";

import React from "react";
import { SteppedVideoUpload } from "./SteppedVideoUpload";

interface VideoUploadProps {
  onUploadComplete?: (video: any) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

/**
 * Main Video Upload Component
 * 
 * This component now uses the SteppedVideoUpload component by default,
 * which provides:
 * - Real-time step-by-step progress indicators
 * - Automatic handling of both single-part and multipart uploads
 * - Thumbnail generation for both upload methods
 * - Mux transcription integration
 * - Professional stepped modal interface
 */
export function VideoUploadComponent({ 
  onUploadComplete, 
  onUploadError, 
  className 
}: VideoUploadProps) {
  return (
    <div className={className}>
      <SteppedVideoUpload
        onUploadComplete={onUploadComplete}
        onUploadError={onUploadError}
      />
    </div>
  );
}
