"""Platform detection for choosing the optimal inference backend."""

import platform as _platform


def detect_backend() -> str:
    """Detect the optimal inference backend.

    Returns:
        "mlx" for Apple Silicon, "cuda" for NVIDIA GPUs, "cpu" otherwise.
    """
    system = _platform.system()
    arch = _platform.machine()

    if system == "Darwin" and arch == "arm64":
        return "mlx"

    if system == "Darwin" and arch == "x86_64":
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
        except ImportError:
            pass
        return "cpu"

    try:
        import torch
        if torch.cuda.is_available():
            return "cuda"
    except ImportError:
        pass

    return "cpu"


def get_gpu_info() -> dict:
    """Get GPU information for the current platform.

    Returns:
        Dictionary with GPU details or error information.
    """
    backend = detect_backend()

    if backend == "mlx":
        try:
            import mlx.core as mx
            mem_limit = "unknown"
            if hasattr(mx.metal, "get_memory_limit"):
                mem_limit = f"{mx.metal.get_memory_limit() / (1024**3):.1f} GB"
            return {
                "backend": "mlx",
                "device": "mps",
                "memory_limit": mem_limit,
                "architecture": "Apple Silicon",
            }
        except Exception as e:
            return {"backend": "mlx", "error": str(e)}

    elif backend == "cuda":
        try:
            import torch
            total_mem = torch.cuda.get_device_properties(0).total_mem
            return {
                "backend": "cuda",
                "device": torch.cuda.get_device_name(0),
                "memory_total": f"{total_mem / (1024**3):.1f} GB",
                "cuda_version": torch.version.cuda,
            }
        except Exception as e:
            return {"backend": "cuda", "error": str(e)}

    return {"backend": "cpu", "device": _platform.processor() or "unknown"}
