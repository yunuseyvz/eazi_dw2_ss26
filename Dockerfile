FROM nvidia/cuda:12.4.0-runtime-ubuntu22.04 AS base

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    HF_HOME=/models

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3.11-dev \
    curl \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

COPY pyproject.toml .
COPY src/ src/

RUN uv sync --no-dev --extra cuda

RUN mkdir -p /models

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENV GEMMA_API_CONFIG_DIR=/models

ENTRYPOINT ["uv", "run", "gemma-api"]
CMD ["start", "--no-ui"]

FROM base AS dev

RUN uv sync

ENTRYPOINT ["uv", "run", "gemma-api"]
CMD ["start", "--ui", "--ui-port", "7860"]
