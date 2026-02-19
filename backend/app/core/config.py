from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    MINIO_ENDPOINT: str
    MINIO_ROOT_USER: str
    MINIO_ROOT_PASSWORD: str
    MINIO_BUCKET: str = "videos"
    LIBRETRANSLATE_URL: str
    OLLAMA_URL: str
    UPLOAD_DIR: str = "/app/videos"
    MAX_UPLOAD_SIZE: int = 500000000
    WHISPER_MODEL: str = "base"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Video Processing Platform"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

