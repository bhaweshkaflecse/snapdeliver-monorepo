"use client";

import { useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface QRGeneratorProps {
  eventId: string;
  eventName: string;
}

/**
 * Generates a QR code for the guest portal URL.
 * Uses a simple SVG-based QR code representation.
 * In production, replace with a proper QR library.
 */
export function QRGenerator({ eventId, eventName }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${eventId}`
      : `/${eventId}`;

  // Simple QR pattern rendering (placeholder for qrcode library)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;

    // Draw a placeholder QR pattern
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "#000000";
    const cellSize = size / 25;

    // Draw finder patterns (corners)
    const drawFinder = (x: number, y: number) => {
      ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        (x + 1) * cellSize,
        (y + 1) * cellSize,
        5 * cellSize,
        5 * cellSize
      );
      ctx.fillStyle = "#000000";
      ctx.fillRect(
        (x + 2) * cellSize,
        (y + 2) * cellSize,
        3 * cellSize,
        3 * cellSize
      );
    };

    drawFinder(1, 1);
    drawFinder(17, 1);
    drawFinder(1, 17);

    // Simple data pattern based on eventId hash
    let hash = 0;
    for (let i = 0; i < eventId.length; i++) {
      hash = (hash << 5) - hash + eventId.charCodeAt(i);
      hash |= 0;
    }

    for (let row = 9; row < 16; row++) {
      for (let col = 1; col < 24; col++) {
        if ((hash ^ (row * col)) % 3 === 0) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [eventId]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `qr-${eventName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [eventName]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
    } catch {
      // Fallback: select and copy
      const input = document.createElement("input");
      input.value = portalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
  }, [portalUrl]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Guest Portal QR</h3>
      <div className="flex flex-col items-center space-y-3">
        <canvas
          ref={canvasRef}
          className="border border-gray-200 rounded-lg"
          width={200}
          height={200}
        />
        <p className="text-xs text-gray-500 text-center break-all max-w-[200px]">
          {portalUrl}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            Download QR
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            Copy Link
          </Button>
        </div>
      </div>
    </div>
  );
}
