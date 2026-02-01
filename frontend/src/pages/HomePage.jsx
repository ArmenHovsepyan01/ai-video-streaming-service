import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import VideoUpload from '../components/VideoUpload'
import { getVideos } from '../services/api'
import './HomePage.css'

function HomePage() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  const loadVideos = async () => {
    try {
      const list = await getVideos()
      setVideos(list)
    } catch (error) {
      console.error('Failed to fetch videos', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [])

  const handleUploaded = () => {
    loadVideos()
  }

  return (
    <div className="page">
      <VideoUpload onUploadComplete={handleUploaded} />

      <section className="video-list">
        <h2>Videos</h2>
        {loading && <p>Loading...</p>}
        {!loading && videos.length === 0 && <p>No videos yet. Upload one to get started.</p>}
        <ul>
          {videos.map((v) => (
            <li key={v.id}>
              <Link to={`/video/${v.id}`}>
                <div className="video-card">
                  <div className="video-title">{v.original_filename || v.filename}</div>
                  <div className="video-meta">
                    <span>Status: {v.status}</span>
                    {v.duration ? <span>Duration: {v.duration.toFixed(1)}s</span> : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default HomePage

