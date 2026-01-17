# WeiChat (local API-key chat UI)

A lightweight, static web app that mimics a ChatGPT-style interface but uses your OpenAI API key directly from the browser. This is intended for local, personal use.

## Run locally

From this folder:

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173` in your browser.

> Tip: Avoid opening `index.html` directly via `file://` because some browsers block API calls from file origins.
