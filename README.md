# cvgenx

Web UI and CLI to generate tailored resumes and cover letters with Gemini. The web experience is now the default.

[![npm version](https://img.shields.io/npm/v/cvgenx.svg)](https://www.npmjs.com/package/cvgenx)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Requirements
- Node.js **v22+**
- Gemini API key

## Install & run (web server)
```bash
npm install
# start web UI on http://localhost:4173
npm start
# optional: rebuild a fresh SQLite db (drops previous data)
npm start -- --reset-db
```

### What the web app does
- Generate Resume / Cover Letter / Both from a Job Description + your uploaded/pasted resume text.
- Upload resumes (PDF/MD/TXT) and reuse previous uploads; latest is used by default.
- “Resume knowledge” view in Settings merges recent resumes so you can see what the system knows.
- Recent generations listed in History with quick reuse of past JDs.
- Download outputs as Markdown, PDF, or DOCX (text-based) and copy to clipboard.

### Routes
- `/` – Generate (upload or reuse resume, paste JD, download/copy outputs)
- `/settings` – Save Gemini key/model, view merged resume knowledge and recent uploads
- `/history` – View recent generations

### Files & storage
- SQLite lives at `~/.cvgenx/cvgenx.db`
- Uploaded resume text and generations are stored locally; no cloud storage
- Reset DB with `--reset-db` flag or `CVGENX_RESET_DB=1` env

## CLI (legacy)
The CLI still exists for quick terminal usage:
```bash
npx cvgenx --cli <job.txt> --type <resume|coverLetter|both>
```
`npm start` without `--cli` launches the web server.

## Configuration
Gemini key is saved locally in SQLite via the Settings page. You can also set `GEMINI_API_KEY` in `~/.cvgenx.env` or `.env`, but the web UI is preferred. Model defaults to `gemini-2.5-flash` and can be changed in Settings.

## Developer notes
- Server: Express + EJS views (`views/`) + static assets in `public/`
- AI: Gemini via `@google/genai`; model is configurable
- DB: `better-sqlite3`, migrations handled automatically; reset with `--reset-db`

## License
MIT
