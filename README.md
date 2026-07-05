# Audora

An audiobook library for uploading MP3s, finding stories with semantic search, and listening with
full playback controls.

Live site: [bring-your-audio-book.vercel.app](https://bring-your-audio-book.vercel.app)

## Features

- LLM-powered semantic catalog search
- MP3 upload and browser playback
- Seeking, 15-second skipping, playback speed, volume, and listening queue
- Vercel Blob delivery for large audio files
- Local PDF-to-audio-summary workflow for documents you have permission to process

## Local development

```bash
npm install
npm run dev
```

Set `FREELLM_API_KEY` in `.env.local` to enable semantic search.

## Local PDF audio summaries

See [LOCAL_AUDIOBOOKS.md](./LOCAL_AUDIOBOOKS.md). Generated files, source PDFs, and environment
secrets are excluded from Git.
