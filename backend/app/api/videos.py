from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from app.core.database import get_db
from app.models.video import Video, ChatHistory
from app.tasks.video_tasks import process_video_task
from app.services.embeddings import embedding_service
from app.services.llm import llm_service
from pydantic import BaseModel

router = APIRouter()

class ChatRequest(BaseModel):
    question: str
    timestamp: Optional[float] = None

class ChatResponse(BaseModel):
    answer: str
    relevant_segments: List[dict]

@router.post("/upload")
async def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.content_type.startswith('video/'):
        raise HTTPException(400, "File must be a video")

    video = Video(filename=f"{file.filename}", original_filename=file.filename, mime_type=file.content_type, status="uploading")
    db.add(video)
    db.commit()
    db.refresh(video)

    video_dir = f"/app/videos/{video.id}"
    os.makedirs(video_dir, exist_ok=True)
    video_path = f"{video_dir}/original.mp4"

    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    video.file_size = os.path.getsize(video_path)
    video.status = "queued"
    db.commit()

    task = process_video_task.delay(video.id, video_path)

    return {"video_id": video.id, "task_id": task.id, "status": "queued"}

@router.get("/videos/{video_id}")
async def get_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")

    return {"id": video.id, "filename": video.filename, "duration": video.duration, "status": video.status, "created_at": video.created_at}

@router.get("/videos")
async def list_videos(db: Session = Depends(get_db)):
    videos = db.query(Video).order_by(Video.created_at.desc()).all()
    return videos

@router.post("/videos/{video_id}/chat", response_model=ChatResponse)
async def chat_with_video(video_id: int, request: ChatRequest, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")

    if video.status != "completed":
        raise HTTPException(400, "Video is still processing")

    relevant_segments = embedding_service.search_similar_segments(
        video_id,
        request.question,
        limit=5,
        timestamp=request.timestamp
    )

    if not relevant_segments:
        raise HTTPException(404, "No relevant content found")

    answer = llm_service.generate_answer(request.question, relevant_segments)

    chat = ChatHistory(video_id=video_id, question=request.question, answer=answer)
    db.add(chat)
    db.commit()

    return {"answer": answer, "relevant_segments": relevant_segments}

@router.get("/videos/{video_id}/chat-history")
async def get_chat_history(video_id: int, db: Session = Depends(get_db)):
    chats = db.query(ChatHistory).filter(ChatHistory.video_id == video_id).order_by(ChatHistory.created_at.desc()).all()
    return chats

@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    from app.tasks.celery_app import celery_app
    task = celery_app.AsyncResult(task_id)

    return {"task_id": task_id, "status": task.state, "result": task.result if task.ready() else None, "info": task.info}

