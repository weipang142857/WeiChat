const chatLog = document.getElementById("chatLog");
const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const modelSwitcher = document.getElementById("modelSwitcher");
const reasoningSelect = document.getElementById("reasoningEffort");
const composerModel = document.getElementById("composerModel");
const composerReasoning = document.getElementById("composerReasoning");
const systemPromptInput = document.getElementById("systemPrompt");
const rememberKeyInput = document.getElementById("rememberKey");
const messageInput = document.getElementById("messageInput");
const fileInput = document.getElementById("fileInput");
const attachmentList = document.getElementById("attachmentList");
const sendBtn = document.getElementById("sendBtn");
const statusEl = document.getElementById("status");
const newChatBtn = document.getElementById("newChatBtn");
const clearBtn = document.getElementById("clearBtn");
const chatList = document.getElementById("chatList");
const themeSelect = document.getElementById("themeSelect");
const hljsThemeLink = document.getElementById("hljs-theme");
const chatContextMenu = document.getElementById("chatContextMenu");
const deleteChatBtn = document.getElementById("deleteChatBtn");
const renameChatBtn = document.getElementById("renameChatBtn");
const starChatBtn = document.getElementById("starChatBtn");
const tokenPill = document.getElementById("tokenPill");
const timerEl = document.getElementById("timer");
const settingsPanel = document.getElementById("settingsPanel");
const sidebar = document.querySelector(".sidebar");
const wideScreenToggle = document.getElementById("wideScreenToggle");
const resizeHandle = document.getElementById("resizeHandle");
const composer = document.querySelector(".composer");
const sidebarToggle = document.getElementById("sidebarToggle");
const fontSizeRange = document.getElementById("fontSizeRange");
const fontSizeValue = document.getElementById("fontSizeValue");
const webSearchToggle = document.getElementById("webSearchToggle");
const codeInterpreterToggle = document.getElementById("codeInterpreterToggle");
const fileSearchToggle = document.getElementById("fileSearchToggle");
const folderInput = document.getElementById("folderInput");
const manageFilesBtn = document.getElementById("manageFilesBtn");
const fileManagerModal = document.getElementById("fileManagerModal");
const closeFileManagerBtn = document.getElementById("closeFileManagerBtn");
const fileManagerList = document.getElementById("fileManagerList");
const vectorStoreInfo = document.getElementById("vectorStoreInfo");
const refreshFilesBtn = document.getElementById("refreshFilesBtn");
const clearVectorStoreBtn = document.getElementById("clearVectorStoreBtn");
const newVectorStoreBtn = document.getElementById("newVectorStoreBtn");
const shareBtn = document.getElementById("shareBtn");
const shareModal = document.getElementById("shareModal");
const closeShareModalBtn = document.getElementById("closeShareModalBtn");
const copyMarkdownBtn = document.getElementById("copyMarkdownBtn");
const downloadMarkdownBtn = document.getElementById("downloadMarkdownBtn");
const downloadHtmlBtn = document.getElementById("downloadHtmlBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const importJsonBtn = document.getElementById("importJsonBtn");
const importJsonInput = document.getElementById("importJsonInput");
const linkStorageBtn = document.getElementById("linkStorageBtn");
const unlinkStorageBtn = document.getElementById("unlinkStorageBtn");
const storageStatus = document.getElementById("storageStatus");

const STORAGE_KEY = "keychat.apiKey";
const MODEL_KEY = "keychat.model";
const SYSTEM_KEY = "keychat.system";
const REASONING_KEY = "keychat.reasoning";
const THEME_KEY = "keychat.theme";
const SESSIONS_KEY = "keychat.sessions";
const ACTIVE_SESSION_KEY = "keychat.activeSession";
const WIDE_SCREEN_KEY = "keychat.wideScreen";
const COMPOSER_HEIGHT_KEY = "keychat.composerHeight";
const SIDEBAR_COLLAPSED_KEY = "keychat.sidebarCollapsed";
const FONT_SIZE_KEY = "keychat.fontSize";
const WEB_SEARCH_KEY = "keychat.webSearch";
const CODE_INTERPRETER_KEY = "keychat.codeInterpreter";
const FILE_SEARCH_KEY = "keychat.fileSearch";
const VECTOR_STORE_KEY = "keychat.vectorStore";
const OPFS_FILE_NAME = "weichat-history.json";
const LINKED_STORAGE_FILE = "weichat-sessions.json";
const IDB_NAME = "weichat-storage";
const IDB_STORE = "handles";

const HLJS_THEMES = {
  light: "https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css",
  dark: "https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css",
};

const state = {
  sessions: [],
  activeSessionId: null,
  messages: [],
  attachments: [],
  loadingAttachments: 0,
  sending: false,
  contextSessionId: null,
  linkedDirHandle: null,
};

let fileSavePromise = Promise.resolve();
let timerStart = null;
let timerInterval = null;

// IndexedDB helpers for storing directory handle
function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
  });
}

async function saveHandleToIDB(handle) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const request = store.put(handle, "dirHandle");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getHandleFromIDB() {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const request = store.get("dirHandle");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function removeHandleFromIDB() {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const request = store.delete("dirHandle");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// File System Access API helpers
async function linkStorageFolder() {
  if (!window.showDirectoryPicker) {
    setStatus("File System Access not supported in this browser.");
    return false;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    state.linkedDirHandle = handle;
    await saveHandleToIDB(handle);
    updateStorageUI();

    // Check if there's existing data in the folder
    try {
      const fileHandle = await handle.getFileHandle(LINKED_STORAGE_FILE);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const payload = parseSessionsPayload(text);

      if (Array.isArray(payload.sessions) && payload.sessions.length > 0) {
        // Found existing sessions - load them
        state.sessions = normalizeStoredSessions(payload.sessions);
        state.activeSessionId = payload.activeSessionId || state.sessions[0]?.id;
        const activeSession = state.sessions.find(s => s.id === state.activeSessionId);
        state.messages = activeSession ? activeSession.messages : [];

        // Update localStorage too
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(state.sessions));
        localStorage.setItem(ACTIVE_SESSION_KEY, state.activeSessionId || "");

        renderChatList();
        renderChatMessages();
        setStatus(`Loaded ${state.sessions.length} session(s) from linked folder.`);
        return true;
      }
    } catch (e) {
      // File doesn't exist yet, that's okay - save current sessions
    }

    // No existing data - save current sessions to the linked folder
    await saveToLinkedStorage();
    setStatus("Storage folder linked successfully!");
    return true;
  } catch (error) {
    if (error.name !== "AbortError") {
      setStatus(`Failed to link folder: ${error.message}`);
    }
    return false;
  }
}

async function unlinkStorageFolder() {
  state.linkedDirHandle = null;
  await removeHandleFromIDB();
  updateStorageUI();
  setStatus("Storage folder unlinked. Using browser storage.");
}

async function restoreLinkedStorage() {
  try {
    const handle = await getHandleFromIDB();
    if (!handle) return false;

    // Verify we still have permission
    const permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission === "granted") {
      state.linkedDirHandle = handle;
      updateStorageUI();
      return true;
    }

    // Try to request permission
    const requested = await handle.requestPermission({ mode: "readwrite" });
    if (requested === "granted") {
      state.linkedDirHandle = handle;
      updateStorageUI();
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to restore linked storage:", error);
    return false;
  }
}

async function saveToLinkedStorage() {
  if (!state.linkedDirHandle) return;

  try {
    const fileHandle = await state.linkedDirHandle.getFileHandle(LINKED_STORAGE_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    const payload = serializeSessions();
    await writable.write(payload);
    await writable.close();
  } catch (error) {
    console.error("Failed to save to linked storage:", error);
    setStatus(`Auto-save failed: ${error.message}`);
  }
}

async function loadFromLinkedStorage() {
  if (!state.linkedDirHandle) return null;

  try {
    const fileHandle = await state.linkedDirHandle.getFileHandle(LINKED_STORAGE_FILE);
    const file = await fileHandle.getFile();
    const text = await file.text();
    const payload = parseSessionsPayload(text);
    if (!Array.isArray(payload.sessions)) {
      return null;
    }
    return {
      sessions: normalizeStoredSessions(payload.sessions),
      activeSessionId: payload.activeSessionId,
    };
  } catch (error) {
    // File doesn't exist yet, that's okay
    if (error.name === "NotFoundError") {
      return null;
    }
    console.error("Failed to load from linked storage:", error);
    return null;
  }
}

function updateStorageUI() {
  if (!storageStatus || !linkStorageBtn || !unlinkStorageBtn) return;

  if (state.linkedDirHandle) {
    storageStatus.textContent = `Linked: ${state.linkedDirHandle.name}`;
    storageStatus.classList.add("linked");
    linkStorageBtn.textContent = "Change folder...";
    unlinkStorageBtn.hidden = false;
  } else {
    storageStatus.textContent = "Using browser storage";
    storageStatus.classList.remove("linked");
    linkStorageBtn.textContent = "Link folder...";
    unlinkStorageBtn.hidden = true;
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

function ensureModelOption(value) {
  if (!modelInput) return;
  const existing = Array.from(modelInput.options).some((opt) => opt.value === value);
  if (!existing && value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    modelInput.appendChild(option);
  }
}

function updateModelPill() {
  // No longer needed - model is shown in composer
}

function ensureModelSwitcherOption(value) {
  if (!modelSwitcher) return;
  const exists = Array.from(modelSwitcher.options).some((opt) => opt.value === value);
  if (!exists && value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    modelSwitcher.appendChild(option);
  }
}

function supportsOpfs() {
  return !!(navigator.storage && navigator.storage.getDirectory);
}

async function getOpfsFileHandle(create = false) {
  const root = await navigator.storage.getDirectory();
  return root.getFileHandle(OPFS_FILE_NAME, { create });
}

function serializeSessions() {
  return JSON.stringify({
    version: 2,
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
  });
}

function parseSessionsPayload(text) {
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed)) {
    return { sessions: parsed, activeSessionId: null };
  }
  if (parsed && Array.isArray(parsed.sessions)) {
    return {
      sessions: parsed.sessions,
      activeSessionId: parsed.activeSessionId || null,
    };
  }
  return { sessions: [], activeSessionId: null };
}

function queueFileSave() {
  if (!supportsOpfs()) {
    return;
  }
  const payload = serializeSessions();
  fileSavePromise = fileSavePromise
    .then(async () => {
      const handle = await getOpfsFileHandle(true);
      const writable = await handle.createWritable();
      await writable.write(payload);
      await writable.close();
    })
    .catch((error) => {
      setStatus(`Auto-save failed: ${error.message}`);
    });
}

async function loadSessionsFromOpfs({ silent = false } = {}) {
  if (!supportsOpfs()) {
    return null;
  }
  try {
    const handle = await getOpfsFileHandle(false);
    const file = await handle.getFile();
    const text = await file.text();
    const payload = parseSessionsPayload(text);
    if (!Array.isArray(payload.sessions)) {
      if (!silent) {
        setStatus("Invalid chat history file.");
      }
      return null;
    }
    return {
      sessions: normalizeStoredSessions(payload.sessions),
      activeSessionId: payload.activeSessionId,
    };
  } catch (error) {
    if (error && error.name === "NotFoundError") {
      return null;
    }
    if (!silent) {
      setStatus(`Failed to load history: ${error.message}`);
    }
    return null;
  }
}

function updateTokenPill() {
  if (!tokenPill) {
    return;
  }
  const session = state.sessions.find((item) => item.id === state.activeSessionId);
  const total = session && typeof session.usageTokens === "number" ? session.usageTokens : 0;
  tokenPill.textContent = `Tokens used ${total}`;
}

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateTimer() {
  if (!timerEl) {
    return;
  }
  if (!timerStart) {
    timerEl.textContent = "00:00";
    return;
  }
  const elapsed = Date.now() - timerStart;
  timerEl.textContent = formatElapsed(elapsed);
}

function startTimer() {
  timerStart = Date.now();
  updateTimer();
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  timerInterval = setInterval(updateTimer, 250);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  updateTimer();
  timerStart = null;
}

function updateControls() {
  const busy = state.sending || state.loadingAttachments > 0;
  sendBtn.disabled = busy;
  messageInput.disabled = state.sending;
  fileInput.disabled = state.sending;
  apiKeyInput.disabled = state.sending;
  if (modelInput) modelInput.disabled = state.sending;
  if (reasoningSelect) reasoningSelect.disabled = state.sending;
  if (composerModel) composerModel.disabled = state.sending;
  if (composerReasoning) composerReasoning.disabled = state.sending;
  systemPromptInput.disabled = state.sending;
  if (clearBtn) clearBtn.disabled = state.sending;
  newChatBtn.disabled = state.sending;
}

function createThinkingPanel() {
  const details = document.createElement("details");
  details.className = "thinking";
  details.open = false;

  const summary = document.createElement("summary");
  summary.innerHTML = '<span class="thinking-indicator"></span>Thinking';

  const body = document.createElement("div");
  body.className = "thinking-body";

  const summaryText = document.createElement("div");
  summaryText.className = "thinking-summary-text";

  body.appendChild(summaryText);
  details.appendChild(summary);
  details.appendChild(body);

  return {
    details,
    summary,
    body,
    summaryText,
  };
}

function addThinkingLine(panel, text) {
  // No longer used - kept for compatibility
}

async function streamResponse(response, onEvent) {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let eventLines = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data:")) {
        eventLines.push(line.slice(5).trim());
      } else if (line === "") {
        if (eventLines.length) {
          onEvent(eventLines.join("\n"));
          eventLines = [];
        }
      }
    }
  }

  if (eventLines.length) {
    onEvent(eventLines.join("\n"));
  }
}

function stashMathSegments(text, stashed) {
  if (!text) {
    return text;
  }

  const isEscaped = (input, index) => {
    let count = 0;
    for (let i = index - 1; i >= 0 && input[i] === "\\"; i -= 1) {
      count += 1;
    }
    return count % 2 === 1;
  };

  const pushStash = (segment, isDisplay = false) => {
    const token = `@@STASH${stashed.length}@@`;
    // Wrap display math in a div to ensure block rendering
    if (isDisplay) {
      stashed.push(`<div class="math-block">${segment}</div>`);
    } else {
      stashed.push(segment);
    }
    return isDisplay ? `\n\n${token}\n\n` : token;
  };

  let output = "";
  let i = 0;

  while (i < text.length) {
    if (text.startsWith("$$", i)) {
      const end = text.indexOf("$$", i + 2);
      if (end !== -1) {
        output += pushStash(text.slice(i, end + 2), true);
        i = end + 2;
        continue;
      }
      output += "$$";
      i += 2;
      continue;
    }

    if (text.startsWith("\\[", i)) {
      const end = text.indexOf("\\]", i + 2);
      if (end !== -1) {
        output += pushStash(text.slice(i, end + 2), true);
        i = end + 2;
        continue;
      }
      output += "\\[";
      i += 2;
      continue;
    }

    if (text.startsWith("\\(", i)) {
      const end = text.indexOf("\\)", i + 2);
      if (end !== -1) {
        output += pushStash(text.slice(i, end + 2), false);
        i = end + 2;
        continue;
      }
      output += "\\(";
      i += 2;
      continue;
    }

    if (text[i] === "$" && !text.startsWith("$$", i) && !isEscaped(text, i)) {
      let j = i + 1;
      let found = false;
      while (j < text.length) {
        if (text[j] === "\n") {
          break;
        }
        if (text[j] === "$" && !isEscaped(text, j)) {
          if (text[j + 1] === "$") {
            j += 1;
            continue;
          }
          output += pushStash(text.slice(i, j + 1));
          i = j + 1;
          found = true;
          break;
        }
        j += 1;
      }
      if (found) {
        continue;
      }
    }

    output += text[i];
    i += 1;
  }

  return output;
}

function normalizeMath(text) {
  if (!text) {
    return text;
  }

  let output = text;

  const stashed = [];
  const stash = (pattern) => {
    output = output.replace(pattern, (match) => {
      const token = `@@STASH${stashed.length}@@`;
      stashed.push(match);
      return token;
    });
  };

  // Protect code blocks and inline code.
  stash(/```[\s\S]*?```/g);
  stash(/`[^`\n]+`/g);

  // Protect existing math so we don't wrap inside it.
  output = stashMathSegments(output, stashed);

  // Convert bracketed block equations: lines like [ ... ]
  output = output.replace(
    /(^|\n)\[\s*([\s\S]*?)\s*\](?=\n|$)/g,
    (match, lead, inner) => {
      if (!/[\\^_=]/.test(inner)) {
        return match;
      }
      return `${lead}\\[${inner.trim()}\\]`;
    }
  );

  // Wrap bare \begin{...}...\end{...} blocks.
  output = output.replace(
    /\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g,
    (match, offset, full) => {
      const before = full.slice(0, offset).trimEnd();
      const after = full.slice(offset + match.length).trimStart();
      const alreadyWrapped =
        before.endsWith("$$") ||
        before.endsWith("\\[") ||
        after.startsWith("$$") ||
        after.startsWith("\\]");
      return alreadyWrapped ? match : `\\[${match}\\]`;
    }
  );

  // Wrap inline LaTeX inside parentheses when it contains commands.
  output = output.replace(/\(([^()]*\\[a-zA-Z][^()]*)\)/g, (match, inner, offset, full) => {
    if (offset > 0 && full[offset - 1] === "\\") {
      return match;
    }
    if (match.includes("$") || match.includes("\\(") || match.includes("\\[")) {
      return match;
    }
    return `\\(${inner}\\)`;
  });

  // Restore stashed code + math.
  output = output.replace(/@@STASH(\d+)@@/g, (match, index) => {
    const i = Number(index);
    return Number.isFinite(i) ? stashed[i] : match;
  });

  return output;
}


function renderMarkdownInto(el, text) {
  el.classList.add("markdown");
  if (!text) {
    el.textContent = "";
    return;
  }

  const normalized = normalizeMath(text);

  if (window.marked) {
    const mathStash = [];
    const masked = stashMathSegments(normalized, mathStash);
    const html = window.marked.parse(masked, { breaks: false, gfm: true });
    const restored = html.replace(/@@STASH(\d+)@@/g, (match, index) => {
      const i = Number(index);
      return Number.isFinite(i) ? mathStash[i] : match;
    });
    const safeHtml = window.DOMPurify ? window.DOMPurify.sanitize(restored) : restored;
    el.innerHTML = safeHtml;
  } else {
    el.textContent = normalized;
  }

  if (window.hljs) {
    el.querySelectorAll("pre code").forEach((block) => {
      window.hljs.highlightElement(block);
    });
  }

  // Add copy buttons to code blocks
  el.querySelectorAll("pre").forEach((pre) => {
    if (pre.parentElement?.classList.contains("code-block-wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "code-block-wrapper";

    // Try to detect language/filename from the code block
    const codeEl = pre.querySelector("code");
    let language = "";
    let filename = "";

    if (codeEl) {
      // Get language from class (e.g., "language-javascript" or "hljs language-python")
      const classes = Array.from(codeEl.classList);
      const langClass = classes.find(c => c.startsWith("language-"));
      if (langClass) {
        language = langClass.replace("language-", "");
      }
    }

    // Map language to file extension
    const extMap = {
      javascript: "js", js: "js", typescript: "ts", ts: "ts",
      python: "py", py: "py", java: "java", cpp: "cpp", "c++": "cpp",
      c: "c", csharp: "cs", "c#": "cs", go: "go", rust: "rs",
      ruby: "rb", php: "php", swift: "swift", kotlin: "kt",
      html: "html", css: "css", scss: "scss", json: "json",
      yaml: "yaml", yml: "yml", xml: "xml", sql: "sql",
      bash: "sh", shell: "sh", sh: "sh", zsh: "zsh",
      markdown: "md", md: "md", txt: "txt", text: "txt",
      latex: "tex", tex: "tex", bibtex: "bib", bib: "bib"
    };

    const ext = extMap[language] || "txt";
    filename = `code.${ext}`;

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "code-block-buttons";

    const copyBtn = document.createElement("button");
    copyBtn.className = "code-copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.type = "button";
    copyBtn.addEventListener("click", async () => {
      const code = pre.querySelector("code")?.textContent || pre.textContent;
      try {
        await navigator.clipboard.writeText(code);
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
      } catch (err) {
        copyBtn.textContent = "Failed";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
      }
    });

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "code-download-btn";
    downloadBtn.textContent = "Download";
    downloadBtn.type = "button";
    downloadBtn.addEventListener("click", () => {
      const code = pre.querySelector("code")?.textContent || pre.textContent;

      // Prompt for filename
      const userFilename = prompt("Save as:", filename);
      if (!userFilename) return;

      const blob = new Blob([code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = userFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      downloadBtn.textContent = "Downloaded!";
      setTimeout(() => { downloadBtn.textContent = "Download"; }, 2000);
    });

    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(downloadBtn);

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    wrapper.appendChild(buttonContainer);
  });

  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(el, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
        throwOnError: false,
        strict: "ignore",
        macros: {
          "\\mathbbm": "\\mathbb",
          "\\R": "\\mathbb{R}",
          "\\N": "\\mathbb{N}",
          "\\Z": "\\mathbb{Z}",
          "\\Q": "\\mathbb{Q}",
          "\\C": "\\mathbb{C}",
          "\\1": "\\mathbb{1}",
        },
      });
    } catch (error) {
      // Ignore math rendering errors to avoid blocking text output.
    }
  }
}

function addMessage(role, content, options = {}) {
  const msg = document.createElement("div");
  msg.className = `msg ${role}` + (options.pending ? " pending" : "");

  const row = document.createElement("div");
  row.className = "msg-row";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "assistant" ? "Wei" : "You";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  let thinking = null;
  if (options.thinking) {
    thinking = createThinkingPanel();
    bubble.appendChild(thinking.details);
  }

  const text = document.createElement("div");
  text.className = "text";
  if (options.markdown) {
    renderMarkdownInto(text, content || "");
  } else {
    text.textContent = content || "";
  }

  bubble.appendChild(text);

  if (options.attachments && options.attachments.length) {
    const list = document.createElement("div");
    list.className = "attachment-list";

    options.attachments.forEach((attachment) => {
      const chip = document.createElement("div");
      chip.className = "attachment-chip";

      if (attachment.kind === "image" && attachment.imageUrl) {
        const thumb = document.createElement("div");
        thumb.className = "attachment-thumb";
        thumb.style.backgroundImage = `url(${attachment.imageUrl})`;
        chip.appendChild(thumb);
      }

      const name = document.createElement("span");
      name.textContent = attachment.name;
      chip.appendChild(name);

      list.appendChild(chip);
    });

    bubble.appendChild(list);
  }

  let actions = null;
  if (options.actions) {
    actions = createActions(options.actions);
    bubble.appendChild(actions);
  }

  row.appendChild(avatar);
  row.appendChild(bubble);
  msg.appendChild(row);
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;

  return { msg, text, thinking, actions };
}

function createActions({ text, messageIndex, role }) {
  const actions = document.createElement("div");
  actions.className = "actions";
  actions.dataset.messageIndex = String(messageIndex);
  actions.dataset.role = role;

  if (role === "assistant") {
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "action-btn";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text || "");
        setStatus("Copied to clipboard.");
      } catch (error) {
        setStatus("Copy failed.");
      }
    });

    const regenBtn = document.createElement("button");
    regenBtn.type = "button";
    regenBtn.className = "action-btn action-regen";
    regenBtn.textContent = "Regenerate";
    regenBtn.disabled = messageIndex !== getLastAssistantIndex() || state.sending;
    regenBtn.addEventListener("click", () => regenerateFrom(messageIndex));

    actions.appendChild(copyBtn);
    actions.appendChild(regenBtn);
  }

  // Branch button - available for all messages
  const branchBtn = document.createElement("button");
  branchBtn.type = "button";
  branchBtn.className = "action-btn action-branch";
  branchBtn.textContent = "Branch";
  branchBtn.title = "Create a new chat branch from this point";
  branchBtn.disabled = state.sending;
  branchBtn.addEventListener("click", () => branchFromMessage(messageIndex));
  actions.appendChild(branchBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "action-btn action-delete";
  deleteBtn.textContent = "Delete";
  deleteBtn.disabled = state.sending;
  deleteBtn.addEventListener("click", () => deleteMessageAt(messageIndex));
  actions.appendChild(deleteBtn);

  return actions;
}

function updateActionButtons() {
  const lastAssistantIndex = getLastAssistantIndex();
  document.querySelectorAll(".actions").forEach((actions) => {
    const index = Number(actions.dataset.messageIndex);
    const regenBtn = actions.querySelector(".action-regen");
    const deleteBtn = actions.querySelector(".action-delete");
    const branchBtn = actions.querySelector(".action-branch");
    if (regenBtn) {
      regenBtn.disabled = state.sending || index !== lastAssistantIndex;
    }
    if (deleteBtn) {
      deleteBtn.disabled = state.sending;
    }
    if (branchBtn) {
      branchBtn.disabled = state.sending;
    }
  });
}

function renderChatMessages() {
  chatLog.innerHTML = "";

  state.messages.forEach((msg, index) => {
    if (msg.role === "user") {
      const { text, attachments } = parseUserContent(msg.content);
      const displayText = text || "Sent attachments.";
      addMessage("user", displayText, {
        attachments,
        actions: { text: displayText, messageIndex: index, role: "user" },
      });
    } else if (msg.role === "assistant") {
      const assistantText = extractAssistantText(msg.content);
      addMessage("assistant", assistantText, {
        markdown: true,
        actions: { text: assistantText, messageIndex: index, role: "assistant" },
      });
    }
  });

  updateActionButtons();
  updateTokenPill();
  chatLog.scrollTop = chatLog.scrollHeight;
}

function parseUserContent(content) {
  if (!Array.isArray(content)) {
    return { text: content || "", attachments: [] };
  }

  const textParts = [];
  const attachments = [];

  content.forEach((part) => {
    if (part.type === "input_text" && typeof part.text === "string") {
      textParts.push(part.text);
    } else if (part.type === "input_image" && part.image_url) {
      attachments.push({
        kind: "image",
        name: part.name || "image",
        imageUrl: part.image_url,
      });
    } else if (part.type === "input_file") {
      attachments.push({
        kind: "pdf",
        name: part.filename || part.file_id || "document.pdf",
      });
    }
  });

  return { text: textParts.join(""), attachments };
}

function stripCitationArtifacts(text) {
  if (!text) return text;
  return text
    // Remove filecite patterns with surrounding special chars
    .replace(/[\u2580-\u259F\u2500-\u257F]*filecite[\w\u2580-\u259F\u2500-\u257F]*/gi, "")
    // Remove OpenAI citation markers like "【4:0†source】" or "【turn1file8†source】"
    .replace(/【[^】]*†[^】]*】/g, "")
    // Remove bracketed citations like "[turn1file8]"
    .replace(/\[turn\d+file\d+\]/gi, "")
    // Remove standalone citation refs like "turn1file8"
    .replace(/\bturn\d+file\d+\b/gi, "")
    // Remove box drawing, block elements, and special Unicode chars
    .replace(/[\u2500-\u257F\u2580-\u259F\uFFFC\uFFFD\u2400-\u243F]/g, "")
    // Remove Private Use Area characters (BMP and supplementary)
    .replace(/[\uE000-\uF8FF]/g, "")
    // Remove tag characters (U+E0000-U+E007F) - these show as boxes with letters
    .replace(/[\u{E0000}-\u{E007F}]/gu, "")
    // Remove variation selectors and other format chars
    .replace(/[\uFE00-\uFE0F\u200B-\u200F\u2028-\u202F]/g, "")
    // Clean up multiple spaces on same line (preserve newlines)
    .replace(/[^\S\n]+/g, " ")
    // Clean up multiple blank lines
    .replace(/\n{3,}/g, "\n\n")
    // Clean up spaces around punctuation
    .replace(/\s+\./g, ".")
    .replace(/\s+,/g, ",")
    .trim();
}

function extractAssistantText(content) {
  if (typeof content === "string") {
    return stripCitationArtifacts(content);
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const text = content
    .map((part) => {
      if (part.type === "output_text" && typeof part.text === "string") {
        return part.text;
      }
      if (part.type === "refusal" && typeof part.refusal === "string") {
        return part.refusal;
      }
      if (part.type === "input_text" && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .join("")
    .trim();

  return stripCitationArtifacts(text);
}

function normalizeUserContent(content) {
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (part.type === "output_text" && part.text) {
        return { type: "input_text", text: part.text };
      }
      if (part.type === "input_file" && part.file_id) {
        const { filename, file_data, ...rest } = part;
        return rest;
      }
      return part;
    });
  }

  if (typeof content === "string") {
    return [{ type: "input_text", text: content }];
  }

  return [];
}

function normalizeAssistantContent(content) {
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (part.type === "input_text" && part.text) {
        return { type: "output_text", text: part.text };
      }
      return part;
    });
  }

  if (typeof content === "string") {
    return [{ type: "output_text", text: content }];
  }

  return [];
}

function normalizeStoredSessions(sessions) {
  return sessions.map((session) => {
    const messages = Array.isArray(session.messages) ? session.messages : [];
    const normalizedMessages = messages.map((msg) => {
      if (msg.role === "assistant") {
        return { ...msg, content: normalizeAssistantContent(msg.content) };
      }
      if (msg.role === "user") {
        return { ...msg, content: normalizeUserContent(msg.content) };
      }
      return msg;
    });

    return {
      ...session,
      messages: normalizedMessages,
      usageTokens: typeof session.usageTokens === "number" ? session.usageTokens : 0,
    };
  });
}

function buildInputMessages() {
  return state.messages.map((msg) => {
    if (msg.role === "assistant") {
      return { role: "assistant", content: normalizeAssistantContent(msg.content) };
    }
    if (msg.role === "user") {
      return { role: "user", content: normalizeUserContent(msg.content) };
    }
    return msg;
  });
}

function rememberKeyIfNeeded() {
  if (rememberKeyInput.checked) {
    localStorage.setItem(STORAGE_KEY, apiKeyInput.value.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function renderAttachmentList() {
  attachmentList.innerHTML = "";

  if (!state.attachments.length) {
    return;
  }

  state.attachments.forEach((attachment, index) => {
    const chip = document.createElement("div");
    chip.className = `attachment-chip${attachment.uploading ? " loading" : ""}`;

    if (attachment.kind === "image" && attachment.imageUrl) {
      const thumb = document.createElement("div");
      thumb.className = "attachment-thumb";
      thumb.style.backgroundImage = `url(${attachment.imageUrl})`;
      chip.appendChild(thumb);
    }

    const name = document.createElement("span");
    name.textContent = attachment.name;
    chip.appendChild(name);

    if (attachment.uploading) {
      const status = document.createElement("span");
      status.className = "attachment-status";
      status.textContent = "Uploading";
      chip.appendChild(status);
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "attachment-remove";
    removeBtn.textContent = "x";
    removeBtn.disabled = attachment.uploading;
    removeBtn.addEventListener("click", () => {
      state.attachments.splice(index, 1);
      renderAttachmentList();
    });
    chip.appendChild(removeBtn);

    attachmentList.appendChild(chip);
  });
}

async function uploadPdfAttachment(file, apiKey) {
  const formData = new FormData();
  formData.append("purpose", "user_data");
  formData.append("file", file, file.name || "document.pdf");

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = `Upload failed (${response.status}).`;
    try {
      const errorJson = JSON.parse(errorText);
      message = errorJson?.error?.message || message;
    } catch (error) {
      if (errorText) {
        message = errorText;
      }
    }
    throw new Error(message);
  }

  const data = await response.json();
  if (!data?.id) {
    throw new Error("Upload did not return a file ID.");
  }
  return data.id;
}

async function uploadFileForSearch(file, apiKey) {
  const formData = new FormData();
  formData.append("purpose", "assistants");
  formData.append("file", file, file.name);

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = `Upload failed (${response.status}).`;
    try {
      const errorJson = JSON.parse(errorText);
      message = errorJson?.error?.message || message;
    } catch (error) {
      if (errorText) {
        message = errorText;
      }
    }
    throw new Error(message);
  }

  const data = await response.json();
  if (!data?.id) {
    throw new Error("Upload did not return a file ID.");
  }
  return data.id;
}

async function createVectorStore(apiKey, name = "WeiChat Files") {
  const response = await fetch("https://api.openai.com/v1/vector_stores", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create vector store: ${errorText}`);
  }

  const data = await response.json();
  return data.id;
}

async function addFileToVectorStore(apiKey, vectorStoreId, fileId) {
  const response = await fetch(
    `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ file_id: fileId }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add file to vector store: ${errorText}`);
  }

  return response.json();
}

async function getOrCreateVectorStore(apiKey) {
  // Get current session's vector store
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  let vectorStoreId = session?.vectorStoreId || localStorage.getItem(VECTOR_STORE_KEY);

  if (vectorStoreId) {
    // Verify it still exists
    try {
      const response = await fetch(
        `https://api.openai.com/v1/vector_stores/${vectorStoreId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );
      if (response.ok) {
        // Update session if needed
        if (session && !session.vectorStoreId) {
          session.vectorStoreId = vectorStoreId;
          saveSessions();
        }
        return vectorStoreId;
      }
    } catch (e) {
      // Vector store doesn't exist, create new one
    }
  }

  // Create new vector store for this session
  vectorStoreId = await createVectorStore(apiKey, `WeiChat - ${session?.title || 'Files'}`);

  // Save to session
  if (session) {
    session.vectorStoreId = vectorStoreId;
    saveSessions();
  } else {
    localStorage.setItem(VECTOR_STORE_KEY, vectorStoreId);
  }

  return vectorStoreId;
}

function getCurrentVectorStoreId() {
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  return session?.vectorStoreId || localStorage.getItem(VECTOR_STORE_KEY);
}

async function listVectorStoreFiles(apiKey, vectorStoreId) {
  const response = await fetch(
    `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to list files");
  }

  const data = await response.json();
  return data.data || [];
}

async function getFileInfo(apiKey, fileId) {
  const response = await fetch(
    `https://api.openai.com/v1/files/${fileId}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function removeFileFromVectorStore(apiKey, vectorStoreId, fileId) {
  const response = await fetch(
    `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files/${fileId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to remove file");
  }

  // Also remove from session's tracked files
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  if (session && session.uploadedFiles) {
    session.uploadedFiles = session.uploadedFiles.filter(f => f.fileId !== fileId);
    saveSessions();
  }

  return response.json();
}

function trackUploadedFile(fileId, fileName, fileSize) {
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  if (!session) return;

  if (!session.uploadedFiles) {
    session.uploadedFiles = [];
  }

  // Avoid duplicates
  if (!session.uploadedFiles.some(f => f.fileId === fileId)) {
    session.uploadedFiles.push({
      fileId,
      fileName,
      fileSize,
      uploadedAt: Date.now()
    });
    saveSessions();
  }
}

async function deleteVectorStore(apiKey, vectorStoreId) {
  const response = await fetch(
    `https://api.openai.com/v1/vector_stores/${vectorStoreId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete vector store");
  }

  return response.json();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function renderFileManagerList() {
  const apiKey = apiKeyInput.value.trim();
  const vectorStoreId = getCurrentVectorStoreId();
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  const storedFiles = session?.uploadedFiles || [];

  if (!apiKey) {
    fileManagerList.innerHTML = '<div class="file-manager-empty">Add API key to manage files</div>';
    vectorStoreInfo.textContent = "Vector Store: Not configured";
    return;
  }

  // If no vector store but we have stored files, show them
  if (!vectorStoreId && storedFiles.length === 0) {
    fileManagerList.innerHTML = '<div class="file-manager-empty">No vector store for this chat. Upload files with File Search enabled.</div>';
    vectorStoreInfo.textContent = `Chat: ${session?.title || 'Unknown'} - No vector store`;
    return;
  }

  vectorStoreInfo.textContent = `Chat: ${session?.title || 'Global'} - ${vectorStoreId ? vectorStoreId.slice(0, 16) + '...' : 'Local only'}`;
  fileManagerList.innerHTML = '<div class="file-manager-empty">Loading files...</div>';

  try {
    let files = [];
    if (vectorStoreId) {
      files = await listVectorStoreFiles(apiKey, vectorStoreId);
    }

    // Merge with stored file metadata for filenames
    const storedFilesMap = new Map(storedFiles.map(f => [f.fileId, f]));

    if (files.length === 0 && storedFiles.length === 0) {
      fileManagerList.innerHTML = '<div class="file-manager-empty">No files in vector store</div>';
      return;
    }

    fileManagerList.innerHTML = "";

    // If we have API files, use them with stored metadata for names
    if (files.length > 0) {
      for (const file of files) {
        const storedFile = storedFilesMap.get(file.id);
        let fileInfo = null;
        let fileName = storedFile?.fileName || file.id;
        let fileSize = storedFile?.fileSize;

        // Try to get file info from API if we don't have stored data
        if (!storedFile) {
          fileInfo = await getFileInfo(apiKey, file.id);
          fileName = fileInfo?.filename || file.id;
          fileSize = fileInfo?.bytes;
        }

        const item = document.createElement("div");
        item.className = "file-manager-item";

        const statusClass = file.status === "completed" ? "" : " processing";
        const statusText = file.status === "completed" ? "Ready" : file.status;

        item.innerHTML = `
          <span class="file-icon">📄</span>
          <div class="file-info">
            <div class="file-name">${fileName}</div>
            <div class="file-meta">${fileSize ? formatFileSize(fileSize) : "Unknown size"}</div>
          </div>
          <span class="file-status${statusClass}">${statusText}</span>
          <button type="button" class="ghost small file-remove" data-file-id="${file.id}">Remove</button>
        `;

        item.querySelector(".file-remove").addEventListener("click", async () => {
          if (confirm("Remove this file from the vector store?")) {
            try {
              await removeFileFromVectorStore(apiKey, vectorStoreId, file.id);
              setStatus("File removed from vector store.");
              renderFileManagerList();
            } catch (error) {
              setStatus(`Failed to remove file: ${error.message}`);
            }
          }
        });

        fileManagerList.appendChild(item);
      }
    } else {
      // No API files but we have stored metadata - show them as cached
      for (const storedFile of storedFiles) {
        const item = document.createElement("div");
        item.className = "file-manager-item";

        item.innerHTML = `
          <span class="file-icon">📄</span>
          <div class="file-info">
            <div class="file-name">${storedFile.fileName}</div>
            <div class="file-meta">${storedFile.fileSize ? formatFileSize(storedFile.fileSize) : "Unknown size"}</div>
          </div>
          <span class="file-status processing">Cached</span>
        `;

        fileManagerList.appendChild(item);
      }
    }
  } catch (error) {
    // API error - fall back to stored files if available
    if (storedFiles.length > 0) {
      fileManagerList.innerHTML = "";
      for (const storedFile of storedFiles) {
        const item = document.createElement("div");
        item.className = "file-manager-item";

        item.innerHTML = `
          <span class="file-icon">📄</span>
          <div class="file-info">
            <div class="file-name">${storedFile.fileName}</div>
            <div class="file-meta">${storedFile.fileSize ? formatFileSize(storedFile.fileSize) : "Unknown size"}</div>
          </div>
          <span class="file-status processing">Cached</span>
        `;

        fileManagerList.appendChild(item);
      }
      vectorStoreInfo.textContent += " (offline)";
    } else {
      fileManagerList.innerHTML = `<div class="file-manager-empty">Error: ${error.message}</div>`;
    }
  }
}

function openFileManager() {
  fileManagerModal.hidden = false;
  renderFileManagerList();
}

function closeFileManager() {
  fileManagerModal.hidden = true;
}

async function uploadFolderFiles(files) {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    setStatus("Add your API key before uploading files.");
    return;
  }

  // Supported file extensions for file search
  const supportedExtensions = [
    // Documents
    '.pdf', '.txt', '.md', '.markdown', '.json', '.csv',
    // LaTeX
    '.tex', '.bib', '.sty', '.cls', '.bst',
    // Code files
    '.py', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.less',
    '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.rb', '.php',
    '.swift', '.kt', '.scala', '.r', '.sql', '.sh', '.bash', '.zsh', '.ps1',
    '.yaml', '.yml', '.xml', '.toml', '.ini', '.cfg', '.conf',
    // Other text formats
    '.log', '.env', '.gitignore', '.dockerfile', '.makefile'
  ];

  const validFiles = Array.from(files).filter(file => {
    const name = file.name.toLowerCase();
    // Skip hidden files and common non-text files
    if (name.startsWith('.') || name.includes('node_modules/') || name.includes('.git/')) {
      return false;
    }
    return supportedExtensions.some(ext => name.endsWith(ext));
  });

  if (validFiles.length === 0) {
    setStatus("No supported files found in the folder.");
    return;
  }

  setStatus(`Uploading ${validFiles.length} files...`);

  let uploaded = 0;
  let failed = 0;

  for (const file of validFiles) {
    try {
      setStatus(`Uploading ${uploaded + 1}/${validFiles.length}: ${file.name}`);
      const fileId = await uploadFileForSearch(file, apiKey);

      // Add to vector store if file search is enabled
      if (fileSearchToggle && fileSearchToggle.checked) {
        const vectorStoreId = await getOrCreateVectorStore(apiKey);
        await addFileToVectorStore(apiKey, vectorStoreId, fileId);
      }

      // Track the uploaded file in session
      trackUploadedFile(fileId, file.name, file.size);

      uploaded++;
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      failed++;
    }
  }

  if (failed > 0) {
    setStatus(`Uploaded ${uploaded} files, ${failed} failed.`);
  } else {
    setStatus(`Successfully uploaded ${uploaded} files to search index.`);
  }
}

function addAttachment(file) {
  if (!file) {
    return;
  }

  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
  const imageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
  const imageExts = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
  const isImage =
    imageTypes.has(file.type) || imageExts.some((ext) => lowerName.endsWith(ext));

  // Supported code/text file extensions for file search
  const codeExtensions = [
    '.txt', '.md', '.markdown', '.json', '.csv',
    '.tex', '.bib', '.sty', '.cls', '.bst',
    '.py', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.less',
    '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.rb', '.php',
    '.swift', '.kt', '.scala', '.r', '.sql', '.sh', '.bash', '.zsh', '.ps1',
    '.yaml', '.yml', '.xml', '.toml', '.ini', '.cfg', '.conf',
    '.log', '.env', '.gitignore', '.dockerfile', '.makefile'
  ];
  const isCodeFile = codeExtensions.some(ext => lowerName.endsWith(ext));

  if (!isPdf && !isImage && !isCodeFile) {
    setStatus("Unsupported file type. Use images, PDFs, or code/text files.");
    return;
  }

  // Handle code/text files - upload for file search
  if (isCodeFile) {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      setStatus("Add your API key before uploading files.");
      return;
    }

    if (!fileSearchToggle || !fileSearchToggle.checked) {
      setStatus("Enable 'Files' toggle to upload code files for search.");
      return;
    }

    const attachment = {
      kind: "code",
      name: file.name || "file.txt",
      uploading: true,
      fileId: null,
    };

    state.attachments.push(attachment);
    state.loadingAttachments += 1;
    updateControls();
    renderAttachmentList();
    setStatus(`Uploading ${file.name}...`);

    uploadFileForSearch(file, apiKey)
      .then(async (fileId) => {
        attachment.fileId = fileId;
        attachment.uploading = false;
        setStatus("File uploaded.");

        // Track the uploaded file in session
        trackUploadedFile(fileId, file.name, file.size);

        // Add to vector store
        try {
          setStatus("Adding file to search index...");
          const vectorStoreId = await getOrCreateVectorStore(apiKey);
          await addFileToVectorStore(apiKey, vectorStoreId, fileId);
          attachment.inVectorStore = true;
          setStatus("File ready for search.");
        } catch (error) {
          setStatus(`File uploaded but search setup failed: ${error.message}`);
        }
      })
      .catch((error) => {
        const index = state.attachments.indexOf(attachment);
        if (index >= 0) {
          state.attachments.splice(index, 1);
        }
        setStatus(`File upload failed: ${error.message}`);
      })
      .finally(() => {
        state.loadingAttachments = Math.max(0, state.loadingAttachments - 1);
        updateControls();
        renderAttachmentList();
      });

    return;
  }

  if (isPdf) {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      setStatus("Add your API key before uploading PDFs.");
      return;
    }

    const attachment = {
      kind: "pdf",
      name: file.name || "document.pdf",
      uploading: true,
      fileId: null,
    };

    state.attachments.push(attachment);
    state.loadingAttachments += 1;
    updateControls();
    renderAttachmentList();
    setStatus("Uploading PDF...");

    uploadPdfAttachment(file, apiKey)
      .then(async (fileId) => {
        attachment.fileId = fileId;
        attachment.uploading = false;
        setStatus("PDF uploaded.");

        // Add to vector store if file search is enabled
        if (fileSearchToggle && fileSearchToggle.checked) {
          // Track the uploaded file in session
          trackUploadedFile(fileId, file.name, file.size);

          try {
            setStatus("Adding file to search index...");
            const vectorStoreId = await getOrCreateVectorStore(apiKey);
            await addFileToVectorStore(apiKey, vectorStoreId, fileId);
            attachment.inVectorStore = true;
            setStatus("File ready for search.");
          } catch (error) {
            setStatus(`File indexed but search setup failed: ${error.message}`);
          }
        }
      })
      .catch((error) => {
        const index = state.attachments.indexOf(attachment);
        if (index >= 0) {
          state.attachments.splice(index, 1);
        }
        setStatus(`PDF upload failed: ${error.message}`);
      })
      .finally(() => {
        state.loadingAttachments = Math.max(0, state.loadingAttachments - 1);
        updateControls();
        renderAttachmentList();
      });

    return;
  }

  const reader = new FileReader();
  state.loadingAttachments += 1;
  updateControls();

  reader.onload = () => {
    const result = reader.result;
    if (typeof result !== "string") {
      setStatus("Could not read the file.");
      return;
    }

    state.attachments.push({
      kind: "image",
      name: file.name || "image",
      imageUrl: result,
    });

    renderAttachmentList();
    setStatus("Attachment added.");
  };

  reader.onerror = () => {
    setStatus("Failed to read the file.");
  };

  reader.onloadend = () => {
    state.loadingAttachments = Math.max(0, state.loadingAttachments - 1);
    updateControls();
  };

  reader.readAsDataURL(file);
}

function getLastAssistantIndex() {
  for (let i = state.messages.length - 1; i >= 0; i -= 1) {
    if (state.messages[i].role === "assistant") {
      return i;
    }
  }
  return -1;
}

function updateSessionMetadata(session) {
  session.updatedAt = Date.now();
}

function summarizeTitle(text) {
  if (!text) {
    return "New chat";
  }
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "New chat";
  }
  return trimmed.length > 30 ? `${trimmed.slice(0, 30)}...` : trimmed;
}

function deriveTitleFromMessages(messages) {
  for (const msg of messages) {
    if (msg.role !== "user") {
      continue;
    }
    const { text } = parseUserContent(msg.content);
    if (text) {
      return summarizeTitle(text);
    }
  }
  return "New chat";
}

async function generateChatTitle(userMessage, apiKey) {
  if (!userMessage || !apiKey) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "user",
            content: `Create a 2-4 word title for this chat. Rules: NO quotes, NO punctuation, NO articles (a/an/the), MAX 25 characters. Just output the title.\n\nMessage: ${userMessage.slice(0, 300)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const outputText = data?.output?.[0]?.content?.[0]?.text ||
      data?.output?.find?.(o => o.type === "message")?.content?.[0]?.text;

    if (outputText) {
      const title = outputText.trim().replace(/^["']|["']$/g, "").replace(/[.!?:]+$/, "").slice(0, 30);
      return title || null;
    }
    return null;
  } catch (error) {
    return null;
  }
}

function saveSessions() {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(state.sessions));
    localStorage.setItem(ACTIVE_SESSION_KEY, state.activeSessionId || "");
  } catch (error) {
    setStatus("Warning: could not save chat history (storage limit).");
  }
  queueFileSave();
  // Also save to linked storage if available
  if (state.linkedDirHandle) {
    saveToLinkedStorage();
  }
}

function loadSessions() {
  const raw = localStorage.getItem(SESSIONS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const sessions = JSON.parse(raw);
    if (!Array.isArray(sessions)) {
      return [];
    }
    return normalizeStoredSessions(sessions);
  } catch (error) {
    return [];
  }
}

function createSession(title = "New chat") {
  const id = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    title,
    messages: [],
    usageTokens: 0,
    vectorStoreId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function setActiveSession(id, { persist = true } = {}) {
  const session = state.sessions.find((item) => item.id === id);
  if (!session) {
    return;
  }
  state.activeSessionId = id;
  state.messages = session.messages;
  state.attachments = [];
  renderAttachmentList();
  messageInput.value = "";
  renderChatList();
  renderChatMessages();
  if (persist) {
    saveSessions();
  }
}

function renderChatList() {
  chatList.innerHTML = "";
  const sorted = [...state.sessions].sort((a, b) => {
    // Starred items first
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;
    // Then by update time
    return b.updatedAt - a.updatedAt;
  });

  sorted.forEach((session) => {
    const item = document.createElement("div");
    item.className = `chat-item${session.id === state.activeSessionId ? " active" : ""}${session.parentSessionId ? " branched" : ""}${session.starred ? " starred" : ""}`;

    // Star button
    const starBtn = document.createElement("button");
    starBtn.type = "button";
    starBtn.className = `chat-star${session.starred ? " active" : ""}`;
    starBtn.textContent = session.starred ? "★" : "☆";
    starBtn.title = session.starred ? "Unstar" : "Star";
    starBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleStarSession(session.id);
    });
    item.appendChild(starBtn);

    // Add branch icon if this is a branched session
    if (session.parentSessionId) {
      const branchIcon = document.createElement("span");
      branchIcon.className = "branch-icon";
      branchIcon.textContent = "⑂";
      branchIcon.title = "Branched conversation";
      item.appendChild(branchIcon);
    }

    const titleSpan = document.createElement("span");
    titleSpan.className = "chat-item-title";
    titleSpan.textContent = session.title || "New chat";
    item.appendChild(titleSpan);

    item.addEventListener("click", () => {
      if (state.sending) {
        return;
      }
      setActiveSession(session.id);
    });
    item.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (state.sending) {
        return;
      }
      showChatContextMenu(event.clientX, event.clientY, session.id);
    });
    item.addEventListener("dblclick", () => {
      if (state.sending) {
        return;
      }
      renameSession(session.id);
    });
    chatList.appendChild(item);
  });
}

function toggleStarSession(sessionId) {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return;

  session.starred = !session.starred;
  saveSessions();
  renderChatList();
  setStatus(session.starred ? "Chat starred." : "Chat unstarred.");
}

function ensureSession() {
  if (state.activeSessionId) {
    return;
  }
  const session = createSession();
  state.sessions.unshift(session);
  setActiveSession(session.id);
}

function showChatContextMenu(x, y, sessionId) {
  if (!chatContextMenu) {
    return;
  }
  state.contextSessionId = sessionId;
  chatContextMenu.style.left = `${x}px`;
  chatContextMenu.style.top = `${y}px`;
  chatContextMenu.hidden = false;

  // Update star button text
  if (starChatBtn) {
    const session = state.sessions.find((s) => s.id === sessionId);
    starChatBtn.textContent = session?.starred ? "Unstar chat" : "Star chat";
  }
}

function hideChatContextMenu() {
  if (!chatContextMenu) {
    return;
  }
  chatContextMenu.hidden = true;
  state.contextSessionId = null;
}


function renameSession(sessionId) {
  if (state.sending) {
    setStatus("Wait for the response to finish before renaming.");
    return;
  }
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) {
    return;
  }
  const current = session.title || "New chat";
  const next = window.prompt("Rename chat", current);
  if (next === null) {
    return;
  }
  const trimmed = next.trim();
  if (!trimmed) {
    setStatus("Chat name unchanged.");
    return;
  }
  session.title = trimmed;
  session.titleLocked = true;
  updateSessionMetadata(session);
  saveSessions();
  renderChatList();
  setStatus("Chat renamed.");
}

function deleteSession(sessionId) {
  if (state.sending) {
    setStatus("Wait for the response to finish before deleting.");
    return;
  }
  const index = state.sessions.findIndex((session) => session.id === sessionId);
  if (index === -1) {
    return;
  }
  const wasActive = state.activeSessionId === sessionId;
  state.sessions.splice(index, 1);

  if (state.sessions.length === 0) {
    const session = createSession();
    state.sessions.push(session);
    state.activeSessionId = session.id;
    state.messages = session.messages;
  } else if (wasActive) {
    const nextSession = state.sessions[0];
    state.activeSessionId = nextSession.id;
    state.messages = nextSession.messages;
  }

  saveSessions();
  renderChatList();
  renderChatMessages();
  setStatus("Chat deleted.");
}

function deleteMessageAt(index) {
  if (state.sending) {
    setStatus("Wait for the response to finish before deleting.");
    return;
  }
  if (index < 0 || index >= state.messages.length) {
    return;
  }

  state.messages.splice(index, 1);
  const session = state.sessions.find((item) => item.id === state.activeSessionId);
  if (session) {
    session.messages = state.messages;
    session.title = deriveTitleFromMessages(state.messages);
    updateSessionMetadata(session);
    saveSessions();
  }

  renderChatList();
  renderChatMessages();
  setStatus("Message deleted.");
}

function branchFromMessage(index) {
  if (state.sending) {
    setStatus("Wait for the response to finish before branching.");
    return;
  }
  if (index < 0 || index >= state.messages.length) {
    return;
  }

  // Get the current session for reference
  const currentSession = state.sessions.find((item) => item.id === state.activeSessionId);
  const currentTitle = currentSession?.title || "Chat";

  // Copy messages up to and including the selected index
  const branchedMessages = JSON.parse(JSON.stringify(state.messages.slice(0, index + 1)));

  // Create a new session with the branched messages
  const newSession = createSession(`Branch: ${currentTitle}`);
  newSession.messages = branchedMessages;
  newSession.parentSessionId = state.activeSessionId;
  newSession.branchPoint = index;

  // Calculate token usage for branched messages (approximate)
  let tokenEstimate = 0;
  branchedMessages.forEach(msg => {
    const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    tokenEstimate += Math.ceil(text.length / 4); // Rough estimate
  });
  newSession.usageTokens = tokenEstimate;

  // Add to sessions and switch to it
  state.sessions.unshift(newSession);
  saveSessions();

  setActiveSession(newSession.id);
  renderChatList();
  renderChatMessages();

  setStatus(`Created branch from message ${index + 1}. You can continue the conversation from here.`);
}

async function sendAssistantResponse() {
  const apiKey = apiKeyInput.value.trim();
  const model = composerModel ? composerModel.value : "gpt-5.2";
  const reasoningEffort = composerReasoning ? composerReasoning.value : "default";

  if (!apiKey) {
    setStatus("Add your API key to continue.");
    apiKeyInput.focus();
    return;
  }

  const reasoningEnabled = reasoningEffort && reasoningEffort !== "default" && reasoningEffort !== "none";
  const pending = addMessage("assistant", "", { pending: true, thinking: reasoningEnabled });
  const thinkingPanel = pending.thinking;
  const thinkingNotes = new Set();
  let streamFinished = false;
  const thinkingStartTime = Date.now();
  const addNote = (key, text) => {
    if (!thinkingPanel || thinkingNotes.has(key)) {
      return;
    }
    thinkingNotes.add(key);
    addThinkingLine(thinkingPanel, text);
  };
  const maybeCollapseThinking = () => {
    if (!thinkingPanel) {
      return;
    }
    if (streamFinished) {
      const elapsed = Math.round((Date.now() - thinkingStartTime) / 1000);
      thinkingPanel.summary.innerHTML = `Thought for ${elapsed} second${elapsed !== 1 ? "s" : ""}`;
      thinkingPanel.details.open = false;
      // Hide body if no content
      if (!thinkingPanel.summaryText.textContent.trim()) {
        thinkingPanel.body.style.display = "none";
      }
    }
  };

  addNote("queued", "Queued");
  setStatus("Thinking...");
  state.sending = true;
  updateControls();
  updateActionButtons();
  startTimer();

  const payload = {
    model,
    input: buildInputMessages(),
    stream: true,
  };

  const systemPrompt = systemPromptInput.value.trim();
  if (systemPrompt) {
    payload.instructions = systemPrompt;
  }

  if (reasoningEffort && reasoningEffort !== "default" && reasoningEffort !== "none") {
    payload.reasoning = { effort: reasoningEffort };
  }

  // Add tools if enabled
  const tools = [];
  if (webSearchToggle && webSearchToggle.checked) {
    tools.push({ type: "web_search_preview" });
  }
  if (codeInterpreterToggle && codeInterpreterToggle.checked) {
    tools.push({
      type: "code_interpreter",
      container: { type: "auto" }
    });
  }
  if (fileSearchToggle && fileSearchToggle.checked) {
    try {
      const vectorStoreId = await getOrCreateVectorStore(apiKey);
      tools.push({
        type: "file_search",
        vector_store_ids: [vectorStoreId]
      });
    } catch (error) {
      setStatus(`File search setup failed: ${error.message}`);
    }
  }
  if (tools.length > 0) {
    payload.tools = tools;
  }

  let assistantText = "";
  let refusalText = "";
  let usageTotal = 0;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let message = `Request failed (${response.status}).`;
      try {
        const errorJson = JSON.parse(errorText);
        message = errorJson?.error?.message || message;
      } catch (error) {
        if (errorText) {
          message = errorText;
        }
      }
      throw new Error(message);
    }

    const contentType = response.headers.get("content-type") || "";
    const isStream = contentType.includes("text/event-stream") && response.body;

    if (isStream) {
      await streamResponse(response, (data) => {
        if (!data || data === "[DONE]") {
          return;
        }

        let event;
        try {
          event = JSON.parse(data);
        } catch (error) {
          return;
        }

        switch (event.type) {
          case "response.queued":
            addNote("queued", "Queued");
            break;
          case "response.created":
            addNote("created", "Started");
            break;
          case "response.in_progress":
            addNote("progress", "Working");
            break;
          case "response.reasoning_text.delta":
            if (thinkingPanel && event.delta) {
              thinkingPanel.details.open = true;
              thinkingPanel.summaryText.textContent += event.delta;
            }
            break;
          case "response.reasoning_summary_text.delta":
            if (thinkingPanel && event.delta) {
              thinkingPanel.details.open = true;
              // Clear reasoning text and show summary instead
              if (!thinkingPanel.showingSummary) {
                thinkingPanel.summaryText.textContent = "";
                thinkingPanel.showingSummary = true;
              }
              thinkingPanel.summaryText.textContent += event.delta;
            }
            break;
          case "response.reasoning_summary_part.added":
          case "response.reasoning_summary_part.delta":
            if (thinkingPanel && event.part?.text) {
              thinkingPanel.details.open = true;
              thinkingPanel.summaryText.textContent += event.part.text;
            }
            break;
          case "response.output_text.delta":
            addNote("draft", "Drafting response");
            assistantText += event.delta || "";
            pending.text.textContent = assistantText;
            setStatus("Streaming response...");
            break;
          case "response.output_text.done":
            if (!assistantText && event.text) {
              assistantText = event.text;
              pending.text.textContent = assistantText;
            }
            break;
          case "response.refusal.delta":
            refusalText += event.delta || "";
            pending.text.textContent = refusalText;
            setStatus("Refusal in progress...");
            break;
          case "response.refusal.done":
            if (event.refusal) {
              refusalText = event.refusal;
              pending.text.textContent = refusalText;
            }
            break;
          case "response.completed":
            addNote("done", "Complete");
            if (event.response && event.response.usage) {
              usageTotal = event.response.usage.total_tokens || 0;
            }
            break;
          case "response.failed":
            throw new Error("Response failed.");
          case "error":
            throw new Error(event.error?.message || "Stream error.");
          // Tool events
          case "response.web_search_call.in_progress":
            addNote("web_search", "Searching the web...");
            setStatus("Searching the web...");
            break;
          case "response.web_search_call.completed":
            addNote("web_search_done", "Web search complete");
            break;
          case "response.web_search_call.searching":
            setStatus("Searching...");
            break;
          case "response.code_interpreter_call.in_progress":
            addNote("code_interpreter", "Running code...");
            setStatus("Running code...");
            break;
          case "response.code_interpreter_call.completed":
            addNote("code_done", "Code execution complete");
            break;
          case "response.code_interpreter_call.code_delta":
            // Code being written
            setStatus("Writing code...");
            break;
          case "response.code_interpreter_call.output":
            // Code output received
            setStatus("Code output received");
            break;
          case "response.file_search_call.in_progress":
            addNote("file_search", "Searching files...");
            setStatus("Searching files...");
            break;
          case "response.file_search_call.completed":
            addNote("file_search_done", "File search complete");
            break;
          case "response.file_search_call.searching":
            setStatus("Searching through documents...");
            break;
          default:
            // Log unknown events for debugging
            if (event.type && (event.type.includes("reasoning") || event.type.includes("tool") || event.type.includes("web_search") || event.type.includes("code_interpreter") || event.type.includes("file_search"))) {
              console.log("Event:", event.type, event);
            }
            break;
        }
      });
      streamFinished = true;
      maybeCollapseThinking();
    } else {
      const data = await response.json();
      assistantText = extractOutputText(data);
      usageTotal = data?.usage?.total_tokens || 0;
      streamFinished = true;
      maybeCollapseThinking();
    }

    if (!assistantText && refusalText) {
      assistantText = refusalText;
    }

    // Strip citation artifacts from the response
    assistantText = stripCitationArtifacts(assistantText);

    if (!assistantText) {
      throw new Error("No text output received.");
    }

    pending.msg.classList.remove("pending");
    renderMarkdownInto(pending.text, assistantText);

    maybeCollapseThinking();

    state.messages.push({
      role: "assistant",
      content: [{ type: "output_text", text: assistantText }],
      usageTokens: usageTotal || 0,
    });

    const session = state.sessions.find((item) => item.id === state.activeSessionId);
    if (session) {
      session.messages = state.messages;
      session.usageTokens = (session.usageTokens || 0) + (usageTotal || 0);
      updateSessionMetadata(session);
      saveSessions();
      renderChatList();
    }
    updateTokenPill();

    if (pending.actions) {
      pending.actions.remove();
    }
    const assistantIndex = state.messages.length - 1;
    const actions = createActions({
      text: assistantText,
      messageIndex: assistantIndex,
      role: "assistant",
    });
    pending.msg.querySelector(".bubble")?.appendChild(actions);
    updateActionButtons();

    setStatus("Ready");
  } catch (error) {
    pending.msg.classList.remove("pending");
    pending.msg.classList.add("error");
    pending.text.textContent = `Error: ${error.message}`;
    addNote("error", "Failed");
    setStatus("Something went wrong. Check your API key and model.");
  } finally {
    state.sending = false;
    updateControls();
    updateActionButtons();
    stopTimer();
    messageInput.focus();
  }
}

function extractOutputText(responseJson) {
  if (!responseJson || !Array.isArray(responseJson.output)) {
    return "";
  }

  const parts = [];
  for (const item of responseJson.output) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const chunk of item.content) {
        if (chunk.type === "output_text" && typeof chunk.text === "string") {
          parts.push(chunk.text);
        }
      }
    } else if (item.type === "output_text" && typeof item.text === "string") {
      parts.push(item.text);
    }
  }

  return parts.join("").trim();
}

async function sendMessage() {
  if (state.loadingAttachments > 0) {
    setStatus("Attachments are still loading.");
    return;
  }

  const userText = messageInput.value.trim();

  if (!userText && state.attachments.length === 0) {
    return;
  }

  ensureSession();
  rememberKeyIfNeeded();

  const model = composerModel ? composerModel.value : "gpt-5.2";
  const reasoning = composerReasoning ? composerReasoning.value : "default";
  localStorage.setItem(MODEL_KEY, model);
  localStorage.setItem(SYSTEM_KEY, systemPromptInput.value);
  localStorage.setItem(REASONING_KEY, reasoning);

  messageInput.value = "";
  const attachments = state.attachments.slice();
  const displayText = userText || "Sent attachments.";
  const userIndex = state.messages.length;
  addMessage("user", displayText, {
    attachments,
    actions: { text: displayText, messageIndex: userIndex, role: "user" },
  });

  const userContent = [];
  if (userText) {
    userContent.push({ type: "input_text", text: userText });
  }
  attachments.forEach((attachment) => {
    if (attachment.kind === "image") {
      userContent.push({ type: "input_image", image_url: attachment.imageUrl });
    } else if (attachment.kind === "pdf") {
      if (attachment.fileId) {
        userContent.push({
          type: "input_file",
          file_id: attachment.fileId,
        });
      } else if (attachment.fileData) {
        userContent.push({
          type: "input_file",
          filename: attachment.name,
          file_data: attachment.fileData,
        });
      }
    }
  });

  state.messages.push({ role: "user", content: userContent });
  updateTokenPill();
  state.attachments = [];
  renderAttachmentList();

  const session = state.sessions.find((item) => item.id === state.activeSessionId);
  const shouldAutoTitle = session && !session.titleLocked && (!session.title || session.title === "New chat");
  if (session) {
    if (shouldAutoTitle) {
      session.title = summarizeTitle(userText || "New chat");
    }
    session.messages = state.messages;
    updateSessionMetadata(session);
    saveSessions();
    renderChatList();
  }

  // Auto-generate chat title for first message
  if (shouldAutoTitle && userText && session) {
    const apiKey = apiKeyInput.value.trim();
    const sessionId = session.id;
    generateChatTitle(userText, apiKey).then((generatedTitle) => {
      if (generatedTitle) {
        const targetSession = state.sessions.find((s) => s.id === sessionId);
        if (targetSession && !targetSession.titleLocked && targetSession.title !== generatedTitle) {
          targetSession.title = generatedTitle;
          saveSessions();
          renderChatList();
        }
      }
    });
  }

  await sendAssistantResponse();
}

async function regenerateFrom(messageIndex) {
  if (state.sending) {
    return;
  }
  const lastAssistantIndex = getLastAssistantIndex();
  if (messageIndex !== lastAssistantIndex) {
    setStatus("Only the latest response can be regenerated.");
    return;
  }

  const removed = state.messages.pop();
  if (!removed || removed.role !== "assistant") {
    return;
  }

  renderChatMessages();
  await sendAssistantResponse();
}

function clearCurrentChat() {
  if (state.sending) {
    return;
  }
  state.messages = [];
  state.attachments = [];
  renderAttachmentList();
  messageInput.value = "";
  const session = state.sessions.find((item) => item.id === state.activeSessionId);
  if (session) {
    session.messages = [];
    session.title = "New chat";
    updateSessionMetadata(session);
    saveSessions();
  }
  renderChatList();
  renderChatMessages();
  setStatus("Cleared.");
}

function setTheme(choice) {
  const selected = choice || "system";
  localStorage.setItem(THEME_KEY, selected);
  applyTheme(selected);
}

function applyTheme(choice) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = choice === "system" ? (prefersDark ? "dark" : "light") : choice;
  document.documentElement.dataset.theme = theme;
  if (hljsThemeLink) {
    hljsThemeLink.href = theme === "dark" ? HLJS_THEMES.dark : HLJS_THEMES.light;
  }
}

async function initialize() {
  const savedKey = localStorage.getItem(STORAGE_KEY);
  const savedModel = localStorage.getItem(MODEL_KEY);
  const savedSystem = localStorage.getItem(SYSTEM_KEY);
  const savedReasoning = localStorage.getItem(REASONING_KEY);
  const savedTheme = localStorage.getItem(THEME_KEY) || "system";
  const savedActiveSession = localStorage.getItem(ACTIVE_SESSION_KEY);

  if (savedKey) {
    apiKeyInput.value = savedKey;
    rememberKeyInput.checked = true;
  }

  if (savedModel && modelInput) {
    ensureModelOption(savedModel);
    modelInput.value = savedModel;
  }

  if (savedSystem) {
    systemPromptInput.value = savedSystem;
  }

  if (savedReasoning && reasoningSelect) {
    reasoningSelect.value = savedReasoning;
  }

  themeSelect.value = savedTheme;
  applyTheme(savedTheme);

  let loadedFromFile = false;

  // Try to restore linked storage first (highest priority)
  const linkedRestored = await restoreLinkedStorage();
  if (linkedRestored) {
    const linkedPayload = await loadFromLinkedStorage();
    if (linkedPayload) {
      state.sessions = linkedPayload.sessions;
      if (state.sessions.length === 0) {
        const session = createSession();
        state.sessions.push(session);
        state.activeSessionId = session.id;
      } else {
        const candidate = linkedPayload.activeSessionId || savedActiveSession;
        const exists = candidate
          ? state.sessions.some((session) => session.id === candidate)
          : false;
        state.activeSessionId = exists ? candidate : state.sessions[0].id;
      }
      loadedFromFile = true;
      setStatus("Loaded from linked folder.");
    }
  }

  // Fall back to OPFS
  if (!loadedFromFile) {
    const filePayload = await loadSessionsFromOpfs({ silent: true });
    if (filePayload) {
      state.sessions = filePayload.sessions;
      if (state.sessions.length === 0) {
        const session = createSession();
        state.sessions.push(session);
        state.activeSessionId = session.id;
      } else {
        const candidate = filePayload.activeSessionId || savedActiveSession;
        const exists = candidate
          ? state.sessions.some((session) => session.id === candidate)
          : false;
        state.activeSessionId = exists ? candidate : state.sessions[0].id;
      }
      loadedFromFile = true;
    }
  }

  // Fall back to localStorage
  if (!loadedFromFile) {
    state.sessions = loadSessions();
    if (state.sessions.length === 0) {
      const session = createSession();
      state.sessions.push(session);
      state.activeSessionId = session.id;
    } else if (savedActiveSession) {
      const exists = state.sessions.some((session) => session.id === savedActiveSession);
      state.activeSessionId = exists ? savedActiveSession : state.sessions[0].id;
    } else {
      state.activeSessionId = state.sessions[0].id;
    }
  }

  const activeSession = state.sessions.find((session) => session.id === state.activeSessionId);
  state.messages = activeSession ? activeSession.messages : [];

  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(state.sessions));
    localStorage.setItem(ACTIVE_SESSION_KEY, state.activeSessionId || "");
  } catch (error) {
    // Ignore if localStorage is unavailable.
  }

  renderChatList();
  renderChatMessages();
  renderAttachmentList();
  updateControls();
  updateModelPill();
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

newChatBtn.addEventListener("click", () => {
  if (state.sending) {
    return;
  }
  const session = createSession();
  state.sessions.unshift(session);
  setActiveSession(session.id);
  setStatus("Ready");
});

if (clearBtn) {
  clearBtn.addEventListener("click", clearCurrentChat);
}

// Storage folder linking
if (linkStorageBtn) {
  linkStorageBtn.addEventListener("click", linkStorageFolder);
}

if (unlinkStorageBtn) {
  unlinkStorageBtn.addEventListener("click", unlinkStorageFolder);
}

fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files || []);
  files.forEach(addAttachment);
  fileInput.value = "";
});

rememberKeyInput.addEventListener("change", rememberKeyIfNeeded);

if (modelInput) {
  modelInput.addEventListener("change", () => {
    updateModelPill();
    localStorage.setItem(MODEL_KEY, modelInput.value);
  });
}

themeSelect.addEventListener("change", (event) => {
  setTheme(event.target.value);
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (themeSelect.value === "system") {
    applyTheme("system");
  }
});

document.addEventListener("click", (event) => {
  if (chatContextMenu && !chatContextMenu.hidden) {
    if (!chatContextMenu.contains(event.target)) {
      hideChatContextMenu();
    }
  }
});

window.addEventListener("resize", hideChatContextMenu);

if (renameChatBtn) {
  renameChatBtn.addEventListener("click", () => {
    if (state.contextSessionId) {
      renameSession(state.contextSessionId);
      hideChatContextMenu();
    }
  });
}

if (starChatBtn) {
  starChatBtn.addEventListener("click", () => {
    if (state.contextSessionId) {
      toggleStarSession(state.contextSessionId);
      hideChatContextMenu();
    }
  });
}

if (deleteChatBtn) {
  deleteChatBtn.addEventListener("click", () => {
    if (state.contextSessionId) {
      deleteSession(state.contextSessionId);
      hideChatContextMenu();
    }
  });
}

window.addEventListener("load", () => {
  initialize().catch((error) => {
    setStatus(`Failed to initialize: ${error.message}`);
  });
});

// Model switcher in topbar - sync with sidebar
if (modelSwitcher) {
  modelSwitcher.addEventListener("change", () => {
    const value = modelSwitcher.value;
    ensureModelOption(value);
    modelInput.value = value;
    localStorage.setItem(MODEL_KEY, value);
  });
}

// Composer model and reasoning selects
if (composerModel) {
  const savedModel = localStorage.getItem(MODEL_KEY) || "gpt-5.2";
  // Ensure option exists
  const exists = Array.from(composerModel.options).some(opt => opt.value === savedModel);
  if (!exists) {
    const option = document.createElement("option");
    option.value = savedModel;
    option.textContent = savedModel;
    composerModel.appendChild(option);
  }
  composerModel.value = savedModel;

  composerModel.addEventListener("change", () => {
    const value = composerModel.value;
    localStorage.setItem(MODEL_KEY, value);
    // Sync with sidebar
    if (modelInput) {
      ensureModelOption(value);
      modelInput.value = value;
    }
  });
}

if (composerReasoning) {
  const savedReasoning = localStorage.getItem(REASONING_KEY) || "default";
  composerReasoning.value = savedReasoning;

  composerReasoning.addEventListener("change", () => {
    const value = composerReasoning.value;
    localStorage.setItem(REASONING_KEY, value);
    // Sync with sidebar
    if (reasoningSelect) {
      reasoningSelect.value = value;
    }
  });
}

// Wide screen toggle (default: true)
if (wideScreenToggle) {
  const savedValue = localStorage.getItem(WIDE_SCREEN_KEY);
  const isWide = savedValue === null ? true : savedValue === "true";
  wideScreenToggle.checked = isWide;
  if (isWide) {
    document.body.classList.add("wide-screen");
  }

  wideScreenToggle.addEventListener("change", () => {
    const isWide = wideScreenToggle.checked;
    document.body.classList.toggle("wide-screen", isWide);
    localStorage.setItem(WIDE_SCREEN_KEY, isWide);
  });
}

// Composer resize handle
if (resizeHandle && composer) {
  const savedHeight = localStorage.getItem(COMPOSER_HEIGHT_KEY);
  // Ensure saved height is at least 200px
  if (savedHeight && parseInt(savedHeight, 10) >= 200) {
    composer.style.height = savedHeight + "px";
  } else if (savedHeight) {
    // Reset too-small saved height
    localStorage.removeItem(COMPOSER_HEIGHT_KEY);
  }

  let startY = 0;
  let startHeight = 0;

  const onMouseMove = (e) => {
    const delta = startY - e.clientY;
    // Minimum 200px ensures textarea + composer-actions stay visible
    const newHeight = Math.max(200, Math.min(500, startHeight + delta));
    composer.style.height = newHeight + "px";
  };

  const onMouseUp = () => {
    document.body.classList.remove("resizing-composer");
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    localStorage.setItem(COMPOSER_HEIGHT_KEY, composer.offsetHeight);
  };

  resizeHandle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startY = e.clientY;
    startHeight = composer.offsetHeight;
    document.body.classList.add("resizing-composer");
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

// Sidebar toggle
if (sidebarToggle) {
  const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  if (savedCollapsed) {
    document.body.classList.add("sidebar-collapsed");
  }

  sidebarToggle.addEventListener("click", () => {
    const isCollapsed = document.body.classList.toggle("sidebar-collapsed");
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isCollapsed);
  });
}

// Font size settings (range slider)
if (fontSizeRange) {
  const savedSize = localStorage.getItem(FONT_SIZE_KEY) || "15";
  fontSizeRange.value = savedSize;
  if (fontSizeValue) fontSizeValue.textContent = savedSize;
  document.documentElement.style.setProperty("--text-font-size", `${savedSize}px`);

  fontSizeRange.addEventListener("input", () => {
    const size = fontSizeRange.value;
    if (fontSizeValue) fontSizeValue.textContent = size;
    document.documentElement.style.setProperty("--text-font-size", `${size}px`);
    localStorage.setItem(FONT_SIZE_KEY, size);
  });
}

// Force visibility of composer controls (fallback for CSS issues)
function ensureComposerControlsVisible() {
  const composerActions = document.querySelector(".composer-actions");
  const composerLeft = document.querySelector(".composer-left");
  const modelSelect = document.getElementById("composerModel");
  const reasoningSelect = document.getElementById("composerReasoning");
  const sendButton = document.getElementById("sendBtn");

  if (composerActions) {
    composerActions.style.cssText = "display: flex !important; visibility: visible !important; opacity: 1 !important; min-height: 50px;";
  }
  if (composerLeft) {
    composerLeft.style.cssText = "display: flex !important; visibility: visible !important; opacity: 1 !important; gap: 8px;";
  }
  if (modelSelect) {
    modelSelect.style.cssText = "display: inline-block !important; visibility: visible !important; opacity: 1 !important; min-width: 130px; height: 40px;";
  }
  if (reasoningSelect) {
    reasoningSelect.style.cssText = "display: inline-block !important; visibility: visible !important; opacity: 1 !important; min-width: 130px; height: 40px;";
  }
  if (sendButton) {
    sendButton.style.cssText = "display: inline-block !important; visibility: visible !important; opacity: 1 !important; min-width: 80px;";
  }
}

// Call on DOM ready and after a short delay
document.addEventListener("DOMContentLoaded", ensureComposerControlsVisible);
setTimeout(ensureComposerControlsVisible, 100);

// Web search toggle
if (webSearchToggle) {
  const savedWebSearch = localStorage.getItem(WEB_SEARCH_KEY) === "true";
  webSearchToggle.checked = savedWebSearch;

  webSearchToggle.addEventListener("change", () => {
    localStorage.setItem(WEB_SEARCH_KEY, webSearchToggle.checked);
  });
}

// Code interpreter toggle
if (codeInterpreterToggle) {
  const savedCodeInterpreter = localStorage.getItem(CODE_INTERPRETER_KEY) === "true";
  codeInterpreterToggle.checked = savedCodeInterpreter;

  codeInterpreterToggle.addEventListener("change", () => {
    localStorage.setItem(CODE_INTERPRETER_KEY, codeInterpreterToggle.checked);
  });
}

// File search toggle
if (fileSearchToggle) {
  const savedFileSearch = localStorage.getItem(FILE_SEARCH_KEY) === "true";
  fileSearchToggle.checked = savedFileSearch;

  fileSearchToggle.addEventListener("change", () => {
    localStorage.setItem(FILE_SEARCH_KEY, fileSearchToggle.checked);
  });
}

// Folder upload
if (folderInput) {
  folderInput.addEventListener("change", () => {
    const files = folderInput.files;
    if (files && files.length > 0) {
      uploadFolderFiles(files);
    }
    folderInput.value = "";
  });
}

// File manager modal
if (manageFilesBtn) {
  manageFilesBtn.addEventListener("click", openFileManager);
}

if (closeFileManagerBtn) {
  closeFileManagerBtn.addEventListener("click", closeFileManager);
}

if (fileManagerModal) {
  fileManagerModal.querySelector(".modal-backdrop").addEventListener("click", closeFileManager);
}

if (refreshFilesBtn) {
  refreshFilesBtn.addEventListener("click", renderFileManagerList);
}

if (clearVectorStoreBtn) {
  clearVectorStoreBtn.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim();
    const vectorStoreId = getCurrentVectorStoreId();
    const session = state.sessions.find((s) => s.id === state.activeSessionId);

    if (!apiKey || !vectorStoreId) {
      setStatus("No vector store to clear.");
      return;
    }

    if (!confirm("Delete all files from this chat's vector store? This cannot be undone.")) {
      return;
    }

    try {
      await deleteVectorStore(apiKey, vectorStoreId);
      if (session) {
        session.vectorStoreId = null;
        saveSessions();
      } else {
        localStorage.removeItem(VECTOR_STORE_KEY);
      }
      setStatus("Vector store deleted.");
      renderFileManagerList();
    } catch (error) {
      setStatus(`Failed to delete vector store: ${error.message}`);
    }
  });
}

if (newVectorStoreBtn) {
  newVectorStoreBtn.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim();
    const session = state.sessions.find((s) => s.id === state.activeSessionId);

    if (!apiKey) {
      setStatus("Add API key first.");
      return;
    }

    if (!confirm("Create a new vector store for this chat? The old one will be deleted.")) {
      return;
    }

    try {
      const oldVectorStoreId = getCurrentVectorStoreId();
      if (oldVectorStoreId) {
        try {
          await deleteVectorStore(apiKey, oldVectorStoreId);
        } catch (e) {
          // Ignore if old store doesn't exist
        }
      }

      const newId = await createVectorStore(apiKey, `WeiChat - ${session?.title || 'Files'}`);
      if (session) {
        session.vectorStoreId = newId;
        saveSessions();
      } else {
        localStorage.setItem(VECTOR_STORE_KEY, newId);
      }
      setStatus("New vector store created.");
      renderFileManagerList();
    } catch (error) {
      setStatus(`Failed to create vector store: ${error.message}`);
    }
  });
}

// Share functionality
function getConversationMarkdown() {
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  const title = session?.title || "Conversation";
  const date = new Date().toLocaleDateString();

  let markdown = `# ${title}\n\n`;
  markdown += `*Exported from WeiChat on ${date}*\n\n---\n\n`;

  state.messages.forEach((msg) => {
    if (msg.role === "user") {
      const { text } = parseUserContent(msg.content);
      markdown += `## You\n\n${text || "*(attachment)*"}\n\n`;
    } else if (msg.role === "assistant") {
      const text = extractAssistantText(msg.content);
      markdown += `## Wei\n\n${text}\n\n`;
    }
  });

  return markdown;
}

function getConversationJson() {
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  return JSON.stringify({
    title: session?.title || "Conversation",
    exportedAt: new Date().toISOString(),
    messages: state.messages,
    usageTokens: session?.usageTokens || 0,
  }, null, 2);
}

function getConversationHtml() {
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  const title = session?.title || "Conversation";
  const date = new Date().toLocaleDateString();

  let messagesHtml = "";
  state.messages.forEach((msg) => {
    if (msg.role === "user") {
      const { text } = parseUserContent(msg.content);
      messagesHtml += `
        <div class="message user">
          <div class="avatar">You</div>
          <div class="content">${escapeHtml(text || "*(attachment)*")}</div>
        </div>`;
    } else if (msg.role === "assistant") {
      const text = extractAssistantText(msg.content);
      messagesHtml += `
        <div class="message assistant">
          <div class="avatar">Wei</div>
          <div class="content">${escapeHtml(text)}</div>
        </div>`;
    }
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - WeiChat Export</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
    }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .messages { padding: 20px; }
    .message {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
    .message:last-child { border-bottom: none; }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 12px;
      flex-shrink: 0;
    }
    .user .avatar { background: #e3f2fd; color: #1976d2; }
    .assistant .avatar { background: #f3e5f5; color: #7b1fa2; }
    .content {
      flex: 1;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .footer {
      background: #f9f9f9;
      padding: 16px 24px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(title)}</h1>
      <p>Exported from WeiChat on ${date}</p>
    </div>
    <div class="messages">
      ${messagesHtml}
    </div>
    <div class="footer">
      Exported from WeiChat
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getShareableLink() {
  const session = state.sessions.find((s) => s.id === state.activeSessionId);
  const data = {
    t: session?.title || "Chat",
    m: state.messages.map(msg => ({
      r: msg.role === "user" ? "u" : "a",
      c: msg.role === "user" ? parseUserContent(msg.content).text : extractAssistantText(msg.content)
    }))
  };

  try {
    const compressed = btoa(encodeURIComponent(JSON.stringify(data)));
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = `share=${compressed}`;
    return url.toString();
  } catch (e) {
    return null;
  }
}

function openShareModal() {
  if (state.messages.length === 0) {
    setStatus("No messages to share.");
    return;
  }
  shareModal.hidden = false;
}

function closeShareModal() {
  shareModal.hidden = true;
}

// Share modal event listeners
if (shareBtn) {
  shareBtn.addEventListener("click", openShareModal);
}

if (closeShareModalBtn) {
  closeShareModalBtn.addEventListener("click", closeShareModal);
}

if (shareModal) {
  shareModal.querySelector(".modal-backdrop").addEventListener("click", closeShareModal);
}

if (copyMarkdownBtn) {
  copyMarkdownBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(getConversationMarkdown());
      setStatus("Markdown copied to clipboard!");
      closeShareModal();
    } catch (e) {
      setStatus("Failed to copy to clipboard.");
    }
  });
}

if (downloadMarkdownBtn) {
  downloadMarkdownBtn.addEventListener("click", () => {
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    const filename = `${(session?.title || "conversation").replace(/[^a-z0-9]/gi, "_")}.md`;
    downloadFile(getConversationMarkdown(), filename, "text/markdown");
    setStatus("Markdown file downloaded!");
    closeShareModal();
  });
}

if (downloadHtmlBtn) {
  downloadHtmlBtn.addEventListener("click", () => {
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    const filename = `${(session?.title || "conversation").replace(/[^a-z0-9]/gi, "_")}.html`;
    downloadFile(getConversationHtml(), filename, "text/html");
    setStatus("HTML file downloaded!");
    closeShareModal();
  });
}

if (downloadJsonBtn) {
  downloadJsonBtn.addEventListener("click", () => {
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    const filename = `${(session?.title || "conversation").replace(/[^a-z0-9]/gi, "_")}.json`;
    downloadFile(getConversationJson(), filename, "application/json");
    setStatus("JSON file downloaded!");
    closeShareModal();
  });
}

if (copyLinkBtn) {
  copyLinkBtn.addEventListener("click", async () => {
    const link = getShareableLink();
    if (!link) {
      setStatus("Conversation too large for URL sharing. Use download instead.");
      return;
    }

    if (link.length > 8000) {
      setStatus("Conversation too large for URL sharing. Use download instead.");
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setStatus("Share link copied to clipboard!");
      closeShareModal();
    } catch (e) {
      setStatus("Failed to copy link.");
    }
  });
}

// Load shared conversation from URL on startup
function loadSharedConversation() {
  const hash = window.location.hash;
  if (!hash.startsWith("#share=")) return;

  try {
    const compressed = hash.slice(7);
    const data = JSON.parse(decodeURIComponent(atob(compressed)));

    if (data.m && Array.isArray(data.m)) {
      const messages = data.m.map(msg => ({
        role: msg.r === "u" ? "user" : "assistant",
        content: msg.c
      }));

      // Create a new session with the shared conversation
      const session = createSession(data.t || "Shared Chat");
      session.messages = messages;
      state.sessions.unshift(session);
      saveSessions();
      setActiveSession(session.id);

      // Clear the hash
      window.location.hash = "";
      setStatus("Loaded shared conversation!");
    }
  } catch (e) {
    console.error("Failed to load shared conversation:", e);
  }
}

// Call on startup
loadSharedConversation();

// Import JSON conversation
function importConversationFromJson(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    if (!data.messages || !Array.isArray(data.messages)) {
      throw new Error("Invalid JSON format: missing messages array");
    }

    // Normalize messages
    const messages = data.messages.map(msg => {
      if (msg.role === "user") {
        return { ...msg, content: normalizeUserContent(msg.content) };
      } else if (msg.role === "assistant") {
        return { ...msg, content: normalizeAssistantContent(msg.content) };
      }
      return msg;
    });

    // Create new session with imported messages
    const session = createSession(data.title || "Imported Chat");
    session.messages = messages;
    session.usageTokens = data.usageTokens || 0;
    session.importedAt = Date.now();

    state.sessions.unshift(session);
    saveSessions();
    setActiveSession(session.id);

    setStatus("Conversation imported successfully!");
    return true;
  } catch (error) {
    setStatus(`Import failed: ${error.message}`);
    return false;
  }
}

if (importJsonBtn) {
  importJsonBtn.addEventListener("click", () => {
    importJsonInput.click();
  });
}

if (importJsonInput) {
  importJsonInput.addEventListener("change", () => {
    const file = importJsonInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const success = importConversationFromJson(e.target.result);
      if (success) {
        closeShareModal();
      }
    };
    reader.onerror = () => {
      setStatus("Failed to read file.");
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    importJsonInput.value = "";
  });
}
