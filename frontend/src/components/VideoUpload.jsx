import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadVideo, getTaskStatus } from '../services/api'
import './VideoUpload.css'

function VideoUpload({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processing, setProcessing] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv'] },
    maxFiles: 1,
    onDrop: handleDrop,
  })

  async function handleDrop(acceptedFiles) {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    setUploading(true)
    setProgress(0)

    try {
      const result = await uploadVideo(file, setProgress)
      setUploading(false)
      setProcessing(true)

      pollTaskStatus(result.task_id, result.video_id)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed: ' + error.message)
      setUploading(false)
    }
  }

  async function pollTaskStatus(taskId, videoId) {
    const interval = setInterval(async () => {
      try {
        const status = await getTaskStatus(taskId)

        if (status.status === 'SUCCESS') {
          clearInterval(interval)
          setProcessing(false)
          onUploadComplete?.(videoId)
        } else if (status.status === 'FAILURE') {
          clearInterval(interval)
          setProcessing(false)
          alert('Processing failed')
        }
      } catch (error) {
        console.error('Status check error:', error)
      }
    }, 3000)
  }

  return (
    <div className="upload-container">
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        {uploading ? (
          <div className="upload-progress">
            <p>Uploading: {progress}%</p>
            <progress value={progress} max="100" />
          </div>
        ) : processing ? (
          <div className="processing">
            <p>Processing video...</p>
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="upload-prompt">
            <p>📹 Drag & drop a video here, or click to select</p>
            <p className="upload-hint">Supported formats: MP4, MOV, AVI, MKV</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoUpload

