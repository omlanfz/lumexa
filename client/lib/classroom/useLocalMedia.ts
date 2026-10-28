// FILE PATH: client/lib/classroom/useLocalMedia.ts
//
// This person's own microphone, camera and screen share, and the buttons that
// switch them. The state is what Daily reports for this connection (so it is
// right even when the teacher muted someone, or took away their microphone),
// and the actions go to Daily.

import { useCallback } from 'react';
import { useCall, useLocalPeer } from './daily/CallContext';

export function useLocalMedia() {
  const call = useCall();
  const local = useLocalPeer();
  const micOn = !!local?.audio.on;
  const cameraOn = !!local?.video.on;
  const screenSharing = !!local?.screenVideo.on;
  /** The teacher took away this person's right to use a microphone. */
  const micLocked = !!local?.micLocked;

  const toggleMic = useCallback(() => {
    if (micLocked && !micOn) return; // Daily would refuse it anyway
    call.setLocalAudio(!micOn);
  }, [call, micLocked, micOn]);

  const setMic = useCallback((on: boolean) => void call.setLocalAudio(on), [call]);

  const toggleCamera = useCallback(() => {
    call.setLocalVideo(!cameraOn);
  }, [call, cameraOn]);

  const startScreenShare = useCallback(() => {
    // The browser asks what to share; the sound of a shared tab comes along where
    // the browser offers it (and is then part of what the class hears and records).
    call.startScreenShare({ displayMediaOptions: { audio: true, video: true } });
  }, [call]);

  const stopScreenShare = useCallback(() => call.stopScreenShare(), [call]);

  const toggleScreenShare = useCallback(() => {
    if (screenSharing) call.stopScreenShare();
    else startScreenShare();
  }, [call, screenSharing, startScreenShare]);

  return { micOn, cameraOn, screenSharing, micLocked, toggleMic, setMic, toggleCamera, toggleScreenShare, startScreenShare, stopScreenShare };
}
