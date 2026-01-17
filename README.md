# WeiChat (local API-key chat UI)

A lightweight, static web app that mimics a ChatGPT-style interface but uses your OpenAI API key directly from the browser. This is intended for local, personal use.

## Run locally

From this folder:

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173` in your browser.

> Tip: Avoid opening `index.html` directly via `file://` because some browsers block API calls from file origins.

## Notes

- Your key is sent directly to the OpenAI API from the browser. For production apps, use a backend so keys are never exposed to clients.
- You can change the model and reasoning effort at any time; saved settings are stored in LocalStorage on this device only.
- Responses stream in real time, and the reasoning panel auto-collapses when a response completes.
- Theme supports System/Light/Dark modes.
- PDFs are uploaded to the Files API and referenced by file_id to avoid huge payloads (add your API key before attaching). Images are sent inline as data URLs.
- Image uploads are limited to PNG/JPEG/WEBP/GIF formats.
- Markdown rendering and code highlighting load from CDNs (marked, DOMPurify, highlight.js).
- Chat history auto-saves to a private on-disk file via the browser Origin Private File System (OPFS), with LocalStorage as a fallback. It reloads automatically on page refresh (note: OPFS files are browser-private and not visible in Finder).
- You can delete individual messages; deletions are removed from context for future replies.
- The token counter uses API-reported usage totals (tokens spent per request in the session).
- The timer shows live response duration while Wei is generating.
- Math rendering supports $...$, $$...$$, \\(...\\), and \\[...\\] via KaTeX.
