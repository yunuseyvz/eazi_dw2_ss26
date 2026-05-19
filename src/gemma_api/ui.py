"""Gradio chat UI for Gemma 4 E4B - supports text, image, audio, video."""

import json
import os
import tempfile
from typing import Generator

import gradio as gr
import requests

MODEL_ID = "google/gemma-4-E4B-it"

_VIDEO_MAX_FRAMES = 30
_VIDEO_FPS = 1.0

_CSS = """
:root {
  --chat-height: calc(100vh - 140px);
}
#main-chatbot {
  height: var(--chat-height) !important;
  border: none !important;
  background: transparent !important;
}
#main-chatbot .bubble-wrap {
  padding: 8px 12px !important;
}
#main-chatbot .message-row {
  margin-bottom: 4px !important;
}
.settings-col {
  border-left: 1px solid var(--border-color-primary) !important;
  padding-left: 12px !important;
}
"""


def _extract_video_frames(video_path: str) -> list[str]:
    import cv2

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return []

    orig_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    interval = max(1, int(orig_fps / _VIDEO_FPS))

    frame_paths: list[str] = []
    frame_idx = 0
    saved = 0

    while saved < _VIDEO_MAX_FRAMES:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % interval == 0:
            fd, tmp_path = tempfile.mkstemp(suffix=".jpg", prefix="vframe_")
            os.close(fd)
            cv2.imwrite(tmp_path, frame)
            frame_paths.append(tmp_path)
            saved += 1
        frame_idx += 1

    cap.release()
    return frame_paths


def _convert_audio(path: str) -> str | None:
    """Convert .m4a/.aac/.ogg to .wav if needed. Returns temp wav path."""
    ext = os.path.splitext(path)[1].lower()
    if ext in {".wav", ".mp3", ".flac"}:
        return path

    try:
        from pydub import AudioSegment
    except ImportError:
        return None

    try:
        audio = AudioSegment.from_file(path)
        fd, tmp = tempfile.mkstemp(suffix=".wav", prefix="audio_")
        os.close(fd)
        audio.export(tmp, format="wav")
        return tmp
    except Exception:
        return None


def _build_content(
    text: str,
    image: str | None,
    audio_path: str | None,
    video_frames: list[str],
) -> list[dict]:
    content: list[dict] = []

    if image:
        content.append({"type": "input_image", "image_url": image})

    for path in video_frames:
        content.append({"type": "input_image", "image_url": path})

    if audio_path:
        content.append({"type": "input_audio", "input_audio": audio_path})

    if text and text.strip():
        content.append({"type": "text", "text": text.strip()})

    return content


def _subtitle(text: str, items: list[str]) -> str:
    parts = []
    if text and text.strip():
        parts.append(f'<span style="color:#c0c0c0">{text.strip()}</span>')
    parts.extend(f" 📎<b>{i}</b>" for i in items)
    return "".join(parts) if parts else "(empty message)"


def _stream_chat(
    api_url: str,
    messages: list[dict],
    thinking: bool,
    max_tokens: int,
    temperature: float,
) -> Generator[str, None, None]:
    payload = {
        "model": MODEL_ID,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "top_p": 0.95,
        "stream": True,
    }
    if thinking:
        payload["enable_thinking"] = True

    response = requests.post(
        f"{api_url}/v1/chat/completions",
        json=payload,
        stream=True,
        timeout=600,
    )

    collected = ""
    for line in response.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue
        data_str = line[6:]
        if data_str == "[DONE]":
            break
        try:
            chunk = json.loads(data_str)
            delta = chunk.get("choices", [{}])[0].get("delta", {})
            content = delta.get("content", "")
            collected += content
            yield collected
        except (json.JSONDecodeError, KeyError, IndexError):
            continue

    if not collected:
        yield "*(no response — is the model loaded?)*"


def _get_file_path(file_obj) -> str | None:
    if isinstance(file_obj, str):
        return file_obj
    if hasattr(file_obj, "path"):
        return file_obj.path
    if hasattr(file_obj, "name"):
        return file_obj.name
    return None


def _categorize_files(files: list) -> tuple[str | None, str | None, str | None]:
    image_exts = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
    audio_exts = {".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"}
    video_exts = {".mp4", ".mov", ".avi", ".mkv", ".webm"}

    image = audio = video = None
    for f in files:
        path = _get_file_path(f)
        if not path:
            continue
        ext = os.path.splitext(path)[1].lower()
        if ext in image_exts and image is None:
            image = path
        elif ext in audio_exts and audio is None:
            audio = path
        elif ext in video_exts and video is None:
            video = path
    return image, audio, video


def chat_fn(
    history: list[dict],
    message: dict,
    thinking: bool,
    api_url: str,
    max_tokens: int,
    temperature: float,
) -> Generator[tuple[list[dict], dict], None, None]:
    text = message.get("text", "")
    files = message.get("files", [])

    image, audio, video = _categorize_files(files)
    original_audio = audio

    if audio:
        converted = _convert_audio(audio)
        if converted is None:
            yield history, {"text": "", "files": []}
            return
        audio = converted

    content = _build_content(text, image, audio, [])
    attachments: list[str] = []

    frames: list[str] = []
    if video:
        frames = _extract_video_frames(video)
        attachments.append(f"{len(frames)} video frames")

    if not content and not frames:
        yield history, {"text": "", "files": []}
        return

    if frames:
        for path in frames:
            content.append({"type": "input_image", "image_url": path})

    if image:
        attachments.append("image")
    if audio:
        attachments.append("audio")

    messages: list[dict] = []
    for entry in history:
        role = entry.get("role", "user")
        msg = entry.get("content", "")
        if isinstance(msg, str):
            messages.append({"role": role, "content": msg})
        elif isinstance(msg, list):
            messages.append({"role": role, "content": msg})

    messages.append({"role": "user", "content": content})

    display = _subtitle(text, attachments)
    history.append({"role": "user", "content": display})
    history.append({"role": "assistant", "content": ""})

    for partial in _stream_chat(
        api_url, messages, thinking, max_tokens, temperature
    ):
        history[-1]["content"] = partial
        yield history, {"text": "", "files": []}

    for p in frames:
        try:
            os.unlink(p)
        except OSError:
            pass

    if audio and audio != original_audio:
        try:
            os.unlink(audio)
        except OSError:
            pass


def clear_fn() -> tuple[list, dict]:
    return [], {"text": "", "files": []}


def build_ui(api_port: int = 8080) -> gr.Blocks:
    api_url = f"http://localhost:{api_port}"

    with gr.Blocks(title="Gemma 4") as demo:
        gr.Markdown("# Gemma 4 E4B")

        with gr.Row(equal_height=True):
            # ---- main chat area ----
            with gr.Column(scale=1):
                chatbot = gr.Chatbot(
                    elem_id="main-chatbot",
                    placeholder="Start chatting…",
                    show_label=False,
                    latex_delimiters=[
                        {"left": "$$", "right": "$$", "display": True},
                        {"left": "$", "right": "$", "display": False},
                    ],
                )

                multimodal_input = gr.MultimodalTextbox(
                    placeholder="Message Gemma…",
                    show_label=False,
                    file_types=["image", "audio", "video"],
                    lines=1,
                    max_lines=4,
                    scale=1,
                )

                with gr.Row():
                    clear_btn = gr.Button("Clear", scale=0, min_width=80)

            # ---- settings sidebar ----
            with gr.Column(scale=0, min_width=220, elem_classes=["settings-col"]):
                with gr.Accordion("Settings", open=False):
                    thinking_toggle = gr.Checkbox(
                        label="Thinking mode",
                        value=False,
                    )
                    max_tokens = gr.Slider(
                        minimum=64,
                        maximum=4096,
                        value=1024,
                        step=64,
                        label="Max tokens",
                    )
                    temp = gr.Slider(
                        minimum=0.0,
                        maximum=2.0,
                        value=1.0,
                        step=0.1,
                        label="Temperature",
                    )

        api_url_state = gr.State(api_url)

        inputs = [
            chatbot,
            multimodal_input,
            thinking_toggle,
            api_url_state,
            max_tokens,
            temp,
        ]
        outputs = [chatbot, multimodal_input]

        multimodal_input.submit(fn=chat_fn, inputs=inputs, outputs=outputs)
        clear_btn.click(fn=clear_fn, inputs=[], outputs=outputs)

    return demo


def launch_ui(api_port: int = 8080, ui_port: int = 7860) -> None:
    demo = build_ui(api_port=api_port)
    print(f"[gemma-api] Starting Gradio UI on http://0.0.0.0:{ui_port}")
    demo.queue(default_concurrency_limit=1).launch(
        server_name="0.0.0.0",
        server_port=ui_port,
        share=False,
        show_error=True,
        css=_CSS,
        theme=gr.themes.Soft(
            primary_hue="indigo",
            secondary_hue="slate",
            neutral_hue="slate",
            font=[
                gr.themes.GoogleFont("Inter"),
                "ui-sans-serif",
                "system-ui",
                "sans-serif",
            ],
        ),
    )
