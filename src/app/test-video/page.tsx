"use client";

import { VideoPlayer } from "@/components/VideoPlayer";

export default function TestVideoPage() {
  // Test with a publicly available sample video
  const testVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">Video Player Test</h1>
        
        <div className="max-w-4xl mx-auto">
          <VideoPlayer
            src={testVideoUrl}
            title="Big Buck Bunny (Test Video)"
            className="w-full aspect-video mb-6"
            showDownload={true}
            showShare={true}
            qualities={['original']}
            defaultQuality="original"
            captions={[]}
            onTimeUpdate={(current, duration) => {
              console.log(`Progress: ${current}/${duration}`);
            }}
            onEnded={() => {
              console.log('Video ended');
            }}
          />
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Test Information</h2>
            <div className="space-y-2 text-sm">
              <p><strong>Video URL:</strong> {testVideoUrl}</p>
              <p><strong>Expected behavior:</strong> Video should load and play with custom controls</p>
              <p><strong>Features to test:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Play/Pause functionality</li>
                <li>Volume control</li>
                <li>Seeking/scrubbing</li>
                <li>Fullscreen mode</li>
                <li>Keyboard shortcuts (Space, Arrow keys, M, F)</li>
                <li>Auto-hide controls</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}