# Pocket AI 2.0 — Cheeky Robot on a Galaxy S10

This prototype reuses **your original Vision AI application code** in `vision.js` and adds a full-screen robot face, voice input/output, configurable cheeky personality, optional camera-to-AI still-image questions, local conversation notes, and a secure cloud AI gateway. It does **not** execute or include `pocket-esp-ai.bin`.

## Files

- `index.html`, `style.css`, `app.js`: Android Chrome robot interface (GitHub Pages)
- `vision.js`: adapted from your uploaded `app.js`, including MediaPipe face and hand tracking and consent-based private face library
- `manifest.webmanifest`, `icon.svg`: home screen icon / web app manifest
- `worker.js`: optional Cloudflare Worker AI gateway; **do not upload this as a public API endpoint without configuring its secrets**
- `wrangler.toml`: optional Cloudflare Worker configuration

## First test — NO API required

1. Create a public GitHub repository, e.g. `pocket-ai`, and upload `index.html`, `style.css`, `app.js`, `vision.js`, `manifest.webmanifest`, and `icon.svg` into its root. These browser files must all be in the same folder. **Do not upload API keys or the `.bin` firmware.**
2. In GitHub repository **Settings → Pages**, select **Deploy from a branch**, branch **main**, folder **/ (root)**, and save.
3. Wait for GitHub Pages to publish and open `https://YOURNAME.github.io/pocket-ai/` in Chrome on the Galaxy S10.
4. Try a typed `Hello`, `Remember that I like tea`, `What do you remember?` or tap **Talk** for speech recognition. These limited demonstration commands do not need the AI cloud connection.
5. Tap **Vision → Start camera** and grant camera permission. The first load downloads MediaPipe's browser library and two machine-learning models. Face and hand detection run in Chrome. A photo is sent to AI **only** if you explicitly press **Ask AI about this frame** and confirm, and after you configure a service.
6. Use Chrome menu **Add to Home screen** / **Install app** if offered. If that isn't available, bookmark the website.

### Important limitation

The demo is **not a full AI chatbot**: arbitrary conversation and open-ended photo analysis need a connected AI service. The Google Chrome Web Speech API can be device- and browser-dependent and may use Google's online recognition service. There is no background, continuous wake-word or listening functionality. Browser voice quality is determined by installed system voices, not copied from Xiaozhi firmware.

## Enable genuine online AI conversations — optional

The example below uses Google Gemini behind a Cloudflare Worker. It is **not guaranteed to be free**; before using it, check Google AI Studio model access and the pricing/usage rules shown in your account. Google has offered limited free-tier access to selected models. Free accounts can hit quotas or lose access to some models. Cloudflare Workers also has plan limits.

1. Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) and confirm a model available to your account in [Gemini model documentation](https://ai.google.dev/gemini-api/docs/models).
2. Create a Cloudflare account, open **Workers & Pages**, create a Worker, and replace its default source with the content of `worker.js`. Or deploy from this folder using Wrangler (`npx wrangler deploy`).
3. In Cloudflare Worker **Settings → Variables and Secrets**, add these as **Secret** values:
   - `GEMINI_API_KEY`: your Gemini API key (never put it in GitHub/browser code)
   - `ROBOT_PIN`: a long random passphrase to protect your Worker; **do not use a short PIN**
   - `ALLOWED_ORIGIN`: your GitHub Pages origin, exactly `https://YOURNAME.github.io` (no trailing slash or `/pocket-ai`)
4. Optional: add a normal `GEMINI_MODEL` variable. The bundled Worker defaults to `gemini-3.8-flash`, which may not be available to your account; choose a model that Google currently lists as accessible to your account, ideally one in the free tier. The API request uses Google Gemini's still-supported legacy `generateContent` REST method.
5. Deploy the Worker and copy its full `https://...workers.dev` URL.
6. On the Galaxy S10, open the Pocket AI website → **Settings** → paste the Worker URL and the `ROBOT_PIN` passphrase; click **Save connection**, then **Test connection**.
7. Ask Pocket an open-ended question. If it works, the reply is produced by Gemini, and the browser speaks it using text-to-speech when enabled.

**Security caveats:** Origin checks and a long passphrase help reduce casual misuse but do not provide enterprise-grade authentication, quotas or per-user accounting. A public Worker URL can still receive unwanted requests. Review AI billing quotas/alerts, rotate leaked credentials, and consider Cloudflare rate limits/Turnstile before broad deployment. The passphrase is stored only in session storage for that browser tab. The website does not contain the Gemini API key. Cloudflare and Google receive messages you send to the online AI, and a camera image only after your explicit confirmation. On a free Gemini tier, Google may use submitted content to improve products as described in its pricing terms; avoid sending private or confidential data.

## Using the original Vision AI features

The adapted `vision.js` retains the original MediaPipe `FaceLandmarker` and `HandLandmarker` logic, and the original IndexedDB name `vision-ai-private-v1`. If you used the previous app on the **same web origin**, its encrypted library can remain accessible with the original passphrase. However, if deployed on a different origin or cleared browser data, profiles will not automatically migrate. This file does **not** have a validated face-identification model: it shows a nearest geometric template, which is an **unverified comparison**, not someone's identity. Always seek consent.

## Troubleshooting

- `Camera error` → Use the HTTPS GitHub Pages URL (not a `file://` opened from Downloads); grant camera access in Chrome.
- `Microphone error` → Check Chrome microphone permission, internet connection and Chrome/Samsung language support; use typed messages as fallback.
- `AI request failed` → Make sure the Worker URL is HTTPS, `ALLOWED_ORIGIN` exactly matches your webpage origin, PIN is correct, key is valid, model is available, and provider quota remains.
- `Failed to load models` → The phone must have internet for MediaPipe JavaScript, WebAssembly and model files. First model load can be slow on older hardware.
- `No speech` → Check phone media volume, voice availability and the Speak replies setting.
- `Memory not saved` → Browser private mode or cleared site data can remove notes.

## Official references

- [Chrome Web Speech limitations (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Google Gemini generateContent REST](https://ai.google.dev/api/generate-content)
- [Google Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [GitHub Pages](https://pages.github.com/)
