'use client';

import { useEffect, useRef } from 'react';

// Mux Player Web Component types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mux-player': {
        'playback-id'?: string;
        'metadata-video-title'?: string;
        'metadata-video-id'?: string;
        'metadata-viewer-user-id'?: string;
        'accent-color'?: string;
        'prefer-mse'?: boolean;
        'stream-type'?: 'on-demand' | 'live' | 'll-live';
        'start-time'?: number;
        autoplay?: boolean;
        muted?: boolean;
        'disable-cookies'?: boolean;
        'disable-tracking'?: boolean;
        poster?: string;
        'playback-token'?: string;
        'custom-domain'?: string;
        style?: React.CSSProperties;
        onPlay?: () => void;
        onPause?: () => void;
        onTimeUpdate?: (e: CustomEvent) => void;
        onLoadedData?: () => void;
        onEnded?: () => void;
        children?: React.ReactNode;
      };
    }
  }
}

interface MuxPlayerProps {
  playbackId: string;
  title?: string;
  videoId?: string;
  userId?: string;
  accentColor?: string;
  poster?: string;
  autoplay?: boolean;
  muted?: boolean;
  startTime?: number;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onLoadedData?: () => void;
  onEnded?: () => void;
  style?: React.CSSProperties;
}

export function MuxPlayerComponent({
  playbackId,
  title,
  videoId,
  userId = 'anonymous',
  accentColor = '#0066CC',
  poster,
  autoplay = false,
  muted = false,
  startTime,
  className = '',
  onPlay,
  onPause,
  onTimeUpdate,
  onLoadedData,
  onEnded,
  style
}: MuxPlayerProps) {
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Load Mux Player script if not already loaded
    if (!document.querySelector('script[src*="mux-player"]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player@2/dist/index.js';
      script.defer = true;
      document.head.appendChild(script);
      
      console.log('🎬 Loading Mux Player script');
    }

    // Set up event listeners
    const player = playerRef.current;
    if (!player) return;

    const handlePlay = () => {
      console.log('▶️ Video playing');
      onPlay?.();
    };

    const handlePause = () => {
      console.log('⏸️ Video paused');
      onPause?.();
    };

    const handleTimeUpdate = (e: CustomEvent) => {
      if (onTimeUpdate && player.currentTime && player.duration) {
        onTimeUpdate(player.currentTime, player.duration);
      }
    };

    const handleLoadedData = () => {
      console.log('📊 Video data loaded');
      onLoadedData?.();
    };

    const handleEnded = () => {
      console.log('🏁 Video ended');
      onEnded?.();
    };

    player.addEventListener('play', handlePlay);
    player.addEventListener('pause', handlePause);
    player.addEventListener('timeupdate', handleTimeUpdate);
    player.addEventListener('loadeddata', handleLoadedData);
    player.addEventListener('ended', handleEnded);

    return () => {
      if (player) {
        player.removeEventListener('play', handlePlay);
        player.removeEventListener('pause', handlePause);
        player.removeEventListener('timeupdate', handleTimeUpdate);
        player.removeEventListener('loadeddata', handleLoadedData);
        player.removeEventListener('ended', handleEnded);
      }
    };
  }, [onPlay, onPause, onTimeUpdate, onLoadedData, onEnded]);

  return (
    <div className={`mux-player-container ${className}`} style={style}>
      <mux-player
        ref={playerRef}
        playback-id={playbackId}
        metadata-video-title={title || 'Video'}
        metadata-video-id={videoId}
        metadata-viewer-user-id={userId}
        accent-color={accentColor}
        prefer-mse={true}
        stream-type="on-demand"
        start-time={startTime}
        autoplay={autoplay}
        muted={muted}
        poster={poster}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          ...style
        }}
      >
        {/* Subtitles will be automatically loaded by Mux if available */}
      </mux-player>
      
      <style jsx>{`
        .mux-player-container {
          width: 100%;
          height: 100%;
          position: relative;
        }
        
        /* Ensure responsive behavior */
        .mux-player-container mux-player {
          --media-object-fit: contain;
          --media-object-position: center;
          --controls-backdrop-color: rgba(0, 0, 0, 0.7);
        }

        /* Custom styling for better integration */
        .mux-player-container mux-player::part(media) {
          border-radius: inherit;
        }
      `}</style>
    </div>
  );
}

export default MuxPlayerComponent;