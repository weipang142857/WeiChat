# WeiChat (local API-key chat UI)

A lightweight web app that mimics a ChatGPT-style interface using your OpenAI API key. Includes a proxy server to handle API requests, making it work even with SSH port forwarding and region restrictions.

## Features

- ✨ Inline contextual chat windows - Select text and ask follow-up questions
- 📁 File uploads and vector search
- 🔍 Web search and code interpreter support
- 💬 Multiple chat sessions with project organization
- 🎨 Dark/Light theme support

## Run with Proxy Server (Recommended)

The proxy server routes API requests through the backend, solving CORS and region blocking issues.

**On your remote machine:**

```bash
# Install Node.js if not already installed
# Then from this folder:
npm start
# or
node server.js
```

The server will start on port 2857.

**SSH Port Forwarding (from local machine):**

```bash
ssh -L 2857:localhost:2857 user@remote-machine
```

Then open `http://localhost:2857` in your local browser.

## Alternative: Run with Static Server

If you're not using SSH tunneling or don't have region restrictions:

```bash
python3 -m http.server 2857
```

Note: This won't work if your region is blocked by OpenAI, as API calls go directly from your browser.

> **Important:** Enter your OpenAI API key in the Settings panel. The key is stored locally in your browser and sent through the proxy server to OpenAI.
