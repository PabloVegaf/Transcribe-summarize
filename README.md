<div align="center">
  <img src="./Images/Logo.png" alt="Audio Summarizer Logo" width="200" height="200">
</div>

# 🎙️ Transcribe & Summarize — Personal Practice Project

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Status](https://img.shields.io/badge/status-learning%20project-purple.svg)

_A project I built to practice full-stack development while exploring the OpenAI API. The app lets you upload an audio file, transcribe it remotely and generate short or long-form summaries using GPT models. Users can now select their preferred models for transcription and summarization._

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuring the OpenAI API Key](#configuring-the-openai-api-key)
- [Using the App](#using-the-app)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Development Notes](#development-notes)
- [Potential next steps](#potential-next-steps)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Author](#author)

## Overview

This repository hosts a small web application I built as a full-stack practice project: it uploads audio, transcribes it via OpenAI Whisper, and produces short or long summaries with GPT models.

Everything runs locally except for the OpenAI API calls, which require your own API key.

## Features

- **Remote transcription** using OpenAI Whisper (user-selectable: `gpt-4o-transcribe` (Better results) or `gpt-4o-mini-transcribe` (Faster and cheaper))
- **Short and long summaries** powered by GPT (user-selectable: `gpt-5.1-2025-11-13` (Better results) or `gpt-5-nano-2025-08-07` (Faster and cheaper))
- **Model selection** via settings page for customization of transcription and summarization models
- **Clean, responsive UI** built with pure HTML, vanilla JS, and Tailwind via CDN
- **Asynchronous processing** with job IDs and client-side polling
- **Local API key management** through a dedicated settings page (stored only in `localStorage`)
- **Automatic cleanup** of uploaded audio files once processing finishes

## Architecture

| Layer            | Responsibility                                              | Key Files                                    |
|------------------|--------------------------------------------------------------|----------------------------------------------|
| Frontend (UI)    | File upload, progress feedback, displaying results           | `index.html`, `scripts/action.js`, `styles/` |
| Config UI        | Capture and persist the user's OpenAI API key and model preferences | `settings.html`, `scripts/settings.js`       |
| Backend (API)    | Receive uploads, call OpenAI APIs, track job status          | `backend/src/index.ts`                       |
| Temp Storage     | Store uploaded audio and in-memory job metadata              | System's temp directory (e.g., `/tmp/uploads`), in-memory `jobs` store   |

The backend listens on **`http://localhost:3000`**, serves the static frontend, and exposes two JSON endpoints for job creation and status polling.

## Tech Stack

### Frontend
- HTML5
- Tailwind CSS (via CDN)
- Vanilla JavaScript (ES6+)
- Google Fonts (Inter & Noto Sans)

### Backend
- Node.js + Express 5
- TypeScript with `ts-node-dev`
- Multer for multipart uploads
- Official `openai` Node SDK

## Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9
- An **OpenAI API key** with access to Whisper and Chat Completions

### Installation

```bash
git clone https://github.com/PabloVegaf/Transcribe-summarize.git
cd Transcribe-summarize

# Install backend dependencies
npm install --prefix backend

# Start the development server
npm run dev --prefix backend
```

The backend will launch on `http://localhost:3000` and serve the frontend automatically.

## Configuring the OpenAI API Key

1. Open `http://localhost:3000/settings.html` in your browser.
2. Paste your OpenAI API key into the form.
3. Select your preferred transcription model.
4. Select your preferred summarization model.
5. Click **Save Settings**.
6. The key and model preferences are saved to `localStorage` and injected into each request as a Bearer token.

➡️ _The key never touches the repository or disk—only your browser and the outgoing HTTPS requests._

## Using the App

1. Navigate to `http://localhost:3000`.
2. Drop an audio file or choose one with **Select File** (mp3, wav, m4a…)
3. Choose an action:
   - **Simple transcription** — returns raw text
   - **Short Summary** — one-paragraph simple overview
   - **Long Summary** — extended explanation
   - **You can customize the system prompt to adjust tone, language and level of detail for summaries.**
     - Prompts for `short` and `long` can be modified in `backend/src/index.ts` (constant `prompts`).
4. The UI polls the status endpoint every 2 seconds and replaces the message with the final result or an error.

## API Reference

All endpoints live under `http://localhost:3000` and expect an **Authorization** header containing your OpenAI key.

### `POST /api/transcribe`

Creates a new job for transcription or summarization.

| Element          | Details                                                                    |
|------------------|----------------------------------------------------------------------------|
| Headers          | `Authorization: Bearer YOUR_OPENAI_API_KEY`                                |
| Query parameters | `action=transcribe | summarize_short | summarize_long` (defaults to `transcribe`)<br>`transcriptorModel=gpt-4o-transcribe | gpt-4o-mini-transcribe` (defaults to `gpt-4o-mini-transcribe`)<br>`summaryModel=gpt-5.1-2025-11-13 | gpt-5-nano-2025-08-07` (defaults to `gpt-5-nano-2025-08-07`) |
| Body             | `multipart/form-data` with an `audio` file field                           |
| Success          | `202 Accepted` with `{ "jobId": "<uuid>" }`                              |

Example cURL:

```bash
curl -X POST "http://localhost:3000/api/transcribe?action=summarize_short&transcriptorModel=gpt-4o-transcribe&summaryModel=gpt-5.1-2025-11-13" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F "audio=@sample.mp3"
```

### `GET /api/status/:jobId`

Returns the status of a previously created job.

```json
{
  "status": "completed",
  "data": {
    "action": "summarize_short",
    "transcription": "...",
    "summary": "..."
  }
}
```

| Status     | Meaning                                           |
|------------|---------------------------------------------------|
| processing | Whisper/GPT call still running                    |
| completed  | Result ready; payload depends on `action`         |
| failed     | Error message available in the `error` property   |

## Project Structure

```
Transcribe-summarize/
├── backend/
│   ├── src/index.ts          # Express server + OpenAI integration
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── index.html            # Main UI
│   ├── settings.html         # API key and model management page
│   ├── Images/               # Logo and favicon
│   ├── scripts/
│   │   ├── action.js         # Frontend logic for uploads & polling
│   │   ├── settings.js       # Settings page logic for API key and models
│   │   └── validators.js     # API key validation
│   └── styles/
│       └── styles.css        # Minimal custom styles
├── .gitignore
├── package-lock.json
└── README.md
```

Temporary assets (`backend/uploads/`), build artifacts, and private notes are excluded through `.gitignore`.

## Development Notes

- **Scripts**: `npm run dev --prefix backend` runs `ts-node-dev` for hot-reloading TypeScript.
- **Type checking**: Run `npx tsc --noEmit` inside `backend` to verify types.
- **Logging**: The server prints high-level job progress to stdout.
- **Cleanup**: Uploaded files are deleted automatically after processing (success or failure).
- **In-memory jobs**: Job data resets whenever you restart the server.
- **Deployment**: The application is designed to run in both traditional and serverless environments. It uses the system's temporary directory (`/tmp`) for file uploads to ensure compatibility with read-only filesystems.

## Potential next steps

- Add database-backed job history and retry support.
- Offer downloadable transcripts in TXT/JSON formats.
- Build a dark mode and multi-language UI.

## Troubleshooting

| Symptom                                                     | Likely cause & fix                                                                 |
|-------------------------------------------------------------|------------------------------------------------------------------------------------|
| `Authorization header with Bearer token is required`        | Save your key in `settings.html`; ensure requests include the header.             |
| `401 Unauthorized`                                          | Key invalid or lacking credits; double-check usage limits in the OpenAI dashboard.|
| `429 Rate limit exceeded`                                   | Too many requests; wait and retry or upgrade your OpenAI quota.                   |
| No result after upload                                      | Check server logs, confirm the audio format is supported, keep files < ~25 MB.    |
| CORS error in browser console                               | Access the UI via `http://localhost:3000`; headers already allow `Authorization`. |
| `Error: ENOENT: no such file or directory, open 'uploads/...'` | The `uploads` directory for temporary files was not found. The backend now creates this directory automatically on startup, so this error should be resolved. If it persists, check the file system permissions. |
| Dashboard shows unexpected model name                       | Ensure models are sent correctly; invalid models may use defaults (`gpt-4o-mini-transcribe` for transcription, `gpt-5-nano-2025-08-07` for summarization). Check settings and API calls. |

## Contributing

This is primarily a learning project, but feel free to fork it or open issues if you have suggestions. Standard workflow:

```bash
git checkout -b feature/awesome-improvement
# make your changes
git commit -m "feat: add awesome improvement"
git push origin feature/awesome-improvement
```

## Author

**Pablo Vega** — Full-stack enthusiast experimenting with AI-assisted tooling. This repository documents my progress and learnings; feedback is welcome!

---</content>
</xai:function_call name="write">
<parameter name="filePath">AGENTS.md