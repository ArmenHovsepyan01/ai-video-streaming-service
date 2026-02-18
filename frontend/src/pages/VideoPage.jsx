import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import VideoPlayer from '../components/VideoPlayer'
import Chat from '../components/Chat'
import { getVideo } from '../services/api'
import './VideoPage.css'

function VideoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const playerRef = useRef(null)

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const data = await getVideo(id)
        setVideo(data)
      } catch (error) {
        console.error('Failed to load video', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVideo()
  }, [id])

  const handleTimeUpdate = (time) => {
    setCurrentTime(time)
  }

  const handleSeek = (time) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(time)
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getAvailableLanguages = () => {
    // Get available caption languages from video data
    if (!video?.translations) return []
    return video.translations.map(t => ({
      code: t.language_code,
      name: getLanguageName(t.language_code)
    }))
  }

  const getLanguageName = (code) => {
    const names = {
      'en': 'English',
      'es': 'Spanish',
      'ru': 'Russian',
      'hy': 'Armenian',
      'ar': 'Arabic'
    }
    return names[code] || code.toUpperCase()
  }

  if (loading) {
    return (
      <div className="video-page-loading">
        <div className="spinner"></div>
        <p>Loading video...</p>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="video-page-error">
        <span className="material-symbols-outlined">error</span>
        <p>Video not found</p>
      </div>
    )
  }

  const languages = getAvailableLanguages()

  return (
    <main className="video-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        <span className="material-symbols-outlined">arrow_back</span>
        Back
      </button>
      <div className="video-page-container">

        <div className="video-content">
          <div className="video-section">
            <VideoPlayer
              videoId={id}
              onTimeUpdate={handleTimeUpdate}
              ref={playerRef}
            />

            {/* Video Info Section */}
            <div className="video-info-card">
              <div className="video-header">
                <div>
                  <h2 className="video-title">
                    {video.original_filename || video.filename}
                  </h2>
                  <div className="video-meta">
                    <span className="meta-item">
                      <span className="material-symbols-outlined">schedule</span>
                      {formatDuration(video.duration)}
                    </span>
                    {languages.length > 0 && (
                      <span className="meta-item">
                        <span className="material-symbols-outlined">closed_caption</span>
                        {languages.length} language{languages.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {languages.length > 0 && (
                <div className="language-section">
                  <span className="section-label">Available Captions</span>
                  <div className="language-tags">
                    {languages.map(lang => (
                      <span key={lang.code} className="language-tag">
                        {lang.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <div className="chat-section">
          <Chat
            videoId={Number(id)}
            onSeekTo={handleSeek}
            currentTime={currentTime}
          />
        </div>
      </div>
    </main>
  )
}

export default VideoPage

