FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir numpy==1.26.4 && \
    pip install --no-cache-dir -r requirements.txt

RUN python -c "import whisper; whisper.load_model('base')"
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY . .
RUN mkdir -p /app/videos

EXPOSE 8000

CMD ["sh", "-c", "python -m app.migrations.run_migrations && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
