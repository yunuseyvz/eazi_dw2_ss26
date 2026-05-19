# Gemma API

Simple API server for **Gemma 4 E4B** with native support for **text + image + video + audio**. Works on Apple Silicon (MLX) and NVIDIA GPUs (CUDA).

## Features

- REST API with OpenAI-compatible `/v1/chat/completions` endpoint
- All four modalities: text, images, audio (ASR/AST), video (frame analysis)
- Thinking mode support (`enable_thinking: true`)
- Streaming responses (SSE)
- Gradio web chat UI (optional)
- Auto-detects platform: MLX on Apple Silicon, CUDA on NVIDIA
- Docker support for easy server deployment

## Quick Start

### Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (package manager)

### Install

```bash
# Clone and enter the project
cd llm-testing

# Install dependencies
uv sync

# Download the model (first run only)
uv run gemma-api download
```

### Start the server

```bash
# API only
uv run gemma-api start

# API + Gradio chat UI
uv run gemma-api start --ui
```

The API will be available at `http://localhost:8080` and the UI at `http://localhost:7860`.

### Configuration

```bash
# View platform info and current config
uv run gemma-api status

# Change settings
uv run gemma-api configure --model google/gemma-4-E4B-it --port 9090 --thinking
```

Config is stored at `~/.gemma-api/config.yaml`.

## API Usage

### Text

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-4-E4B-it",
    "messages": [{"role": "user", "content": "What is the capital of France?"}],
    "max_tokens": 256,
    "stream": false
  }'
```

### Image

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-4-E4B-it",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "input_image", "image_url": "/path/to/photo.jpg"},
        {"type": "text", "text": "Describe this image"}
      ]
    }],
    "max_tokens": 500
  }'
```

### Audio (Speech Recognition)

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-4-E4B-it",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "input_audio", "input_audio": "/path/to/speech.wav"},
        {"type": "text", "text": "Transcribe this audio in English."}
      ]
    }],
    "max_tokens": 500
  }'
```

### Video

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-4-E4B-it",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "input_video", "video": "/path/to/clip.mp4"},
        {"type": "text", "text": "Describe this video"}
      ]
    }],
    "max_tokens": 500
  }'
```

### All Modalities Combined

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-4-E4B-it",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "input_image", "image_url": "/path/to/photo.jpg"},
        {"type": "input_audio", "input_audio": "/path/to/speech.wav"},
        {"type": "input_video", "video": "/path/to/clip.mp4"},
        {"type": "text", "text": "Analyze all of these inputs together"}
      ]
    }],
    "max_tokens": 1000
  }'
```

### Thinking Mode

Add `"enable_thinking": true` to any request to see the model's reasoning:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-4-E4B-it",
    "messages": [{"role": "user", "content": "Solve: 2x + 5 = 15"}],
    "max_tokens": 512,
    "enable_thinking": true
  }'
```

## Docker

### Build

```bash
# For API server only
docker build -t gemma-api .

# For API + UI (dev target)
docker build --target dev -t gemma-api-dev .
```

### Run

```bash
# API server with GPU support
docker run --gpus all -p 8080:8080 -v gemma-models:/models gemma-api

# API + UI
docker run --gpus all -p 8080:8080 -p 7860:7860 -v gemma-models:/models gemma-api-dev
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
services:
  gemma-api:
    build:
      context: .
      target: dev
    ports:
      - "8080:8080"
      - "7860:7860"
    volumes:
      - gemma-models:/models
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

volumes:
  gemma-models:
```

## Model Details

- **Model**: [google/gemma-4-E4B-it](https://huggingface.co/google/gemma-4-E4B-it)
- **Parameters**: 4.5B effective (8B total)
- **Context**: 128K tokens
- **Modalities**: Text, Image, Audio, Video
- **License**: Apache 2.0
- **VRAM**: ~16 GB (BF16, full precision)

## Platform Support

| Platform | Backend | Status |
|----------|---------|--------|
| Apple Silicon (M1-M4) | MLX | Full support |
| NVIDIA GPU | CUDA | Full support |
| CPU (any) | CPU | Limited (slow) |

## CLI Commands

| Command | Description |
|---------|-------------|
| `gemma-api start` | Start the API server |
| `gemma-api start --ui` | Start server + Gradio chat UI |
| `gemma-api status` | Show platform info and config |
| `gemma-api configure` | Update configuration |
| `gemma-api download` | Pre-download the model |
