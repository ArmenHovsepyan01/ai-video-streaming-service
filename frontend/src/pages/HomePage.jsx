import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import VideoUpload from '../components/VideoUpload'
import { getVideos } from '../services/api'
import './HomePage.css'

function HomePage() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingStatus, setProcessingStatus] = useState({})

  const loadVideos = async () => {
    try {
      const list = await getVideos()
      setVideos(list)

      // Setup SSE for videos that are processing
      list.forEach(video => {
        if (video.status === 'processing' || video.status === 'queued') {
          subscribeToProcessingStatus(video.id)
        }
      })
    } catch (error) {
      console.error('Failed to fetch videos', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToProcessingStatus = (videoId) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const eventSource = new EventSource(`${apiUrl}/api/v1/videos/${videoId}/processing-status`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setProcessingStatus(prev => ({
        ...prev,
        [videoId]: data
      }))

      // If processing is complete, reload videos and close connection
      if (data.status === 'completed' || data.status === 'failed') {
        eventSource.close()
        loadVideos()
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }
  }

  useEffect(() => {
    loadVideos()
  }, [])

  const handleUploaded = (uploadResponse) => {
    loadVideos()
    // Subscribe to the newly uploaded video's processing status
    if (uploadResponse.video_id) {
      subscribeToProcessingStatus(uploadResponse.video_id)
    }
  }

  const getStepLabel = (step) => {
    const labels = {
      'transcoding': 'Transcoding Video',
      'extracting_audio': 'Extracting Audio',
      'transcribing': 'Whisper Transcription',
      'generating_subtitles': 'Generating Subtitles',
      'translating': 'Multilingual Translation',
      'generating_embeddings': 'AI Vectorization',
      'done': 'Complete',
      'failed': 'Failed'
    }
    return labels[step] || step
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  }

  return (
    <div className="home-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">
            Video AI <span className="text-primary">Studio</span>
          </h1>
          <p className="page-subtitle">
            Intelligent video processing & multilingual analysis
          </p>
        </div>
      </header>

      <section className="upload-section">
        <VideoUpload onUploadComplete={handleUploaded} />
      </section>

      <section className="videos-section">
        <div className="section-header">
          <h3 className="section-title">Recent Projects</h3>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading videos...</p>
          </div>
        )}

        {!loading && videos.length === 0 && (
          <div className="empty-state">
            <p>No videos yet. Upload one to get started.</p>
          </div>
        )}

        <div className="video-grid">
          {videos.map((video) => {
            const status = processingStatus[video.id] || {
              status: video.status,
              step: video.processing_step,
              progress: video.processing_progress || 0
            }
            const isProcessing = status.status === 'processing' || status.status === 'queued'

            return (
              <div key={video.id} className={`video-card ${isProcessing ? 'processing' : ''}`}>
                {isProcessing ? (
                  <div className="processing-card">
                    <div className="processing-preview">
                      <div className="processing-overlay">
                        <div className="processing-indicator">
                          <div className="spinner-ring"></div>
                          <span className="processing-percent">{status.progress}%</span>
                        </div>
                        <span className="processing-label">In Pipeline</span>
                      </div>
                    </div>

                    <div className="card-content">
                      <div className="card-header">
                        <h4 className="card-title">{video.original_filename || video.filename}</h4>
                        <span className="status-badge processing">Processing</span>
                      </div>

                      <div className="processing-steps">
                        {['transcoding', 'extracting_audio', 'transcribing', 'generating_subtitles', 'translating', 'generating_embeddings'].map((step, idx) => {
                          const stepProgress = status.step === step ? status.progress :
                                             (status.progress > (idx + 1) * 15 ? 100 : 0)
                          const isComplete = stepProgress === 100
                          const isActive = status.step === step
                          const isPending = stepProgress === 0

                          return (
                            <div key={step} className={`step-item ${isComplete ? 'complete' : ''} ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}>
                              <div className="step-icon-wrapper">
                                <div className="step-icon">
                                  {isComplete ? (
                                    <span className="material-symbols-outlined">check</span>
                                  ) : isActive ? (
                                    <div className="step-pulse"></div>
                                  ) : (
                                    <div className="step-dot"></div>
                                  )}
                                </div>
                                {idx < 5 && <div className="step-line"></div>}
                              </div>
                              <div className="step-info">
                                <p className="step-name">{idx + 1}. {getStepLabel(step)}</p>
                                {isActive && (
                                  <>
                                    <span className="step-status active">{stepProgress}%</span>
                                    <div className="step-progress-bar">
                                      <div className="step-progress-fill" style={{ width: `${stepProgress}%` }}></div>
                                    </div>
                                  </>
                                )}
                                {isComplete && <span className="step-status complete">Complete</span>}
                                {isPending && <span className="step-status pending">Pending</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link to={`/video/${video.id}`} className="video-card-link">
                    <div className="video-preview">
                      <div className="preview-overlay"></div>
                      <div className="status-indicator ready">
                        <span className="status-dot"></span>
                        Ready
                      </div>
                    </div>

                    <div className="card-content">
                      <div className="card-header">
                        <h4 className="card-title">{video.original_filename || video.filename}</h4>
                        <span className="video-duration">{formatDuration(video.duration)}</span>
                      </div>

                      <div className="card-footer">
                        <div className="video-meta">
                          <span className="material-symbols-outlined">calendar_month</span>
                          <span>{getTimeAgo(video.created_at)}</span>
                        </div>
                        <button className="open-button">
                          Open Dashboard
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default HomePage

