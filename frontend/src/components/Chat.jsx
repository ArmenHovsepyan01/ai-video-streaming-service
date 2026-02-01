import { useState, useEffect, useRef } from 'react'
import { chatWithVideo, getChatHistory } from '../services/api'
import './Chat.css'

function Chat({ videoId, onSeekTo, currentTime }) {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadChatHistory()
  }, [videoId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory(videoId)
      setMessages(
        history.map((h) => ({
          question: h.question,
          answer: h.answer,
          relevant_segments: [],
        })),
      )
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!question.trim() || loading) return

    setLoading(true)
    const userQuestion = question
    setQuestion('')

    try {
      const response = await chatWithVideo(videoId, userQuestion, currentTime)
      setMessages([
        ...messages,
        {
          question: userQuestion,
          answer: response.answer,
          relevant_segments: response.relevant_segments,
        },
      ])
    } catch (error) {
      console.error('Chat error:', error)
      alert('Failed to get answer: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSeek = (time) => {
    onSeekTo?.(time)
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>💬 Ask questions about the video content</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="chat-message">
            <div className="question">
              <strong>Q:</strong> {msg.question}
            </div>
            <div className="answer">
              <strong>A:</strong> {msg.answer}
            </div>
            {msg.relevant_segments && msg.relevant_segments.length > 0 && (
              <div className="timestamps">
                <strong>References:</strong>
                <ul>
                  {msg.relevant_segments.map((seg, idx) => (
                    <li key={idx}>
                      <button type="button" onClick={() => handleSeek(seg.start_time)}>
                        {seg.start_time.toFixed(1)}s - {seg.end_time.toFixed(1)}s
                      </button>{' '}
                      — {seg.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ask about this video..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
      {currentTime > 0 && (
        <div className="chat-context-info">
          📍 Context: {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
        </div>
      )}
    </div>
  )
}

export default Chat

