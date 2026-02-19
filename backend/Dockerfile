FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libpq-dev \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install build tools first (cached layer)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir setuptools==75.8.2 wheel

# Install PyTorch CPU-only (much smaller ~200MB vs ~2GB GPU version)
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install whisper separately (needs --no-build-isolation for setuptools compat)
RUN pip install --no-cache-dir --no-build-isolation openai-whisper==20231117

# Install remaining requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download models in a separate cached layer
# These only re-run if the layers above change
RUN python -c "import whisper; whisper.load_model('base')"
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .
RUN mkdir -p /app/videos

EXPOSE 8000

CMD ["sh", "-c", "python -m app.migrations.run_migrations && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
