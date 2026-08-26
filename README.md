# 📜 Bulk Certificate Generator

> **100% Local & Private** — Generate hundreds of personalized PDF certificates in seconds, directly on your machine. No cloud, no uploads, no data leaves your computer.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎨 **Interactive Drag & Drop Canvas** | Click and drag directly on the live certificate preview to position the recipient name exactly where you want — Canva-style selection box with corner handles |
| 📄 **Universal Template Support** | Works with **any** PDF certificate — fillable form fields (AcroForm) or image-based templates with text overlay |
| ⚡ **Ultra-Fast Batch Engine** | Generates 500+ certificates in under 10 seconds using an optimized PyMuPDF in-memory pipeline with zero memory bloat |
| 🎯 **Precise 2D Positioning** | Full X/Y percentage-based placement with Left/Center/Right alignment, quick-snap buttons, and real-time coordinate display |
| 🖋️ **Rich Typography Controls** | Font family (Times, Helvetica, Courier), size (14–64pt), color presets + custom hex picker, and text alignment |
| 🧹 **Background Patch/Wipe** | Cover existing placeholder text on any template with a configurable white (or custom color) rectangle before overlaying the new name |
| 📊 **Excel & CSV Support** | Read recipient names from `.xlsx`, `.xlsm`, `.csv` files with automatic column detection and smart sheet selection |
| 📁 **Native Folder Browser** | Windows-native folder picker dialog for selecting the output directory |
| 🔒 **100% Offline & Private** | Everything runs locally — your certificates, names, and templates never leave your machine |

---

## 🖥️ Screenshots

### Live Interactive Canvas
The interactive preview lets you drag the recipient name to any position on the certificate in real time:

- **Canva-style selection box** with corner handles and dashed border
- **Floating coordinate tooltip** while dragging
- **Real-time font/color/size preview** matching your exact settings
- **Background patch preview** showing the wipe area

### Certificate Output
Generated certificates are pixel-perfect PDF files with the recipient name rendered at the exact position, font, size, and color you configured.

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+** ([Download](https://www.python.org/downloads/))
- **Node.js 18+** ([Download](https://nodejs.org/)) — only needed if you want to modify the frontend

### 🖥️ One-Click Desktop Launch (Windows)

```bash
# Clone the repository
git clone https://github.com/NarayanapurapuGanesh/BulkCertificateGeneration.git
cd BulkCertificateGeneration

# Double-click start.bat, or run:
start.bat
```

The launcher will automatically start the **native desktop application window** with zero terminal popups.

### 📦 Build Standalone Executable (.exe)

To compile a standalone `.exe` that runs anywhere without needing Python installed:

```bash
# Double-click build_desktop.bat, or run:
build_desktop.bat
```

The standalone application will be compiled into:
`dist_app/BulkCertificateGenerator.exe`

### Manual Setup

```bash
# 1. Clone
git clone https://github.com/NarayanapurapuGanesh/BulkCertificateGeneration.git
cd BulkCertificateGeneration

# 2. Backend setup
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

# 3. Frontend build (optional — pre-built dist is included)
cd ../frontend
npm install
npm run build

# 4. Run
cd ../backend
python main.py
```

Open **http://localhost:8000** in your browser.

---

## 📖 How to Use

### Step 1: Upload Certificate Template
- Drag & drop or browse for your **PDF certificate template**
- The system auto-detects whether it has fillable form fields or needs text overlay mode
- For overlay mode, click/drag directly on the preview to position the name

### Step 2: Upload Names List
- Upload an **Excel (.xlsx/.xlsm)** or **CSV (.csv)** file with recipient names
- Select the column containing the names
- Preview detected names before generating

### Step 3: Configure Styling
- **Font Family**: Times Bold, Helvetica Bold, Courier Bold, and more
- **Font Size**: 14pt to 64pt with a live slider
- **Font Color**: 7 curated presets + custom hex color picker
- **Text Alignment**: Left, Center, or Right
- **Background Patch**: Enable to cover existing placeholder text with a wipe rectangle

### Step 4: Position the Name
- **Click or drag** anywhere on the live certificate canvas
- Use **quick-snap buttons** (Left 16%, Center 50%, Right 84%)
- Fine-tune with **X/Y percentage sliders**
- Adjust **Patch Width/Height** for the background wipe area

### Step 5: Generate
- Select the **output folder** using the native folder browser
- Click **Generate All Certificates**
- Watch the real-time progress bar
- All certificates are saved as individual PDF files named after each recipient

---

## 🏗️ Architecture

```
bulk-certificate-generator/
├── backend/
│   ├── main.py                  # FastAPI server + API endpoints
│   ├── desktop.py               # Native desktop window launcher
│   ├── certificate_engine.py    # Core PDF processing engine
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main React application
│   │   ├── api.js               # API client functions
│   │   └── components/          # Reusable UI components
│   ├── dist/                    # Pre-built production bundle
│   └── package.json
├── start.bat                    # One-click desktop launcher
├── build_desktop.bat            # One-click standalone .exe builder
├── .gitignore
└── README.md
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Python 3.10+ / FastAPI / Uvicorn | REST API server |
| **Desktop Window** | pywebview (Edge WebView2) | Native borderless desktop window |
| **Packaging** | PyInstaller | Standalone single-file .exe compilation |
| **PDF Engine** | PyMuPDF (fitz) | Ultra-fast PDF rendering & text insertion |
| **PDF Forms** | pypdf | AcroForm field detection & filling |
| **Text Overlay** | ReportLab | PDF text overlay generation |
| **Frontend** | React 19 / Vite 6 | Interactive single-page application |
| **Styling** | Tailwind CSS 4 | Utility-first responsive design |
| **Excel Parsing** | openpyxl | .xlsx/.xlsm file reading |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/session` | Create a new session |
| `POST` | `/api/upload/template` | Upload PDF certificate template |
| `POST` | `/api/upload/names` | Upload Excel/CSV names list |
| `GET` | `/api/template/preview-image` | Live certificate preview as PNG |
| `POST` | `/api/generate/{session_id}/start` | Start batch generation |
| `GET` | `/api/generate/{session_id}/status` | Poll generation progress |
| `POST` | `/api/open-folder` | Native OS folder browser dialog |
| `POST` | `/api/validate-folder` | Validate output folder path |

---

## ⚙️ Configuration

### Supported Font Families
- **Times Bold** (Classic Serif) — `Times-Bold`
- **Times Italic** (Elegant) — `Times-Italic`
- **Times Roman** — `Times-Roman`
- **Helvetica Bold** (Modern Sans) — `Helvetica-Bold`
- **Helvetica Regular** — `Helvetica`
- **Courier Bold** (Monospace) — `Courier-Bold`

### Color Presets
| Color | Hex Code |
|-------|----------|
| Gold / Amber | `#d97706` |
| Warm Gold | `#e59b2a` |
| Navy Blue | `#0d408c` |
| Deep Charcoal | `#1e293b` |
| Pure Black | `#000000` |
| Crimson Red | `#991b1b` |
| Emerald Green | `#065f46` |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Narayanapurapu Ganesh**

- GitHub: [@NarayanapurapuGanesh](https://github.com/NarayanapurapuGanesh)

---

<p align="center">
  <strong>⭐ Star this repo if you find it useful!</strong>
</p>
