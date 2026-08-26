const BASE = "/api";

async function handle(res) {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.detail || message;
    } catch (_) {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}

export async function createSession() {
  return handle(await fetch(`${BASE}/session`, { method: "POST" }));
}

export async function uploadTemplate(sessionId, file) {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("file", file);
  return handle(await fetch(`${BASE}/upload/template`, { method: "POST", body: form }));
}

export async function uploadNames(sessionId, file) {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("file", file);
  return handle(await fetch(`${BASE}/upload/names`, { method: "POST", body: form }));
}

export async function previewNames(sessionId, column) {
  const params = new URLSearchParams({ session_id: sessionId, column });
  return handle(await fetch(`${BASE}/names/preview?${params.toString()}`));
}

export async function browseFolder() {
  return handle(await fetch(`${BASE}/browse-folder`, { method: "POST" }));
}

export async function validateFolder(path) {
  return handle(
    await fetch(`${BASE}/validate-folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    })
  );
}

export async function startGenerate({
  sessionId,
  fieldName,
  nameColumn,
  outputFolder,
  mode = "field",
  fontName = "Times-Bold",
  fontSize = 28,
  fontColor = "#0d408c",
  align = "center",
  xPercent = 50.0,
  yPercent = 50.0,
  placeholderBbox = null,
  coverBox = false,
  boxColor = "#FFFFFF",
  boxWidth = null,
  boxHeight = null,
}) {
  return handle(
    await fetch(`${BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        field_name: fieldName,
        name_column: nameColumn,
        output_folder: outputFolder,
        mode,
        font_name: fontName,
        font_size: fontSize,
        font_color: fontColor,
        align,
        x_percent: xPercent,
        y_percent: yPercent,
        placeholder_bbox: placeholderBbox,
        cover_box: coverBox,
        box_color: boxColor,
        box_width: boxWidth,
        box_height: boxHeight,
      }),
    })
  );
}

export function previewImageUrl({
  sessionId,
  name = "Jane Doe",
  mode = "overlay",
  fieldName = "",
  fontName = "Times-Bold",
  fontSize = 32,
  fontColor = "#d97706",
  align = "center",
  xPercent = 50.0,
  yPercent = 36.0,
  placeholderBbox = null,
  coverBox = true,
  boxColor = "#FFFFFF",
  boxWidth = null,
  boxHeight = null,
}) {
  const params = new URLSearchParams({
    session_id: sessionId,
    name,
    mode,
    field_name: fieldName || "",
    font_name: fontName,
    font_size: String(fontSize),
    font_color: fontColor,
    align,
    x_percent: String(xPercent),
    y_percent: String(yPercent),
    cover_box: coverBox ? "true" : "false",
    box_color: boxColor,
    bbox_str: placeholderBbox ? placeholderBbox.join(",") : "",
    t: String(Date.now()),
  });
  if (boxWidth) params.append("box_width", String(boxWidth));
  if (boxHeight) params.append("box_height", String(boxHeight));
  return `${BASE}/template/preview-image?${params.toString()}`;
}

export function samplePreviewUrl({
  sessionId,
  name = "Jane Doe (Sample Recipient)",
  mode = "overlay",
  fieldName = "",
  fontName = "Times-Bold",
  fontSize = 28,
  fontColor = "#0d408c",
  align = "center",
  xPercent = 50.0,
  yPercent = 50.0,
  placeholderBbox = null,
  coverBox = false,
  boxColor = "#FFFFFF",
}) {
  const params = new URLSearchParams({
    session_id: sessionId,
    name,
    mode,
    field_name: fieldName || "",
    font_name: fontName,
    font_size: String(fontSize),
    font_color: fontColor,
    align,
    x_percent: String(xPercent),
    y_percent: String(yPercent),
    cover_box: coverBox ? "true" : "false",
    box_color: boxColor,
    bbox_str: placeholderBbox ? placeholderBbox.join(",") : "",
    t: String(Date.now()),
  });
  return `${BASE}/template/sample-preview?${params.toString()}`;
}

export async function getJobStatus(jobId) {
  return handle(await fetch(`${BASE}/generate/${jobId}/status`));
}

export async function openFolder(path) {
  const form = new FormData();
  form.append("path", path);
  return handle(await fetch(`${BASE}/open-folder`, { method: "POST", body: form }));
}

export function reportCsvUrl(jobId) {
  return `${BASE}/generate/${jobId}/report.csv`;
}

export async function cleanupSession(sessionId) {
  try {
    await fetch(`${BASE}/session/${sessionId}`, { method: "DELETE" });
  } catch (_) {
    /* best-effort */
  }
}
