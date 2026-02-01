from sentence_transformers import SentenceTransformer
from typing import List, Optional
from app.core.config import settings
from app.core.database import get_vector_db
from pgvector.psycopg2 import register_vector

class EmbeddingService:
    def __init__(self):
        self.model = None

    def load_model(self):
        if self.model is None:
            self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
        return self.model

    def generate_embedding(self, text: str) -> List[float]:
        model = self.load_model()
        embedding = model.encode(text)
        return embedding.tolist()

    def store_segments_with_embeddings(self, video_id: int, segments: List[dict]):
        conn = get_vector_db()
        cur = conn.cursor()

        try:
            for seg in segments:
                text = seg['text']
                embedding = self.generate_embedding(text)

                cur.execute(
                    """
                    INSERT INTO video_segments 
                    (video_id, start_time, end_time, text, translated_text, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        video_id,
                        seg['start'],
                        seg['end'],
                        seg['text'],
                        seg.get('translated_text'),
                        embedding
                    )
                )

            conn.commit()
        except Exception as e:  # noqa: BLE001
            conn.rollback()
            raise e
        finally:
            cur.close()
            conn.close()

    def search_similar_segments(self, video_id: int, query: str, limit: int = 5, timestamp: Optional[float] = None):
        query_embedding = self.generate_embedding(query)

        conn = get_vector_db()
        cur = conn.cursor()

        try:
            if timestamp is not None:
                # Context-aware search: combine semantic similarity with temporal proximity
                # Give more weight to segments near the current timestamp
                cur.execute(
                    """
                    SELECT 
                        id,
                        text, 
                        translated_text, 
                        start_time, 
                        end_time,
                        1 - (embedding <=> %s::vector) as similarity,
                        ABS(start_time - %s) as time_distance
                    FROM video_segments
                    WHERE video_id = %s
                    ORDER BY 
                        (1 - (embedding <=> %s::vector)) * 0.7 + 
                        (1 / (1 + ABS(start_time - %s) / 30.0)) * 0.3 DESC
                    LIMIT %s
                    """,
                    (query_embedding, timestamp, video_id, query_embedding, timestamp, limit)
                )
            else:
                # Standard semantic search without timestamp context
                cur.execute(
                    """
                    SELECT 
                        id,
                        text, 
                        translated_text, 
                        start_time, 
                        end_time,
                        1 - (embedding <=> %s::vector) as similarity
                    FROM video_segments
                    WHERE video_id = %s
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (query_embedding, video_id, query_embedding, limit)
                )

            results = cur.fetchall()

            return [
                {
                    'id': r[0],
                    'text': r[1],
                    'translated_text': r[2],
                    'start_time': r[3],
                    'end_time': r[4],
                    'similarity': r[5]
                }
                for r in results
            ]
        finally:
            cur.close()
            conn.close()

embedding_service = EmbeddingService()

