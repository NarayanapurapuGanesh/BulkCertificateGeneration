import React, { useMemo, useState } from "react";
import { openFolder, reportCsvUrl } from "../api.js";

export default function CompletionPanel({ job, outputFolder, onReset }) {
  const [opening, setOpening] = useState(false);
  const summary = useMemo(() => {
    const results = job.results || [];
    const success = results.filter((r) => r.status === "success").length;
    const issues = results.length - success;
    return { total: results.length, success, issues, results };
  }, [job]);

  const issueRows = summary.results.filter((r) => r.status !== "success");

  return (
    <div className="bg-white rounded-xl shadow-card border border-ink-100 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-seal/10 text-seal flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h3 className="font-display text-xl text-ink-950">Generation complete</h3>
          <p className="text-sm text-ink-500">{outputFolder}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Total records" value={summary.total} />
        <Stat label="Generated" value={summary.success} accent />
        <Stat label="Issues" value={summary.issues} warn={summary.issues > 0} />
      </div>

      {issueRows.length > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-semibold text-ink-900 mb-2">Records that need attention</h4>
          <div className="rounded-lg border border-ink-100 divide-y divide-ink-100 max-h-56 overflow-y-auto">
            {issueRows.map((r) => (
              <div key={r.row_number} className="px-4 py-2.5 text-sm flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink-900 truncate">
                    Row {r.row_number}{r.name ? ` — ${r.name}` : ""}
                  </p>
                  <p className="text-ink-500">{r.message}</p>
                </div>
                <span className="shrink-0 text-xs font-mono uppercase tracking-wide text-seal-dark bg-seal/10 rounded px-2 py-0.5">
                  {r.status}
                </span>
              </div>
            ))}
          </div>
          <a
            href={reportCsvUrl(job.id)}
            download
            className="inline-block mt-2 text-sm text-seal-dark underline underline-offset-2 hover:text-seal"
          >
            Download full report (.csv)
          </a>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={async () => {
            setOpening(true);
            try {
              await openFolder(outputFolder);
            } finally {
              setOpening(false);
            }
          }}
          className="focus-ring px-5 py-2.5 rounded-md bg-ink-950 text-paper text-sm font-medium hover:bg-ink-800 transition-colors disabled:opacity-60"
          disabled={opening}
        >
          {opening ? "Opening…" : "Open folder"}
        </button>
        <button
          onClick={onReset}
          className="focus-ring px-5 py-2.5 rounded-md border border-ink-200 text-ink-900 text-sm font-medium hover:bg-ink-100/60 transition-colors"
        >
          Start another batch
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, warn }) {
  return (
    <div className="rounded-lg border border-ink-100 px-4 py-3">
      <p
        className={`font-display text-2xl ${
          warn && value > 0 ? "text-seal-dark" : accent ? "text-ink-950" : "text-ink-950"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-ink-500 mt-0.5">{label}</p>
    </div>
  );
}
