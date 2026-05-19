"""Server lifecycle management for the Gemma API."""

import os
import signal
import subprocess
import sys
import time

import requests

from .platform import detect_backend


class GemmaServer:
    """Manages the mlx-vlm inference server process."""

    def __init__(self, config: dict):
        self.config = config
        self.process: subprocess.Popen | None = None

    @property
    def base_url(self) -> str:
        return f"http://{self.config['host']}:{self.config['port']}"

    def start(self) -> None:
        """Start the mlx-vlm server as a subprocess."""
        cmd = [
            sys.executable, "-m", "mlx_vlm.server",
            "--model", self.config["model"],
            "--host", self.config["host"],
            "--port", str(self.config["port"]),
            "--trust-remote-code",
        ]

        if self.config.get("thinking_enabled"):
            cmd.append("--enable-thinking")

        env = os.environ.copy()
        backend = detect_backend()
        if backend == "cuda":
            env.setdefault("MLX_VLM_BACKEND", "cuda")

        print(f"[gemma-api] Starting mlx_vlm.server on {self.base_url}")
        print(f"[gemma-api] Model: {self.config['model']}")
        print(f"[gemma-api] Backend: {backend}")
        print("[gemma-api] First run will download the model (~16 GB).")
        print("[gemma-api] This can take 10-30 minutes depending on connection.")
        print("[gemma-api] Waiting for server to be ready...\n")

        self.process = subprocess.Popen(
            cmd,
            stdout=None,
            stderr=None,
            env=env,
        )

        self._wait_for_ready()

    def _wait_for_ready(self, timeout: int = 1800) -> None:
        """Poll the health endpoint until the server responds."""
        url = f"{self.base_url}/health"
        start = time.time()
        last_msg = start
        while time.time() - start < timeout:
            if self.process and self.process.poll() is not None:
                rc = self.process.returncode
                raise RuntimeError(
                    f"Server process exited with code {rc}"
                )
            try:
                resp = requests.get(url, timeout=2)
                if resp.status_code == 200:
                    print(f"\n[gemma-api] Server ready on {self.base_url}")
                    return
            except requests.ConnectionError:
                pass

            if time.time() - last_msg > 30:
                elapsed = int(time.time() - start)
                print(
                    f"[gemma-api] Still waiting... ({elapsed}s elapsed)"
                )
                last_msg = time.time()

            time.sleep(2)

        raise TimeoutError(
            f"Server did not become ready within {timeout}s. "
            "Check network connection or try pre-downloading with: "
            "gemma-api download"
        )

    def stop(self, wait: bool = True) -> None:
        """Stop the server process gracefully."""
        if self.process is None:
            return
        self.process.send_signal(signal.SIGINT)
        if wait:
            try:
                self.process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
        self.process = None
        print("[gemma-api] Server stopped.")

    def is_running(self) -> bool:
        """Check if the server process is alive."""
        if self.process is None:
            return False
        return self.process.poll() is None

    def is_ready(self) -> bool:
        """Check if the server is responding to health checks."""
        try:
            resp = requests.get(f"{self.base_url}/health", timeout=2)
            return resp.status_code == 200
        except Exception:
            return False


def start_server(config: dict) -> GemmaServer:
    """Convenience function to create and start a server."""
    server = GemmaServer(config)
    server.start()
    return server
