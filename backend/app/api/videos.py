from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
import asyncio
import json
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

    # Store task_id for tracking
    video.task_id = task.id
    db.commit()

    return {"video_id": video.id, "task_id": task.id, "status": "queued"}

@router.get("/{video_id}")
async def get_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")

    thumbnail_url = None
    if video.thumbnail_path:
        thumbnail_url = f"/thumbnails/{video.id}/thumbnail.jpg"

    return {
        "id": video.id,
        "filename": video.filename,
        "duration": video.duration,
        "status": video.status,
        "created_at": video.created_at,
        "thumbnail_url": thumbnail_url
    }

@router.get("/")
async def list_videos(db: Session = Depends(get_db)):
    videos = db.query(Video).order_by(Video.created_at.desc()).all()
    results = []
    for video in videos:
        thumbnail_url = None
        if video.thumbnail_path:
            thumbnail_url = f"/thumbnails/{video.id}/thumbnail.jpg"
        results.append({
            "id": video.id,
            "filename": video.filename,
            "original_filename": video.original_filename,
            "duration": video.duration,
            "status": video.status,
            "file_size": video.file_size,
            "mime_type": video.mime_type,
            "task_id": video.task_id,
            "processing_step": video.processing_step,
            "processing_progress": video.processing_progress,
            "created_at": video.created_at,
            "updated_at": video.updated_at,
            "thumbnail_url": thumbnail_url
        })
    return results

@router.post("/{video_id}/chat", response_model=ChatResponse)
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

@router.get("/{video_id}/chat-history")
async def get_chat_history(video_id: int, db: Session = Depends(get_db)):
    chats = db.query(ChatHistory).filter(ChatHistory.video_id == video_id).order_by(ChatHistory.created_at.desc()).all()
    return chats

@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    from app.tasks.celery_app import celery_app
    task = celery_app.AsyncResult(task_id)

    return {"task_id": task_id, "status": task.state, "result": task.result if task.ready() else None, "info": task.info}

@router.get("/{video_id}/processing-status")
async def video_processing_status_stream(video_id: int, db: Session = Depends(get_db)):
    """SSE endpoint for real-time video processing status updates"""
    async def event_generator():
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            yield f"data: {json.dumps({'error': 'Video not found'})}\n\n"
            return

        # If video is already completed or failed, send final status and close
        if video.status in ["completed", "failed"]:
            data = {
                'status': video.status,
                'video_id': video_id,
                'step': video.processing_step or 'done',
                'progress': video.processing_progress or 100
            }
            yield f"data: {json.dumps(data)}\n\n"
            return

        last_state = None
        retries = 0
        max_retries = 600  # 10 minutes timeout

        while retries < max_retries:
            # Refresh video status from DB
            db.refresh(video)

            current_status = {
                'video_id': video_id,
                'status': video.status,
                'step': video.processing_step or 'unknown',
                'progress': video.processing_progress or 0
            }

            # Check if video processing is complete
            if video.status == "completed":
                current_status['step'] = 'done'
                current_status['progress'] = 100
                yield f"data: {json.dumps(current_status)}\n\n"
                break
            elif video.status == "failed":
                current_status['step'] = 'failed'
                current_status['error'] = 'Processing failed'
                yield f"data: {json.dumps(current_status)}\n\n"
                break

            # Only send if state changed
            if current_status != last_state:
                yield f"data: {json.dumps(current_status)}\n\n"
                last_state = current_status

            await asyncio.sleep(1)
            retries += 1

        # Timeout
        if retries >= max_retries:
            yield f"data: {json.dumps({'error': 'Processing timeout', 'video_id': video_id})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
