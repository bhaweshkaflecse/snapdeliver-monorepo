import React from "react";

export interface UploadItem {
  id: string;
  fileName: string;
  fileSize: number;
  status: "pending" | "uploading" | "paused" | "completed" | "failed";
  progress: number;
  chunksCompleted: number;
  totalChunks: number;
  speed: number;
  error?: string;
}

interface UploadProgressProps {
  items: UploadItem[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1024 * 1024)
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatETA(remainingBytes: number, speed: number): string {
  if (speed <= 0) return "--";
  const seconds = Math.ceil(remainingBytes / speed);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
}

function getStatusColor(status: UploadItem["status"]): string {
  switch (status) {
    case "pending":
      return "bg-gray-200";
    case "uploading":
      return "bg-blue-500";
    case "paused":
      return "bg-yellow-400";
    case "completed":
      return "bg-green-500";
    case "failed":
      return "bg-red-500";
  }
}

function getStatusLabel(status: UploadItem["status"]): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "uploading":
      return "Uploading";
    case "paused":
      return "Paused";
    case "completed":
      return "Done";
    case "failed":
      return "Failed";
  }
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No uploads in progress
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const remainingBytes = item.fileSize * (1 - item.progress / 100);
        return (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow p-4 space-y-2"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.fileName}
                </p>
                <p className="text-xs text-gray-500">
                  {formatSize(item.fileSize)} - Chunk{" "}
                  {item.chunksCompleted}/{item.totalChunks}
                </p>
              </div>
              <span
                className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full text-white ${getStatusColor(
                  item.status
                )}`}
              >
                {getStatusLabel(item.status)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(
                  item.status
                )}`}
                style={{ width: `${item.progress}%` }}
              />
            </div>

            {/* Stats row */}
            <div className="flex justify-between text-xs text-gray-500">
              <span>{item.progress.toFixed(1)}%</span>
              {item.status === "uploading" && (
                <>
                  <span>{formatSpeed(item.speed)}</span>
                  <span>ETA: {formatETA(remainingBytes, item.speed)}</span>
                </>
              )}
              {item.status === "failed" && item.error && (
                <span className="text-red-600">{item.error}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
