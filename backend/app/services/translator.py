import requests
from typing import List, Dict
from app.core.config import settings

class TranslationService:
    def __init__(self):
        self.base_url = settings.LIBRETRANSLATE_URL

    def translate_text(self, text: str, source_lang: str = "en", target_lang: str = "es") -> str:
        try:
            response = requests.post(
                f"{self.base_url}/translate",
                json={"q": text, "source": source_lang, "target": target_lang},
                timeout=30
            )
            response.raise_for_status()
            return response.json()['translatedText']
        except Exception as e:  # noqa: BLE001
            print(f"Translation error: {e}")
            return text

    def translate_segments(self, segments: List[Dict], target_lang: str = "es") -> List[Dict]:
        translated = []
        for seg in segments:
            trans_text = self.translate_text(seg['text'], target_lang=target_lang)
            translated.append({**seg, 'translated_text': trans_text})
        return translated

    def get_supported_languages(self) -> List[Dict]:
        try:
            response = requests.get(f"{self.base_url}/languages")
            response.raise_for_status()
            return response.json()
        except Exception:  # noqa: BLE001
            return []

translator = TranslationService()

