import React, { useState } from "react";
import { Dropzone } from "./components/Dropzone";
import { UploadProgress } from "./components/UploadProgress";
import { useUploadQueue } from "./hooks/useUploadQueue";

type Page = "upload" | "queue" | "settings";

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>("upload");
  const { queue, addFiles, pauseAll, resumeAll, retryFailed, clearCompleted } =
    useUploadQueue();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-gray-900">SnapDeliver</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentPage("upload")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === "upload"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Upload
              </button>
              <button
                onClick={() => setCurrentPage("queue")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === "queue"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Queue ({queue.filter((item) => item.status !== "completed").length})
              </button>
              <button
                onClick={() => setCurrentPage("settings")}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === "settings"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {currentPage === "upload" && (
          <div className="space-y-6">
            <Dropzone onFilesSelected={addFiles} />
            <UploadProgress items={queue} />
          </div>
        )}

        {currentPage === "queue" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Upload Queue
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={pauseAll}
                  className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                >
                  Pause All
                </button>
                <button
                  onClick={resumeAll}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  Resume All
                </button>
                <button
                  onClick={retryFailed}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Retry Failed
                </button>
                <button
                  onClick={clearCompleted}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Clear Completed
                </button>
              </div>
            </div>
            <UploadProgress items={queue} />
          </div>
        )}

        {currentPage === "settings" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  API Endpoint
                </label>
                <input
                  type="text"
                  defaultValue={
                    localStorage.getItem("api_endpoint") || ""
                  }
                  onChange={(e) =>
                    localStorage.setItem("api_endpoint", e.target.value)
                  }
                  placeholder="e.g. http://localhost:3000/api"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Event ID
                </label>
                <input
                  type="text"
                  defaultValue={
                    localStorage.getItem("default_event_id") || ""
                  }
                  onChange={(e) =>
                    localStorage.setItem("default_event_id", e.target.value)
                  }
                  placeholder="UUID of the event to upload to"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
