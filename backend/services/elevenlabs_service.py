import os
from typing import Any

import httpx


ELEVENLABS_BASE_URL = os.getenv("ELEVENLABS_BASE_URL", "https://api.elevenlabs.io").rstrip("/")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "").strip()
ELEVENLABS_TTS_MODEL_ID = os.getenv("ELEVENLABS_TTS_MODEL_ID", "eleven_flash_v2_5")
ELEVENLABS_STT_MODEL_ID = os.getenv("ELEVENLABS_STT_MODEL_ID", "scribe_v2")
ELEVENLABS_OUTPUT_FORMAT = os.getenv("ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_128")
ELEVENLABS_DEFAULT_VOICE_ID = os.getenv("ELEVENLABS_DEFAULT_VOICE_ID", "").strip()
ELEVENLABS_TIMEOUT_SECONDS = float(os.getenv("ELEVENLABS_TIMEOUT_SECONDS", "60"))
MAX_VOICE_PAGES = 5


def is_elevenlabs_configured() -> bool:
    return bool(ELEVENLABS_API_KEY)


def get_voice_runtime_config() -> dict[str, Any]:
    return {
        "configured": is_elevenlabs_configured(),
        "provider": "elevenlabs" if is_elevenlabs_configured() else "browser",
        "tts_model_id": ELEVENLABS_TTS_MODEL_ID,
        "stt_model_id": ELEVENLABS_STT_MODEL_ID,
        "default_voice_id": ELEVENLABS_DEFAULT_VOICE_ID or None,
    }


def _require_api_key() -> str:
    if not ELEVENLABS_API_KEY:
        raise RuntimeError(
            "ElevenLabs is not configured. Set ELEVENLABS_API_KEY in backend/.env."
        )

    return ELEVENLABS_API_KEY


def _extract_error_message(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text or "Unknown ElevenLabs error"

    if isinstance(payload, dict):
        detail = payload.get("detail")

        if isinstance(detail, dict):
            status = detail.get("status")
            message = detail.get("message")

            if status and message:
                return f"{status}: {message}"

            if message:
                return str(message)

        if isinstance(detail, str):
            return detail

        if "message" in payload and isinstance(payload["message"], str):
            return payload["message"]

    return response.text or "Unknown ElevenLabs error"


def _request(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json: dict[str, Any] | None = None,
    data: dict[str, Any] | None = None,
    files: dict[str, Any] | None = None,
    accept: str = "application/json",
) -> httpx.Response:
    api_key = _require_api_key()

    with httpx.Client(timeout=ELEVENLABS_TIMEOUT_SECONDS) as client:
        response = client.request(
            method,
            f"{ELEVENLABS_BASE_URL}{path}",
            headers={
                "xi-api-key": api_key,
                "Accept": accept,
            },
            params=params,
            json=json,
            data=data,
            files=files,
        )

    if response.is_error:
        raise RuntimeError(_extract_error_message(response))

    return response


def list_voices() -> list[dict[str, Any]]:
    voices: list[dict[str, Any]] = []
    next_page_token: str | None = None

    for _ in range(MAX_VOICE_PAGES):
        params = {
            "page_size": 100,
            "sort": "name",
            "sort_direction": "asc",
            "include_total_count": False,
        }

        if next_page_token:
            params["next_page_token"] = next_page_token

        response = _request("GET", "/v2/voices", params=params)
        payload = response.json()

        for voice in payload.get("voices", []):
            voices.append(
                {
                    "voice_id": voice.get("voice_id"),
                    "name": voice.get("name"),
                    "category": voice.get("category"),
                    "description": voice.get("description"),
                    "preview_url": voice.get("preview_url"),
                    "labels": voice.get("labels") or {},
                }
            )

        if not payload.get("has_more"):
            break

        next_page_token = payload.get("next_page_token")

        if not next_page_token:
            break

    return voices


def synthesize_speech(
    text: str,
    voice_id: str | None = None,
) -> tuple[bytes, str]:
    cleaned_text = text.strip()

    if not cleaned_text:
        raise ValueError("Text is required to generate speech.")

    resolved_voice_id = (voice_id or ELEVENLABS_DEFAULT_VOICE_ID).strip()

    if not resolved_voice_id:
        raise ValueError(
            "No ElevenLabs voice is selected. Choose a voice in setup or set ELEVENLABS_DEFAULT_VOICE_ID."
        )

    response = _request(
        "POST",
        f"/v1/text-to-speech/{resolved_voice_id}",
        params={
            "output_format": ELEVENLABS_OUTPUT_FORMAT,
        },
        json={
            "text": cleaned_text,
            "model_id": ELEVENLABS_TTS_MODEL_ID,
        },
        accept="audio/mpeg",
    )

    return response.content, response.headers.get("content-type", "audio/mpeg")


def transcribe_audio(
    audio_bytes: bytes,
    *,
    filename: str = "interview.webm",
    content_type: str = "audio/webm",
) -> dict[str, Any]:
    if not audio_bytes:
        raise ValueError("Audio payload is empty.")

    response = _request(
        "POST",
        "/v1/speech-to-text",
        data={
            "model_id": ELEVENLABS_STT_MODEL_ID,
        },
        files={
            "file": (
                filename,
                audio_bytes,
                content_type,
            )
        },
    )

    payload = response.json()

    return {
        "text": (payload.get("text") or "").strip(),
        "language_code": payload.get("language_code"),
        "language_probability": payload.get("language_probability"),
    }
