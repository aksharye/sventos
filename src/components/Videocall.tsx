"use client";

import { CSSProperties, useEffect, useRef, useState, useCallback } from "react";
import ZoomVideo, {
  VideoQuality,
  type VideoPlayer,
  SharePrivilege,
} from "@zoom/videosdk";
import { CameraButton, MicButton } from "./MuteButtons";
import { PhoneOff, MonitorUp, MicOff } from "lucide-react";
import { Button } from "./ui/button";
import { startVideoStream, stopVideoStream } from '../utils/videoUtils';
import { getRandomPosition, calculateMaxDimensions } from '../utils/layoutUtils';
import React from "react";

interface VideoPlayerContainerProps {
  ref: React.RefObject<HTMLDivElement>;
  style: React.CSSProperties;
  children: React.ReactNode;
}

const VideoPlayerContainer = React.forwardRef<HTMLDivElement, Omit<VideoPlayerContainerProps, 'ref'>>(
  ({ style, children }, ref) => {
    return <div ref={ref} style={style}>{children}</div>;
  }
);
VideoPlayerContainer.displayName = "video-player-container";

const Videocall = (props: { slug: string; JWT: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const session = props.slug;
  const jwt = props.JWT;
  const [inSession, setInSession] = useState(false);
  const client = useRef(ZoomVideo.createClient());
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [userName] = useState(`User-${Math.floor(Math.random() * 1000)}`);

  const renderVideo = async (event: { action: "Start" | "Stop"; userId: number; }) => {
    try {
      console.log(event.userId);
      const mediaStream = client.current.getMediaStream();
      const currentUserId = client.current.getCurrentUserInfo().userId;
      const isLocalUser = currentUserId === event.userId;

      // Get video container from existing slot
      if (!containerRef.current) return;
      let videoContainer = containerRef.current.querySelector(
        `#video-${event.userId}`
      ) as HTMLDivElement;
      
      if (!videoContainer && event.action === "Start") {
        const videosContainer = containerRef.current.querySelector('#videos-container');
        if (videosContainer) {
          // Create draggable wrapper
          const draggableWrapper = document.createElement('div');
          draggableWrapper.className = 'draggable-video';
          draggableWrapper.style.position = 'absolute';
          draggableWrapper.style.width = '320px';
          draggableWrapper.style.height = '240px';
          draggableWrapper.style.border = '1px solid #334155';
          draggableWrapper.style.boxSizing = 'border-box';
          draggableWrapper.style.minWidth = '200px';
          draggableWrapper.style.minHeight = '150px';
          draggableWrapper.style.cursor = 'se-resize';
          draggableWrapper.style.resize = 'both';
          draggableWrapper.style.overflow = 'hidden';
          
          // Random position for all videos
          const containerRect = videosContainer.getBoundingClientRect();
          const { maxX, maxY } = calculateMaxDimensions(containerRect, 320, 240);
          const { x, y } = getRandomPosition(maxX, maxY);
          draggableWrapper.style.left = `${x}px`;
          draggableWrapper.style.top = `${y}px`;
          
          // Add drag handlers for Command key
          let isDragging = false;
          let initialX = 0; 
          let initialY = 0;

          const startDragging = (e: { metaKey: any; clientX: number; clientY: number; }) => {
            if (!e.metaKey) {
              // Enable resize mode by default
              draggableWrapper.style.resize = 'both';
              draggableWrapper.style.overflow = 'hidden';
              draggableWrapper.style.cursor = 'se-resize';
              return;
            }
            // Enable drag mode with Command key
            isDragging = true;
            draggableWrapper.style.resize = 'none';
            draggableWrapper.style.overflow = 'visible';
            const rect = draggableWrapper.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;
            draggableWrapper.style.zIndex = '100';
            draggableWrapper.style.cursor = 'grabbing';
          };

          const stopDragging = () => {
            isDragging = false;
            draggableWrapper.style.zIndex = '50';
            draggableWrapper.style.resize = 'both';
            draggableWrapper.style.overflow = 'hidden';
            draggableWrapper.style.cursor = 'se-resize';
          };

          const drag = (e: { preventDefault: () => void; clientX: number; clientY: number; }) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.clientX - initialX;
            const y = e.clientY - initialY;
            
            // Keep within the container bounds
            const bounds = videosContainer.getBoundingClientRect();
            const newX = Math.max(bounds.left, Math.min(x, bounds.right - draggableWrapper.offsetWidth));
            const newY = Math.max(bounds.top, Math.min(y, bounds.bottom - draggableWrapper.offsetHeight));
            
            draggableWrapper.style.left = `${newX - bounds.left}px`;
            draggableWrapper.style.top = `${newY - bounds.top}px`;
          };

          draggableWrapper.addEventListener('mousedown', startDragging);
          document.addEventListener('mousemove', drag);
          document.addEventListener('mouseup', stopDragging);
          
          // Update cursor when Command key changes
          document.addEventListener('keydown', (e) => {
            if (e.metaKey) draggableWrapper.style.cursor = 'grab';
          });
          document.addEventListener('keyup', (e) => {
            if (e.key === 'Meta') draggableWrapper.style.cursor = 'se-resize';
          });
          
          // Bring element to front on click
          draggableWrapper.addEventListener('click', () => {
            const allWrappers = document.querySelectorAll('.draggable-video, .draggable-share');
            allWrappers.forEach(wrapper => (wrapper as HTMLElement).style.zIndex = '50'); // Reset all
            draggableWrapper.style.zIndex = '100'; // Bring clicked one to front
          });
          
          // Create video container
          videoContainer = document.createElement('div');
          videoContainer.id = `video-${event.userId}`;
          videoContainer.style.width = '100%';
          videoContainer.style.height = '100%';
          videoContainer.style.position = 'relative';
          videoContainer.style.overflow = 'hidden';
          videoContainer.style.borderRadius = '16px';
          videoContainer.style.backgroundColor = '#1E293B';
          videoContainer.style.border = '1px solid #334155';
          videoContainer.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          
          // Create video element
          const videoElement = document.createElement('video');
          videoElement.style.width = '100%';
          videoElement.style.height = '100%';
          videoElement.style.objectFit = 'contain';
          videoElement.style.borderRadius = '16px';
          
          // Mirror local video
          if (isLocalUser) {
            videoElement.style.transform = 'scaleX(-1)';
          }
          
          videoContainer.appendChild(videoElement);
          draggableWrapper.appendChild(videoContainer);
          videosContainer.appendChild(draggableWrapper);
        }
      }

      const videoWrapperStyle: CSSProperties = {
        width: '100%',
        height: '100%',
        backgroundColor: '#1E293B',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        border: '1px solid #334155',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        cursor: 'move',
        userSelect: 'none',
        touchAction: 'none',
      };

      if (!videoContainer &&event.action === "Stop") {
        videoContainer = document.createElement('div');
        videoContainer.id = `video-${event.userId}`;
        Object.assign(videoContainer.style, videoWrapperStyle);
        const videosContainer = containerRef.current.querySelector('#videos-container');
        videoContainer.style.backgroundColor = 'rgba(255,255,255,0)';
        if (videosContainer) {
          videosContainer.appendChild(videoContainer);
        }
      }

      if (!videoContainer) return;


      // Clean up existing video
      const existingVideo = videoContainer.querySelector('video');
      if (existingVideo && event.action === "Stop") existingVideo.remove();

      if (event.action === "Start") {
        // Create inner container for video content
        const videoContent = document.createElement('div');
        videoContent.className = 'video-content';
        Object.assign(videoContent.style, {
          position: 'absolute',
          inset: 0,
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        });
        
        // Setup video element
        const userVideo = await mediaStream.attachVideo(
          event.userId,
          VideoQuality.Video_360P
        ) as VideoPlayer;
        
        Object.assign(userVideo.style, {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'none',
          transition: 'none'
        });
        
        // Add name label
        const nameLabel = document.createElement('div');
        nameLabel.textContent = isLocalUser ? 'You' : 'Participant';
        Object.assign(nameLabel.style, {
          position: 'absolute',
          bottom: '0.5rem',
          left: '0.5rem',
          padding: '0.25rem 0.75rem',
          background: 'rgba(0, 0, 0, 0.5)',
          color: '#fff',
          borderRadius: '9999px',
          fontSize: '0.875rem',
          fontWeight: '500',
          zIndex: 10,
          pointerEvents: 'none',
          transform: 'none',
          transition: 'none'
        });
        
        // Clear and append elements
        videoContainer.innerHTML = '';
        videoContainer.style.backgroundColor = 'rgba(255,255,255,0)';
        videoContent.appendChild(userVideo);
        videoContent.appendChild(nameLabel);
        videoContainer.appendChild(videoContent);
        
        if (isLocalUser) setIsVideoMuted(true);
        return;
      } else {
        videoContainer.style.backgroundColor = 'rgba(20,20,20,1.0)';
      }
      
      if (isLocalUser) setIsVideoMuted(false);
    } catch (error) {
      console.error('Error rendering video:', error);
    }
  };

  const joinSession = async () => {
    await client.current.init("en-US", "Global", { patchJsMedia: true });
    client.current.on("peer-video-state-change", renderVideo);
    client.current.on("active-share-change", (payload) => {
      console.log("active-share-change", payload);
      handleShareChange(payload);
    });
    client.current.on("user-added", (payload) => {
      console.log("user-added", payload);
    });
    // client.current.on("user-removed", (payload) => {
    //   if (!containerRef.current) return;
    //   if (!payload) return;
    //   if (!payload.userId) return;
    //   const videoContainer = containerRef.current.querySelector(`#video-${payload.userId}`);
    //   if (videoContainer) {
    //     const parentElement = videoContainer.parentElement;
    //     if (parentElement) {
    //       parentElement.remove(); // Remove the draggable wrapper
    //     }
    //   }
    // });
    await client.current.join(session, jwt, userName).catch((e) => {
      console.log(e);
    });
    setInSession(true);

    

    const mediaStream = client.current.getMediaStream();
    await mediaStream.startAudio();
    setIsAudioMuted(mediaStream.isAudioMuted());
    await mediaStream.startVideo();
    setIsVideoMuted(!mediaStream.isCapturingVideo());
    client.current.getAllUser().forEach(async (user) => {
      console.log(user);
      if (user.bVideoOn) {
        await renderVideo({
          action: "Start",
          userId: user.userId,
        });
      } else {
        await renderVideo({
          action: "Stop",
          userId: user.userId,
        });
      }
    });

    await renderVideo({
      action: "Start",
      userId: client.current.getCurrentUserInfo().userId,
    });
  };

  async function handleShareChange(payload: { state: 'Active' | 'Inactive', userId: number }) {
    if (!client.current || !containerRef.current) return;
    
    const mediaStream = client.current.getMediaStream();
    let sharesContainer = containerRef.current.querySelector('#shares-container');
    if (!sharesContainer) return;

    if (payload.state === 'Active') {        
      // Create draggable wrapper for screen shares
      const draggableWrapper = document.createElement('div');
      draggableWrapper.className = 'draggable-share';
      draggableWrapper.style.position = 'absolute';
      draggableWrapper.style.zIndex = '50';
      draggableWrapper.style.resize = 'both';
      draggableWrapper.style.overflow = 'hidden';
      draggableWrapper.style.cursor = 'default';

      // Set maximum size for incoming screens
      const maxWidth = 320; // Maximum width
      const maxHeight = 240; // Maximum height
      draggableWrapper.style.width = `${maxWidth}px`;
      draggableWrapper.style.height = `${maxHeight}px`;

      // Random initial position
      const containerRect = sharesContainer.getBoundingClientRect();
      const maxX = containerRect.width - maxWidth;
      const maxY = containerRect.height - maxHeight;
      draggableWrapper.style.left = `${Math.random() * maxX}px`;
      draggableWrapper.style.top = `${Math.random() * maxY}px`;

      // Create video container
      const videoContainer = document.createElement('div');
      videoContainer.id = `share-${payload.userId}`;
      videoContainer.style.width = '100%';
      videoContainer.style.height = '100%';
      videoContainer.style.position = 'relative';
      videoContainer.style.overflow = 'hidden';
      videoContainer.style.borderRadius = '16px';
      videoContainer.style.backgroundColor = '#1E293B';
      videoContainer.style.border = '1px solid #334155';
      videoContainer.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';

      // Add drag handlers for Command key
      let isDragging = false;
      let initialX = 0;
      let initialY = 0;

      const startDragging = (e: MouseEvent) => {
        if (!e.metaKey) return; // Only start dragging if Command key is pressed
        isDragging = true;
        const rect = draggableWrapper.getBoundingClientRect();
        initialX = e.clientX - rect.left;
        initialY = e.clientY - rect.top;
        draggableWrapper.style.zIndex = '100';
        draggableWrapper.style.cursor = 'grabbing';
      };

      const stopDragging = () => {
        isDragging = false;
        draggableWrapper.style.zIndex = '50';
        draggableWrapper.style.cursor = 'default';
      };

      const drag = (e: MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.clientX - initialX;
        const y = e.clientY - initialY;
        
        // Keep within the container bounds
        const bounds = sharesContainer.getBoundingClientRect();
        const newX = Math.max(bounds.left, Math.min(x, bounds.right - draggableWrapper.offsetWidth));
        const newY = Math.max(bounds.top, Math.min(y, bounds.bottom - draggableWrapper.offsetHeight));
        
        draggableWrapper.style.left = `${newX - bounds.left}px`;
        draggableWrapper.style.top = `${newY - bounds.top}px`;
      };

      draggableWrapper.addEventListener('mousedown', startDragging);
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDragging);
      
      // Update cursor when Command key changes
      document.addEventListener('keydown', (e) => {
        if (e.metaKey) draggableWrapper.style.cursor = 'grab';
      });
      document.addEventListener('keyup', (e) => {
        if (e.key === 'Meta') draggableWrapper.style.cursor = 'default';
      });

      // Bring element to front on click
      draggableWrapper.addEventListener('click', () => {
        const allWrappers = document.querySelectorAll('.draggable-video, .draggable-share');
        allWrappers.forEach(wrapper => (wrapper as HTMLElement).style.zIndex = '50'); // Reset all
        draggableWrapper.style.zIndex = '100'; // Bring clicked one to front
      });

      // Create video element
      const videoElement = document.createElement('canvas');
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.objectFit = 'contain';
      videoElement.style.borderRadius = '16px';
      videoElement.style.transform = 'none';
      videoElement.style.transition = 'none';

      // Append elements
      videoContainer.appendChild(videoElement);
      draggableWrapper.appendChild(videoContainer);
      sharesContainer.appendChild(draggableWrapper);

      // Start share view
      await mediaStream.startShareView(videoElement, payload.userId);
    } else if (payload.state === 'Inactive') {
      // Remove share container when screenshare stops
      const shareContainer = containerRef.current.querySelector(`#share-${payload.userId}`);
      if (shareContainer) {
        const parentElement = shareContainer.parentElement;
        if (parentElement) {
          // Clean up event listeners
          if (parentElement.parentNode) {
            const clone = parentElement.cloneNode(true) as HTMLElement;
            parentElement.parentNode.replaceChild(clone, parentElement);
            clone.remove();
          }
        }
        setIsSharing(false);
        await mediaStream.stopShareView();
      }
    }
  };

  const toggleShare = async () => {
    try {
      if (!client.current || !containerRef.current) return;
      const mediaStream = client.current.getMediaStream();
      
      if (!isSharing) {
        // Create draggable wrapper for screen shares
        const draggableWrapper = document.createElement('div');
        draggableWrapper.className = 'draggable-share';
        draggableWrapper.style.position = 'absolute';
        draggableWrapper.style.zIndex = '50';
        draggableWrapper.style.width = '640px';
        draggableWrapper.style.height = '480px';
        draggableWrapper.style.border = '1px solid #334155';
        draggableWrapper.style.boxSizing = 'border-box';
        draggableWrapper.style.minWidth = '320px';
        draggableWrapper.style.minHeight = '240px';
        draggableWrapper.style.resize = 'both';
        draggableWrapper.style.overflow = 'hidden';
        draggableWrapper.style.cursor = 'default';
        
        let sharesContainer = containerRef.current.querySelector('#shares-container');
        if (!sharesContainer) return;
        const containerRect = sharesContainer.getBoundingClientRect();
        const maxX = containerRect.width - 640;
        const maxY = containerRect.height - 480;
        draggableWrapper.style.left = `${Math.random() * maxX}px`;
        draggableWrapper.style.top = `${Math.random() * maxY}px`;

        // Create video container
        const videoContainer = document.createElement('div');
        videoContainer.id = `share-${client.current.getCurrentUserInfo().userId}`;
        videoContainer.style.width = '100%';
        videoContainer.style.height = '100%';
        videoContainer.style.position = 'relative';
        videoContainer.style.overflow = 'hidden';
        videoContainer.style.borderRadius = '16px';
        videoContainer.style.backgroundColor = '#1E293B';
        videoContainer.style.border = '1px solid #334155';
        videoContainer.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';

        // Add drag handlers for Command key
        let isDragging = false;
        let initialX = 0;
        let initialY = 0;

        const startDragging = (e: MouseEvent) => {
          if (!e.metaKey) return; // Only start dragging if Command key is pressed
          isDragging = true;
          const rect = draggableWrapper.getBoundingClientRect();
          initialX = e.clientX - rect.left;
          initialY = e.clientY - rect.top;
          draggableWrapper.style.zIndex = '100';
          draggableWrapper.style.cursor = 'grabbing';
        };

        const stopDragging = () => {
          isDragging = false;
          draggableWrapper.style.zIndex = '50';
          draggableWrapper.style.cursor = 'default';
        };

        const drag = (e: MouseEvent) => {
          if (!isDragging) return;
          e.preventDefault();
          const x = e.clientX - initialX;
          const y = e.clientY - initialY;
          
          // Keep within the container bounds
          if (!containerRef.current) return;
          let sharesContainer = containerRef.current.querySelector('#shares-container');
          if (sharesContainer) {
            const bounds = sharesContainer.getBoundingClientRect();
            const newX = Math.max(bounds.left, Math.min(x, bounds.right - draggableWrapper.offsetWidth));
            const newY = Math.max(bounds.top, Math.min(y, bounds.bottom - draggableWrapper.offsetHeight));
            
            draggableWrapper.style.left = `${newX - bounds.left}px`;
            draggableWrapper.style.top = `${newY - bounds.top}px`;
          }
        };

        draggableWrapper.addEventListener('mousedown', startDragging);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDragging);
        
        // Update cursor when Command key changes
        document.addEventListener('keydown', (e) => {
          if (e.metaKey) draggableWrapper.style.cursor = 'grab';
        });
        document.addEventListener('keyup', (e) => {
          if (e.key === 'Meta') draggableWrapper.style.cursor = 'default';
        });

        // Bring element to front on click
        draggableWrapper.addEventListener('click', () => {
          const allWrappers = document.querySelectorAll('.draggable-video, .draggable-share');
          allWrappers.forEach(wrapper => (wrapper as HTMLElement).style.zIndex = '50'); // Reset all
          draggableWrapper.style.zIndex = '100'; // Bring clicked one to front
        });

        // Create video element
        const videoElement = document.createElement('video');
        Object.assign(videoElement.style, {
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius: '16px'
        });

        // Add name label
        const nameLabel = document.createElement('div');
        Object.assign(nameLabel.style, {
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: '5px',
          borderRadius: '4px',
          fontSize: '12px'
        });
        nameLabel.textContent = `${userName}'s Screen`;

        videoContainer.appendChild(videoElement);
        videoContainer.appendChild(nameLabel);
        draggableWrapper.appendChild(videoContainer);
        if (sharesContainer) sharesContainer.appendChild(draggableWrapper);
        
        await mediaStream.startShareScreen(videoElement);
        setIsSharing(true);
      } else {
        await mediaStream.stopShareScreen();
        setIsSharing(false);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      setIsSharing(false);
    }
  };

  const leaveSession = async () => {
    if (!client.current) return;
    client.current.off("peer-video-state-change", renderVideo);
    client.current.off("active-share-change", handleShareChange);
    await client.current.leave().catch((e) => console.error("leave error", e));
    window.location.href = "/";
  };

  useEffect(() => {
    client.current = ZoomVideo.createClient();
    
    return () => {
      
      if (client.current) {
        client.current.off("peer-video-state-change", renderVideo);
        client.current.off("active-share-change", handleShareChange);
        client.current.leave().catch(e => console.error("leave error", e));
      }
    };
  }, []);

  const videoContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    padding: '1.5rem',
    gap: '1.5rem',
    position: 'relative',
  };

  return (

    <div className="fixed inset-0 bg-[#0F172A] overflow-hidden">
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <h1 className="text-center text-xl font-medium text-slate-300/80 px-4 py-2 rounded-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50">
          {session}
        </h1>
      </div>
      <div
        className="h-full w-full"
        style={inSession ? {} : { display: "none" }}
      >
        <VideoPlayerContainer ref={containerRef} style={videoContainerStyle}>
          {/* Videos container */}
          <div className="absolute inset-0 z-0">
            <div id="videos-container" className="absolute inset-0 overflow-hidden"></div>
            
            {/* Screen shares container */}
            <div id="shares-container" className="absolute inset-0 overflow-hidden"></div>
          </div>
        </VideoPlayerContainer>
      </div>
      {!inSession ? (
        <div className="mx-auto flex w-64 flex-col self-center mt-[40vh]">
          <div className="w-4" />
          <Button className="flex flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-105" onClick={joinSession} title="join session">
            Join
          </Button>
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 transform transition-transform duration-300 ease-in-out hover:translate-y-0 translate-y-[calc(100%-1.5rem)] z-50">
          <div className="mx-auto w-[30rem] rounded-t-2xl bg-slate-800/90 p-6 border border-slate-700 shadow-lg backdrop-blur-sm">
            <div className="mb-4 flex justify-center">
              <div className="h-1.5 w-12 rounded-full bg-slate-600 hover:bg-slate-500 transition-colors cursor-pointer"></div>
            </div>
            <div className="flex justify-around">
              <CameraButton
                client={client}
                isVideoMuted={isVideoMuted}
                setIsVideoMuted={setIsVideoMuted}
                renderVideo={renderVideo}
              />
              <MicButton
                client={client}
                isAudioMuted={isAudioMuted}
                setIsAudioMuted={setIsAudioMuted}
              />
              <Button
                onClick={toggleShare}
                variant={isSharing ? "destructive" : "default"}
                title={isSharing ? "stop share" : "start share"}
              >
                <MonitorUp />
              </Button>
              <Button
                onClick={leaveSession}
                variant="destructive"
                title="leave session"
              >
                <PhoneOff />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Videocall;
