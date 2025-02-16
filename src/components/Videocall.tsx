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

const Videocall = (props: { slug: string; JWT: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const session = props.slug;
  const jwt = props.JWT;
  const [inSession, setInSession] = useState(false);
  const client = useRef(ZoomVideo.createClient());
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [userName] = useState(`User-${Math.floor(Math.random() * 1000)}`);
  const [participants, setParticipants] = useState<Set<number>>(new Set());
  const [activeShares, setActiveShares] = useState<Set<number>>(new Set());

  const renderVideo = async (event: { action: "Start" | "Stop"; userId: number; }) => {
    try {
      console.log(event.userId);
      const mediaStream = client.current.getMediaStream();
      const currentUserId = client.current.getCurrentUserInfo().userId;
      const isLocalUser = currentUserId === event.userId;

      // Get or create video container
      let videoContainer = containerRef.current.querySelector(
        `#video-${event.userId}`
      ) as HTMLDivElement;

      if (!videoContainer && event.action === "Start") {
        videoContainer = document.createElement('div');
        videoContainer.id = `video-${event.userId}`;
        Object.assign(videoContainer.style, videoWrapperStyle);
        const videosContainer = containerRef.current.querySelector('#videos-container');
        if (videosContainer) {
          videosContainer.appendChild(videoContainer);
        }
      }

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
        const userVideo = await mediaStream.attachVideo(
          event.userId,
          VideoQuality.Video_360P
        ) as VideoPlayer;
        
        Object.assign(videoContainer.style, {
          width: '105%',
          height: '100%',
          objectFit: 'cover'
        });

        videoContainer.innerHTML = '';
        videoContainer.style.backgroundColor = 'rgba(255,255,255,0)';
        videoContainer.appendChild(userVideo as VideoPlayer);
        if (isLocalUser) setIsVideoMuted(true);
        return;
      } else {
        videoContainer.style.backgroundColor = 'rgba(20,20,20,1.0)';
      }


      // Add name label
      const nameLabel = document.createElement('div');
      Object.assign(nameLabel.style, {
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.5)',
        color: 'white',
        padding: '5px',
        borderRadius: '4px',
        fontSize: '12px'
      });
      nameLabel.textContent = isLocalUser ? `${userName} (You)` : `Participant ${event.userId}`;
      
      videoContainer.appendChild(nameLabel);
      
      if (isLocalUser) setIsVideoMuted(false);
    } catch (error) {
      console.error('Error rendering video:', error);
      if (event.userId === client.current.getCurrentUserInfo().userId) {
        setIsVideoMuted(true);
      }
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
    client.current.on("user-removed", (payload) => {
      console.log("user-removed", payload);
    });
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
    
    try {
      const mediaStream = client.current.getMediaStream();
      const sharesContainer = containerRef.current.querySelector('#shares-container');
      if (!sharesContainer) return;

      if (payload.state === 'Active') {
        setActiveShares(prev => new Set([...prev, payload.userId]));
        
        // Create share container
        const shareContainer = document.createElement('div');
        shareContainer.id = `share-${payload.userId}`;
        Object.assign(shareContainer.style, {
          ...videoWrapperStyle,
          width: '640px',  // Larger size for shares
          height: '480px'
        });

        const videoElement = document.createElement('canvas');
        Object.assign(videoElement.style, {
          width: '100%',
          height: '100%',
          objectFit: 'contain'
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
        const isLocal = payload.userId === client.current.getCurrentUserInfo().userId;
        nameLabel.textContent = isLocal ? `${userName}'s Screen` : `Participant ${payload.userId}'s Screen`;

        shareContainer.appendChild(videoElement);
        shareContainer.appendChild(nameLabel);
        sharesContainer.appendChild(shareContainer);
        
        await mediaStream.startShareView(videoElement, payload.userId);
      } else if (payload.state === 'Inactive') {
        setActiveShares(prev => {
          const next = new Set(prev);
          next.delete(payload.userId);
          return next;
        });

        const shareContainer = sharesContainer.querySelector(`#share-${payload.userId}`);
        if (shareContainer) {
          shareContainer.remove();
        }
        await mediaStream.stopShareView();
      }
    } catch (error) {
      console.error('Error handling share change:', error);
    }
  };

  const toggleShare = async () => {
    if (!client.current || !containerRef.current) return;
    
    try {
      const mediaStream = client.current.getMediaStream();
      const sharesContainer = containerRef.current.querySelector('#shares-container');
      if (!sharesContainer) return;
      
      const userId = client.current.getCurrentUserInfo().userId;
      
      if (isSharing) {
        await mediaStream.stopShareScreen();
        const shareContainer = sharesContainer.querySelector(`#share-${userId}`);
        if (shareContainer) {
          shareContainer.remove();
        }
        setIsSharing(false);
      } else {
        const shareContainer = document.createElement('div');
        shareContainer.id = `share-${userId}`;
        Object.assign(shareContainer.style, {
          ...videoWrapperStyle,
          width: '640px',
          height: '480px'
        });

        const videoElement = document.createElement('video');
        Object.assign(videoElement.style, {
          width: '100%',
          height: '100%',
          objectFit: 'contain'
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

        shareContainer.appendChild(videoElement);
        shareContainer.appendChild(nameLabel);
        sharesContainer.appendChild(shareContainer);
        
        await mediaStream.startShareScreen(videoElement);
        setIsSharing(true);
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

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <h1 className="text-center text-3xl font-bold mb-4 mt-0">
        Session: {session}
      </h1>
      <div
        className="flex w-full flex-1 justify-center items-center"
        style={inSession ? {} : { display: "none" }}
      >
        <video-player-container ref={containerRef} style={videoContainerStyle}>
          {/* Videos container */}
          <div id="videos-container" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            justifyContent: 'center',
            marginBottom: '20px'
          }}></div>
          
          {/* Screen shares container */}
          <div id="shares-container" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            justifyContent: 'center'
          }}></div>
        </video-player-container>
      </div>
      {!inSession ? (
        <div className="mx-auto flex w-64 flex-col self-center">
          <div className="w-4" />
          <Button className="flex flex-1" onClick={joinSession} title="join session">
            Join
          </Button>
        </div>
      ) : (
        <div className="flex w-full flex-col justify-around self-center">
          <div className="mt-4 flex w-[30rem] flex-1 justify-around self-center rounded-md bg-white p-4">
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
      )}
    </div>
  );
};

export default Videocall;

const videoContainerStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  alignItems: 'flex-start',
  width: '100%',
  height: '100%',
  padding: '20px',
  backgroundColor: '#000',
  borderRadius: '8px',
  maxWidth: '1200px',
  margin: '0 auto',
  minHeight: '600px',
};

const videoWrapperStyle: CSSProperties = {
  width: '320px',
  height: '240px',
  backgroundColor: '#333',
  overflow: 'hidden',
  position: 'relative',
  flexShrink: 0,
};

const placeholderStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#2d2d2d',
  color: '#fff',
  fontSize: '1.2rem',
  fontWeight: 'bold',
};
