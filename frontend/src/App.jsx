import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import VideoPage from './pages/VideoPage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <header className="header">
          <h1>🎬 Video Processing Platform</h1>
        </header>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/video/:id" element={<VideoPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

