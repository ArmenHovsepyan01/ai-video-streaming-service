-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    duration FLOAT,
    status VARCHAR(50) DEFAULT 'uploading',
    file_size BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Video segments table with embeddings
CREATE TABLE IF NOT EXISTS video_segments (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    text TEXT NOT NULL,
    translated_text TEXT,
    language_code VARCHAR(10) DEFAULT 'en',
    embedding vector(384),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Translations table
CREATE TABLE IF NOT EXISTS translations (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    vtt_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(video_id, language_code)
);

-- Chat history table
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    relevant_segments JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_video_segments_video_id ON video_segments(video_id);
CREATE INDEX idx_video_segments_time ON video_segments(start_time, end_time);
CREATE INDEX idx_video_status ON videos(status);
CREATE INDEX idx_chat_video_id ON chat_history(video_id);

-- Create vector similarity index (IVFFlat)
CREATE INDEX ON video_segments USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for videos table
CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

