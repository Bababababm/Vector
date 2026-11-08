
/*
  POCKET AI 2.0 — COMPLETE APP.JS
  Galaxy S10 robot companion

  - Gemini via Cloudflare Worker
  - Animated eyes and moods
  - Voice recognition and speech
  - Local conversation history
  - Local memory notes
  - Settings auto-scroll
  - Optional Vision module

  IMPORTANT:
  Never put your Gemini API key here.
*/

const $ = id => document.getElementById(id);

const STORE = "pocket-ai-v2-state";

const DEFAULT = {
  endpoint: "",
  cheek: 65,
  rate: 1,
  speak: true,
  voice: "",
  notes: [],
  history: []
};

let state;

try {
  state = {
    ...DEFAULT,
    ...JSON.parse(localStorage.getItem(STORE) || "{}")
  };
} catch {
  state = { ...DEFAULT };
}

if (!Array.isArray(state.history)) state.history = [];
if (!Array.isArray(state.notes)) state.notes = [];

let busy = false;
let recog = null;
let speechActive = false;
let vision = null;

const setFeedback = message => {
  $("feedback").textContent = message;
};

function persist() {
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
  } catch {
    setFeedback("Local storage unavailable.");
  }
}

function mood(value, words) {
  $("face").dataset.mood = value;

  const labels = {
    idle: "READY",
    listening: "YOUR TURN",
    speaking: "TALKING",
    thinking: "PROCESSING"
  };

  $("modeIndicator").textContent =
    value.toUpperCase() + " · " +
    (labels[value] || "READY");

  if (words) $("mood").textContent = words;
}

function lookAround() {
  const x = Math.round((Math.random() - 0.5) * 24);
  const y = Math.round((Math.random() - 0.5) * 14);

  document.querySelectorAll(".pupil").forEach(el => {
    el.style.setProperty("--px", x + "px");
    el.style.setProperty("--py", y + "px");
  });
}

setInterval(lookAround, 2600);

function addBubble(role, text, save = true) {
  const item = document.createElement("div");
  item.className =
    "bubble " + (role === "user" ? "human" : "robot");

  const who = document.createElement("span");
  who.className = "who";
  who.textContent = role === "user" ? "You" : "Pocket";

  item.append(who, document.createTextNode(text));

  $("chat").append(item);
  $("chat").scrollTop = $("chat").scrollHeight;

  if (save) {
    state.history.push({
      role,
      text: String(text).slice(0, 2200)
    });

    state.history = state.history.slice(-24);
    persist();
  }
}

function drawHistory() {
  $("chat").replaceChildren();

  if (!state.history.length) {
    addBubble(
      "model",
      "Hey, I'm Pocket. Talk to me. " +
      "I promise to be only moderately annoying.",
      false
    );
  } else {
    for (const item of state.history) {
      addBubble(item.role, item.text, false);
    }
  }
}

function renderNotes() {
  $("memories").replaceChildren();

  if (!state.notes.length) {
    const li = document.createElement("li");
    li.textContent = "No saved notes yet.";
    $("memories").append(li);
  }

  for (const [i, note] of state.notes.entries()) {
    const li = document.createElement("li");
    const text = document.createElement("span");
    const del = document.createElement("button");

    text.textContent = note;
    del.textContent = "Delete";
    del.type = "button";

    del.onclick = () => {
      state.notes.splice(i, 1);
      persist();
      renderNotes();
    };

    li.append(text, del);
    $("memories").append(li);
  }
}

/* VOICE */

function voices() {
  if (!("speechSynthesis" in window)) return [];
  return speechSynthesis.getVoices() || [];
}

function populateVoices() {
  if (!("speechSynthesis" in window)) return;

  const selected = state.voice;
  $("voice").replaceChildren();

  const option = document.createElement("option");
  option.value = "";
  option.textContent = "System default";
  $("voice").append(option);

  for (const voice of voices()) {
    const op = document.createElement("option");
    op.value = voice.voiceURI;
    op.textContent =
      `${voice.name} (${voice.lang})`;

    $("voice").append(op);
  }

  $("voice").value =
    [...$("voice").options].some(
      op => op.value === selected
    ) ? selected : "";
}

function say(text) {
  if (!state.speak ||
      !("speechSynthesis" in window)) {
    mood("idle", "Ready for your next question.");
    return;
  }

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  const selected = voices().find(
    v => v.voiceURI === state.voice
  );

  if (selected) utterance.voice = selected;

  utterance.lang = selected?.lang || "en-US";
  utterance.rate = Number(state.rate) || 1;
  utterance.pitch = 1.06;

  utterance.onstart = () => {
    speechActive = true;
    mood("speaking", "Listen to this masterpiece...");
  };

  utterance.onend = utterance.onerror = () => {
    speechActive = false;
    mood("idle", "Your turn, genius.");
  };

  speechSynthesis.speak(utterance);
}

function speakReply(reply) {
  addBubble("model", reply);
  say(reply);
}

/* LOCAL MEMORY AND BASIC COMMANDS */

const normal = text =>
  String(text).trim().replace(/\s+/g, " ");

function maybeLocal(message) {
  const m = normal(message);

  const remember = m.match(
    /^(?:please\s+)?remember\s+(?:that\s+)?(.+)/i
  );

  if (remember) {
    const note = remember[1].slice(0, 240);

    if (!state.notes.includes(note)) {
      state.notes.push(note);
      state.notes = state.notes.slice(-30);
      persist();
      renderNotes();
    }

    return `Saved locally: "${note}". ` +
      "Look at me, being responsible for once.";
  }

  if (/\b(what do you remember|show (?:my )?memory|your memory)\b/i.test(m)) {
    return state.notes.length
      ? "Here is what I remember: " +
        state.notes.join("; ")
      : "No saved notes yet.";
  }

  if (/^((hey|hi|hello)( pocket| robot)?[.!?]?|what('s| is) your name[?]?)$/i.test(m)) {
    return "Hey! Pocket here. Your old phone " +
      "finally got a personality upgrade.";
  }

  if (/^(tell me (the )?time|what time is it)[?]*/i.test(m)) {
    return "Your phone says it is " +
      new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      }) + ".";
  }

  return null;
}

/* CLOUDFLARE + GEMINI CONNECTION */

function connection() {
  const endpoint = state.endpoint.trim();

  if (!/^https:\/\/[a-z0-9.-]+(?::443)?(?:\/.*)?$/i.test(endpoint)) {
    return "";
  }

  return endpoint.replace(/\/+$/, "");
}

function showConnection() {
  const configured = !!connection();

  $("connection").textContent =
    configured ? "AI URL SAVED" : "DEMO MODE";

  $("connection").classList.toggle(
    "online",
    configured
  );
}

async function queryAI(message, image = null) {
  const endpoint = connection();

  if (!endpoint) {
    throw new Error(
      "No AI connection configured. " +
      "Open Settings and add your Cloudflare Worker URL."
    );
  }

  if (image) {
    throw new Error(
      "Image requests are not yet supported by this " +
      "Worker. We will enable Vision separately."
    );
  }

  // Cloudflare Worker expects:
  // POST to the base URL with message/messages.

  const history = state.history
    .filter(m =>
      m.role === "user" || m.role === "model"
    )
    .slice(-12)
    .map(m => ({
      role: m.role === "user" ? "user" : "model",
      content: m.text
    }));

  // Avoid sending duplicate current message.
  if (
    history.length &&
    history[history.length - 1].role === "user" &&
    history[history.length - 1].content === message
  ) {
    history.pop();
  }

  history.push({
    role: "user",
    content: message
  });

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    45000
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        messages: history
      }),
      signal: controller.signal
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        `AI server returned HTTP ${response.status}`
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error || `HTTP ${response.status}`
      );
    }

    if (
      typeof data.reply !== "string" ||
      !data.reply.trim()
    ) {
      throw new Error("AI response was empty.");
    }

    return data.reply.trim().slice(0, 3000);

  } finally {
    clearTimeout(timeout);
  }
}

async function sendMessage(message, image = null) {
  message = normal(message);

  if (!message || busy) return;

  busy = true;
  $("send").disabled = true;
  $("listen").disabled = true;

  if (!image) {
    addBubble("user", message);
  } else {
    addBubble(
      "user",
      message + " [camera image]"
    );
  }

  const local = !image
    ? maybeLocal(message)
    : null;

  if (local) {
    busy = false;
    $("send").disabled = false;
    $("listen").disabled = false;
    speakReply(local);
    return;
  }

  mood("thinking", "Thinking of a comeback...");
  setFeedback("Talking to Gemini...");

  try {
    const reply = await queryAI(message, image);

    speakReply(reply);
    setFeedback("AI reply received.");

  } catch (error) {
    const msg = error.name === "AbortError"
      ? "AI request timed out."
      : error.message;

    addBubble(
      "model",
      "I could not reach my AI brain: " + msg
    );

    mood("idle", "Connection needed.");
    setFeedback(msg);

  } finally {
    busy = false;
    $("send").disabled = false;
    $("listen").disabled = false;
  }
}

/* CHAT INPUT */

$("messageForm").onsubmit = event => {
  event.preventDefault();

  const text = $("message").value;
  $("message").value = "";

  sendMessage(text);
};

/* MICROPHONE */

$("listen").onclick = () => {
  const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SR) {
    setFeedback(
      "Speech recognition is not supported " +
      "in this browser. Type instead."
    );
    return;
  }

  if (recog) {
    try {
      recog.stop();
    } catch {}
    return;
  }

  if (
    speechActive &&
    "speechSynthesis" in window
  ) {
    speechSynthesis.cancel();
  }

  try {
    recog = new SR();
    recog.lang = "en-US";
    recog.interimResults = false;
    recog.continuous = false;
    recog.maxAlternatives = 1;

    recog.onresult = event => {
      const text =
        event.results?.[0]?.[0]?.transcript || "";

      if (text) {
        setFeedback("Heard: " + text);
        sendMessage(text);
      }
    };

    recog.onerror = event => {
      setFeedback(
        "Microphone error: " + event.error
      );
      mood("idle", "Try again?");
    };

    recog.onend = () => {
      recog = null;

      if (!busy && !speechActive) {
        mood("idle", "Your turn, genius.");
      }
    };

    recog.start();

    mood("listening", "Go on, I'm all ears.");
    setFeedback("Listening...");

  } catch (error) {
    recog = null;
    setFeedback(
      "Could not start speech: " + error.message
    );
  }
};

/* SETTINGS PANEL */

$("settingsButton").onclick = () => {
  const panel = $("settingsPanel");

  panel.hidden = !panel.hidden;

  if (!panel.hidden) {
    renderNotes();

    requestAnimationFrame(() => {
      panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }
};

$("closeSettings").onclick = () => {
  $("settingsPanel").hidden = true;
};

$("endpoint").value = state.endpoint;
$("cheek").value = state.cheek;
$("cheekValue").textContent = state.cheek + "%";

$("rate").value = state.rate;
$("rateValue").textContent =
  Number(state.rate).toFixed(2) + "×";

$("speakReplies").checked = state.speak;

$("cheek").oninput = event => {
  $("cheekValue").textContent =
    event.target.value + "%";
};

$("rate").oninput = event => {
  $("rateValue").textContent =
    Number(event.target.value).toFixed(2) + "×";
};

$("saveSettings").onclick = () => {
  const endpoint = $("endpoint").value
    .trim()
    .replace(/\/+$/, "");

  if (
    endpoint &&
    !/^https:\/\/[a-z0-9.-]+(?::443)?(?:\/.*)?$/i.test(endpoint)
  ) {
    setFeedback(
      "Worker URL must start with https://"
    );
    return;
  }

  state.endpoint = endpoint;
  state.cheek = Number($("cheek").value);
  state.rate = Number($("rate").value);
  state.voice = $("voice").value;
  state.speak = $("speakReplies").checked;

  persist();
  showConnection();

  setFeedback(
    "Settings saved. Test the AI connection."
  );
};

/* CONNECTION TEST */

$("testConnection").onclick = async () => {
  const endpoint = $("endpoint").value
    .trim()
    .replace(/\/+$/, "");

  if (!/^https:\/\//i.test(endpoint)) {
    setFeedback(
      "Enter your HTTPS Worker URL first."
    );
    return;
  }

  setFeedback("Testing Cloudflare Worker...");

  try {
    const response = await fetch(endpoint);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || `HTTP ${response.status}`
      );
    }

    setFeedback(
      data.message ||
      "Cloudflare Worker is responding."
    );

  } catch (error) {
    setFeedback(
      "Connection test failed: " + error.message
    );
  }
};

/* VOICE SETTINGS */

$("testVoice").onclick = () => {
  say(
    "Well hello there. I am Pocket, " +
    "your charmingly sarcastic robot."
  );
};

$("stopVoice").onclick = () => {
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }

  speechActive = false;
  mood("idle", "Quiet mode. Finally.");
};

/* MEMORY CONTROLS */

$("clearMemory").onclick = () => {
  if (!confirm(
    "Delete all saved conversation notes?"
  )) return;

  state.notes = [];
  persist();
  renderNotes();
};

$("clearChat").onclick = () => {
  if (!confirm(
    "Clear conversation history saved on this phone?"
  )) return;

  state.history = [];
  persist();
  drawHistory();
};

/* VISION — KEEP EXISTING MODULE */

$("cameraButton").onclick = () => {
  $("cameraPanel").hidden = false;

  $("cameraPanel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  setFeedback(
    "Camera is optional. Start it to use Vision."
  );
};

$("closeCamera").onclick = () => {
  if (vision) vision.stop();
  $("cameraPanel").hidden = true;
};

async function getVision() {
  if (!vision) {
    $("visionStatus").textContent =
      "Loading Vision AI module...";

    try {
      const mod = await import("./vision.js");

      vision = mod.createVision({
        onStatus: status => {
          $("visionStatus").textContent = status;
        }
      });

    } catch (error) {
      $("visionStatus").textContent =
        "Vision module unavailable: " +
        error.message;

      throw error;
    }
  }

  return vision;
}

$("start").onclick = async () => {
  try {
    await (await getVision()).start();
  } catch (error) {
    setFeedback(
      "Camera error: " + error.message
    );
  }
};

$("stop").onclick = () => {
  vision?.stop();
};

$("switch").onclick = () => {
  vision?.switchCamera();
};

$("describe").onclick = async () => {
  setFeedback(
    "AI image description is not yet enabled. " +
    "We will configure Vision after text chat works."
  );
};

/* CLEANUP */

window.addEventListener("pagehide", () => {
  if (vision) vision.stop();

  if (recog) {
    try {
      recog.stop();
    } catch {}
  }

  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }
});

/* INITIALIZE */

drawHistory();
renderNotes();
showConnection();

if ("speechSynthesis" in window) {
  populateVoices();
  speechSynthesis.onvoiceschanged =
    populateVoices;
}

mood("idle", "I'm awake. Make it interesting.");
