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
        db.commit()

        video_dir = f"/app/videos/{video_id}"
        os.makedirs(video_dir, exist_ok=True)

        self.update_state(state='PROGRESS', meta={'step': 'transcoding', 'progress': 10})

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

        self.update_state(state='PROGRESS', meta={'step': 'extracting_audio', 'progress': 70})
        audio_path = f"{video_dir}/audio.wav"
        video_processor.extract_audio(video_path, audio_path)

        self.update_state(state='PROGRESS', meta={'step': 'transcribing', 'progress': 75})
        result = video_processor.transcribe_audio(audio_path)

        duration = video_processor.get_video_duration(video_path)
        video.duration = duration
        db.commit()

        self.update_state(state='PROGRESS', meta={'step': 'generating_subtitles', 'progress': 85})
        vtt_content = video_processor.generate_vtt(result['segments'])
        vtt_path_en = f"{video_dir}/subtitles_en.vtt"
        with open(vtt_path_en, 'w', encoding='utf-8') as f:
            f.write(vtt_content)

        translation_en = Translation(video_id=video_id, language_code='en', vtt_path=vtt_path_en)
        db.add(translation_en)
        db.commit()

        self.update_state(state='PROGRESS', meta={'step': 'translating', 'progress': 90})
        translated_segments = translator.translate_segments(result['segments'], 'es')

        vtt_translated = video_processor.generate_vtt(translated_segments, use_translated=True)
        vtt_path_es = f"{video_dir}/subtitles_es.vtt"
        with open(vtt_path_es, 'w', encoding='utf-8') as f:
            f.write(vtt_translated)

        translation_es = Translation(video_id=video_id, language_code='es', vtt_path=vtt_path_es)
        db.add(translation_es)
        db.commit()

        self.update_state(state='PROGRESS', meta={'step': 'generating_embeddings', 'progress': 95})
        segments_with_translations = []
        for orig, trans in zip(result['segments'], translated_segments):
            segments_with_translations.append({
                'start': orig['start'],
                'end': orig['end'],
                'text': orig['text'],
                'translated_text': trans.get('translated_text')
            })

        embedding_service.store_segments_with_embeddings(video_id, segments_with_translations)

        video.status = "completed"
        db.commit()

        if os.path.exists(audio_path):
            os.remove(audio_path)

        return {'status': 'completed', 'video_id': video_id, 'duration': duration, 'segments_count': len(result['segments'])}

    except Exception as e:  # noqa: BLE001
        video.status = "failed"
        db.commit()
        raise e
    finally:
        db.close()

