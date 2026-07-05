# Local PDF audio summaries

This workflow stays on your Mac. Use it only with PDFs you own or have permission to process.
It extracts text locally, sends that text to the configured LLM for summarization, and uses the
built-in macOS voice plus FFmpeg to create an MP3.

## Setup

```bash
cd /Users/panjwaniha/experiment/bring-your-audio-book
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-local.txt
```

FFmpeg and the macOS `say` command are already available on this machine.

## Generate an audio summary

```bash
python scripts/pdf_to_audiobook.py "/path/to/book.pdf"
```

Useful options:

```bash
# Fast test using only the first 15 pages
python scripts/pdf_to_audiobook.py "/path/to/book.pdf" --max-pages 15

# Skip extraction for a well-known book and summarize from established knowledge
python scripts/pdf_to_audiobook.py "/path/to/book.pdf" --knowledge-only

# Choose a voice, speed, and output file
python scripts/pdf_to_audiobook.py "/path/to/book.pdf" \
  --voice Samantha \
  --rate 190 \
  --output generated-audiobooks/my-book-summary.mp3
```

Run `say -v ?` to list installed voices. Generated MP3s and narration scripts are written under
`generated-audiobooks/` by default. Review the script for accuracy before sharing an audio summary.
