"""Configuration management for the Gemma API server."""

import os
from pathlib import Path

import yaml

DEFAULT_CONFIG = {
    "model": "google/gemma-4-E4B-it",
    "host": "0.0.0.0",
    "port": 8080,
    "ui_port": 7860,
    "max_tokens": 1024,
    "temperature": 1.0,
    "top_p": 0.95,
    "top_k": 64,
    "thinking_enabled": False,
    "trust_remote_code": True,
}


def _config_dir() -> Path:
    if env := os.environ.get("GEMMA_API_CONFIG_DIR"):
        return Path(env)
    return Path.home() / ".gemma-api"


def _config_path() -> Path:
    return _config_dir() / "config.yaml"


def load_config() -> dict:
    """Load configuration from file, falling back to defaults."""
    path = _config_path()
    if path.exists():
        try:
            with open(path) as f:
                user_config = yaml.safe_load(f) or {}
            merged = {**DEFAULT_CONFIG, **user_config}
            return merged
        except Exception:
            return dict(DEFAULT_CONFIG)
    return dict(DEFAULT_CONFIG)


def save_config(config: dict) -> None:
    """Save configuration to file."""
    path = _config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        yaml.dump(config, f, sort_keys=False, default_flow_style=False)


def init_config() -> dict:
    """Initialize config file if it does not exist, then return config."""
    path = _config_path()
    if not path.exists():
        save_config(DEFAULT_CONFIG)
        return dict(DEFAULT_CONFIG)
    return load_config()
