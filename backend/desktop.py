"""
Bulk Certificate Generator - Standalone Desktop Application
===========================================================
Launches the FastAPI backend in a background worker and opens a sleek,
native Windows application window powered by pywebview (Edge WebView2).
Zero terminal popup, zero browser address bar, 100% offline.
"""
import os
import socket
import sys
import threading
import time
import urllib.request
import uvicorn
import webview

from main import app, FRONTEND_DIST


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
    """Run uvicorn server in background thread."""
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=port,
        log_level="error",
        access_log=False,
    )
    server = uvicorn.Server(config)
    server.run()


def wait_for_server(url: str, timeout: float = 8.0) -> bool:
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
            time.sleep(0.1)
    return False


def main():
    port = find_free_port(8000)
    server_thread = threading.Thread(target=start_backend_server, args=(port,), daemon=True)
    server_thread.start()

    base_url = f"http://127.0.0.1:{port}"
    wait_for_server(base_url, timeout=6.0)

    # Open sleek native desktop window
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


if __name__ == "__main__":
    main()
