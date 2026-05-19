"""CLI entry point for the Gemma API server."""

import os
import sys
import threading
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from .config import load_config, save_config
from .platform import detect_backend, get_gpu_info
from .server import GemmaServer

console = Console()


@click.group()
@click.version_option()
def main() -> None:
    """Gemma API — Multimodal inference server for Gemma 4 E4B."""


@main.command()
@click.option("--port", "-p", type=int, help="API server port (default: 8080)")
@click.option("--host", "-h", default="0.0.0.0", help="Host to bind (default: 0.0.0.0)")
@click.option("--ui/--no-ui", default=False, help="Also launch the Gradio chat UI")
@click.option("--ui-port", type=int, default=7860, help="UI port (default: 7860)")
@click.option(
    "--thinking/--no-thinking",
    default=None,
    help="Enable thinking mode by default",
)
@click.option("--model", help="Model ID to use (HF repo or local path)")
def start(
    port: int | None,
    host: str,
    ui: bool,
    ui_port: int,
    thinking: bool | None,
    model: str | None,
) -> None:
    """Start the Gemma 4 inference server."""
    config = load_config()

    if port is not None:
        config["port"] = port
    if host:
        config["host"] = host
    if thinking is not None:
        config["thinking_enabled"] = thinking
    if model:
        config["model"] = model

    backend = detect_backend()

    table = Table(title="Gemma API Server")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")
    table.add_row("Model", config["model"])
    table.add_row("API Port", str(config["port"]))
    table.add_row("Host", config["host"])
    table.add_row("Backend", backend)
    table.add_row("Thinking", "on" if config["thinking_enabled"] else "off")
    if ui:
        table.add_row("Gradio UI", f"http://localhost:{ui_port}")
    console.print(table)

    server = GemmaServer(config)

    def cleanup():
        if server.is_running():
            server.stop()

    import atexit
    atexit.register(cleanup)

    try:
        server.start()
    except (RuntimeError, TimeoutError) as e:
        console.print(f"[red]Failed to start server: {e}[/red]")
        sys.exit(1)

    if ui:
        from .ui import launch_ui

        def _launch_ui():
            try:
                launch_ui(api_port=config["port"], ui_port=ui_port)
            except Exception as e:
                console.print(f"\n[red]Gradio UI failed to start: {e}[/red]")
                console.print(
                    "[yellow]The API server is still running on "
                    f"http://localhost:{config['port']}[/yellow]"
                )

        ui_thread = threading.Thread(
            target=_launch_ui,
            daemon=True,
        )
        ui_thread.start()
        console.print(
            f"[green]Gradio UI starting at http://localhost:{ui_port} ...[/green]"
        )

    console.print(
        f"[green]API server ready at http://localhost:{config['port']}[/green]"
    )
    console.print("[green]Press Ctrl+C to stop.[/green]")
    try:
        while server.is_running():
            import time
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        server.stop()
        console.print("[yellow]Server stopped.[/yellow]")


@main.command()
def status() -> None:
    """Show platform info and current configuration."""
    config = load_config()
    gpu = get_gpu_info()
    backend = detect_backend()

    table = Table(title="Platform Info")
    table.add_column("Property", style="cyan")
    table.add_column("Value", style="green")

    if backend == "mlx":
        table.add_row("Backend", "MLX (Apple Silicon)")
        table.add_row("Device", gpu.get("device", "unknown"))
        table.add_row("Memory Limit", gpu.get("memory_limit", "unknown"))
        table.add_row("Architecture", gpu.get("architecture", "unknown"))
    elif backend == "cuda":
        table.add_row("Backend", "CUDA (NVIDIA)")
        table.add_row("Device", gpu.get("device", "unknown"))
        table.add_row("VRAM", gpu.get("memory_total", "unknown"))
        table.add_row("CUDA Version", gpu.get("cuda_version", "unknown"))
    else:
        table.add_row("Backend", "CPU")
        table.add_row("Device", gpu.get("device", "unknown"))
    console.print(table)

    table2 = Table(title="Configuration")
    table2.add_column("Setting", style="cyan")
    table2.add_column("Value", style="green")
    for key, value in config.items():
        table2.add_row(key, str(value))
    console.print(table2)


@main.command()
@click.option("--model", help="Model to configure (HF repo ID)")
@click.option("--port", type=int, help="API server port")
@click.option(
    "--thinking/--no-thinking",
    default=None,
    help="Enable thinking mode by default",
)
def configure(
    model: str | None, port: int | None, thinking: bool | None
) -> None:
    """Update the Gemma API configuration."""
    config = load_config()
    changed = False

    if model is not None:
        config["model"] = model
        changed = True
        console.print(f"[green]Model set to: {model}[/green]")
    if port is not None:
        config["port"] = port
        changed = True
        console.print(f"[green]Port set to: {port}[/green]")
    if thinking is not None:
        config["thinking_enabled"] = thinking
        changed = True
        console.print(f"[green]Thinking mode: {'on' if thinking else 'off'}[/green]")

    if changed:
        save_config(config)
        console.print("[green]Configuration saved.[/green]")
    else:
        console.print("[yellow]No changes specified. Use --help for options.[/yellow]")


@main.command()
def download() -> None:
    """Pre-download the model from HuggingFace."""
    config = load_config()
    model = config["model"]

    console.print(f"[cyan]Pre-downloading model: {model}[/cyan]")
    cache_dir = os.environ.get(
        "HF_HOME", str(Path.home() / ".cache" / "huggingface")
    )
    console.print(f"[dim]Cache directory: {cache_dir}[/dim]")
    console.print("[dim]This may take 10-30 minutes for ~16 GB...[/dim]")

    try:
        from huggingface_hub import snapshot_download

        path = snapshot_download(
            repo_id=model,
            cache_dir=cache_dir,
            resume_download=True,
        )
        console.print(f"[green]Model downloaded to: {path}[/green]")
        console.print("[green]Ready to start: gemma-api start[/green]")

    except ImportError:
        console.print(
            "[yellow]huggingface_hub not available. "
            "The model will download automatically on first start.[/yellow]"
        )
    except Exception as e:
        console.print(f"[red]Download failed: {e}[/red]")
        console.print(
            "[yellow]You can also let it download on first start: "
            "gemma-api start[/yellow]"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
