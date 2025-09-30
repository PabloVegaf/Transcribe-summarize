# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Overview
- Purpose: Local audio transcription web app that uploads an audio file from the browser, triggers Whisper transcription via a Node/TypeScript backend, and displays the result.
- Stack: Frontend (vanilla HTML/CSS/JS) served by the backend; Backend (Node.js + Express, TypeScript).
- Main port: 3000 (hardcoded in backend/src/index.ts).

Common commands
- Install backend deps (from repo root): npm install --prefix backend
- Start backend in dev (serves the UI and API): npm run --prefix backend dev
- Build: not configured
- Run compiled build: not applicable
- Lint: not configured
- Tests: not configured (package.json test script is a placeholder)

Prerequisites and environment
- Whisper runtime: The backend calls a Whisper CLI inside a Python virtualenv via a hardcoded path:
  - Path: /home/pablo/IA/whisper_env/bin/activate
  - Location in code: backend/src/index.ts (exec command)
  - Ensure this venv exists and contains a working whisper executable accessible after activation. If your environment differs, update the path in backend/src/index.ts accordingly.
- File uploads:
  - Upload middleware: multer with disk storage
  - Upload directory: uploads/
  - Cleanup: uploaded file is deleted after the Whisper process completes
  - No explicit file type filter or max size limits are set in code
- CORS:
  - origin: '*'
  - methods: ['POST', 'GET']
  - allowedHeaders: ['Content-Type']

High-level architecture and flow
- Frontend (served by the backend)
  - index.html at repo root is the UI. It loads scripts/action.js and styles/styles.css.
  - scripts/action.js handles file selection, POSTs FormData to the backend at /api/transcribe, and polls /api/status/:jobId for completion. On success, it renders the transcription text.
  - styles/styles.css contains minimal font rules; Tailwind is included via CDN in index.html.
- Backend (Node + Express, TypeScript)
  - Entry point: backend/src/index.ts
  - Static assets: served from the repository root and explicitly from /scripts and /styles
    - app.use(express.static(path.join(__dirname, '../../')))
    - app.use('/scripts', express.static(path.join(__dirname, '../../scripts')))
    - app.use('/styles', express.static(path.join(__dirname, '../../styles')))
  - API endpoints:
    - POST /api/transcribe
      - Accepts multipart/form-data with field name 'audio' (multer upload.single('audio'))
      - Immediately returns { jobId } and starts a background Whisper process
    - GET /api/status/:jobId
      - Returns the current job object: { status: 'processing' | 'completed' | 'failed', data?, error? }
    - Job processing:
      - Spawns Whisper via exec, using the hardcoded venv activation; on completion, stores transcription in memory under jobs[jobId]
      - Removes the uploaded file after processing
  - In-memory job store: a simple object keyed by jobId maintains status/data/error; no persistence.
  - Listen: app.listen(3000, '0.0.0.0')

Existing docs and rules
- README.md: # Transcribe-summarize
- No CLAUDE, Cursor, or Copilot rule files detected.
