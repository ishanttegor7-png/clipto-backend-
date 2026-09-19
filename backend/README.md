# Clipto — Asynchronous Video Clipping Backend API

Clipto Backend is a production-ready, standalone Node.js & TypeScript REST API service for creating short MP4 video clips from YouTube URLs. It is designed to be deployed as a Docker Web Service on **Render** (or any container platform) with native FFmpeg processing.

---

## Features & Architecture

- **REST API Endpoints**:
  - `GET /health` — Health check endpoint for uptime monitors and Render health checks.
  - `POST /api/process/auto` — Slices up to 5 sequential 60-second clips starting at a given timestamp.
  - `POST /api/process/custom` — Slices a custom duration clip (strictly <= 60 seconds).
  - `GET /api/process/status/:jobId` — Polling endpoint returning job status (`queued`, `processing`, `completed`, `failed`) and download URLs.
  - `GET /api/download/:filename` — Secure MP4 file streaming with directory-traversal protection.
- **FFmpeg Integration**:
  - Native video clipping using FFmpeg.
  - Preserves original aspect ratios and resolutions across widescreen, square, and vertical videos.
  - Slices with fast stream copying (`-c copy`) when keyframes align to avoid unnecessary re-encoding, with automatic fallback to high-speed H.264/AAC MP4.
- **Temporary Ephemeral Storage**:
  - Source videos and generated clips are stored temporarily only in `/tmp/clipto_backend`.
  - Automatic scheduler sweeps and purges any media older than `TEMP_FILE_TTL_MINUTES` (default: 15 minutes).
  - Source files are deleted immediately after clipping to conserve disk.
  - No permanent database or user media history is created.
- **Modular Job Queue**:
  - In-memory asynchronous job manager with status tracking and concurrency safeguards.
  - Decoupled interface ready for drop-in replacement with Redis/BullMQ.
- **Security & Input Validation**:
  - Validates YouTube URLs and rejects malformed inputs.
  - Enforces 30-minute maximum source video length (`MAX_VIDEO_LENGTH_SECONDS=1800`).
  - Enforces 60-second maximum clip duration (`MAX_CLIP_LENGTH_SECONDS=60`).
  - Configurable CORS via `FRONTEND_URL`.

---

## Project Structure

```
backend/
├── src/
│   ├── server.ts              # Express initialization, CORS, middleware, shutdown
│   ├── routes/
│   │   ├── health.route.ts    # GET /health
│   │   ├── process.route.ts   # POST /auto, POST /custom, GET /status/:jobId
│   │   └── download.route.ts  # GET /download/:filename
│   ├── services/
│   │   ├── ffmpeg.service.ts  # FFmpeg & ffprobe probe, cut, format preservation
│   │   ├── storage.service.ts # Ephemeral disk management & automated TTL cleanup
│   │   └── youtube.service.ts # Authorized media resolver & compliance gate
│   ├── jobs/
│   │   ├── jobManager.ts      # In-memory queue, background worker, state store
│   │   └── types.ts           # Job, Clip, and status type definitions
│   ├── utils/
│   │   ├── validators.ts      # URL regex, duration checks, parameter schemas
│   │   └── logger.ts          # Structured logging with timestamps and tags
│   └── config/
│       └── env.ts             # Typed environment variable loader with defaults
├── package.json               # Node.js dependencies and build scripts
├── tsconfig.json              # Strict TypeScript compiler options
├── Dockerfile                 # Multi-stage production container with FFmpeg
├── .dockerignore              # Excludes node_modules and temp files from image
├── .gitignore                 # Standard git exclusions
├── .env.example               # Environment variables specification
└── README.md                  # Documentation and deployment guide
```

---

## 1. How to Run Locally

### Prerequisites
- Node.js 20+ LTS
- FFmpeg installed locally (`brew install ffmpeg` on macOS, `sudo apt install ffmpeg` on Ubuntu/Debian)

### Steps
1. Navigate into the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` file:
   ```bash
   cp .env.example .env
   ```
4. Start development server with live reload:
   ```bash
   npm run dev
   ```
5. Verify health:
   ```bash
   curl http://localhost:3000/health
   # {"status":"ok","service":"clipto-backend"}
   ```
6. To build and run in production mode:
   ```bash
   npm run build
   npm start
   ```

---

## 2. How to Build & Run the Docker Image

The Dockerfile uses a multi-stage build on `node:20-bookworm-slim` with system FFmpeg installed.

1. Build the Docker image:
   ```bash
   docker build -t clipto-backend .
   ```
2. Run the container:
   ```bash
   docker run -d \
     --name clipto-backend \
     -p 3000:3000 \
     -e PORT=3000 \
     -e FRONTEND_URL="http://localhost:5173" \
     -e TEMP_FILE_TTL_MINUTES=15 \
     clipto-backend
   ```
3. Test the container:
   ```bash
   curl http://localhost:3000/health
   ```

---

## 3. Which Files Need to Be Pushed to GitHub

When creating your GitHub repository for the Clipto backend, push all files in the `backend/` folder:

```
src/
package.json
package-lock.json
tsconfig.json
Dockerfile
.dockerignore
.gitignore
.env.example
README.md
```

**DO NOT** commit:
- `node_modules/`
- `dist/`
- `temp/`
- `.env` (contains private runtime configuration)

---

## 4. Which Environment Variables Render Will Need

When creating a new **Web Service** on [Render](https://render.com) using Docker:

| Variable Name | Required | Default Value | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | Auto | `10000` (Render default) | Render sets this automatically; the app binds to `process.env.PORT`. |
| `FRONTEND_URL` | Yes | `*` or your frontend URL | e.g. `https://clipto.vercel.app` or `https://my-clipto-app.com`. Used for CORS header. |
| `TEMP_FILE_TTL_MINUTES` | No | `15` | Minutes before generated clips and temporary media are auto-deleted from disk. |
| `MAX_VIDEO_LENGTH_SECONDS` | No | `1800` | Maximum source video length allowed for clipping (1800 = 30 minutes). |
| `MAX_CLIP_LENGTH_SECONDS` | No | `60` | Maximum duration for any individual clip (60 seconds). |
| `NODE_ENV` | No | `production` | Production environment flag. |

### Render Configuration Settings:
- **Environment**: `Docker`
- **Region**: Oregon (US West) or Frankfurt (EU Central)
- **Health Check Path**: `/health`
- **Auto-Deploy**: Yes (on git push to `main`)

---

## API Reference

### 1. Health Check
- **`GET /health`**
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "service": "clipto-backend"
  }
  ```

### 2. Auto-Clip
- **`POST /api/process/auto`**
- **Body**:
  ```json
  {
    "sourceUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "batchStartSeconds": 0,
    "batchSize": 5
  }
  ```
- **Response `202 Accepted`**:
  ```json
  {
    "jobId": "8f8b3c10-928e-4a87-b248-cb5421a24d5b",
    "status": "queued",
    "message": "Auto-clip job successfully queued for processing"
  }
  ```

### 3. Custom Clip
- **`POST /api/process/custom`**
- **Body**:
  ```json
  {
    "sourceUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "startSeconds": 45,
    "endSeconds": 90
  }
  ```
- **Rules**: `endSeconds - startSeconds` must be `<= 60 seconds`.
- **Response `202 Accepted`**:
  ```json
  {
    "jobId": "c3182601-5231-4091-a1cf-b8d46e0ecf79",
    "status": "queued",
    "message": "Custom-clip job successfully queued for processing"
  }
  ```

### 4. Job Status & Polling
- **`GET /api/process/status/:jobId`**
- **Response `200 OK`** (when completed):
  ```json
  {
    "jobId": "8f8b3c10-928e-4a87-b248-cb5421a24d5b",
    "status": "completed",
    "clips": [
      {
        "clipNumber": 1,
        "startTime": 0,
        "endTime": 60,
        "downloadUrl": "/api/download/clip_8f8b3c10-928e-4a87-b248-cb5421a24d5b_1.mp4"
      },
      {
        "clipNumber": 2,
        "startTime": 60,
        "endTime": 120,
        "downloadUrl": "/api/download/clip_8f8b3c10-928e-4a87-b248-cb5421a24d5b_2.mp4"
      }
    ],
    "error": null
  }
  ```

### 5. Download Clip
- **`GET /api/download/:filename`**
- **Response**: Binary `video/mp4` stream with `Content-Disposition: attachment; filename="clip_...mp4"`.
