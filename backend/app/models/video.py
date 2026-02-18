from sqlalchemy import Column, Integer, String, Float, BigInteger, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    duration = Column(Float)
    status = Column(String(50), default="uploading")
    file_size = Column(BigInteger)
    mime_type = Column(String(100))
    task_id = Column(String(255))  # Celery task ID for tracking
    processing_step = Column(String(100))  # Current processing step
    processing_progress = Column(Integer, default=0)  # Progress percentage
    thumbnail_path = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    segments = relationship("VideoSegment", back_populates="video", cascade="all, delete-orphan")
    translations = relationship("Translation", back_populates="video", cascade="all, delete-orphan")
    chats = relationship("ChatHistory", back_populates="video", cascade="all, delete-orphan")

class VideoSegment(Base):
    __tablename__ = "video_segments"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"))
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    text = Column(Text, nullable=False)
    translated_text = Column(Text)
    language_code = Column(String(10), default="en")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    video = relationship("Video", back_populates="segments")

class Translation(Base):
    __tablename__ = "translations"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"))
    language_code = Column(String(10), nullable=False)
    vtt_path = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    video = relationship("Video", back_populates="translations")

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"))
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    video = relationship("Video", back_populates="chats")
