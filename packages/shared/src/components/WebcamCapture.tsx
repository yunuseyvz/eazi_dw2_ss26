'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Props {
  onFrame: (base64Image: string) => void;
  intervalMs?: number;
  enabled?: boolean;
}

export default function WebcamCapture({ onFrame, intervalMs = 2500, enabled = true }: Props) {
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;

      // Create off-screen video element (no DOM footprint)
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;

      // Create off-screen canvas
      canvasRef.current = document.createElement('canvas');
    } catch (err) {
      console.error('Webcam access denied or failed:', err);
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    canvasRef.current = null;
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    onFrame(base64);
  }, [onFrame]);

  useEffect(() => {
    if (enabled) {
      startCapture();
      intervalRef.current = setInterval(captureFrame, intervalMs);
    } else {
      stopCapture();
    }
    return () => stopCapture();
  }, [enabled, intervalMs, startCapture, stopCapture, captureFrame]);

  return null;
}
