import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const STREAMING_URL = import.meta.env.VITE_STREAMING_URL || 'http://localhost:8080'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const uploadVideo = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/videos/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      onProgress?.(progress)
    },
  })

  return response.data
}

export const getVideo = async (videoId) => {
  const response = await api.get(`/videos/videos/${videoId}`)
  return response.data
}

export const getVideos = async () => {
  const response = await api.get('/videos/videos')
  return response.data
}

export const chatWithVideo = async (videoId, question, timestamp = null) => {
  const payload = { question }
  if (timestamp !== null && timestamp !== undefined) {
    payload.timestamp = timestamp
  }
  const response = await api.post(`/videos/videos/${videoId}/chat`, payload)
  return response.data
}

export const getChatHistory = async (videoId) => {
  const response = await api.get(`/videos/videos/${videoId}/chat-history`)
  return response.data
}

export const getTaskStatus = async (taskId) => {
  const response = await api.get(`/videos/task/${taskId}`)
  return response.data
}

export const getStreamUrl = (videoId) => {
  return `${STREAMING_URL}/hls/${videoId}/master.m3u8`
}

export const getSubtitleUrl = (videoId, lang) => {
  return `${STREAMING_URL}/subtitles/${videoId}/subtitles_${lang}.vtt`
}

