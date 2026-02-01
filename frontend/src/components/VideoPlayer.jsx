import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import Hls from 'hls.js'
import { getStreamUrl, getSubtitleUrl } from '../services/api'
import './VideoPlayer.css'

const VideoPlayer = forwardRef(({ videoId, onTimeUpdate }, ref) => {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [currentQuality, setCurrentQuality] = useState(-1)
  const [qualities, setQualities] = useState([])

  useEffect(() => {
    const video = videoRef.current
    const hlsUrl = getStreamUrl(videoId)

    if (Hls.isSupported()) {
      const hls = new Hls({ debug: false, enableWorker: true })

      hls.loadSource(hlsUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setQualities(hls.levels)
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setCurrentQuality(data.level)
      })

      hlsRef.current = hls

      return () => {
        hls.destroy()
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl
    }
  }, [videoId])

  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime)
    }
  }

  const changeQuality = (levelIndex) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex
    }
  }

  const seekTo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      videoRef.current.play()
    }
  }

  useImperativeHandle(ref, () => ({
    seekTo,
  }))

  return (
    <div className="video-player-container">
      <video
        ref={videoRef}
        controls
        className="video-player"
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
      >
        <track kind="subtitles" src={getSubtitleUrl(videoId, 'en')} srcLang="en" label="English" default />
        <track kind="subtitles" src={getSubtitleUrl(videoId, 'es')} srcLang="es" label="Español" />
      </video>

      {qualities.length > 0 && (
        <div className="quality-selector">
          <label>Quality: </label>
          <select value={currentQuality} onChange={(e) => changeQuality(Number(e.target.value))}>
            <option value={-1}>Auto</option>
            {qualities.map((level, index) => (
              <option key={index} value={index}>
                {level.height}p
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'

export default VideoPlayer

