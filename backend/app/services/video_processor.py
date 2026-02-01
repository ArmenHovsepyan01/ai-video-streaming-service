import ffmpeg
import whisper
from typing import List, Dict
from app.core.config import settings

class VideoProcessor:
    def __init__(self):
        self.whisper_model = None

    def load_whisper_model(self):
        if self.whisper_model is None:
            self.whisper_model = whisper.load_model(settings.WHISPER_MODEL)
        return self.whisper_model

    def extract_audio(self, video_path: str, audio_path: str):
        try:
            (
                ffmpeg
                .input(video_path)
                .output(audio_path, ac=1, ar='16000')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            return audio_path
        except ffmpeg.Error as e:
            raise Exception(f"FFmpeg error: {e.stderr.decode()}")

    def transcode_video(self, input_path: str, output_path: str, height: int,
                        video_bitrate: str, audio_bitrate: str):
        try:
            (
                ffmpeg
                .input(input_path)
                .output(
                    output_path,
                    vf=f"scale=-2:{height}",
                    video_bitrate=video_bitrate,
                    audio_bitrate=audio_bitrate,
                    vcodec='libx264',
                    acodec='aac',
                    preset='fast',
                    movflags='faststart',
                    format='mp4'
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            return output_path
        except ffmpeg.Error as e:
            raise Exception(f"Transcode error: {e.stderr.decode()}")

    def transcribe_audio(self, audio_path: str) -> Dict:
        model = self.load_whisper_model()
        result = model.transcribe(audio_path, task="transcribe")
        return result

    def generate_vtt(self, segments: List[Dict], use_translated: bool = False) -> str:
        vtt = "WEBVTT\n\n"

        for i, seg in enumerate(segments, 1):
            start = self._format_timestamp(seg['start'])
            end = self._format_timestamp(seg['end'])
            text = seg.get('translated_text' if use_translated else 'text', '').strip()
            vtt += f"{i}\n{start} --> {end}\n{text}\n\n"

        return vtt

    def _format_timestamp(self, seconds: float) -> str:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"

    def get_video_duration(self, video_path: str) -> float:
        try:
            probe = ffmpeg.probe(video_path)
            duration = float(probe['streams'][0]['duration'])
            return duration
        except:  # noqa: E722
            return 0.0

video_processor = VideoProcessor()

