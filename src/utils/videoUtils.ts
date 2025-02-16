import ZoomVideo, { VideoQuality, VideoPlayer } from "@zoom/videosdk";

export const startVideoStream = async (
  mediaStream: any,
  videoElement: HTMLVideoElement,
  userId: number,
  isLocalUser: boolean
) => {
  if (isLocalUser) {
    await mediaStream.startVideo({ videoElement });
  } else {
    await mediaStream.renderVideo(videoElement, userId, 640, 360, 0, 0, VideoQuality.Video_360P);
  }
};

export const stopVideoStream = async (
  mediaStream: any,
  userId: number,
  isLocalUser: boolean
) => {
  if (isLocalUser) {
    await mediaStream.stopVideo();
  } else {
    await mediaStream.stopRenderVideo(userId);
  }
};
