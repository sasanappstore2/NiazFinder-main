from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path


def convert_to_whisper_wav(src_path: str) -> str:
    """
    Convert any browser recording to 16 kHz mono WAV for better Persian accuracy.
    Falls back to original path if ffmpeg is unavailable.
    """
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return src_path

    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    out.close()
    out_path = out.name

    try:
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-i",
                src_path,
                "-ar",
                "16000",
                "-ac",
                "1",
                "-c:a",
                "pcm_s16le",
                out_path,
            ],
            check=True,
            capture_output=True,
            timeout=45,
        )
        Path(src_path).unlink(missing_ok=True)
        return out_path
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError):
        Path(out_path).unlink(missing_ok=True)
        return src_path
