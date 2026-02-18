from app.tasks.celery_app import celery_app
from app.services.video_processor import video_processor
from app.services.translator import translator
from app.services.embeddings import embedding_service
from app.core.database import SessionLocal
from app.models.video import Video, Translation
import os

@celery_app.task(bind=True)
def process_video_task(self, video_id: int, video_path: str):
    db = SessionLocal()

    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        video.status = "processing"
        video.processing_step = "starting"
        video.processing_progress = 5
        db.commit()

        video_dir = f"/app/videos/{video_id}"
        os.makedirs(video_dir, exist_ok=True)

        self.update_state(state='PROGRESS', meta={'step': 'transcoding', 'progress': 10})
        video.processing_step = "transcoding"
        video.processing_progress = 10
        db.commit()

        bitrate_configs = [
            {'height': 1080, 'video_bitrate': '5000k', 'audio_bitrate': '192k', 'name': '1080p'},
            {'height': 720, 'video_bitrate': '2800k', 'audio_bitrate': '128k', 'name': '720p'},
            {'height': 480, 'video_bitrate': '1400k', 'audio_bitrate': '128k', 'name': '480p'},
            {'height': 360, 'video_bitrate': '800k', 'audio_bitrate': '96k', 'name': '360p'},
        ]

        for i, config in enumerate(bitrate_configs):
            output_path = f"{video_dir}/video_{config['name']}.mp4"
            video_processor.transcode_video(
                video_path,
                output_path,
                config['height'],
                config['video_bitrate'],
                config['audio_bitrate']
            )
            progress = 10 + (i + 1) * 15
            self.update_state(state='PROGRESS', meta={'step': 'transcoding', 'progress': progress})
            video.processing_progress = progress
            db.commit()

        thumbnail_path = f"{video_dir}/thumbnail.jpg"
        video_processor.generate_thumbnail(video_path, thumbnail_path)
        video.thumbnail_path = thumbnail_path
        db.commit()

        self.update_state(state='PROGRESS', meta={'step': 'extracting_audio', 'progress': 70})
        video.processing_step = "extracting_audio"
        video.processing_progress = 70
        db.commit()
        audio_path = f"{video_dir}/audio.wav"
        video_processor.extract_audio(video_path, audio_path)

        self.update_state(state='PROGRESS', meta={'step': 'transcribing', 'progress': 75})
        video.processing_step = "transcribing"
        video.processing_progress = 75
        db.commit()
        result = video_processor.transcribe_audio(audio_path)

        duration = video_processor.get_video_duration(video_path)
        video.duration = duration
        db.commit()

        self.update_state(state='PROGRESS', meta={'step': 'generating_subtitles', 'progress': 85})
        video.processing_step = "generating_subtitles"
        video.processing_progress = 85
        db.commit()
        vtt_content = video_processor.generate_vtt(result['segments'])
        vtt_path_en = f"{video_dir}/subtitles_en.vtt"
        with open(vtt_path_en, 'w', encoding='utf-8') as f:
            f.write(vtt_content)

        translation_en = Translation(video_id=video_id, language_code='en', vtt_path=vtt_path_en)
        db.add(translation_en)
        db.commit()

        self.update_state(state='PROGRESS', meta={'step': 'translating', 'progress': 90})
        video.processing_step = "translating"
        video.processing_progress = 90
        db.commit()

        # Translate to Spanish
        translated_segments_es = translator.translate_segments(result['segments'], 'es')
        vtt_translated_es = video_processor.generate_vtt(translated_segments_es, use_translated=True)
        vtt_path_es = f"{video_dir}/subtitles_es.vtt"
        with open(vtt_path_es, 'w', encoding='utf-8') as f:
            f.write(vtt_translated_es)

        translation_es = Translation(video_id=video_id, language_code='es', vtt_path=vtt_path_es)
        db.add(translation_es)

        # Translate to Russian
        translated_segments_ru = translator.translate_segments(result['segments'], 'ru')
        vtt_translated_ru = video_processor.generate_vtt(translated_segments_ru, use_translated=True)
        vtt_path_ru = f"{video_dir}/subtitles_ru.vtt"
        with open(vtt_path_ru, 'w', encoding='utf-8') as f:
            f.write(vtt_translated_ru)

        translation_ru = Translation(video_id=video_id, language_code='ru', vtt_path=vtt_path_ru)
        db.add(translation_ru)

        db.commit()

        self.update_state(state='PROGRESS', meta={'step': 'generating_embeddings', 'progress': 95})
        video.processing_step = "generating_embeddings"
        video.processing_progress = 95
        db.commit()
        segments_with_translations = []
        for orig, trans_es in zip(result['segments'], translated_segments_es):
            segments_with_translations.append({
                'start': orig['start'],
                'end': orig['end'],
                'text': orig['text'],
                'translated_text': trans_es.get('translated_text')
            })

        embedding_service.store_segments_with_embeddings(video_id, segments_with_translations)

        video.status = "completed"
        video.processing_step = "done"
        video.processing_progress = 100
        db.commit()

        if os.path.exists(audio_path):
            os.remove(audio_path)

        return {'status': 'completed', 'video_id': video_id, 'duration': duration, 'segments_count': len(result['segments'])}

    except Exception as e:  # noqa: BLE001
        video.status = "failed"
        video.processing_step = "failed"
        db.commit()
        raise e
    finally:
        db.close()
