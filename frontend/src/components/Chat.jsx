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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="chat-container">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-content">
          <div className="ai-avatar-container">
            <div className="ai-avatar">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
          </div>
          <div className="chat-title-section">
            <h3 className="chat-title">Video AI Intelligence</h3>
            <div className="chat-status">
              <span className="status-dot-pulse"></span>
              <p className="status-text">Neural Engine Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="chat-messages custom-scrollbar">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="session-badge">Analysis Complete — Session Started</div>
            <div className="message-bubble ai-message">
              <div className="message-avatar">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <div className="message-content">
                <div className="message-text">
                  Hello! I've analyzed this video for you. I can summarize content, explain specific concepts mentioned, or jump to timestamps for you. What would you like to explore?
                </div>
                <span className="message-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="message-exchange">
            {/* User Message */}
            <div className="message-bubble user-message">
              <div className="user-avatar">
                <span className="avatar-initials">ME</span>
              </div>
              <div className="message-content">
                <div className="message-text">{msg.question}</div>
                <span className="message-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* AI Message */}
            <div className="message-bubble ai-message">
              <div className="message-avatar">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <div className="message-content">
                <div className="message-text">{msg.answer}</div>

                {msg.relevant_segments && msg.relevant_segments.length > 0 && (
                  <div className="timestamps-section">
                    <div className="timestamps-header">
                      <span className="material-symbols-outlined">format_quote</span>
                      <span className="timestamps-label">Video References</span>
                    </div>
                    <div className="timestamps-list">
                      {msg.relevant_segments.map((seg, idx) => (
                        <div key={idx} className="timestamp-item">
                          <button
                            type="button"
                            className="timestamp-button"
                            onClick={() => handleSeek(seg.start_time)}
                          >
                            <span className="material-symbols-outlined">play_circle</span>
                            {formatTime(seg.start_time)}
                          </button>
                          <span className="timestamp-text">{seg.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <span className="message-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
            <span className="typing-text">AI is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="chat-input-container">
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <textarea
              className="chat-textarea custom-scrollbar"
              placeholder="Ask anything about the video..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              disabled={loading}
              rows={2}
            />
            <button
              type="submit"
              className="send-button"
              disabled={loading || !question.trim()}
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </form>

        <div className="chat-footer">
          <div className="chat-actions">
            <button className="action-button" type="button">
              <span className="material-symbols-outlined">mic</span>
            </button>
            <button className="action-button" type="button">
              <span className="material-symbols-outlined">attach_file</span>
            </button>
            <button className="action-button" type="button">
              <span className="material-symbols-outlined">image</span>
            </button>
          </div>
          {currentTime > 0 && (
            <div className="context-info">
              <span className="material-symbols-outlined">info</span>
              <p className="context-text">Context: {formatTime(currentTime)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Chat

