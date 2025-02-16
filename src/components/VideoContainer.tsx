"use client";

import React, { useEffect, useRef } from 'react';
import DraggableResizable from './DraggableResizable';

interface VideoContainerProps {
  userId: number;
  isLocalUser: boolean;
  onMount: (videoElement: HTMLVideoElement) => void;
  initialPosition?: { x: number; y: number };
  isScreenShare?: boolean;
}

const VideoContainer: React.FC<VideoContainerProps> = ({
  userId,
  isLocalUser,
  onMount,
  initialPosition = { x: 50, y: 50 },
  isScreenShare = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      onMount(videoRef.current);
    }
  }, [onMount]);

  return (
    <DraggableResizable
      initialWidth={isScreenShare ? 640 : 320}
      initialHeight={isScreenShare ? 480 : 240}
      minWidth={isScreenShare ? 320 : 200}
      minHeight={isScreenShare ? 240 : 150}
      defaultPosition={initialPosition}
      className={isScreenShare ? 'share-wrapper' : 'video-wrapper'}
    >
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
        />
        <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
          {isLocalUser ? 'You' : `User ${userId}`}
        </div>
      </div>
    </DraggableResizable>
  );
};

export default VideoContainer;