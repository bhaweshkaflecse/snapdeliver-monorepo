"use client";

import { useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";

interface QRGeneratorProps {
  eventId: string;
  eventName: string;
}

/**
 * Generates a scannable QR code for the guest portal URL using qrcode.react.
 * Supports PNG download and copy-link functionality.
 */
export function QRGenerator({ eventId, eventName }: QRGeneratorProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null!);
  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${eventId}`
      : `/${eventId}`;

  const handleDownload = useCallback(() => {
    const container = svgContainerRef.current;
    if (!container) return;

    const svgElement = container.querySelector("svg");
    if (!svgElement) return;

    // Convert SVG to canvas for PNG export
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 200, 200);
      ctx.drawImage(img, 0, 0, 200, 200);

      const link = document.createElement("a");
      link.download = `qr-${eventName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      URL.revokeObjectURL(url);
    };
    img.src = url;
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
        <div
          ref={svgContainerRef}
          className="border border-gray-200 rounded-lg p-2 bg-white"
        >
          <QRCodeSVG
            value={portalUrl}
            size={200}
            level="M"
            includeMargin={false}
          />
        </div>
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
