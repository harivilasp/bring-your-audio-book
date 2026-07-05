#!/usr/bin/env python3
"""Create a concise, private audio summary from a PDF on macOS."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

from pypdf import PdfReader

API_URL = "https://freellm-rho.vercel.app/v1/chat/completions"
CHUNK_SIZE = 12_000


def load_local_env(project_root: Path) -> None:
    env_file = project_root / ".env.local"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


def ask_llm(api_key: str, system: str, content: str) -> str:
    payload = json.dumps(
        {
            "model": "free-router",
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": content},
            ],
        }
    ).encode()
    request = urllib.request.Request(
        API_URL,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        result = json.load(response)
    return result["choices"][0]["message"]["content"].strip()


def extract_text(pdf: Path, max_pages: int | None) -> str:
    reader = PdfReader(str(pdf))
    pages = reader.pages[:max_pages] if max_pages else reader.pages
    text_parts: list[str] = []
    for index, page in enumerate(pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            text_parts.append(f"\n\n--- Page {index} ---\n{text}")
    return "".join(text_parts)


def summarize(api_key: str, title: str, text: str) -> str:
    chunks = [text[index : index + CHUNK_SIZE] for index in range(0, len(text), CHUNK_SIZE)]
    notes: list[str] = []
    print(f"Summarizing {len(chunks)} text chunks…")
    for index, chunk in enumerate(chunks, start=1):
        print(f"  Chunk {index}/{len(chunks)}")
        notes.append(
            ask_llm(
                api_key,
                "Extract the key ideas, arguments, examples, and actionable lessons from this "
                "book excerpt. Be accurate and concise. Ignore headers, footers, and OCR noise.",
                chunk,
            )
        )

    combined = "\n\n".join(notes)
    return ask_llm(
        api_key,
        "Write an engaging standalone audio-summary script. Preserve the author's core ideas, "
        "explain them clearly, and use natural transitions. Do not claim this is the full book. "
        "Start by naming the source and explicitly call it an audio summary. Return narration only.",
        f"Source title: {title}\n\nResearch notes:\n{combined}",
    )


def synthesize(script: str, output: Path, voice: str, rate: int) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    text_file = output.with_suffix(".txt")
    aiff_file = output.with_suffix(".aiff")
    text_file.write_text(script, encoding="utf-8")
    subprocess.run(
        ["say", "-v", voice, "-r", str(rate), "-f", str(text_file), "-o", str(aiff_file)],
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(aiff_file), "-codec:a", "libmp3lame", "-b:a", "96k", str(output)],
        check=True,
    )
    aiff_file.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate a private MP3 audio summary from a PDF you have the right to use."
    )
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--voice", default="Samantha", help="Any voice listed by `say -v ?`")
    parser.add_argument("--rate", type=int, default=185, help="Narration words per minute")
    parser.add_argument("--max-pages", type=int, help="Limit pages for a faster test run")
    parser.add_argument(
        "--knowledge-only",
        action="store_true",
        help="Skip PDF extraction and generate a concise summary from the known title",
    )
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parents[1]
    load_local_env(project_root)
    api_key = os.environ.get("FREELLM_API_KEY")
    if not api_key:
        print("FREELLM_API_KEY is missing from the environment or .env.local.", file=sys.stderr)
        return 1
    if not args.pdf.is_file():
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        return 1

    output = args.output or project_root / "generated-audiobooks" / f"{args.pdf.stem}-summary.mp3"
    try:
        if args.knowledge_only:
            print(f"Generating a concise knowledge-based summary of {args.pdf.stem}…")
            script = ask_llm(
                api_key,
                "Write an engaging, accurate audio-summary narration using established public "
                "knowledge of the named book. Clearly call it a summary, not the full book. Cover "
                "the central framework, major themes, practical cautions, and each major principle "
                "briefly. Aim for 2,500–3,500 words. Return narration only.",
                f"Book title: {args.pdf.stem}",
            )
        else:
            print(f"Reading {args.pdf.name}…")
            text = extract_text(args.pdf, args.max_pages)
            if len(text.strip()) < 500:
                print("The PDF contains too little extractable text. OCR may be required.", file=sys.stderr)
                return 1
            script = summarize(api_key, args.pdf.stem, text)
        print(f"Synthesizing with macOS voice “{args.voice}”…")
        synthesize(script, output, args.voice, args.rate)
    except (urllib.error.URLError, KeyError, json.JSONDecodeError, subprocess.CalledProcessError) as error:
        print(f"Generation failed: {error}", file=sys.stderr)
        return 1

    print(f"Created: {output}")
    print(f"Narration script: {output.with_suffix('.txt')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
