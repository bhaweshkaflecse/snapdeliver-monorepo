"use client";

import { useState } from "react";
import { useCamera } from "@/hooks/useCamera";
import { Button } from "@/components/ui/Button";

interface SelfieCaptureProps {
  onCapture: (canvas: HTMLCanvasElement) => void;
}

export function SelfieCapture({ onCapture }: SelfieCaptureProps) {
  const { videoRef, isActive, error, startCamera, stopCamera, captureFrame } =
    useCamera({ facingMode: "user" });
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedCanvas, setCapturedCanvas] = useState<HTMLCanvasElement | null>(
    null
  );

  const handleCapture = () => {
    const canvas = captureFrame();
    if (canvas) {
      setCapturedCanvas(canvas);
      setPreview(canvas.toDataURL("image/jpeg", 0.85));
      stopCamera();
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setCapturedCanvas(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedCanvas) {
      onCapture(capturedCanvas);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {error && (
        <div className="w-full rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isActive && !preview && (
        <div className="flex flex-col items-center space-y-4">
          <div className="flex h-64 w-64 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-24 w-24 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"
              />
            </svg>
          </div>
          <Button onClick={startCamera} size="lg">
            Open Camera
          </Button>
        </div>
      )}

      {isActive && (
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-80 w-80 rounded-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          <div className="mt-4 flex justify-center">
            <Button onClick={handleCapture} size="lg">
              Take Selfie
            </Button>
          </div>
        </div>
      )}

      {preview && (
        <div className="flex flex-col items-center space-y-4">
          <img
            src={preview}
            alt="Selfie preview"
            className="h-80 w-80 rounded-full object-cover"
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleRetake}>
              Retake
            </Button>
            <Button onClick={handleConfirm}>
              Find My Photos
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
