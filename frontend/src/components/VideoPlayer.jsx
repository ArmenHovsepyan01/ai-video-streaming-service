import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import Hls from 'hls.js'
import { getStreamUrl, getSubtitleUrl } from '../services/api'
import './VideoPlayer.css'

const VideoPlayer = forwardRef(({ videoId, onTimeUpdate }, ref) => {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const progressBarRef = useRef(null)
  const volumeBarRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [buffered, setBuffered] = useState(0)
  const [showControls, setShowControls] = useState(false)
  const [currentQuality, setCurrentQuality] = useState(-1)
  const [qualities, setQualities] = useState([])
  const [selectedLanguage, setSelectedLanguage] = useState('en')

  useEffect(() => {
    const video = videoRef.current
    const hlsUrl = getStreamUrl(videoId)

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        startLevel: -1
      })

      hls.loadSource(hlsUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setQualities(hls.levels)
        setDuration(video.duration)
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
      video.addEventListener('loadedmetadata', () => {
        setDuration(video.duration)
      })
    }
  }, [videoId])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (onTimeUpdate) {
        onTimeUpdate(video.currentTime)
      }
    }

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const percentage = (bufferedEnd / video.duration) * 100
        setBuffered(percentage)
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [onTimeUpdate])

  const togglePlay = () => {
    const video = videoRef.current
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const handleProgressClick = (e) => {
    const rect = progressBarRef.current.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    const video = videoRef.current
    video.currentTime = pos * duration
  }

  const handleVolumeClick = (e) => {
    const rect = volumeBarRef.current.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    const newVolume = Math.max(0, Math.min(1, pos))
    const video = videoRef.current
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (isMuted) {
      video.volume = volume || 0.5
      setIsMuted(false)
      setVolume(volume || 0.5)
    } else {
      video.volume = 0
      setIsMuted(true)
    }
  }

  const toggleFullscreen = () => {
    const container = videoRef.current.parentElement
    if (!document.fullscreenElement) {
      container.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const changeQuality = (levelIndex) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex
    }
  }

  const changeLanguage = (lang) => {
    setSelectedLanguage(lang)
    const tracks = videoRef.current?.textTracks
    if (tracks) {
      for (let i = 0; i < tracks.length; i++) {
        if (lang === 'off') {
          tracks[i].mode = 'hidden'
        } else {
          tracks[i].mode = tracks[i].language === lang ? 'showing' : 'hidden'
        }
      }
    }
  }

  const seekTo = (time) => {
    const video = videoRef.current
    if (video) {
      video.currentTime = time
      video.play()
      setIsPlaying(true)
    }
  }

  useImperativeHandle(ref, () => ({
    seekTo,
  }))

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const languages = [
    { code: 'off', name: 'Off' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'ru', name: 'Russian' }
  ]

  return (
    <div
      className="video-player-wrapper"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="video-player-container">
        {/* Video Element */}
        <video
          ref={videoRef}
          className="video-element"
          crossOrigin="anonymous"
          onClick={togglePlay}
        >
          <track kind="subtitles" src={getSubtitleUrl(videoId, 'en')} srcLang="en" label="English" default />
          <track kind="subtitles" src={getSubtitleUrl(videoId, 'es')} srcLang="es" label="Español" />
          <track kind="subtitles" src={getSubtitleUrl(videoId, 'ru')} srcLang="ru" label="Russian" />
          <track kind="subtitles" src={getSubtitleUrl(videoId, 'hy')} srcLang="hy" label="Armenian" />
        </video>

        {/* Custom Controls Overlay */}
        <div className={`custom-controls ${showControls ? 'show' : ''}`}>
          {/* Top Bar */}
          <div className="controls-top">

          </div>

          {/* Center Play Button */}
          <div className="controls-center">
            <button
              className="play-big-button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <span className="material-symbols-outlined">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="controls-bottom">
            {/* Progress Bar */}
            <div
              className="progress-container"
              ref={progressBarRef}
              onClick={handleProgressClick}
            >
              <div className="progress-buffered" style={{ width: `${buffered}%` }}></div>
              <div className="progress-bar" style={{ width: `${(currentTime / duration) * 100}%` }}>
                <div className="progress-handle"></div>
              </div>
            </div>

            {/* Control Buttons Row */}
            <div className="controls-row">
              {/* Left Controls */}
              <div className="controls-left">
                <button
                  className="control-button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  <span className="material-symbols-outlined">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>

                {/* Volume */}
                <div className="volume-control">
                  <button
                    className="control-button"
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    <span className="material-symbols-outlined">
                      {isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                    </span>
                  </button>
                  <div
                    className="volume-slider"
                    ref={volumeBarRef}
                    onClick={handleVolumeClick}
                  >
                    <div className="volume-bar" style={{ width: `${isMuted ? 0 : volume * 100}%` }}></div>
                  </div>
                </div>

                {/* Time Display */}
                <div className="time-display">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Right Controls */}
              <div className="controls-right">
                {/* Caption Selector */}
                <div className="selector-group" onClick={(e) => e.stopPropagation()}>
                  <span className="material-symbols-outlined">closed_caption</span>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => changeLanguage(e.target.value)}
                    className="control-select"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quality Selector */}
                {qualities.length > 0 && (
                  <div className="selector-group" onClick={(e) => e.stopPropagation()}>
                    <span className="material-symbols-outlined">hd</span>
                    <select
                      value={currentQuality}
                      onChange={(e) => changeQuality(Number(e.target.value))}
                      className="control-select"
                    >
                      <option value={-1}>Auto</option>
                      {qualities.map((level, index) => (
                        <option key={index} value={index}>
                          {level.height}p
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Fullscreen */}
                <button
                  className="control-button"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  <span className="material-symbols-outlined">
                    {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'

export default VideoPlayer



