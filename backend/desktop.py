"""
Bulk Certificate Generator - Standalone Desktop Application
===========================================================
Launches the FastAPI backend in a background worker and opens a sleek,
native Windows application window powered by pywebview (Edge WebView2).
Zero terminal popup, zero browser address bar, 100% offline.
"""
import io
import multiprocessing
import os
import socket
import sys
import threading
import time
import urllib.request
import uvicorn

# Fix for PyInstaller --noconsole mode where sys.stdout/stderr are None
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

from main import app, FRONTEND_DIST, APP_DIR


def find_free_port(preferred: int = 8000) -> int:
    """Check if preferred port is free; otherwise find any available port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", preferred))
            return preferred
        except OSError:
            pass
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_backend_server(port: int):
    """Run uvicorn server in background thread with log_config=None to prevent console crashes."""
    try:
        config = uvicorn.Config(
            app,
            host="127.0.0.1",
            port=port,
            loop="asyncio",
            log_config=None,
            log_level="critical",
            access_log=False,
        )
        server = uvicorn.Server(config)
        server.run()
    except Exception as e:
        err_path = APP_DIR / "server_error.log"
        with open(err_path, "a", encoding="utf-8") as f:
            f.write(f"Server error: {e}\n")


def wait_for_server(url: str, timeout: float = 12.0) -> bool:
    """Wait until the backend server is accepting HTTP requests."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(
                f"{url}/api/session",
                data=b"{}",
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.15)
    return False


def main():
    multiprocessing.freeze_support()

    port = find_free_port(8000)
    server_thread = threading.Thread(target=start_backend_server, args=(port,), daemon=True)
    server_thread.start()

    base_url = f"http://127.0.0.1:{port}"
    server_ok = wait_for_server(base_url, timeout=10.0)

    try:
        import importlib
        webview = importlib.import_module("webview")
        window = webview.create_window(
            title="Bulk Certificate Generator",
            url=base_url,
            width=1320,
            height=880,
            min_size=(980, 660),
            resizable=True,
            text_select=True,
        )
        webview.start(gui="edgechromium")
        sys.exit(0)
    except Exception as e:
        import webbrowser
        webbrowser.open(base_url)
        while True:
            time.sleep(1)


if __name__ == "__main__":
    main()
