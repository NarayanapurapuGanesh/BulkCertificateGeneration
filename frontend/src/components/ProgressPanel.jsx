import React from "react";

export default function ProgressPanel({ processed, total, currentName }) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  return (
    <div className="bg-white rounded-xl shadow-card border border-ink-100 p-6">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-lg text-ink-950">Generating certificates…</h3>
        <span className="font-mono text-sm text-ink-500">
          {processed} / {total}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden">
        <div
          className="h-full bg-seal transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {currentName && (
        <p className="text-sm text-ink-500 mt-3">
          Currently processing: <span className="text-ink-900 font-medium">{currentName}</span>
        </p>
      )}
    </div>
  );
}
