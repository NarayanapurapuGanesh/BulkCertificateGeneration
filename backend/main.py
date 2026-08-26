"""
Bulk Certificate Generator - Local Backend
=============================================
Runs entirely on localhost. No data ever leaves this machine:
  - uploaded files are written to a local temp/session folder
  - generated certificates are written straight to the user's chosen
    local output folder
  - there is no authentication, no database, and no outbound network call

Start with:  python main.py
Then open:   http://localhost:8000
"""
from __future__ import annotations

import csv
import json
import os
import shutil
import subprocess
import sys
import threading
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import certificate_engine as engine

APP_DIR = Path(__file__).resolve().parent
SESSIONS_DIR = APP_DIR / "_sessions"
SESSIONS_DIR.mkdir(exist_ok=True)
FRONTEND_DIST = APP_DIR.parent / "frontend" / "dist"

app = FastAPI(title="Bulk Certificate Generator")

# CORS is only relevant during `npm run dev` (Vite on :5173 talking to
# FastAPI on :8000). In the packaged app the frontend is served by FastAPI
# itself on the same origin, so this has no effect on the shipped product.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job registry. This app is single-user/local, so a simple dict
# guarded by a lock is all that's needed - no database.
_jobs_lock = threading.Lock()
_jobs: dict[str, dict] = {}


def _session_dir(session_id: str) -> Path:
    d = SESSIONS_DIR / session_id
    d.mkdir(parents=True, exist_ok=True)
    return d


# ---------------------------------------------------------------------------
# Session / upload endpoints
# ---------------------------------------------------------------------------

@app.post("/api/session")
def create_session():
    session_id = uuid.uuid4().hex
    _session_dir(session_id)
    return {"session_id": session_id}


@app.post("/api/upload/template")
async def upload_template(session_id: str = Form(...), file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "The selected file is not a valid PDF template.")

    dest_dir = _session_dir(session_id)
    dest_path = dest_dir / "template.pdf"
    with open(dest_path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    if not engine.is_valid_pdf(str(dest_path)):
        dest_path.unlink(missing_ok=True)
        raise HTTPException(400, "The selected file is not a valid PDF template.")

    try:
        info = engine.get_pdf_info(str(dest_path))
    except Exception as exc:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(400, f"Could not inspect PDF template: {exc}")

    fields = info["fields"]
    has_fields = info["has_fillable_fields"]
    analysis = info.get("analysis", {})

    return {
        "filename": file.filename,
        "width": info["width"],
        "height": info["height"],
        "page_count": info["page_count"],
        "has_fillable_fields": has_fields,
        "mode": "field" if has_fields else "overlay",
        "fields": [
            {
                "name": f.name,
                "page": f.page,
                "font_name": f.font_name,
                "font_size": f.font_size,
                "max_len": f.max_len,
            }
            for f in fields
        ],
        "default_overlay": {
            "x": info["width"] / 2.0,
            "y": info["height"] * 0.48,
            "x_percent": analysis.get("x_percent", 50.0),
            "y_percent": analysis.get("y_percent", 50.0),
            "font_name": analysis.get("font_name", "Times-Bold"),
            "font_size": analysis.get("font_size", 28.0),
            "font_color": analysis.get("font_color", "#0d408c"),
            "align": analysis.get("align", "center"),
            "box_width": analysis.get("box_width", 520),
            "box_height": analysis.get("box_height", 48),
            "placeholder_bbox": analysis.get("bbox"),
            "placeholder_text": analysis.get("placeholder_text"),
            "reason": analysis.get("reason", "Auto-detected styles from template"),
        },
    }


from fastapi.responses import JSONResponse, FileResponse, Response


@app.get("/api/template/preview-image")
def preview_template_image(
    session_id: str,
    name: str = "Jane Doe",
    mode: str = "overlay",
    field_name: Optional[str] = None,
    font_name: str = "Times-Bold",
    font_size: float = 32,
    font_color: str = "#d97706",
    align: str = "center",
    x_percent: Optional[float] = None,
    y_percent: float = 36.0,
    cover_box: bool = False,
    box_width: Optional[float] = None,
    box_height: Optional[float] = None,
    box_color: str = "#FFFFFF",
    bbox_str: Optional[str] = None,
):
    dest_dir = _session_dir(session_id)
    template_path = dest_dir / "template.pdf"
    if not template_path.exists():
        raise HTTPException(404, "Template not found")

    placeholder_bbox = None
    if bbox_str:
        try:
            placeholder_bbox = [float(x) for x in bbox_str.split(",") if x.strip()]
        except Exception:
            placeholder_bbox = None

    png_bytes = engine.render_certificate_image(
        template_path=str(template_path),
        name_value=name,
        mode=mode,
        field_name=field_name,
        x_percent=x_percent,
        y_percent=y_percent,
        font_name=font_name,
        font_size=font_size,
        font_color=font_color,
        align=align,
        cover_box=cover_box,
        box_width=box_width,
        box_height=box_height,
        box_color=box_color,
        placeholder_bbox=placeholder_bbox,
        dpi=130,
    )
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


@app.get("/api/template/sample-preview")
def preview_sample_certificate(
    session_id: str,
    name: str = "Jane Doe (Sample Recipient)",
    mode: str = "overlay",
    field_name: Optional[str] = None,
    font_name: str = "Times-Bold",
    font_size: float = 28,
    font_color: str = "#0d408c",
    align: str = "center",
    x_percent: Optional[float] = None,
    y_percent: float = 50.0,
    cover_box: bool = False,
    box_width: Optional[float] = None,
    box_height: Optional[float] = None,
    box_color: str = "#FFFFFF",
    bbox_str: Optional[str] = None,
):
    dest_dir = _session_dir(session_id)
    template_path = dest_dir / "template.pdf"
    if not template_path.exists():
        raise HTTPException(404, "Template not found")

    preview_path = dest_dir / "sample_preview.pdf"
    if mode == "field" and field_name:
        engine.fill_single_certificate(str(template_path), field_name, name, str(preview_path))
    else:
        placeholder_bbox = None
        if bbox_str:
            try:
                placeholder_bbox = [float(x) for x in bbox_str.split(",") if x.strip()]
            except Exception:
                placeholder_bbox = None

        engine.overlay_single_certificate(
            template_path=str(template_path),
            name_value=name,
            output_path=str(preview_path),
            x_percent=x_percent,
            y_percent=y_percent,
            font_name=font_name,
            font_size=font_size,
            font_color=font_color,
            align=align,
            placeholder_bbox=placeholder_bbox,
            cover_box=cover_box,
            box_width=box_width,
            box_height=box_height,
            box_color=box_color,
        )
    return FileResponse(
        str(preview_path),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=preview.pdf"},
    )


@app.post("/api/upload/names")
async def upload_names(session_id: str = Form(...), file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in (".xlsx", ".xlsm", ".csv"):
        raise HTTPException(400, "Please select an .xlsx or .csv names list.")

    dest_dir = _session_dir(session_id)
    dest_path = dest_dir / f"names{ext}"
    with open(dest_path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    try:
        columns = engine.read_columns(str(dest_path))
    except Exception as exc:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(400, f"Could not read the names file: {exc}")

    if not columns:
        raise HTTPException(422, "No recipient names were found.")

    try:
        preview_records = engine.read_names(str(dest_path), column=columns[0])
    except Exception:
        preview_records = []

    return {
        "filename": file.filename,
        "columns": columns,
        "row_count": len(preview_records),
        "preview": [r.raw_name for r in preview_records[:5]],
    }


@app.get("/api/names/preview")
def preview_names(session_id: str, column: str):
    dest_dir = _session_dir(session_id)
    candidates = list(dest_dir.glob("names.*"))
    if not candidates:
        raise HTTPException(404, "Please select a names list.")
    records = engine.read_names(str(candidates[0]), column=column)
    empty = sum(1 for r in records if not r.raw_name)
    return {
        "row_count": len(records),
        "empty_count": empty,
        "preview": [r.raw_name for r in records[:8] if r.raw_name],
    }


def _pick_folder_subprocess() -> Optional[str]:
    """Open a folder picker in an isolated subprocess so Tkinter/Tcl thread cleanup
    never crashes the main FastAPI/Uvicorn server process (fixes Tcl_AsyncDelete crash)."""
    if sys.platform.startswith("win"):
        # 1. Native Windows Forms dialog via PowerShell
        try:
            ps_cmd = (
                "[System.Reflection.Assembly]::LoadWithPartialName('System.windows.forms') | Out-Null; "
                "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog; "
                "$dialog.Description = 'Select Certificate Output Folder'; "
                "$dialog.ShowNewFolderButton = $true; "
                "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { "
                "  Write-Output $dialog.SelectedPath "
                "}"
            )
            res = subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd],
                capture_output=True,
                text=True,
                check=False,
            )
            folder = res.stdout.strip()
            if folder and os.path.isdir(folder):
                return folder
        except Exception:
            pass

    # 2. Fallback to isolated Python subprocess with Tkinter
    try:
        script = (
            "import tkinter as tk\n"
            "from tkinter import filedialog\n"
            "root = tk.Tk()\n"
            "root.withdraw()\n"
            "root.attributes('-topmost', True)\n"
            "folder = filedialog.askdirectory(title='Select output folder')\n"
            "root.destroy()\n"
            "if folder:\n"
            "    print(folder)\n"
        )
        res = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            check=False,
        )
        folder = res.stdout.strip()
        if folder and os.path.isdir(folder):
            return folder
    except Exception:
        pass

    return None


@app.post("/api/browse-folder")
def browse_folder():
    try:
        folder = _pick_folder_subprocess()
        if not folder:
            return {"path": None}
        return {"path": folder}
    except Exception as exc:
        raise HTTPException(500, f"Could not open a folder picker: {exc}")


@app.post("/api/open-folder")
def open_folder(path: str = Form(...)):
    if not os.path.isdir(path):
        raise HTTPException(400, "Please select an output folder.")
    try:
        if sys.platform.startswith("win"):
            os.startfile(path)  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.run(["open", path], check=False)
        else:
            subprocess.run(["xdg-open", path], check=False)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(500, f"Could not open folder: {exc}")


class ValidateFolderRequest(BaseModel):
    path: str


@app.post("/api/validate-folder")
def validate_folder(body: ValidateFolderRequest):
    path = body.path.strip()
    if not path:
        raise HTTPException(400, "Please select an output folder.")
    try:
        os.makedirs(path, exist_ok=True)
    except Exception as exc:
        raise HTTPException(400, f"Could not use that folder: {exc}")
    if not os.access(path, os.W_OK):
        raise HTTPException(400, "That folder is not writable.")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    session_id: str
    field_name: Optional[str] = None
    name_column: str
    output_folder: str
    mode: str = "field"  # "field" or "overlay"
    font_name: Optional[str] = "Times-Bold"
    font_size: Optional[float] = 28
    font_color: Optional[str] = "#0d408c"
    align: Optional[str] = "center"
    x_percent: Optional[float] = 50.0
    y_percent: Optional[float] = 50.0
    x: Optional[float] = None
    y: Optional[float] = None
    placeholder_bbox: Optional[list[float]] = None
    cover_box: Optional[bool] = False
    box_width: Optional[float] = None
    box_height: Optional[float] = None
    box_color: Optional[str] = "#FFFFFF"


_active_job_cancel_event: Optional[threading.Event] = None


@app.post("/api/generate")
def start_generate(body: GenerateRequest):
    global _active_job_cancel_event
    dest_dir = _session_dir(body.session_id)
    template_path = dest_dir / "template.pdf"
    if not template_path.exists():
        raise HTTPException(400, "Please select a certificate PDF template.")

    names_candidates = list(dest_dir.glob("names.*"))
    if not names_candidates:
        raise HTTPException(400, "Please select a names list.")
    names_path = names_candidates[0]

    if not body.output_folder.strip():
        raise HTTPException(400, "Please select an output folder.")
    os.makedirs(body.output_folder, exist_ok=True)

    fields = engine.detect_fillable_fields(str(template_path))
    field_lookup = {f.name: f for f in fields}
    if body.mode == "field" and body.field_name and body.field_name not in field_lookup:
        body.mode = "overlay"

    names = engine.read_names(str(names_path), column=body.name_column)
    if not names:
        raise HTTPException(422, "No recipient names were found.")

    # Cancel any previously running generation job
    if _active_job_cancel_event is not None:
        _active_job_cancel_event.set()
    cancel_event = threading.Event()
    _active_job_cancel_event = cancel_event

    job_id = uuid.uuid4().hex
    with _jobs_lock:
        _jobs[job_id] = {
            "status": "running",
            "processed": 0,
            "total": len(names),
            "current_name": "",
            "results": [],
        }

    def progress_cb(idx, total, name):
        with _jobs_lock:
            _jobs[job_id]["processed"] = idx
            _jobs[job_id]["total"] = total
            _jobs[job_id]["current_name"] = name

    overlay_options = {
        "font_name": body.font_name or "Times-Bold",
        "font_size": body.font_size or 28,
        "font_color": body.font_color or "#0d408c",
        "align": body.align or "center",
        "x_percent": body.x_percent if body.x_percent is not None else 50.0,
        "y_percent": body.y_percent if body.y_percent is not None else 50.0,
        "x": body.x,
        "y": body.y,
        "placeholder_bbox": body.placeholder_bbox,
        "cover_box": bool(body.cover_box),
        "box_width": body.box_width,
        "box_height": body.box_height,
        "box_color": body.box_color or "#FFFFFF",
    }

    def run_job():
        try:
            results = engine.generate_all(
                template_path=str(template_path),
                names=names,
                field_name=body.field_name,
                field_lookup=field_lookup,
                output_dir=body.output_folder,
                progress_cb=progress_cb,
                mode=body.mode,
                overlay_options=overlay_options,
                cancel_event=cancel_event,
            )
            with _jobs_lock:
                _jobs[job_id]["status"] = "done"
                _jobs[job_id]["results"] = [
                    {
                        "row_number": r.row_number,
                        "name": r.name,
                        "status": r.status,
                        "message": r.message,
                        "output_path": r.output_path,
                    }
                    for r in results
                ]
        except Exception as exc:
            with _jobs_lock:
                _jobs[job_id]["status"] = "failed"
                _jobs[job_id]["error"] = str(exc)

    threading.Thread(target=run_job, daemon=True).start()
    return {"job_id": job_id}


@app.get("/api/generate/{job_id}/status")
def generate_status(job_id: str):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            raise HTTPException(404, "Unknown job.")
        return dict(job)


@app.get("/api/generate/{job_id}/report.csv")
def generate_report_csv(job_id: str):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job or job.get("status") != "done":
            raise HTTPException(404, "Report not ready.")
        results = job["results"]

    dest_dir = SESSIONS_DIR / "_reports"
    dest_dir.mkdir(exist_ok=True)
    report_path = dest_dir / f"{job_id}.csv"
    with open(report_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Row", "Name", "Status", "Message", "Output File"])
        for r in results:
            writer.writerow([r["row_number"], r["name"], r["status"], r["message"], r["output_path"] or ""])

    return FileResponse(report_path, filename="generation_report.csv", media_type="text/csv")


@app.delete("/api/session/{session_id}")
def cleanup_session(session_id: str):
    """Removes the temporary uploaded copies (template/names) for this
    session. Generated certificates in the user's chosen output folder are
    never touched by this."""
    d = SESSIONS_DIR / session_id
    if d.exists():
        shutil.rmtree(d, ignore_errors=True)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Serve the built frontend (packaged / production mode)
# ---------------------------------------------------------------------------

if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    import webbrowser

    port = 8000
    if not FRONTEND_DIST.exists():
        print("Note: frontend/dist not found - run `npm run build` in frontend/ "
              "first, or use `npm run dev` for development mode (Vite on :5173).")
    else:
        threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{port}")).start()

    uvicorn.run(app, host="127.0.0.1", port=port)
