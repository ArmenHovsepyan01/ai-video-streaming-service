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

      // Pass the full result to parent so it can subscribe to SSE
      onUploadComplete?.(result)

      // Still poll for backup
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
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''} ${uploading || processing ? 'disabled' : ''}`}>
        <input {...getInputProps()} disabled={uploading || processing} />
        {uploading ? (
          <div className="upload-progress">
            <div className="upload-icon">
              <span className="material-symbols-outlined">cloud_upload</span>
            </div>
            <h2 className="upload-title">Uploading...</h2>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="progress-text">{progress}%</p>
          </div>
        ) : processing ? (
          <div className="processing-state">
            <div className="processing-spinner"></div>
            <h2 className="upload-title">Processing video...</h2>
            <p className="upload-description">AI is analyzing your content</p>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon">
              <span className="material-symbols-outlined">upload_file</span>
            </div>
            <h2 className="upload-title">Upload your video project</h2>
            <p className="upload-description">
              Drag and drop your MP4, MOV or AVI files. Our AI will automatically generate captions, translate content, and extract key insights.
            </p>
            <div className="upload-features">
              <span className="feature-tag">Auto-Captions</span>
              <span className="feature-tag">Multilingual Support</span>
              <span className="feature-tag">AI Summarization</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoUpload

