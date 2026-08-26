import React, { useRef, useState } from "react";

export default function UploadCard({
  step,
  title,
  hint,
  accept,
  fileLabel,
  status, // "idle" | "uploading" | "done" | "error"
  errorMessage,
  onFile,
  children,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList) {
    const file = fileList?.[0];
    if (file) onFile(file);
  }

  return (
    <div className="bg-white rounded-xl shadow-card border border-ink-100 p-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-8 h-8 rounded-full bg-ink-950 text-paper flex items-center justify-center font-mono text-sm">
          {step}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg text-ink-950">{title}</h3>
          <p className="text-sm text-ink-500 mt-0.5">{hint}</p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`mt-4 rounded-lg border-2 border-dashed px-4 py-5 flex items-center justify-between gap-3 transition-colors ${
              dragOver ? "border-seal bg-seal/5" : "border-ink-100"
            }`}
          >
            <div className="min-w-0">
              {status === "done" ? (
                <p className="text-sm font-medium text-ink-900 truncate">{fileLabel}</p>
              ) : (
                <p className="text-sm text-ink-500 truncate">
                  Drag a file here, or browse from your computer
                </p>
              )}
              {status === "uploading" && (
                <p className="text-xs text-seal mt-1">Reading file…</p>
              )}
              {status === "error" && (
                <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="focus-ring shrink-0 px-4 py-2 rounded-md bg-ink-950 text-paper text-sm font-medium hover:bg-ink-800 transition-colors"
            >
              Browse
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
}
