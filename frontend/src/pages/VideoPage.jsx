import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import VideoPlayer from '../components/VideoPlayer'
import Chat from '../components/Chat'
import { getVideo } from '../services/api'
import './VideoPage.css'

function VideoPage() {
  const { id } = useParams()
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

  if (loading) return <p>Loading...</p>
  if (!video) return <p>Video not found</p>

  return (
    <div className="page video-page">
      <div className="player-column">
        <VideoPlayer videoId={id} onTimeUpdate={handleTimeUpdate} ref={playerRef} />
      </div>
      <div className="chat-column">
        <Chat videoId={Number(id)} onSeekTo={handleSeek} currentTime={currentTime} />
      </div>
    </div>
  )
}

export default VideoPage

