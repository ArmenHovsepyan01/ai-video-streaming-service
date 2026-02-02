# Video Streaming Platform

A modern video-on-demand (VOD) platform with AI-powered features including video chat, multi-language translation, and semantic search capabilities.

## 🎯 Overview

This platform combines video streaming, transcription, translation, and AI chat into a unified system. Upload videos, automatically generate transcripts, translate content into multiple languages, and interact with video content through an AI-powered chat interface.

### Key Features

- 🎥 **HLS Video Streaming** - Adaptive bitrate streaming using NGINX VOD module
- 🤖 **AI-Powered Chat** - Ask questions about video content using LLM (Ollama)
- 🌐 **Multi-Language Translation** - Support for Armenian, Russian, and more via LibreTranslate
- 🔍 **Semantic Search** - Find relevant video segments using embeddings
- 📝 **Automatic Transcription** - Generate transcripts using Whisper
- ⚡ **Real-Time Processing Status** - Live updates via Server-Sent Events (SSE)
- 🎨 **Modern UI Design** - Glassmorphism dark theme with responsive layout
- 📊 **Pipeline Visualization** - See each processing step in real-time

## 🆕 What's New in v2.0

### Real-Time Processing with SSE
Watch your videos process in real-time! The new Server-Sent Events implementation provides live updates as your video moves through each stage of the pipeline. See progress bars, step completion, and status changes without refreshing the page.

### Complete UI Redesign
Experience a modern, dark-themed interface with:
- Glassmorphism design elements
- Responsive grid layout
- Material Design icons
- Smooth animations and transitions
- Processing pipeline visualization

[View full changelog →](CHANGELOG.md) | [SSE Implementation Guide →](SSE_IMPLEMENTATION.md)

## 📋 Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [API Documentation](#api-documentation)

## 🏗 Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Browser   │─────▶│   Frontend   │─────▶│   Backend   │
│  (React)    │◀─────│   (Vite)     │◀─────│  (FastAPI)  │
└─────────────┘      └──────────────┘      └─────────────┘
                                                   │
                     ┌─────────────────────────────┼─────────────────┐
                     │                             │                 │
              ┌──────▼──────┐            ┌────────▼────────┐  ┌─────▼─────┐
              │    NGINX    │            │  Celery Workers │  │  Postgres │
              │  VOD Module │            │  (Processing)   │  │    DB     │
              └─────────────┘            └─────────────────┘  └───────────┘
                                                   │
                                  ┌────────────────┼────────────────┐
                                  │                │                │
                           ┌──────▼──────┐  ┌─────▼─────┐   ┌─────▼──────┐
                           │   Ollama    │  │LibreTransl│   │   Redis    │
                           │    (LLM)    │  │   (i18n)  │   │  (Cache)   │
                           └─────────────┘  └───────────┘   └────────────┘
```

### Component Responsibilities

- **Frontend (React + Vite)**: User interface for video playback, upload, and chat
- **Backend (FastAPI)**: REST API, video metadata, chat endpoints
- **NGINX VOD**: HLS packaging and streaming optimization
- **Celery Workers**: Async video processing, transcription, translation, embeddings
- **Postgres**: Video metadata, transcripts, translations, chat history
- **Redis**: Task queue and caching layer
- **Ollama**: Local LLM for chat responses
- **LibreTranslate**: Self-hosted translation service

## 🛠 Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Celery** - Distributed task queue
- **SQLAlchemy** - ORM for database operations
- **PostgreSQL** - Primary database
- **Redis** - Message broker and cache

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Video.js / HLS.js** - Video playback

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **NGINX** - Web server and VOD module
- **MinIO** - S3-compatible object storage (optional)

### AI/ML Services
- **Ollama** - Local LLM inference
- **OpenAI Whisper** - Speech-to-text transcription
- **LibreTranslate** - Machine translation
- **Sentence Transformers** - Text embeddings

## ✅ Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Node.js** (v18+) and **npm** or **yarn**
- **Python** 3.11+ (for local backend development)
- **Git** (for cloning dependencies like nginx-vod-module)
- **Ollama** (optional, for local LLM - https://ollama.ai)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd video-streaming
```

### 2. Configure Environment Variables

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` and replace example values with real credentials (see [Configuration](#configuration) section below).

### 3. Start All Services

```bash
docker-compose up --build
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend API (port 8000)
- Frontend (port 3000)
- NGINX VOD (port 8080)
- LibreTranslate (port 5000)
- Celery workers

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Video Streaming**: http://localhost:8080/hls/{video_id}/master.m3u8

### 5. Upload Your First Video

1. Navigate to http://localhost:3000
2. Drag and drop a video file or click to browse (MP4, MOV, AVI supported)
3. Watch the upload progress bar
4. **See real-time processing updates** as your video moves through the pipeline:
   - ✓ Transcoding (multiple bitrates)
   - ✓ Audio extraction
   - ✓ Whisper transcription
   - ✓ Subtitle generation
   - ✓ Multi-language translation
   - ✓ AI vectorization
5. Once complete, click to view and interact with your video!

### 6. Apply Database Migration (First Time Setup)

If this is your first time running the app or after updating, apply the database migration:

```bash
docker-compose exec postgres psql -U postgres -d videodb < scripts/add_processing_fields.sql
```

Then restart the services:

```bash
docker-compose restart backend celery_worker
```

## ⚙️ Configuration

### Environment Variables

The `.env.example` file contains all configuration options with placeholder values:

```bash
# Database
POSTGRES_USER=example_user
POSTGRES_PASSWORD=example_password
POSTGRES_DB=example_db
DATABASE_URL=postgresql://example_user:example_password@db-host:5432/example_db

# Redis
REDIS_URL=redis://redis-host:6379/0

# MinIO
MINIO_ROOT_USER=example_minio_user
MINIO_ROOT_PASSWORD=example_minio_password
MINIO_ENDPOINT=minio.example.com:9000
MINIO_BUCKET=example_bucket

# Services
LIBRETRANSLATE_URL=http://libretranslate.example.com:5000
OLLAMA_URL=http://ollama.example.com:11434

# Database Configuration
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=video_streaming
DATABASE_URL=postgresql://your_db_user:your_secure_password@postgres:5432/video_streaming

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# MinIO/S3 Configuration (Optional)
MINIO_ROOT_USER=your_minio_user
MINIO_ROOT_PASSWORD=your_minio_password
MINIO_ENDPOINT=minio:9000
MINIO_BUCKET=videos

# AI Services
LIBRETRANSLATE_URL=http://libretranslate:5000
OLLAMA_URL=http://host.docker.internal:11434

# Application Settings
UPLOAD_DIR=/app/videos
MAX_UPLOAD_SIZE=500000000
WHISPER_MODEL=base
```

### Key Configuration Notes

**Database**: PostgreSQL stores all metadata, transcripts, and translations.

**Ollama URL**: 
- If running Ollama **locally on your host**, use `http://host.docker.internal:11434` (macOS/Windows)
- If running Ollama **in Docker**, use `http://ollama:11434`
- If backend runs **outside Docker**, use `http://localhost:11434`

**LibreTranslate**: Supports Armenian (`hy`), Russian (`ru`), and many other languages. The service is configured in `docker-compose.yml`.

**Upload Directory**: Must be accessible by both backend and NGINX containers (mounted as volume).

## 💻 Development

### Frontend Development

Run the frontend in development mode with hot reload:

```bash
cd frontend
npm install
npm run dev
```

The dev server will start at http://localhost:3000 with hot module replacement.

### Backend Development

Run the backend locally without Docker:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Running Celery Workers Locally

```bash
cd backend
celery -A app.tasks.celery_app worker --loglevel=info
```

### Database Migrations

```bash
cd backend
alembic upgrade head  # Apply migrations
alembic revision --autogenerate -m "Description"  # Create new migration
```

## 🐛 Troubleshooting

### NGINX VOD Module Issues

**Problem**: Container exits with "unknown directive vod_metadata_cache" or "ngx_http_vod_module.so: No such file"

**Solution**: The NGINX VOD module needs to be compiled into the image. 

1. Clone the module source:
```bash
git clone https://github.com/kaltura/nginx-vod-module.git nginx/nginx-vod-module
```

2. Update `docker-compose.yml` to build locally:
```yaml
nginx:
  build:
    context: ./nginx
    dockerfile: Dockerfile.vod
  # Remove the 'image:' line if it references a remote image
```

3. Ensure `nginx/Dockerfile.vod` compiles the module (check the implementation guide for build instructions).

4. Rebuild:
```bash
docker-compose build nginx
docker-compose up -d nginx
```

### PostgreSQL Connection Issues

**Problem**: "Connection refused" or "password authentication failed"

**Solutions**:
- Verify credentials in `.env` match `docker-compose.yml`
- Ensure PostgreSQL is running: `docker-compose ps`
- Check logs: `docker-compose logs postgres`
- Reset the database: `docker-compose down -v && docker-compose up -d postgres`

### Docker Image Pull Stuck

**Problem**: Docker hangs while pulling images

**Solutions**:
```bash
# Remove potentially corrupted images
docker-compose down
docker system prune -a

# Pull images manually
docker-compose pull

# Restart Docker daemon
```

### Frontend Errors: "currentTime is not defined"

**Problem**: React throws `ReferenceError: currentTime is not defined` in `VideoPage.jsx` or `Chat.jsx`

**Solution**: Ensure `currentTime` state is properly managed and passed as props:

```jsx
// VideoPage.jsx
import { useState } from 'react'
import VideoPlayer from '../components/VideoPlayer'
import Chat from '../components/Chat'

function VideoPage() {
  const [currentTime, setCurrentTime] = useState(0)

  const handleTimeUpdate = (time) => {
    setCurrentTime(time)
  }

  return (
    <div>
      <VideoPlayer onTimeUpdate={handleTimeUpdate} />
      <Chat currentTime={currentTime} />
    </div>
  )
}
```

### Video Playback Issues

**Problem**: Videos won't play or HLS streams fail to load

**Solutions**:
- Verify NGINX is running: `docker-compose logs nginx`
- Check video path: http://localhost:8080/hls/{video_id}/master.m3u8
- Ensure video processing completed: Check Celery worker logs
- Verify CORS headers in NGINX configuration

### Ollama Connection Issues

**Problem**: Chat doesn't work, LLM requests fail

**Solutions**:
- If using local Ollama, ensure it's running: `ollama list`
- Check `OLLAMA_URL` in `.env` uses `host.docker.internal:11434`
- Pull required model: `ollama pull llama2`
- Test connection: `curl http://localhost:11434/api/tags`

## 📚 API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation (Swagger UI).

### Key Endpoints

**Videos**
- `POST /api/videos/upload` - Upload a new video
- `GET /api/videos` - List all videos
- `GET /api/videos/{id}` - Get video details
- `GET /api/videos/{id}/transcript` - Get video transcript
- `POST /api/videos/{id}/translate` - Translate video to another language

**Chat**
- `POST /api/chat` - Send a message about the video (includes `timestamp` for context)

**Health**
- `GET /health` - Service health check

## 🧪 Testing

### Run Backend Tests

```bash
cd backend
pytest
```

### Run Frontend Tests

```bash
cd frontend
npm test
```

## 🔧 Useful Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f celery

# Restart a service
docker-compose restart nginx

# Rebuild and restart a service
docker-compose up -d --build backend

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Execute command in container
docker-compose exec backend bash
docker-compose exec postgres psql -U your_db_user -d video_streaming

# Check service status
docker-compose ps
```

## 📁 Project Structure

```
video-streaming/
├── backend/
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   ├── core/             # Configuration
│   │   ├── models/           # Database models
│   │   ├── services/         # Business logic
│   │   └── tasks/            # Celery tasks
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   └── services/         # API services
│   ├── package.json
│   └── vite.config.js
├── nginx/
│   ├── nginx.conf
│   ├── vod.conf
│   └── Dockerfile.vod
├── scripts/
│   └── init.sql              # Database initialization
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Kaltura nginx-vod-module](https://github.com/kaltura/nginx-vod-module) for HLS streaming
- [LibreTranslate](https://github.com/LibreTranslate/LibreTranslate) for translation services
- [Ollama](https://ollama.ai) for local LLM inference
- [OpenAI Whisper](https://github.com/openai/whisper) for transcription

## 📞 Support

For issues and questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review logs: `docker-compose logs -f`
- Open an issue on GitHub

---

**Note**: This is a development setup. For production deployment, ensure proper security measures, environment variable management, SSL/TLS configuration, and resource scaling.

