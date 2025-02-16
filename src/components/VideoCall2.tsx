"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import ZoomVideo, {
  VideoClient,
  VideoQuality,
  VideoPlayer,
  SharePrivilege,
} from "@zoom/videosdk";
import { CameraButton, MicButton } from "./MuteButtons";
import { PhoneOff, MonitorUp } from "lucide-react";
import { Button } from "./ui/button";

const shareMaps = new Map<number, HTMLCanvasElement>();

const Videocall = ({ slug, JWT }: { slug: string; JWT: string }) => {
  const session = slug;
  const jwt = JWT;
  const [inSession, setInSession] = useState(false);
  const client = useRef<typeof VideoClient>(ZoomVideo.createClient());
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    client.current = ZoomVideo.createClient();
    return () => {
      if (client.current) {
        client.current.leave().catch(e => console.error("leave error", e));
      }
    };
  }, []);

  const joinSession = async () => {
    await client.current.init("en-US", "Global", { patchJsMedia: true });
    client.current.on(
      "peer-video-state-change",
      (payload) => void renderVideo(payload)
    );
    client.current.on("active-share-change", (payload) => {
      console.log("active-share-change", payload);
      handleShareChange(payload);
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
    await renderVideo({
      action: "Start",
      userId: client.current.getCurrentUserInfo().userId,
    });

  };

  const renderVideo = async (event: { action: "Start" | "Stop"; userId: number }) => {
    if (!client.current) return;
    const mediaStream = client.current.getMediaStream();
    if (event.action === "Stop") {
      const element = await mediaStream.detachVideo(event.userId);
      Array.isArray(element)
        ? element.forEach((el) => el.remove())
        : element?.remove();
    } else {
      const userVideo = await mediaStream.attachVideo(event.userId, VideoQuality.Video_360P);
      videoContainerRef.current?.appendChild(userVideo as VideoPlayer);
    }
  };

  const toggleShare = async () => {
    if (!client.current) return;
    const mediaStream = client.current.getMediaStream();
    if (isSharing) {
      await mediaStream.stopShareScreen();
      const videoElement = shareMaps.get(client.current.getCurrentUserInfo().userId);
      if (videoElement) {
        videoElement.remove();
        shareMaps.delete(client.current.getCurrentUserInfo().userId);
      }
      setIsSharing(false);
    } else {
      const videoElement = document.createElement('canvas');
      videoContainerRef.current?.appendChild(videoElement);
      await mediaStream.startShareScreen(videoElement);
      shareMaps.set(client.current.getCurrentUserInfo().userId, videoElement);
      setIsSharing(true);
    }
  };

  const handleShareChange = async (payload: { state: 'Active' | 'Inactive', userId: number }) => {
    if (!client.current) return;
    const mediaStream = client.current.getMediaStream();
    if (payload.state === 'Active') {
      const videoElement = document.createElement('canvas');
      videoContainerRef.current?.appendChild(videoElement);
      await mediaStream.startShareView(videoElement, payload.userId);
      shareMaps.set(payload.userId, videoElement);
    } else if (payload.state === 'Inactive') {
      const videoElement = shareMaps.get(payload.userId);
      if (videoElement) {
        videoElement.remove();
        shareMaps.delete(payload.userId);
      }
      await mediaStream.stopShareView(payload.userId);
    }
  };

  const leaveSession = async () => {
    if (!client.current) return;
    client.current.off("peer-video-state-change", renderVideo);
    client.current.off("active-share-change", handleShareChange);
    await client.current.leave().catch((e) => console.error("leave error", e));
    window.location.href = "/";
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <h1 className="text-center text-3xl font-bold mb-4 mt-0">
        Session: {session}
      </h1>
      <div
        className="flex w-full flex-1"
        style={inSession ? {} : { display: "none" }}
      >
        <div ref={videoContainerRef} style={videoPlayerStyle} />
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
              isAudioMuted={isAudioMuted}
              client={client}
              setIsAudioMuted={setIsAudioMuted}
            />
            <Button onClick={toggleShare} title={isSharing ? "stop sharing" : "start sharing"}>
              <MonitorUp className={isSharing ? "text-red-500" : ""} />
            </Button>
            <Button onClick={leaveSession} title="leave session">
              <PhoneOff />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Videocall;

const videoPlayerStyle: CSSProperties = {
  height: "75vh",
  marginTop: "1.5rem",
  marginLeft: "3rem",
  marginRight: "3rem",
  alignContent: "center",
  borderRadius: "10px",
  overflow: "hidden",
};

const userName = `User-${new Date().getTime().toString().slice(8)}`;
