import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MissionGenerator from './components/MissionGenerator.jsx'
import MissionLog from './components/MissionLog.jsx'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MissionGenerator />} />
        <Route path="/log" element={<MissionLog />} />
        <Route path="/generate" element={<MissionGenerator />} />
      </Routes>
    </Router>
  )
}
