import re
import requests
import httpx
from typing import List, Dict
from app.core.config import settings

class LLMService:
    def __init__(self):
        self.base_url = settings.OLLAMA_URL
        self.model = "qwen:0.5b"

    def _strip_thinking_tags(self, text: str) -> str:
        """Remove <think>...</think> tags from model output."""
        return re.sub(r'<think>.*?</think>\s*', '', text, flags=re.DOTALL).strip()

    def generate_answer(self, question: str, context_segments: List[Dict]) -> str:
        context = "\n\n".join([
            f"[{seg['start_time']:.1f}s - {seg['end_time']:.1f}s]: {seg['text']}"
            for seg in context_segments
        ])

        prompt = f"""Based on the following video transcript segments, answer the question accurately and concisely.

Context from video:
{context}

Question: {question}

Answer (be specific and reference timestamps when relevant):"""

        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": False},
                timeout=60
            )
            response.raise_for_status()
            raw_response = response.json()['response']
            return self._strip_thinking_tags(raw_response)
        except Exception as e:  # noqa: BLE001
            return f"Sorry, I couldn't generate an answer. Error: {str(e)}"

    async def generate_answer_async(self, question: str, context_segments: List[Dict]) -> str:
        """Non-blocking async version of generate_answer using httpx."""
        context = "\n\n".join([
            f"[{seg['start_time']:.1f}s - {seg['end_time']:.1f}s]: {seg['text']}"
            for seg in context_segments
        ])

        prompt = f"""Based on the following video transcript segments, answer the question accurately and concisely.

Context from video:
{context}

Question: {question}

Answer (be specific and reference timestamps when relevant):"""

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={"model": self.model, "prompt": prompt, "stream": False},
                )
                response.raise_for_status()
                raw_response = response.json()['response']
                return self._strip_thinking_tags(raw_response)
        except Exception as e:  # noqa: BLE001
            return f"Sorry, I couldn't generate an answer. Error: {str(e)}"

    def check_model_availability(self) -> bool:
        try:
            response = requests.get(f"{self.base_url}/api/tags")
            models = response.json().get('models', [])
            return any(m['name'].startswith(self.model) for m in models)
        except Exception:  # noqa: BLE001
            return False

llm_service = LLMService()

