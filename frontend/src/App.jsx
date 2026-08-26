import React, { useEffect, useRef, useState, useCallback } from "react";
import UploadCard from "./components/UploadCard.jsx";
import ProgressPanel from "./components/ProgressPanel.jsx";
import CompletionPanel from "./components/CompletionPanel.jsx";
import {
  createSession,
  uploadTemplate,
  uploadNames,
  previewNames,
  browseFolder,
  validateFolder,
  startGenerate,
  getJobStatus,
  previewImageUrl,
} from "./api.js";

const STAGE = {
  SETUP: "setup",
  RUNNING: "running",
  DONE: "done",
};

const COLOR_PRESETS = [
  { label: "Gold / Amber", value: "#d97706" },
  { label: "Warm Gold", value: "#e59b2a" },
  { label: "Navy Blue", value: "#0d408c" },
  { label: "Deep Charcoal", value: "#1e293b" },
  { label: "Pure Black", value: "#000000" },
  { label: "Crimson Red", value: "#991b1b" },
  { label: "Emerald Green", value: "#065f46" },
];

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [globalError, setGlobalError] = useState("");

  // Template state
  const [templateStatus, setTemplateStatus] = useState("idle");
  const [templateError, setTemplateError] = useState("");
  const [templateFile, setTemplateFile] = useState(null);
  const [templateMode, setTemplateMode] = useState("overlay"); // "field" | "overlay"
  const [hasFillableFields, setHasFillableFields] = useState(false);
  const [fields, setFields] = useState([]);
  const [fieldName, setFieldName] = useState("");

  // Typography & Placement State (2D Placement)
  const [fontName, setFontName] = useState("Times-Bold");
  const [fontSize, setFontSize] = useState(32);
  const [fontColor, setFontColor] = useState("#d97706");
  const [align, setAlign] = useState("center");
  const [xPercent, setXPercent] = useState(50.0);
  const [yPercent, setYPercent] = useState(36.0);
  const [placeholderBbox, setPlaceholderBbox] = useState(null);
  const [analysisReason, setAnalysisReason] = useState("");

  // Erase / Cover existing name on image templates
  const [coverBox, setCoverBox] = useState(true);
  const [boxColor, setBoxColor] = useState("#FFFFFF");
  const [boxWidth, setBoxWidth] = useState(520);
  const [boxHeight, setBoxHeight] = useState(48);

  // Names state
  const [namesStatus, setNamesStatus] = useState("idle");
  const [namesError, setNamesError] = useState("");
  const [namesFile, setNamesFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [nameColumn, setNameColumn] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [emptyCount, setEmptyCount] = useState(0);
  const [sampleRecipientName, setSampleRecipientName] = useState("Jane Doe");

  // Output folder
  const [outputFolder, setOutputFolder] = useState("");
  const [folderError, setFolderError] = useState("");

  // Generation
  const [stage, setStage] = useState(STAGE.SETUP);
  const [job, setJob] = useState(null);
  const pollRef = useRef(null);

  // Canvas Drag & Drop State
  const previewContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    createSession()
      .then((r) => setSessionId(r.session_id))
      .catch(() => setGlobalError("Could not start a local session. Please restart the application."));
    return () => clearInterval(pollRef.current);
  }, []);

  async function handleTemplateFile(file) {
    if (!sessionId) return;
    setTemplateStatus("uploading");
    setTemplateError("");
    setTemplateFile(file);
    try {
      const res = await uploadTemplate(sessionId, file);
      setFields(res.fields || []);
      setHasFillableFields(Boolean(res.has_fillable_fields));
      
      if (res.has_fillable_fields && res.fields?.length > 0) {
        setTemplateMode("field");
        setFieldName(res.fields[0].name);
      } else {
        setTemplateMode("overlay");
        setFieldName("");
      }

      if (res.default_overlay) {
        if (res.default_overlay.x_percent !== undefined) setXPercent(res.default_overlay.x_percent);
        if (res.default_overlay.y_percent !== undefined) setYPercent(res.default_overlay.y_percent);
        if (res.default_overlay.font_name) setFontName(res.default_overlay.font_name);
        if (res.default_overlay.font_size) setFontSize(res.default_overlay.font_size);
        if (res.default_overlay.font_color) setFontColor(res.default_overlay.font_color);
        if (res.default_overlay.align) setAlign(res.default_overlay.align);
        if (res.default_overlay.box_width) setBoxWidth(res.default_overlay.box_width);
        if (res.default_overlay.box_height) setBoxHeight(res.default_overlay.box_height);
        if (res.default_overlay.placeholder_bbox) setPlaceholderBbox(res.default_overlay.placeholder_bbox);
        if (res.default_overlay.reason) setAnalysisReason(res.default_overlay.reason);
      }

      setTemplateStatus("done");
    } catch (e) {
      setTemplateStatus("error");
      setTemplateError(e.message);
    }
  }

  async function handleNamesFile(file) {
    if (!sessionId) return;
    setNamesStatus("uploading");
    setNamesError("");
    setNamesFile(file);
    try {
      const res = await uploadNames(sessionId, file);
      setColumns(res.columns);
      const defaultCol = res.columns.length === 1 ? res.columns[0] : (res.columns.find((c) => /name/i.test(c)) || res.columns[0] || "");
      setNameColumn(defaultCol);
      setRowCount(res.row_count);
      if (res.preview && res.preview.length > 0) {
        setSampleRecipientName(res.preview[0] || "Jane Doe");
      }
      setNamesStatus("done");
      if (defaultCol) await refreshPreview(defaultCol);
    } catch (e) {
      setNamesStatus("error");
      setNamesError(e.message);
    }
  }

  async function refreshPreview(column) {
    try {
      const res = await previewNames(sessionId, column);
      setRowCount(res.row_count);
      setEmptyCount(res.empty_count);
      if (res.preview && res.preview.length > 0) {
        setSampleRecipientName(res.preview[0] || "Jane Doe");
      }
    } catch (_) {
      /* non-fatal */
    }
  }

  async function handleBrowseFolder() {
    try {
      const res = await browseFolder();
      if (res.path) {
        setOutputFolder(res.path);
        setFolderError("");
      }
    } catch (e) {
      setFolderError(e.message);
    }
  }

  async function handleGenerate() {
    setFolderError("");
    setGlobalError("");
    try {
      await validateFolder(outputFolder);
    } catch (e) {
      setFolderError(e.message);
      return;
    }

    try {
      const { job_id } = await startGenerate({
        sessionId,
        fieldName: templateMode === "field" ? fieldName : "",
        nameColumn,
        outputFolder,
        mode: templateMode,
        fontName,
        fontSize,
        fontColor,
        align,
        xPercent,
        yPercent,
        placeholderBbox,
        coverBox,
        boxColor,
        boxWidth,
        boxHeight,
      });
      setStage(STAGE.RUNNING);
      setJob({ id: job_id, status: "running", processed: 0, total: rowCount, current_name: "" });

      pollRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(job_id);
          setJob({ id: job_id, ...status });
          if (status.status === "done" || status.status === "failed") {
            clearInterval(pollRef.current);
            setStage(status.status === "done" ? STAGE.DONE : STAGE.SETUP);
            if (status.status === "failed") {
              setGlobalError(status.error || "Certificate generation failed.");
            }
          }
        } catch (e) {
          clearInterval(pollRef.current);
          setGlobalError(e.message);
          setStage(STAGE.SETUP);
        }
      }, 400);
    } catch (e) {
      setGlobalError(e.message);
    }
  }

  function handleReset() {
    setStage(STAGE.SETUP);
    setJob(null);
    setTemplateStatus("idle");
    setTemplateFile(null);
    setFields([]);
    setFieldName("");
    setNamesStatus("idle");
    setNamesFile(null);
    setColumns([]);
    setNameColumn("");
    setRowCount(0);
    setEmptyCount(0);
    setPlaceholderBbox(null);
    setAnalysisReason("");
    createSession().then((r) => setSessionId(r.session_id));
  }

  // --- Interactive Drag & Drop System ---
  const updatePositionFromEvent = useCallback((clientX, clientY) => {
    if (!previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    const px = Math.max(3, Math.min(97, Math.round((relativeX / rect.width) * 1000) / 10));
    const py = Math.max(5, Math.min(95, Math.round((relativeY / rect.height) * 1000) / 10));
    setXPercent(px);
    setYPercent(py);
  }, []);

  const handlePointerDown = (e) => {
    if (templateMode === "field") return;
    isDraggingRef.current = true;
    setIsDragging(true);
    updatePositionFromEvent(e.clientX, e.clientY);

    const onPointerMove = (moveEvt) => {
      if (!isDraggingRef.current) return;
      updatePositionFromEvent(moveEvt.clientX, moveEvt.clientY);
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const readyToGenerate =
    templateStatus === "done" &&
    namesStatus === "done" &&
    (templateMode === "overlay" || (templateMode === "field" && fieldName)) &&
    nameColumn &&
    outputFolder.trim().length > 0 &&
    rowCount > 0;

  const currentPreviewImageUrl = sessionId && templateStatus === "done"
    ? previewImageUrl({
        sessionId,
        name: templateMode === "field" ? (sampleRecipientName || "Jane Doe") : "",
        mode: templateMode,
        fieldName,
        fontName,
        fontSize,
        fontColor,
        align,
        xPercent,
        yPercent,
        placeholderBbox,
        coverBox: false,
        boxColor,
        boxWidth,
        boxHeight,
      })
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SealMark />
            <div>
              <h1 className="font-bold text-lg text-slate-900 tracking-tight">
                Bulk Certificate Generator
              </h1>
              <p className="text-xs text-slate-500">
                100% Local &amp; Private · Interactive Drag &amp; Drop Canvas · Bulk PDF Engine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Local Processing
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 flex-1 w-full space-y-6">
        {globalError && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-4 flex items-start gap-3 shadow-xs">
            <span className="font-bold">⚠️</span>
            <div className="flex-1">{globalError}</div>
          </div>
        )}

        {stage === STAGE.SETUP && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form Steps & Controls (6 cols) */}
            <div className="lg:col-span-6 space-y-5">
              {/* Step 1: Template */}
              <UploadCard
                step={1}
                title="Certificate Template (Any PDF)"
                hint="Upload any certificate design (Canva, Word, Image PDF, or Fillable Form)."
                accept=".pdf"
                fileLabel={templateFile?.name}
                status={templateStatus}
                errorMessage={templateError}
                onFile={handleTemplateFile}
              >
                {templateStatus === "done" && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                    {/* Mode Toggle if form fields detected */}
                    {hasFillableFields && (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-900">
                        <span>Form fields detected ({fields.length})</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setTemplateMode("field")}
                            className={`px-2.5 py-1 rounded font-medium transition ${
                              templateMode === "field"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-white text-blue-800 border border-blue-300"
                            }`}
                          >
                            Use Form Field
                          </button>
                          <button
                            type="button"
                            onClick={() => setTemplateMode("overlay")}
                            className={`px-2.5 py-1 rounded font-medium transition ${
                              templateMode === "overlay"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-white text-blue-800 border border-blue-300"
                            }`}
                          >
                            Drag &amp; Drop Placement
                          </button>
                        </div>
                      </div>
                    )}

                    {templateMode === "field" && fields.length > 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                        <FieldSelect
                          label="Recipient Name Field"
                          value={fieldName}
                          onChange={setFieldName}
                          options={fields.map((f) => ({ value: f.name, label: `${f.name} (Page ${f.page})` }))}
                        />
                      </div>
                    ) : (
                      /* Drag & Drop Overlay Controls */
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span>✨</span> Name Placement &amp; Styling
                          </span>
                          <span className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-medium">
                            Drag directly on preview →
                          </span>
                        </div>

                        {/* Erase / Cover Old Name Feature */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-950">
                              <input
                                type="checkbox"
                                checked={coverBox}
                                onChange={(e) => setCoverBox(e.target.checked)}
                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600"
                              />
                              <span>Erase &amp; Replace Old Name on Template</span>
                            </label>
                            {coverBox && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-amber-800 font-medium">Patch Color:</span>
                                <input
                                  type="color"
                                  value={boxColor}
                                  onChange={(e) => setBoxColor(e.target.value)}
                                  className="w-5 h-5 rounded border border-amber-300 cursor-pointer p-0"
                                  title="Background wipe patch color"
                                />
                              </div>
                            )}
                          </div>
                          
                          {coverBox && (
                            <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-amber-200/60">
                              <div>
                                <div className="flex justify-between text-[11px] text-amber-900 font-medium mb-1">
                                  <span>Patch Width</span>
                                  <span className="font-mono">{boxWidth}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="150"
                                  max="800"
                                  step="10"
                                  value={boxWidth}
                                  onChange={(e) => setBoxWidth(Number(e.target.value))}
                                  className="w-full accent-amber-600 cursor-pointer"
                                />
                              </div>
                              <div>
                                <div className="flex justify-between text-[11px] text-amber-900 font-medium mb-1">
                                  <span>Patch Height</span>
                                  <span className="font-mono">{boxHeight}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="20"
                                  max="100"
                                  step="2"
                                  value={boxHeight}
                                  onChange={(e) => setBoxHeight(Number(e.target.value))}
                                  className="w-full accent-amber-600 cursor-pointer"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Interactive Position Controls */}
                        <div className="space-y-3.5 text-xs">
                          {/* Horizontal (X) & Vertical (Y) Controls */}
                          <div className="space-y-2.5 bg-white border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center justify-between font-semibold text-slate-800">
                              <span>Position Coordinates</span>
                              <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                X: {xPercent}% · Y: {yPercent}%
                              </span>
                            </div>

                            {/* Horizontal Slider & Quick Snap */}
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-slate-600 font-medium">Horizontal (X Axis): {xPercent}%</label>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => { setXPercent(16); setAlign("left"); }}
                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-[10px] rounded text-slate-700 font-medium"
                                    title="Snap to left side (e.g. Deloitte templates)"
                                  >
                                    Left side
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setXPercent(50); setAlign("center"); }}
                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-[10px] rounded text-slate-700 font-medium"
                                    title="Center of certificate"
                                  >
                                    Center
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setXPercent(84); setAlign("right"); }}
                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-[10px] rounded text-slate-700 font-medium"
                                    title="Snap to right side"
                                  >
                                    Right side
                                  </button>
                                </div>
                              </div>
                              <input
                                type="range"
                                min="5"
                                max="95"
                                step="0.5"
                                value={xPercent}
                                onChange={(e) => setXPercent(Number(e.target.value))}
                                className="w-full accent-blue-600 cursor-pointer"
                              />
                            </div>

                            {/* Vertical Slider */}
                            <div>
                              <label className="text-slate-600 font-medium block mb-1">Vertical (Y Axis): {yPercent}% from top</label>
                              <input
                                type="range"
                                min="5"
                                max="95"
                                step="0.5"
                                value={yPercent}
                                onChange={(e) => setYPercent(Number(e.target.value))}
                                className="w-full accent-blue-600 cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Font Family & Size */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block font-semibold text-slate-700 mb-1">Font Family</label>
                              <select
                                value={fontName}
                                onChange={(e) => setFontName(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                              >
                                <option value="Times-Bold">Times Bold (Classic Serif)</option>
                                <option value="Times-Italic">Times Italic (Elegant)</option>
                                <option value="Times-Roman">Times Roman</option>
                                <option value="Helvetica-Bold">Helvetica Bold (Modern Sans)</option>
                                <option value="Helvetica">Helvetica Regular</option>
                                <option value="Courier-Bold">Courier Bold (Monospace)</option>
                              </select>
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <label className="font-semibold text-slate-700">Font Size</label>
                                <span className="text-blue-600 font-bold">{fontSize} pt</span>
                              </div>
                              <input
                                type="range"
                                min="14"
                                max="64"
                                step="1"
                                value={fontSize}
                                onChange={(e) => setFontSize(Number(e.target.value))}
                                className="w-full accent-blue-600 cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Color Selection with Quick Presets */}
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1.5">Font Color</label>
                            <div className="flex flex-wrap items-center gap-2">
                              {COLOR_PRESETS.map((p) => (
                                <button
                                  key={p.value}
                                  type="button"
                                  onClick={() => setFontColor(p.value)}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition ${
                                    fontColor.toLowerCase() === p.value.toLowerCase()
                                      ? "border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <span
                                    className="w-3 h-3 rounded-full border border-black/20"
                                    style={{ backgroundColor: p.value }}
                                  />
                                  <span>{p.label}</span>
                                </button>
                              ))}

                              <div className="flex items-center gap-1 ml-auto">
                                <input
                                  type="color"
                                  value={fontColor}
                                  onChange={(e) => setFontColor(e.target.value)}
                                  className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0"
                                />
                                <input
                                  type="text"
                                  value={fontColor}
                                  onChange={(e) => setFontColor(e.target.value)}
                                  className="w-20 uppercase font-mono text-[11px] bg-white border border-slate-300 rounded px-1.5 py-0.5 font-bold"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Text Alignment */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="font-semibold text-slate-700">Text Alignment</span>
                            <div className="flex border border-slate-300 rounded bg-white overflow-hidden">
                              {["left", "center", "right"].map((a) => (
                                <button
                                  key={a}
                                  type="button"
                                  onClick={() => setAlign(a)}
                                  className={`px-3 py-1 text-xs capitalize ${
                                    align === a ? "bg-blue-600 text-white font-medium" : "text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  {a}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </UploadCard>

              {/* Step 2: Names List */}
              <UploadCard
                step={2}
                title="Names List (Excel or CSV)"
                hint="Upload the .xlsx, .xlsm, or .csv list of certificate recipients."
                accept=".xlsx,.xlsm,.csv"
                fileLabel={namesFile?.name}
                status={namesStatus}
                errorMessage={namesError}
                onFile={handleNamesFile}
              >
                {namesStatus === "done" && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    {columns.length > 1 && (
                      <FieldSelect
                        label="Recipient Name Column"
                        value={nameColumn}
                        onChange={(v) => {
                          setNameColumn(v);
                          refreshPreview(v);
                        }}
                        options={columns.map((c) => ({ value: c, label: c }))}
                      />
                    )}
                    {nameColumn && (
                      <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        <div>
                          Found <strong className="text-slate-900">{rowCount}</strong> recipient{rowCount === 1 ? "" : "s"}.
                          {emptyCount > 0 && (
                            <span className="text-amber-700 ml-1">
                              ({emptyCount} blank name rows will be reported as invalid)
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 font-mono">Column: {nameColumn}</span>
                      </div>
                    )}
                  </div>
                )}
              </UploadCard>

              {/* Step 3: Destination Folder */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-xs font-semibold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base text-slate-900">Output Folder</h3>
                    <p className="text-xs text-slate-500">
                      Destination folder on your computer for generated certificates.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={outputFolder}
                        onChange={(e) => setOutputFolder(e.target.value)}
                        placeholder="e.g. C:\Users\YourName\Documents\Certificates"
                        className="flex-1 min-w-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleBrowseFolder}
                        className="shrink-0 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition shadow-xs"
                      >
                        Browse…
                      </button>
                    </div>
                    {folderError && <p className="text-xs text-red-600 mt-1.5 font-medium">{folderError}</p>}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!readyToGenerate}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
              >
                <span>🚀</span>
                <span>Generate {rowCount > 0 ? `${rowCount} Certificates` : "Certificates"}</span>
              </button>
            </div>

            {/* Right Column: Interactive Drag & Drop Live Certificate Canvas (6 cols) */}
            <div className="lg:col-span-6 lg:sticky lg:top-20 space-y-3">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Interactive Live Certificate Canvas
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Sample: "{sampleRecipientName}"
                  </span>
                </div>

                <div className="p-4 bg-slate-100 flex flex-col items-center justify-center min-h-[420px] select-none">
                  {currentPreviewImageUrl ? (
                    <div className="relative group w-full flex flex-col items-center select-none">
                      {/* Canvas Container with Interactive Draggable Badge */}
                      <div
                        ref={previewContainerRef}
                        onPointerDown={handlePointerDown}
                        className="relative border border-slate-300 rounded-lg shadow-md overflow-hidden bg-white max-w-full cursor-crosshair touch-none select-none"
                        title="Click or Drag anywhere on the certificate to move the recipient name!"
                      >
                        <img
                          src={currentPreviewImageUrl}
                          alt="Certificate Live Preview"
                          className="w-full h-auto object-contain pointer-events-none select-none max-h-[520px] block"
                          draggable="false"
                        />

                        {/* Interactive Canva-Style Text & Background Box */}
                        {templateMode === "overlay" && (
                          <div
                            style={{
                              left: `${xPercent}%`,
                              top: `${yPercent}%`,
                              transform:
                                align === "left"
                                  ? "translate(0, -50%)"
                                  : align === "right"
                                  ? "translate(-100%, -50%)"
                                  : "translate(-50%, -50%)",
                            }}
                            className={`absolute pointer-events-none transition-all duration-75 flex flex-col z-10 ${
                              isDragging
                                ? "ring-2 ring-blue-500 shadow-xl"
                                : "hover:ring-1 hover:ring-blue-400 group-hover:ring-1 group-hover:ring-blue-400/60"
                            }`}
                          >
                            {/* Floating Coordinates Tooltip (Positioned ABOVE the text so it never blocks it) */}
                            {isDragging && (
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-md whitespace-nowrap pointer-events-none">
                                X: {xPercent}% · Y: {yPercent}%
                              </div>
                            )}

                            {/* Clean Visual Selection Box with Live Background Patch Preview */}
                            <div
                              style={{
                                backgroundColor: coverBox ? boxColor : "transparent",
                                width: coverBox ? `${Math.min(boxWidth * 0.7, 500)}px` : "auto",
                                height: coverBox ? `${Math.max(boxHeight * 0.65, 28)}px` : "auto",
                              }}
                              className={`relative px-3 py-1 flex items-center ${
                                align === "left"
                                  ? "justify-start"
                                  : align === "right"
                                  ? "justify-end"
                                  : "justify-center"
                              } border ${
                                isDragging
                                  ? "border-blue-500 border-solid"
                                  : "border-blue-400/70 border-dashed"
                              } rounded-sm transition-all`}
                            >
                              <span
                                style={{
                                  color: fontColor,
                                  fontFamily: fontName.includes("Times")
                                    ? "serif"
                                    : fontName.includes("Courier")
                                    ? "monospace"
                                    : "sans-serif",
                                  fontWeight: fontName.includes("Bold") ? "bold" : "normal",
                                  fontStyle: fontName.includes("Italic") ? "italic" : "normal",
                                  fontSize: `${Math.max(12, Math.min(fontSize * 0.55, 24))}px`,
                                }}
                                className="whitespace-nowrap select-none drop-shadow-2xs leading-none"
                              >
                                {sampleRecipientName || "Jane Doe"}
                              </span>

                              {/* Subtle Corner Dots (Canva style) */}
                              <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-600 rounded-full border border-white"></div>
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full border border-white"></div>
                              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-600 rounded-full border border-white"></div>
                              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-600 rounded-full border border-white"></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Clean Hint */}
                      <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-600 bg-white/90 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs">
                        <span className="text-blue-600 font-bold">✨</span>
                        <span>
                          <strong>Click or Drag</strong> anywhere on the certificate to move the text freely!
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8 text-slate-400 space-y-2">
                      <div className="text-3xl">📄</div>
                      <p className="text-xs font-medium">Upload a certificate PDF template to preview and drag the name</p>
                    </div>
                  )}
                </div>

                {currentPreviewImageUrl && (
                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                    <span>
                      Placement: <strong>X: {xPercent}%</strong> · <strong>Y: {yPercent}%</strong> · Align: <strong className="capitalize">{align}</strong> · Font: <strong>{fontName}</strong> ({fontSize}pt)
                    </span>
                    <span
                      className="w-4 h-4 rounded-full border border-black/20"
                      style={{ backgroundColor: fontColor }}
                      title={`Color: ${fontColor}`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {stage === STAGE.RUNNING && job && (
          <ProgressPanel
            processed={job.processed}
            total={job.total}
            currentName={job.current_name}
          />
        )}

        {stage === STAGE.DONE && job && (
          <CompletionPanel job={job} outputFolder={outputFolder} onReset={handleReset} />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-slate-400">
          Bulk Certificate Generator · 100% Local &amp; Private · Fast batch PDF processing
        </div>
      </footer>
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SealMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" className="shrink-0">
      <circle cx="20" cy="20" r="18" stroke="#d97706" strokeWidth="2" />
      <circle cx="20" cy="20" r="13" stroke="#d97706" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M14 20l4 4 8-8" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
